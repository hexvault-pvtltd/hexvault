"use client";

import { useEffect, useState } from "react";

type Balance = {
  employee: { id: string; employeeCode: string; fullName: string };
  leaveType: { name: string };
  year: number;
  opening: number;
  accrued: number;
  used: number;
  adjusted: number;
  remaining: number | null;
};

export function LeaveBalanceList() {
  const [items, setItems] = useState<Balance[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/leave/balances?year=${year}`)
      .then(async (response) => {
        const body = await response.json();
        if (!active) return;
        if (response.ok) setItems(body.data.items);
        else setError(body.error?.message ?? "Unable to load balances.");
      })
      .catch(() => {
        if (active) setError("Unable to load leave balances. Check your connection and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [year]);

  return (
    <section aria-labelledby="leave-balances-title" className="mb-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="leave-balances-title" className="text-sm font-semibold">Leave balances</h2>
          <p className="mt-1 text-xs text-slate-500">Current balance by employee and leave type for {year}.</p>
        </div>
      </div>
      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-white p-5 text-sm text-rose-700">{error}</div>
      ) : loading ? (
        <div aria-label="Loading leave balances" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => <div key={key} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
        </div>
      ) : items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={`${item.employee.id}-${item.leaveType.name}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.employee.fullName}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{item.employee.employeeCode} <span aria-hidden="true">·</span> {item.leaveType.name}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#fff1e9] px-2.5 py-1 text-[10px] font-semibold text-[#c74410]">{item.year}</span>
              </div>
              <div className="mt-5 flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Remaining</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{item.remaining === null ? "—" : item.remaining}<span className="ml-1 text-xs font-normal text-slate-500">{item.remaining === null ? "No annual cap" : item.remaining === 1 ? "day" : "days"}</span></p>
                </div>
                <div className="text-right text-[11px] leading-5 text-slate-500">Opening {item.opening}<br />Used {item.used}</div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-xs text-slate-500">No balances available for your scope.</div>
      )}
    </section>
  );
}
