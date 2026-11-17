"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Radio, X } from "lucide-react";

type Person = { userId: string; name: string };
type Signal = { id: string; fromUserId: string; type: "OFFER" | "ANSWER" | "CANDIDATE"; payload: Record<string, unknown>; createdAt: string };
async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "The voice call request failed.");
  return body?.data;
}

export function VoiceCallPanel({ conversationId, selfId, action, onClose }: { conversationId: string; selfId: string; action: "start" | "join"; onClose: () => void }) {
  const [callId, setCallId] = useState("");
  const [participants, setParticipants] = useState<Person[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<{ id: string; stream: MediaStream }[]>([]);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const localStream = useRef<MediaStream | null>(null);
  const callIdRef = useRef("");
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const pendingCandidates = useRef(new Map<string, RTCIceCandidateInit[]>());
  const offered = useRef(new Set<string>());
  const cursor = useRef<{ afterAt: string; afterId: string } | null>(null);
  const processed = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    const peerConnections = peers.current;
    async function joinCall() {
      let joinedId = "";
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Voice calls need a secure page and a browser with microphone access.");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
        localStream.current = stream;
        const result = await jsonRequest(`/api/v1/chat/conversations/${conversationId}/calls`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
        joinedId = result.item.id;
        if (cancelled) { await jsonRequest(`/api/v1/chat/conversations/${conversationId}/calls`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "leave" }) }); return; }
        callIdRef.current = joinedId;
        setCallId(joinedId);
        setParticipants(result.item.participants);
        setReady(true);
      } catch (reason) {
        if (joinedId) void jsonRequest(`/api/v1/chat/conversations/${conversationId}/calls`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "leave" }) }).catch(() => {});
        localStream.current?.getTracks().forEach(track => track.stop());
        localStream.current = null;
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Microphone access could not be started.");
      }
    }
    void joinCall();
    return () => {
      cancelled = true;
      for (const peer of peerConnections.values()) peer.close();
      peerConnections.clear();
      localStream.current?.getTracks().forEach(track => track.stop());
      localStream.current = null;
      if (callIdRef.current) void jsonRequest(`/api/v1/chat/conversations/${conversationId}/calls`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "leave" }) }).catch(() => {});
    };
  }, [action, conversationId]);

  useEffect(() => {
    if (!callId || !ready) return;
    let active = true;
    const send = async (toUserId: string, type: Signal["type"], payload: Record<string, unknown>) => {
      await jsonRequest(`/api/v1/chat/calls/${callId}/signals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toUserId, type, payload }) });
    };
    const ensurePeer = (remoteId: string) => {
      const existing = peers.current.get(remoteId);
      if (existing) return existing;
      const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      localStream.current?.getTracks().forEach(track => peer.addTrack(track, localStream.current!));
      peer.onicecandidate = event => { if (event.candidate) void send(remoteId, "CANDIDATE", event.candidate.toJSON() as unknown as Record<string, unknown>).catch(cause => setError(cause instanceof Error ? cause.message : "Call signaling failed.")); };
      peer.ontrack = event => {
        const stream = event.streams[0];
        if (stream) setRemoteStreams(current => current.some(item => item.id === remoteId) ? current : [...current, { id: remoteId, stream }]);
      };
      peer.onconnectionstatechange = () => {
        if (["failed", "closed"].includes(peer.connectionState)) setRemoteStreams(current => current.filter(item => item.id !== remoteId));
      };
      peers.current.set(remoteId, peer);
      return peer;
    };
    const acceptCandidate = async (remoteId: string, candidate: RTCIceCandidateInit) => {
      const peer = ensurePeer(remoteId);
      if (peer.remoteDescription) await peer.addIceCandidate(new RTCIceCandidate(candidate));
      else pendingCandidates.current.set(remoteId, [...(pendingCandidates.current.get(remoteId) ?? []), candidate]);
    };
    const drainCandidates = async (remoteId: string, peer: RTCPeerConnection) => {
      for (const candidate of pendingCandidates.current.get(remoteId) ?? []) await peer.addIceCandidate(new RTCIceCandidate(candidate));
      pendingCandidates.current.delete(remoteId);
    };
    const poll = async () => {
      try {
        const params = new URLSearchParams();
        if (cursor.current) { params.set("afterAt", cursor.current.afterAt); params.set("afterId", cursor.current.afterId); }
        const state = await jsonRequest(`/api/v1/chat/calls/${callId}/signals${params.size ? `?${params}` : ""}`);
        if (!active) return;
        setParticipants(state.participants);
        cursor.current = state.nextCursor;
        for (const person of state.participants as Person[]) {
          if (person.userId === selfId) continue;
          const peer = ensurePeer(person.userId);
          if (selfId.localeCompare(person.userId) < 0 && !offered.current.has(person.userId) && !peer.localDescription) {
            offered.current.add(person.userId);
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            await send(person.userId, "OFFER", peer.localDescription!.toJSON() as unknown as Record<string, unknown>);
          }
        }
        for (const signal of state.signals as Signal[]) {
          if (processed.current.has(signal.id)) continue;
          processed.current.add(signal.id);
          const peer = ensurePeer(signal.fromUserId);
          if (signal.type === "OFFER") {
            await peer.setRemoteDescription(new RTCSessionDescription(signal.payload as unknown as RTCSessionDescriptionInit));
            await drainCandidates(signal.fromUserId, peer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await send(signal.fromUserId, "ANSWER", peer.localDescription!.toJSON() as unknown as Record<string, unknown>);
          } else if (signal.type === "ANSWER") {
            await peer.setRemoteDescription(new RTCSessionDescription(signal.payload as unknown as RTCSessionDescriptionInit));
            await drainCandidates(signal.fromUserId, peer);
          } else {
            await acceptCandidate(signal.fromUserId, signal.payload as unknown as RTCIceCandidateInit);
          }
        }
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : "The live call connection was interrupted."); }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1200);
    return () => { active = false; window.clearInterval(timer); };
  }, [callId, ready, selfId]);

  function toggleMute() {
    const next = !muted;
    localStream.current?.getAudioTracks().forEach(track => { track.enabled = !next; });
    setMuted(next);
  }
  async function hangUp() {
    if (callId) await jsonRequest(`/api/v1/chat/conversations/${conversationId}/calls`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "leave" }) }).catch(() => {});
    callIdRef.current = "";
    onClose();
  }

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Voice call">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141414] p-6 text-white shadow-2xl">
      <header className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#f5682d]">HEXVAULT voice</p><h2 className="mt-2 text-xl font-semibold">{ready ? "Live call" : error ? "Call unavailable" : "Connecting…"}</h2></div><button onClick={() => void hangUp()} aria-label="Close call" className="grid h-9 w-9 place-items-center rounded-xl text-white/60 hover:bg-white/10"><X size={17}/></button></header>
      <div className="mt-6 space-y-2">{participants.map(person => <div key={person.userId} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-3"><span className={`grid h-9 w-9 place-items-center rounded-full ${person.userId === selfId ? "bg-[#f4511e]" : "bg-white/10"}`}><Radio size={16}/></span><span className="min-w-0 flex-1 truncate text-sm">{person.name}{person.userId === selfId ? " (you)" : ""}</span><span className="h-2 w-2 rounded-full bg-emerald-400"/></div>)}</div>
      {remoteStreams.map(item => <audio key={item.id} autoPlay playsInline ref={element => { if (element && element.srcObject !== item.stream) element.srcObject = item.stream; }} />)}
      <p className="mt-4 min-h-10 text-xs leading-5 text-white/50">{error || (ready ? `${Math.max(0, participants.length - 1)} other participant${participants.length === 2 ? "" : "s"} connected. Calls use your microphone only.` : "Allow microphone access when your browser asks." )}</p>
      <div className="mt-5 flex justify-center gap-3"><button onClick={toggleMute} disabled={!ready} aria-label={muted ? "Unmute microphone" : "Mute microphone"} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/15 disabled:opacity-40">{muted ? <MicOff size={18}/> : <Mic size={18}/>}</button><button onClick={() => void hangUp()} className="inline-flex h-12 items-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-semibold hover:bg-rose-500"><PhoneOff size={17}/>Leave call</button></div>
      <p className="mt-4 text-center text-[10px] text-white/35">A secure HTTPS connection and microphone permission are required. Some networks may require a TURN relay.</p>
    </section>
  </div>;
}
