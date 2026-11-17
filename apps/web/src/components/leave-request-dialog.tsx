"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { V4Modal } from "@/components/v4";
import { LeaveRequestForm } from "@/components/leave-request-form";

export function LeaveRequestDialog({ types }: { types: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#ff794f] px-4 text-xs font-semibold text-white transition hover:bg-[#f16a40]"><Plus size={15}/> Request leave</button><V4Modal open={open} onClose={() => setOpen(false)} title="Request time off"><LeaveRequestForm types={types} onSuccess={() => setOpen(false)}/></V4Modal></>;
}
