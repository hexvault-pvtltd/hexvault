import { MessageCircle } from "lucide-react";
import { ChatPage } from "@/components/chat-page";
import { currentUser } from "@core/lib/auth";

export default async function ChatRoute() {
  const actor = await currentUser();
  return <div className="w-full">
    <header className="mb-4 flex items-end justify-between gap-3">
      <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#858585]">Workspace / Members</p><h1 className="mt-1 text-2xl font-semibold">Chat</h1><p className="mt-1 text-xs text-[#858585]">Message active HEXVAULT members in real time.</p></div>
      <div className="hidden h-10 w-10 place-items-center rounded-xl bg-white text-[#292929] sm:grid"><MessageCircle size={18}/></div>
    </header>
    <ChatPage selfId={actor?.id ?? ""} roles={actor?.roles ?? []}/>
  </div>;
}
