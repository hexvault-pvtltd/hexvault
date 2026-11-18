export default function WorkspaceLoading() {
  return <div role="status" aria-live="polite" aria-busy="true" className="w-full space-y-6">
    <span className="sr-only">Loading page…</span>
    <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
      <div className="h-3 w-28 rounded bg-neutral-200" />
      <div className="h-8 w-56 max-w-full rounded-lg bg-neutral-200" />
      <div className="h-3 w-80 max-w-full rounded bg-neutral-200" />
    </div>
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 motion-safe:animate-pulse">
      {[0, 1, 2, 3].map(key => <div key={key} className="h-28 rounded-2xl border border-neutral-200 bg-white p-5"><div className="h-3 w-20 rounded bg-neutral-100" /><div className="mt-5 h-7 w-12 rounded bg-neutral-100" /></div>)}
    </div>
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 motion-safe:animate-pulse">
      <div className="mb-6 h-4 w-36 rounded bg-neutral-100" />
      {[0, 1, 2, 3, 4].map(key => <div key={key} className="flex gap-6 border-t border-neutral-100 py-5"><div className="h-3 w-2/5 rounded bg-neutral-100" /><div className="h-3 w-1/4 rounded bg-neutral-100" /><div className="ml-auto h-3 w-12 rounded bg-neutral-100" /></div>)}
    </div>
  </div>;
}
