"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Radio, Volume2, X } from "lucide-react";
import { VoicePeerSession, type VoiceParticipant, type VoiceSignal } from "@/lib/voice-peer-session";

async function jsonRequest(url: string, init?: RequestInit) {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(url, { cache: "no-store", ...init, signal: init?.signal ? AbortSignal.any([timeout, init.signal]) : timeout });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "The voice call request failed.");
  return body?.data;
}
function callAction(conversationId: string, action: string, callId?: string) {
  return jsonRequest(`/api/v1/chat/conversations/${conversationId}/calls`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...(callId ? { callId } : {}) }) });
}

function RemoteAudio({ id, stream, register, playback }: { id: string; stream: MediaStream; register: (id: string, audio: HTMLAudioElement | null) => void; playback: (id: string, blocked: boolean) => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    let active = true;
    register(id, audio);
    audio.srcObject = stream;
    void audio.play().then(() => { if (active) playback(id, false); }).catch(() => { if (active) playback(id, true); });
    return () => { active = false; audio.pause(); audio.srcObject = null; register(id, null); };
  }, [id, stream, register, playback]);
  return <audio ref={ref} autoPlay playsInline />;
}

export function VoiceCallPanel({ conversationId, selfId, action, onClose }: { conversationId: string; selfId: string; action: "start" | "join"; onClose: () => void }) {
  const [callId, setCallId] = useState("");
  const [configuration, setConfiguration] = useState<RTCConfiguration | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<{ id: string; stream: MediaStream }[]>([]);
  const [connectionStates, setConnectionStates] = useState<Record<string, RTCPeerConnectionState>>({});
  const [blockedAudio, setBlockedAudio] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const localStream = useRef<MediaStream | null>(null);
  const callIdRef = useRef("");
  const audioElements = useRef(new Map<string, HTMLAudioElement>());
  const registerAudio = useCallback((id: string, audio: HTMLAudioElement | null) => {
    if (audio) audioElements.current.set(id, audio);
    else audioElements.current.delete(id);
  }, []);
  const playback = useCallback((id: string, blocked: boolean) => setBlockedAudio(current => ({ ...current, [id]: blocked })), []);

  useEffect(() => {
    let cancelled = false;
    let ownedStream: MediaStream | null = null;
    let joinedId = "";
    async function joinCall() {
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") throw new Error("Voice calls need a secure page and a browser with microphone access.");
        ownedStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
        if (cancelled) { ownedStream.getTracks().forEach(track => track.stop()); return; }
        localStream.current = ownedStream;
        const result = await callAction(conversationId, action);
        joinedId = result.item.id;
        if (cancelled) { await callAction(conversationId, "leave", joinedId); return; }
        callIdRef.current = joinedId;
        setParticipants(result.item.participants);
        setConfiguration({ iceServers: result.configuration?.iceServers ?? [{ urls: "stun:stun.l.google.com:19302" }] });
        setCallId(joinedId);
      } catch (reason) {
        ownedStream?.getTracks().forEach(track => track.stop());
        if (localStream.current === ownedStream) localStream.current = null;
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Microphone access could not be started.");
      }
    }
    void joinCall();
    return () => {
      cancelled = true;
      ownedStream?.getTracks().forEach(track => track.stop());
      if (localStream.current === ownedStream) localStream.current = null;
      // Scope cleanup to the call this effect joined, never a newer call.
      if (joinedId && callIdRef.current === joinedId) {
        callIdRef.current = "";
        void callAction(conversationId, "leave", joinedId).catch(() => {});
      }
    };
  }, [action, conversationId]);

  useEffect(() => {
    const stream = localStream.current;
    if (!callId || !configuration || !stream) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cursor: { afterAt: string; afterId: string } | null = null;
    const controller = new AbortController();
    const session = new VoicePeerSession({
      selfId, stream, configuration,
      send: async (toUserId, type, payload) => {
        if (!active) throw new Error("Call closed.");
        await jsonRequest(`/api/v1/chat/calls/${callId}/signals`, { method: "POST", signal: controller.signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ toUserId, type, payload }) });
      },
      onStream: (id, remote) => {
        if (!active) return;
        setRemoteStreams(current => remote ? [...current.filter(item => item.id !== id), { id, stream: remote }] : current.filter(item => item.id !== id));
        if (!remote) setBlockedAudio(current => { const next = { ...current }; delete next[id]; return next; });
      },
      onState: (id, state) => {
        if (active) setConnectionStates(current => { const next = { ...current }; if (state === "left") delete next[id]; else next[id] = state; return next; });
      },
    });
    async function poll() {
      try {
        const params = new URLSearchParams();
        if (cursor) { params.set("afterAt", cursor.afterAt); params.set("afterId", cursor.afterId); }
        const state = await jsonRequest(`/api/v1/chat/calls/${callId}/signals${params.size ? `?${params}` : ""}`, { signal: controller.signal });
        if (!active) return;
        setParticipants(state.participants);
        await session.tick(state.participants, state.signals as VoiceSignal[]);
        // Acknowledge only after the whole batch has been handled successfully.
        if (active) { cursor = state.nextCursor; setError(""); }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "The live call connection was interrupted.");
      } finally {
        // One in-flight poll: slow network requests cannot race SDP or cursors.
        if (active) timer = setTimeout(() => void poll(), 1000);
      }
    }
    void poll();
    return () => { active = false; controller.abort(); clearTimeout(timer); session.close(); };
  }, [callId, configuration, selfId]);

  function toggleMute() {
    const next = !muted;
    localStream.current?.getAudioTracks().forEach(track => { track.enabled = !next; });
    setMuted(next);
  }
  function enableAudio() {
    // Keep play() directly within the click gesture so browsers can allow sound.
    for (const [id, audio] of audioElements.current) void audio.play().then(() => playback(id, false)).catch(() => playback(id, true));
  }
  function hangUp() { onClose(); }

  const others = participants.filter(person => person.userId !== selfId);
  const connected = others.filter(person => connectionStates[person.userId] === "connected").length;
  const failed = others.some(person => connectionStates[person.userId] === "failed");
  const audioBlocked = remoteStreams.some(item => blockedAudio[item.id]);
  const status = error || (failed ? "Audio could not connect. Leave and rejoin the call. If it keeps failing, contact your workspace administrator." : !callId ? "Allow microphone access when your browser asks." : !others.length ? "Waiting for another member. Ask them to open this conversation and select Join call using their own account." : connected < others.length ? "Connecting audio with the other members..." : `${connected} other participant${connected === 1 ? "" : "s"} connected with audio.`);

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Voice call">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141414] p-6 text-white shadow-2xl">
      <header className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#f5682d]">HEXVAULT voice</p><h2 className="mt-2 text-xl font-semibold">{connected ? "Live call" : callId ? others.length ? "Connecting audio" : "Waiting for a teammate" : error ? "Call unavailable" : "Connecting..."}</h2></div><button onClick={hangUp} aria-label="Close call" className="grid h-9 w-9 place-items-center rounded-xl text-white/60 hover:bg-white/10"><X size={17}/></button></header>
      <div className="mt-6 space-y-2">{participants.map(person => {
        const isSelf = person.userId === selfId;
        const state = connectionStates[person.userId];
        return <div key={person.userId} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-3"><span className={`grid h-9 w-9 place-items-center rounded-full ${isSelf ? "bg-[#f4511e]" : "bg-white/10"}`}><Radio size={16}/></span><span className="min-w-0 flex-1 truncate text-sm">{person.name}{isSelf ? " (you)" : ""}</span><span className={`h-2 w-2 rounded-full ${isSelf || state === "connected" ? "bg-emerald-400" : state === "failed" ? "bg-rose-400" : "bg-amber-400"}`} aria-label={isSelf ? muted ? "Microphone muted" : "Microphone ready" : state === "connected" ? "Audio connected" : state === "failed" ? "Audio connection failed" : "Connecting audio"}/></div>;
      })}</div>
      {remoteStreams.map(item => <RemoteAudio key={item.id} id={item.id} stream={item.stream} register={registerAudio} playback={playback}/>)}
      <p role="status" className="mt-4 min-h-10 text-xs leading-5 text-white/50">{status}</p>
      {audioBlocked && <button onClick={enableAudio} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm"><Volume2 size={17}/>Enable sound</button>}
      <div className="mt-5 flex justify-center gap-3"><button onClick={toggleMute} disabled={!callId} aria-label={muted ? "Unmute microphone" : "Mute microphone"} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/15 disabled:opacity-40">{muted ? <MicOff size={18}/> : <Mic size={18}/>}</button><button onClick={hangUp} className="inline-flex h-12 items-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-semibold hover:bg-rose-500"><PhoneOff size={17}/>Leave call</button></div>
    </section>
  </div>;
}
