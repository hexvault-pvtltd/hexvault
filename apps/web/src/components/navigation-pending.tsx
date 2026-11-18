"use client";

import { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";

export function NavigationPending() {
  const { pending } = useLinkStatus();
  return <span role="status" className={`ml-auto grid size-4 shrink-0 place-items-center ${pending ? "opacity-100" : "opacity-0"}`}>
    {pending && <><LoaderCircle size={13} className="motion-safe:animate-spin" aria-hidden="true" /><span className="sr-only">Opening page…</span></>}
  </span>;
}
