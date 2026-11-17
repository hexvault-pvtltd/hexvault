"use client";

import type { ReactNode } from "react";
import { Inbox, Search, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";

export function V4PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div className="min-w-0">{eyebrow && <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-[#898989]">{eyebrow}</p>}<h1 className="text-[25px] font-semibold tracking-[-.04em] text-[#25251f]">{title}</h1>{description && <p className="mt-1.5 max-w-2xl text-xs leading-5 text-[#898989]">{description}</p>}</div>{actions && <div className="flex items-center gap-2">{actions}</div>}</div>;
}

export function V4MetricCard({ label, value, caption, icon, tone = "neutral" }: { label: string; value: ReactNode; caption?: string; icon?: ReactNode; tone?: "neutral" | "orange" | "green" | "blue" }) {
  void tone;
  return <article className="rounded-[18px] border border-[#e8e8e8] bg-white p-4 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,.045)] sm:p-4"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-medium text-[#777]">{label}</p>{icon && <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f1f1f1] text-[#333]">{icon}</span>}</div><p className="mt-3 text-[25px] font-semibold tracking-[-.04em] text-[#171717]">{value}</p>{caption && <p className="mt-1 text-[10px] leading-4 text-[#858585]">{caption}</p>}</article>;
}

export function V4DashboardGrid({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>{children}</section>; }

export function V4StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "error" | "accent" }) {
  const colors = { neutral: "bg-[#f1f1ef] text-[#686862]", success: "bg-[#edf7f1] text-[#238653]", warning: "bg-[#fcf5e8] text-[#a9761d]", error: "bg-[#fff0f0] text-[#bd4444]", accent: "bg-[#fff0ea] text-[#c75534]" };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold ${colors[tone]}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{children}</span>;
}

export function V4EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) { return <div className="flex min-h-36 flex-col items-center justify-center px-5 py-8 text-center"><span className="mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-[#f5f5f4] text-[#777]"><Inbox size={17}/></span><p className="text-xs font-semibold text-[#4d4d47]">{title}</p>{description && <p className="mt-1 max-w-sm text-[10px] leading-4 text-[#898989]">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>; }

export function V4Search({ value, onChange, placeholder = "Search" }: { value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="flex h-9 items-center gap-2 rounded-xl border border-[#ececea] bg-white px-3 text-[#898989] focus-within:border-[#ffb29a]"><Search size={14}/><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 bg-transparent text-[11px] text-[#25251f] outline-none placeholder:text-[#aaa9a3]"/></label>; }

export function V4Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')?.focus();
    return () => previous?.focus();
  }, [open]);
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const items = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
    if (!items?.length) { event.preventDefault(); return; }
    const first = items[0]; const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  if (!open) return null;
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#171816]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} onKeyDown={handleKeyDown} role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-[24px] sm:p-6"><header className="mb-5 flex items-center justify-between"><h2 className="text-base font-semibold tracking-tight text-[#25251f]">{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl bg-[#f5f5f4] text-[#686862]"><X size={16}/></button></header>{children}</section></div>;
}

export function V4FormDrawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')?.focus();
    return () => previous?.focus();
  }, [open]);
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const items = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
    if (!items?.length) { event.preventDefault(); return; }
    const first = items[0]; const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  if (!open) return null;
  return <div className="fixed inset-0 z-[70] bg-black/30" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} onKeyDown={handleKeyDown} role="dialog" aria-modal="true" aria-label={title} className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7"><header className="mb-6 flex items-center justify-between"><h2 className="text-base font-semibold">{title}</h2><button type="button" aria-label="Close drawer" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl bg-[#f5f5f4]"><X size={16}/></button></header>{children}</section></div>;
}

export function V4DatePicker(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) { return <input {...props} type="date" className={`h-10 rounded-xl border border-[#ececea] bg-white px-3 text-xs outline-none focus:border-[#ff9b79] ${props.className ?? ""}`}/>; }

export function V4DataTable({ headers, children }: { headers: string[]; children: ReactNode }) { return <div className="overflow-x-auto rounded-[18px] border border-[#ececea] bg-white"><table className="w-full min-w-[640px] border-collapse text-left"><thead className="bg-[#f8f8f6] text-[9px] font-semibold uppercase tracking-[.12em] text-[#898989]"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-[#f0f0ed] text-xs">{children}</tbody></table></div>; }

export function V4ActivityTimeline({ items }: { items: Array<{ title: string; detail?: string; time?: string }> }) { return <ol className="space-y-4">{items.map((item, index) => <li key={`${item.title}-${index}`} className="flex gap-3"><span className="relative mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-[#fff0ea] after:h-1.5 after:w-1.5 after:rounded-full after:bg-[#ff794f]"/><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-[#45453f]">{item.title}</p>{item.detail && <p className="mt-1 text-[10px] leading-4 text-[#898989]">{item.detail}</p>}</div>{item.time && <time className="shrink-0 text-[9px] text-[#a3a39d]">{item.time}</time>}</li>)}</ol>; }

export function V4NotificationPopover({ children }: { children: ReactNode }) { return <div className="rounded-[18px] border border-[#ececea] bg-white p-4">{children}</div>; }
