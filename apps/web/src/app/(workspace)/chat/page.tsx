import { ChatPage } from "@/components/chat-page";
import { currentUser } from "@core/lib/auth";

export default async function ChatRoute() {
  const actor = await currentUser();
  return <div className="w-full">
    <ChatPage selfId={actor?.id ?? ""} roles={actor?.roles ?? []}/>
  </div>;
}
