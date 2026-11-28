import { notFound, redirect } from "next/navigation";
import { letterActor } from "@core/features/letters/access";
import { LetterError } from "@core/features/letters/policy";
import { LetterManager } from "@/components/letter-manager";

export default async function LettersPage() {
  try { await letterActor(); }
  catch (error) {
    if (error instanceof LetterError && error.status === 401) redirect("/login");
    if (error instanceof LetterError && error.status === 403) notFound();
    throw error;
  }
  return <div className="space-y-6"><header><p className="text-xs text-slate-400">HR / Documents</p><h1 className="mt-2 text-2xl font-semibold">Letters &amp; certificates</h1><p className="mt-2 text-sm text-slate-500">Prepare a letter, request owner approval, then HR can email the approved PDF.</p></header><LetterManager/></div>;
}
