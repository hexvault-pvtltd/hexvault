export type VoiceParticipant = { userId: string; name: string; joinedAt?: string };
export type VoiceSignal = { id: string; fromUserId: string; type: "OFFER" | "ANSWER" | "CANDIDATE"; payload: Record<string, unknown>; createdAt?: string };
type Peer = { connection: RTCPeerConnection; joinedAt?: string; candidates: RTCIceCandidateInit[]; outgoing: RTCIceCandidateInit[]; offerSent: boolean; restart: boolean; restarts: number };
type Options = {
  selfId: string;
  stream: MediaStream;
  configuration: RTCConfiguration;
  send: (to: string, type: VoiceSignal["type"], payload: Record<string, unknown>) => Promise<void>;
  onStream: (id: string, stream: MediaStream | null) => void;
  onState: (id: string, state: RTCPeerConnectionState | "left") => void;
  createPeer?: (configuration: RTCConfiguration) => RTCPeerConnection;
};

// One instance owns one call. Polling must await tick before advancing its cursor.
export class VoicePeerSession {
  private peers = new Map<string, Peer>();
  private processed = new Set<string>();
  private closed = false;
  constructor(private options: Options) {}

  private remove(id: string) {
    const peer = this.peers.get(id);
    if (!peer) return;
    peer.connection.onicecandidate = null;
    peer.connection.ontrack = null;
    peer.connection.onconnectionstatechange = null;
    peer.connection.close();
    this.peers.delete(id);
    this.options.onStream(id, null);
    this.options.onState(id, "left");
  }

  private ensure(person: VoiceParticipant) {
    let peer = this.peers.get(person.userId);
    if (peer && peer.joinedAt !== person.joinedAt) { this.remove(person.userId); peer = undefined; }
    if (peer) return peer;
    const connection = this.options.createPeer?.(this.options.configuration) ?? new RTCPeerConnection(this.options.configuration);
    peer = { connection, joinedAt: person.joinedAt, candidates: [], outgoing: [], offerSent: false, restart: false, restarts: 0 };
    const record = peer;
    this.options.stream.getTracks().forEach(track => connection.addTrack(track, this.options.stream));
    connection.onicecandidate = event => { if (!this.closed && event.candidate) record.outgoing.push(event.candidate.toJSON()); };
    connection.ontrack = event => {
      if (!this.closed) this.options.onStream(person.userId, event.streams[0] ?? new MediaStream([event.track]));
    };
    connection.onconnectionstatechange = () => {
      if (this.closed) return;
      this.options.onState(person.userId, connection.connectionState);
      if (connection.connectionState === "failed" && this.options.selfId < person.userId && record.restarts < 2) record.restart = true;
    };
    this.peers.set(person.userId, peer);
    this.options.onState(person.userId, "new");
    return peer;
  }

  private async drain(peer: Peer) {
    const pc = peer.connection;
    if (!pc.remoteDescription || pc.signalingState === "have-local-offer") return;
    const remoteUfrag = pc.remoteDescription.sdp.match(/a=ice-ufrag:([^\r\n]+)/)?.[1];
    for (let index = 0; !this.closed && index < peer.candidates.length;) {
      const candidate = peer.candidates[index];
      // A restart's candidates can arrive before its new description. Retain
      // them without blocking candidates for the current ICE generation.
      if (candidate.usernameFragment && remoteUfrag && candidate.usernameFragment !== remoteUfrag) { index++; continue; }
      await pc.addIceCandidate(candidate);
      peer.candidates.splice(index, 1);
    }
  }

  async tick(participants: VoiceParticipant[], signals: VoiceSignal[]) {
    if (this.closed) return;
    const others = new Map(participants.filter(person => person.userId !== this.options.selfId).map(person => [person.userId, person]));
    for (const id of this.peers.keys()) if (!others.has(id)) this.remove(id);
    for (const person of others.values()) this.ensure(person);
    for (const signal of signals) {
      if (this.closed) return;
      if (this.processed.has(signal.id) || !others.has(signal.fromUserId)) continue;
      const sender = others.get(signal.fromUserId)!;
      if (sender.joinedAt && signal.createdAt && new Date(signal.createdAt) < new Date(sender.joinedAt)) continue;
      const peer = this.ensure(others.get(signal.fromUserId)!);
      const pc = peer.connection;
      if (signal.type === "CANDIDATE") {
        // A candidate may arrive before its offer/answer. Keep it until SDP exists.
        peer.candidates.push(signal.payload as RTCIceCandidateInit);
      } else if (signal.type === "OFFER") {
        const description = signal.payload as unknown as RTCSessionDescriptionInit;
        if (!(pc.remoteDescription?.sdp === description.sdp && pc.localDescription?.type === "answer" && pc.signalingState === "stable")) {
          if (pc.signalingState === "have-local-offer") {
            if (this.options.selfId < signal.fromUserId) { this.processed.add(signal.id); continue; }
            await pc.setLocalDescription({ type: "rollback" });
          }
          await pc.setRemoteDescription(description);
          await pc.setLocalDescription(await pc.createAnswer());
        }
        await this.options.send(signal.fromUserId, "ANSWER", pc.localDescription!.toJSON() as unknown as Record<string, unknown>);
      } else if (pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(signal.payload as unknown as RTCSessionDescriptionInit);
      }
      // A failed signal is retried on the next poll instead of being lost forever.
      this.processed.add(signal.id);
    }
    for (const [id, peer] of this.peers) {
      if (this.closed) return;
      const pc = peer.connection;
      await this.drain(peer);
      if (this.options.selfId < id && ((!peer.offerSent && (!pc.remoteDescription || pc.signalingState === "have-local-offer")) || peer.restart)) {
        if (!pc.localDescription || (peer.restart && pc.signalingState === "stable")) {
          await pc.setLocalDescription(await pc.createOffer({ iceRestart: peer.restart }));
          if (peer.restart) { peer.restarts++; peer.restart = false; peer.offerSent = false; }
        }
        if (!peer.offerSent && pc.localDescription?.type === "offer") {
          await this.options.send(id, "OFFER", pc.localDescription.toJSON() as unknown as Record<string, unknown>);
          peer.offerSent = true;
        }
      }
      while (!this.closed && peer.outgoing.length) {
        await this.options.send(id, "CANDIDATE", peer.outgoing[0] as unknown as Record<string, unknown>);
        peer.outgoing.shift();
      }
    }
  }

  close() {
    this.closed = true;
    for (const peer of this.peers.values()) {
      peer.connection.onicecandidate = null;
      peer.connection.ontrack = null;
      peer.connection.onconnectionstatechange = null;
      peer.connection.close();
    }
    this.peers.clear();
    this.processed.clear();
  }
}
