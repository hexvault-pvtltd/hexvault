"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, LoaderCircle, MessageCircle, Mic, Pin, Phone, Plus, Search, Send, Settings2, Square, Users, X } from "lucide-react";
import { ChatImage } from "@/components/chat-image";
import { ChatAudio } from "@/components/chat-audio";
import { VoiceCallPanel } from "@/components/voice-call-panel";

type Member = { userId: string; employeeId: string; fullName: string; employeeCode: string; title: string | null; department?: string | null };
type Reaction = { emoji: string; count: number; reacted: boolean };
type Message = { id: string; clientMessageId: string | null; senderId: string; senderName: string; body: string; createdAt: string; mine: boolean; isPinned: boolean; attachments: { id: string; filename: string; mimeType: string }[]; reactions: Reaction[] };
type Conversation = { id: string; kind: "DIRECT" | "GROUP"; name: string | null; description: string | null; createdBy: string | null; peer: Member | null; members: Member[]; lastMessage: { body: string; createdAt: string; mine: boolean; hasAttachments: boolean } | null; lastMessageAt: string; pinnedMessages: { id: string; body: string; senderName: string; hasAttachments: boolean }[]; activeCall: { id: string; participantCount: number } | null };
const emojiOptions = ["👍", "❤️", "😂", "🎉", "👀", "✅"];
async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "The chat request failed.");
  return body?.data;
}
function initials(name: string) { return name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase(); }
function time(value: string) { return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function json(method: string, body: unknown): RequestInit { return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }; }

export function ChatPage({ selfId, roles }: { selfId: string; roles: string[] }) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImageId, setSelectedImageId] = useState("");
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [newGroup, setNewGroup] = useState(false);
  const [groupDetails, setGroupDetails] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [addMemberIds, setAddMemberIds] = useState<string[]>([]);
  const [callAction, setCallAction] = useState<"start" | "join" | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState("👍");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingSecondsRef = useRef(0);
  const bottomPinned = useRef(true);
  const conversation = conversations.find(item => item.id === conversationId) ?? null;
  const peer = conversation?.peer ?? members.find(item => item.userId === selectedUserId) ?? null;
  const title = conversation?.kind === "GROUP" ? conversation.name ?? "Group chat" : peer?.fullName ?? "Chat";
  const canManageGroup = conversation?.kind === "GROUP" && (conversation.createdBy === selfId || roles.some(role => ["OWNER", "HR"].includes(role)));
  const dmByUser = useMemo(() => new Map(conversations.filter(item => item.kind === "DIRECT" && item.peer).map(item => [item.peer!.userId, item])), [conversations]);
  const shownMembers = useMemo(() => {
    const value = search.trim().toLowerCase();
    return members.filter(item => !value || (item.fullName + " " + item.employeeCode + " " + (item.title ?? "")).toLowerCase().includes(value));
  }, [members, search]);
  const refreshConversations = useCallback(async () => {
    const data = await requestJson("/api/v1/chat/conversations");
    setConversations(data.items);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const results = await Promise.all([requestJson("/api/v1/chat/members"), requestJson("/api/v1/chat/conversations")]);
        if (active) { setMembers(results[0].items); setConversations(results[1].items); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Unable to load chat."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    const timer = window.setInterval(() => { void refreshConversations().catch(() => {}); }, 6000);
    return () => { active = false; window.clearInterval(timer); };
  }, [refreshConversations]);

  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    let stream: EventSource | null = null;
    async function reload(limit = 50) {
      const result = await requestJson("/api/v1/chat/conversations/" + conversationId + "/messages?limit=" + limit);
      if (active) { setMessages(result.items); setHasMore(result.hasMore); }
      return result.items as Message[];
    }
    async function begin() {
      try {
        const initial = await reload();
        if (!active) return;
        const latest = initial.at(-1);
        const cursor = latest ? "?afterAt=" + encodeURIComponent(latest.createdAt) + "&afterId=" + encodeURIComponent(latest.id) : "";
        stream = new EventSource("/api/v1/chat/conversations/" + conversationId + "/stream" + cursor);
        stream.onopen = () => setConnected(true);
        stream.onerror = () => setConnected(false);
        stream.addEventListener("message", event => {
          const incoming = JSON.parse((event as MessageEvent<string>).data) as Message;
          setMessages(current => current.some(item => item.id === incoming.id) ? current : [...current, incoming]);
          bottomPinned.current = true;
          void reload(100).catch(() => {});
          void refreshConversations().catch(() => {});
        });
        stream.addEventListener("chat-event", event => {
          const update = JSON.parse((event as MessageEvent<string>).data) as { type: string; payload: { messageId?: string } };
          if (update.type === "MESSAGE_UPDATED" && update.payload.messageId) {
            void requestJson("/api/v1/chat/conversations/" + conversationId + "/messages?messageId=" + update.payload.messageId).then(data => {
              const changed = data.items[0] as Message | undefined;
              if (changed) setMessages(current => current.map(item => item.id === changed.id ? changed : item));
            }).catch(() => {});
          }
          void refreshConversations().catch(() => {});
        });
        stream.addEventListener("auth-expired", () => { stream?.close(); router.push("/login"); router.refresh(); });
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Unable to load messages."); }
    }
    void begin();
    return () => { active = false; stream?.close(); setConnected(false); };
  }, [conversationId, refreshConversations, router]);

  useEffect(() => { if (bottomPinned.current) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  useEffect(() => () => {
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  function selectConversation(item: Conversation) {
    setConversationId(item.id); setSelectedUserId(item.peer?.userId ?? "__group__");
    setMessages([]); setError(""); setSelectedImage(null); setSelectedImageId(""); setSelectedAudio(null); setSelectedAudioId("");
    setGroupName(item.name ?? ""); setGroupDescription(item.description ?? "");
  }
  async function openMember(item: Member) {
    const existing = dmByUser.get(item.userId);
    if (existing) { selectConversation(existing); return; }
    setBusy(true); setError("");
    try {
      const result = await requestJson("/api/v1/chat/conversations", json("POST", { peerUserId: item.userId }));
      await refreshConversations(); setConversationId(result.item.id); setSelectedUserId(item.userId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open this chat."); }
    finally { setBusy(false); }
  }
  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (groupMemberIds.length < 2) { setError("Choose at least two other members."); return; }
    setBusy(true); setError("");
    try {
      const result = await requestJson("/api/v1/chat/conversations", json("POST", { name: groupName, description: groupDescription, memberUserIds: groupMemberIds }));
      await refreshConversations(); setConversationId(result.item.id); setSelectedUserId("__group__"); setNewGroup(false); setGroupMemberIds([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the group."); }
    finally { setBusy(false); }
  }
  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!conversation) return;
    setBusy(true); setError("");
    try {
      await requestJson("/api/v1/chat/conversations/" + conversation.id, json("PATCH", { name: groupName, description: groupDescription }));
      if (addMemberIds.length) await requestJson("/api/v1/chat/conversations/" + conversation.id + "/members", json("POST", { userIds: addMemberIds }));
      await refreshConversations(); setAddMemberIds([]); setGroupDetails(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save group details."); }
    finally { setBusy(false); }
  }
  async function uploadAttachment(file: File) {
    const mimeType = file.type.split(";")[0].toLowerCase();
    const init = await requestJson("/api/v1/chat/uploads/init", json("POST", { conversationId, originalFilename: file.name, mimeType, sizeBytes: file.size }));
    const form = new FormData();
    Object.entries(init.fields as Record<string, string>).forEach(([key, value]) => form.append(key, value));
    form.append("file", file);
    const uploaded = await fetch(init.uploadUrl, { method: "POST", body: form });
    if (!uploaded.ok) throw new Error("Private storage rejected the attachment.");
    const complete = await requestJson("/api/v1/files/upload-complete", json("POST", { fileId: init.fileId }));
    if (complete.scanStatus !== "CLEAN") throw new Error("The attachment is waiting for security scanning.");
    return init.fileId as string;
  }

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("Voice recording is not supported by this browser."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferred = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        setRecording(false);
        if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        const mimeType = recorder.mimeType.split(";")[0].toLowerCase();
        const extensions: Record<string, string> = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" };
        const blob = new Blob(chunks, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null; recorderRef.current = null;
        if (!extensions[mimeType]) { setError("This browser produced an unsupported voice format. Try a current version of Chrome, Edge, or Firefox."); return; }
        if (!blob.size) { setError("No audio was captured. Check microphone access and try again."); return; }
        if (blob.size > 8 * 1024 * 1024) { setError("This recording is over 8 MB. Record a shorter voice message."); return; }
        setSelectedAudio(new File([blob], `voice-message.${extensions[mimeType]}`, { type: mimeType }));
        setSelectedAudioId("");
      };
      recorderRef.current = recorder; recorder.start(); setRecording(true); setRecordingSeconds(0); recordingSecondsRef.current = 0;
      recordingTimerRef.current = window.setInterval(() => {
        const next = recordingSecondsRef.current + 1;
        recordingSecondsRef.current = next; setRecordingSeconds(next);
        if (next >= 180 && recorder.state === "recording") recorder.stop();
      }, 1000);
    } catch (cause) {
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      setError(cause instanceof Error && cause.name === "NotAllowedError" ? "Allow microphone access in your browser to record a voice message." : "Could not start recording. Check that a microphone is connected and available.");
    }
  }
  function stopRecording() {
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null; setRecording(false);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }
  async function send(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if ((!draft.trim() && !selectedImage && !selectedAudio) || !conversationId || busy || recording) return;
    setBusy(true); setError("");
    try {
      const fileIds: string[] = [];
      if (selectedImage) { const id = selectedImageId || await uploadAttachment(selectedImage); setSelectedImageId(id); fileIds.push(id); }
      if (selectedAudio) { const id = selectedAudioId || await uploadAttachment(selectedAudio); setSelectedAudioId(id); fileIds.push(id); }
      const result = await requestJson("/api/v1/chat/conversations/" + conversationId + "/messages", json("POST", { body: draft.trim(), clientMessageId: crypto.randomUUID(), ...(fileIds.length ? { fileIds } : {}) }));
      setMessages(current => current.some(item => item.id === result.item.id) ? current : [...current, result.item]);
      setDraft(""); setSelectedImage(null); setSelectedImageId(""); setSelectedAudio(null); setSelectedAudioId(""); bottomPinned.current = true;
      await refreshConversations();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Message could not be sent; your draft is still here."); }
    finally { setBusy(false); }
  }
  async function loadOlder() {
    const first = messages[0]; if (!first || !hasMore || busy) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({ limit: "50", beforeAt: first.createdAt, beforeId: first.id });
      const result = await requestJson("/api/v1/chat/conversations/" + conversationId + "/messages?" + params);
      setMessages(current => [...result.items, ...current]); setHasMore(result.hasMore); bottomPinned.current = false;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load older messages."); }
    finally { setBusy(false); }
  }
  async function react(message: Message, emoji: string) {
    try {
      const result = await requestJson("/api/v1/chat/conversations/" + conversationId + "/messages/" + message.id + "/reactions", json("POST", { emoji }));
      setMessages(current => current.map(item => item.id === message.id ? { ...item, reactions: result.reactions } : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Reaction was not saved."); }
  }
  async function pin(message: Message) {
    try {
      await requestJson("/api/v1/chat/conversations/" + conversationId + "/messages/" + message.id, json("PATCH", { isPinned: !message.isPinned }));
      setMessages(current => current.map(item => item.id === message.id ? { ...item, isPinned: !message.isPinned } : item));
      await refreshConversations();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Pin update failed."); }
  }
  async function removeMember(userId: string) {
    if (!conversation || !window.confirm(userId === selfId ? "Leave this group?" : "Remove this person from the group?")) return;
    try {
      await requestJson("/api/v1/chat/conversations/" + conversation.id + "/members/" + userId, { method: "DELETE" });
      await refreshConversations();
      if (userId === selfId) { setConversationId(""); setSelectedUserId(""); setGroupDetails(false); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update group members."); }
  }

  const compact = (item: Conversation) => item.lastMessage?.body || (item.lastMessage?.hasAttachments ? "📷 Image" : item.kind === "GROUP" ? item.members.length + " members" : item.peer?.title ?? "Workspace member");

  return <>
    <section className="flex h-[calc(100dvh-210px)] min-h-[440px] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <aside className={(selectedUserId ? "hidden md:flex" : "flex") + " w-full shrink-0 flex-col border-r border-[var(--border)] md:w-[300px] lg:w-[340px]"}>
        <div className="border-b border-[var(--border)] p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Messages</h2><button onClick={() => { setNewGroup(true); setGroupName(""); setGroupDescription(""); setGroupMemberIds([]); setError(""); }} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#171717] px-2.5 text-[10px] font-semibold text-white"><Plus size={13}/>New group</button></div><label className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[#fafafa] px-2.5"><Search size={14} className="text-[#888]"/><input aria-label="Search members" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people" className="min-w-0 flex-1 bg-transparent text-xs outline-none"/></label></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <p className="px-3 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-[.13em] text-[#999]">Recent conversations</p>
          {conversations.map(item => <button key={item.id} onClick={() => selectConversation(item)} className={"mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left " + (conversationId === item.id ? "bg-[#f1f1f1]" : "hover:bg-[#f7f7f7]")}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f5eee9] text-[#cf4b20]">{item.kind === "GROUP" ? <Users size={16}/> : initials(item.peer?.fullName ?? "H")}</span><span className="min-w-0 flex-1"><b className="block truncate text-xs">{item.kind === "GROUP" ? item.name : item.peer?.fullName}</b><span className="mt-1 block truncate text-[10px] text-[#888]">{compact(item)}</span></span>{item.activeCall && <Phone size={13} className="text-emerald-600"/>}</button>)}
          <p className="px-3 pb-1 pt-4 text-[9px] font-semibold uppercase tracking-[.13em] text-[#999]">Workspace members</p>
          {loading ? <p className="py-8 text-center text-xs text-[#888]">Loading members…</p> : shownMembers.map(item => <button key={item.userId} onClick={() => void openMember(item)} disabled={busy} className={"mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-[#f7f7f7] " + (selectedUserId === item.userId ? "bg-[#f1f1f1]" : "")}><span className="grid h-10 w-10 place-items-center rounded-full bg-[#ededed] text-[11px] font-semibold">{initials(item.fullName)}</span><span className="min-w-0 flex-1"><b className="block truncate text-xs">{item.fullName}</b><span className="mt-1 block truncate text-[10px] text-[#888]">{item.title ?? item.employeeCode}</span></span></button>)}
          {!loading && !shownMembers.length && <p className="py-8 text-center text-xs text-[#888]">{search ? "No matches." : "No active members."}</p>}
        </div>
      </aside>
      <div className={(selectedUserId ? "flex" : "hidden md:flex") + " min-w-0 flex-1 flex-col"}>
        {conversationId ? <>
          <header className="flex min-h-[62px] items-center gap-3 border-b border-[var(--border)] px-3 sm:px-5"><button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f3f3f3] md:hidden" onClick={() => { setConversationId(""); setSelectedUserId(""); }} aria-label="Back"><ArrowLeft size={16}/></button><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f3eee9] text-[#c84b1e]">{conversation?.kind === "GROUP" ? <Users size={16}/> : initials(title)}</span><div className="min-w-0 flex-1"><h2 className="truncate text-xs font-semibold">{title}</h2><p className="truncate text-[10px] text-[#888]">{conversation?.kind === "GROUP" ? (conversation.description || conversation.members.length + " members") : (peer?.title ?? "Workspace member") + " · " + (connected ? "Live" : "Connecting…")}</p></div>{conversation?.activeCall ? <button onClick={() => setCallAction("join")} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[10px] font-semibold text-white"><Phone size={13}/>Join</button> : <button onClick={() => setCallAction("start")} aria-label="Start voice call" className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)]"><Phone size={15}/></button>}{conversation?.kind === "GROUP" && <button onClick={() => setGroupDetails(true)} aria-label="Group details" className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)]"><Settings2 size={15}/></button>}</header>
          {!!conversation?.pinnedMessages.length && <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2"><Pin size={13} className="text-amber-700"/><b className="text-[10px] text-amber-800">Pinned</b><div className="flex flex-1 gap-2 overflow-x-auto">{conversation.pinnedMessages.map(item => <button key={item.id} onClick={() => document.getElementById("chat-message-" + item.id)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="max-w-48 truncate text-[10px] text-amber-900 underline">{item.body || "Image"} · {item.senderName}</button>)}</div></div>}
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-3 py-4 sm:px-5" onScroll={event => { const node = event.currentTarget; bottomPinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48; }}>
            {hasMore && <div className="mb-4 text-center"><button onClick={() => void loadOlder()} disabled={busy} className="rounded-full border bg-white px-3 py-1.5 text-[10px]">Load older messages</button></div>}
            {!messages.length && <div className="grid h-full min-h-36 place-items-center text-center"><div><MessageCircle size={21} className="mx-auto text-[#777]"/><p className="mt-3 text-xs font-semibold">Start a conversation</p><p className="mt-1 text-[10px] text-[#888]">Say hello to {title}.</p></div></div>}
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">{messages.map((message, index) => <div key={message.id} id={"chat-message-" + message.id}>{(index === 0 || new Date(messages[index - 1].createdAt).toDateString() !== new Date(message.createdAt).toDateString()) && <p className="my-3 text-center text-[9px] text-[#999]">{new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date(message.createdAt))}</p>}<div className={"flex " + (message.mine ? "justify-end" : "justify-start")}><div className="max-w-[88%] sm:max-w-[72%]">{conversation?.kind === "GROUP" && !message.mine && <p className="mb-1 pl-1 text-[9px] font-semibold text-[#777]">{message.senderName}</p>}<div className={"rounded-2xl px-3.5 py-2.5 " + (message.mine ? "rounded-br-md bg-[#171717] text-white" : "rounded-bl-md border border-[var(--border)] bg-white text-[#222]")}>{message.isPinned && <p className="mb-1 flex items-center gap-1 text-[9px] text-amber-500"><Pin size={10}/>Pinned</p>}{message.body && <p className="whitespace-pre-wrap break-words text-xs leading-5">{message.body}</p>}{message.attachments.map(file => file.mimeType.startsWith("audio/") ? <ChatAudio key={file.id} fileId={file.id} filename={file.filename}/> : <ChatImage key={file.id} fileId={file.id} filename={file.filename}/>)}<time className="mt-1 block text-right text-[9px] opacity-60">{time(message.createdAt)}</time></div><div className="flex flex-wrap items-center gap-1 pt-1">{message.reactions.map(item => <button key={item.emoji} onClick={() => void react(message, item.emoji)} className={"rounded-full border px-1.5 py-0.5 text-[10px] " + (item.reacted ? "border-orange-300 bg-orange-50" : "border-[var(--border)] bg-white")}>{item.emoji} {item.count}</button>)}<select aria-label="Choose reaction" value={selectedEmoji} onChange={event => setSelectedEmoji(event.target.value)} className="h-6 w-10 rounded-full border bg-white text-[10px]">{emojiOptions.map(emoji => <option key={emoji}>{emoji}</option>)}</select><button aria-label="React to message" onClick={() => void react(message, selectedEmoji)} className="grid h-6 w-6 place-items-center rounded-full text-sm text-[#777] hover:bg-white">＋</button><button aria-label={message.isPinned ? "Unpin message" : "Pin message"} onClick={() => void pin(message)} className="grid h-6 w-6 place-items-center rounded-full text-[#777] hover:bg-white"><Pin size={11}/></button></div></div></div></div>)}</div><div ref={endRef}/>
          </div>
          {error && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-[10px] text-rose-700">{error}</p>}
          {selectedImage && <div className="flex items-center gap-2 border-t bg-orange-50 px-4 py-2 text-[10px]"><ImagePlus size={14}/><span className="flex-1 truncate">{selectedImage.name}{selectedImageId ? " · scanned" : ""}</span><button type="button" onClick={() => { setSelectedImage(null); setSelectedImageId(""); }} aria-label="Remove image"><X size={14}/></button></div>}\n          {selectedAudio && <div className="flex items-center gap-2 border-t bg-orange-50 px-4 py-2 text-[10px]"><Mic size={14}/><span className="flex-1 truncate">Voice message · {Math.floor(selectedAudio.size / 1024)} KB{selectedAudioId ? " · scanned" : ""}</span><button type="button" onClick={() => { setSelectedAudio(null); setSelectedAudioId(""); }} aria-label="Remove voice message"><X size={14}/></button></div>}
          <form onSubmit={event => void send(event)} className="flex items-end gap-2 border-t bg-white p-3 sm:p-4"><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" id="chat-image" onChange={event => { const file = event.target.files?.[0] ?? null; event.target.value = ""; if (file && file.size > 5 * 1024 * 1024) { setError("Choose an image up to 5 MB."); return; } setSelectedImage(file); setSelectedImageId(""); }}/><label htmlFor="chat-image" className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border"><ImagePlus size={16}/></label><button type="button" onClick={() => recording ? stopRecording() : void startRecording()} disabled={!conversationId || busy || Boolean(selectedAudio)} aria-label={recording ? "Stop voice recording" : "Record a voice message"} title={recording ? `Stop recording (${recordingSeconds}s)` : "Record voice message"} className={"grid h-10 w-10 shrink-0 place-items-center rounded-xl border " + (recording ? "border-rose-300 bg-rose-50 text-rose-700" : "")}>{recording ? <Square size={14} fill="currentColor"/> : <Mic size={16}/>}</button>{recording && <span className="shrink-0 text-[10px] font-medium text-rose-700" aria-live="polite">{Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")}</span>}<textarea aria-label="Write a message" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} maxLength={4000} rows={1} placeholder="Write a message… (Enter to send)" className="min-h-10 min-w-0 flex-1 resize-y rounded-xl border px-3 py-2.5 text-xs" disabled={busy}/><button type="submit" disabled={(!draft.trim() && !selectedImage && !selectedAudio) || busy || recording} aria-label="Send message" className="grid h-10 w-10 place-items-center rounded-xl bg-[#171717] text-white disabled:opacity-40">{busy ? <LoaderCircle size={16} className="animate-spin"/> : <Send size={15}/>}</button></form>
        </> : <div className="grid flex-1 place-items-center p-6 text-center"><div><MessageCircle size={22} className="mx-auto text-[#555]"/><h2 className="mt-4 text-sm font-semibold">Your workspace chat</h2><p className="mt-1 max-w-sm text-xs text-[#888]">Choose a member or create a group. Messages update live while the chat is open.</p></div></div>}
      </div>
    </section>
    {error && !conversationId && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    {newGroup && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4"><form onSubmit={event => void createGroup(event)} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"><div className="flex justify-between"><h2 className="text-base font-semibold">Create a group chat</h2><button type="button" onClick={() => setNewGroup(false)} aria-label="Close"><X size={18}/></button></div><label className="mt-4 block text-xs font-semibold">Group name<input required minLength={2} maxLength={80} value={groupName} onChange={event => setGroupName(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border px-3 text-xs"/></label><label className="mt-3 block text-xs font-semibold">Description<textarea maxLength={500} value={groupDescription} onChange={event => setGroupDescription(event.target.value)} className="mt-1.5 min-h-20 w-full rounded-lg border px-3 py-2 text-xs"/></label><p className="mt-4 text-xs font-semibold">Add members <span className="font-normal text-[#888]">· select two or more</span></p><div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border p-2">{members.map(item => <label key={item.userId} className="flex items-center gap-2 p-2 text-xs"><input type="checkbox" checked={groupMemberIds.includes(item.userId)} onChange={event => setGroupMemberIds(current => event.target.checked ? [...current, item.userId] : current.filter(id => id !== item.userId))}/><span className="flex-1">{item.fullName}</span>{item.title}</label>)}</div>{error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setNewGroup(false)} className="rounded-lg border px-4 py-2 text-xs">Cancel</button><button disabled={busy} className="rounded-lg bg-[#171717] px-4 py-2 text-xs font-semibold text-white">{busy ? "Creating…" : "Create group"}</button></div></form></div>}
    {groupDetails && conversation?.kind === "GROUP" && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4"><form onSubmit={event => void saveGroup(event)} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"><div className="flex justify-between"><h2 className="text-base font-semibold">Group details</h2><button type="button" onClick={() => setGroupDetails(false)} aria-label="Close"><X size={18}/></button></div><label className="mt-4 block text-xs font-semibold">Name<input value={groupName} disabled={!canManageGroup} onChange={event => setGroupName(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border px-3 text-xs"/></label><label className="mt-3 block text-xs font-semibold">Description<textarea value={groupDescription} disabled={!canManageGroup} onChange={event => setGroupDescription(event.target.value)} className="mt-1.5 min-h-20 w-full rounded-lg border px-3 py-2 text-xs"/></label><p className="mt-4 text-xs font-semibold">Members ({conversation.members.length})</p><div className="mt-2 space-y-1 rounded-xl border p-2">{conversation.members.map(item => <div key={item.userId} className="flex items-center gap-2 p-2 text-xs"><span className="flex-1">{item.fullName}{item.userId === conversation.createdBy ? " · creator" : ""}</span>{(item.userId === selfId || (canManageGroup && item.userId !== conversation.createdBy)) && <button type="button" onClick={() => void removeMember(item.userId)} className="text-rose-600">{item.userId === selfId ? "Leave" : "Remove"}</button>}</div>)}</div>{canManageGroup && <><p className="mt-4 text-xs font-semibold">Add members</p><div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-xl border p-2">{members.filter(item => !conversation.members.some(existing => existing.userId === item.userId)).map(item => <label key={item.userId} className="flex gap-2 p-2 text-xs"><input type="checkbox" checked={addMemberIds.includes(item.userId)} onChange={event => setAddMemberIds(current => event.target.checked ? [...current, item.userId] : current.filter(id => id !== item.userId))}/>{item.fullName}</label>)}</div></>}{error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setGroupDetails(false)} className="rounded-lg border px-4 py-2 text-xs">Close</button>{canManageGroup && <button disabled={busy} className="rounded-lg bg-[#171717] px-4 py-2 text-xs text-white">{busy ? "Saving…" : "Save changes"}</button>}</div></form></div>}
    {callAction && conversation && <VoiceCallPanel conversationId={conversation.id} selfId={selfId} action={callAction} onClose={() => { setCallAction(null); void refreshConversations(); }}/>}
  </>;
}
