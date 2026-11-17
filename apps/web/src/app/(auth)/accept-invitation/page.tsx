import { AcceptInvitationForm } from "@/components/accept-invitation-form";
export const dynamic="force-dynamic";
export default async function AcceptInvitation({searchParams}:{searchParams:Promise<{token?:string}>}){const {token=""}=await searchParams;return <AcceptInvitationForm token={token}/>}
