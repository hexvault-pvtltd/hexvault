export function netWorkMinutes(start: Date, end: Date, breaks: Array<{ start: Date; end: Date }>) {
  if (end < start) throw new RangeError("End time must not be before start time.");
  const duration = end.getTime() - start.getTime();
  const ranges = breaks.map(item => {
    if (item.end < item.start) throw new RangeError("Break end must not be before its start.");
    const from = Math.max(start.getTime(), item.start.getTime());
    const to = Math.min(end.getTime(), item.end.getTime());
    return { from, to };
  }).filter(item => item.to > item.from).sort((a, b) => a.from - b.from);
  let breakMs = 0;
  let active: { from: number; to: number } | null = null;
  for (const range of ranges) {
    if (!active) active = { ...range };
    else if (range.from <= active.to) active.to = Math.max(active.to, range.to);
    else { breakMs += active.to - active.from; active = { ...range }; }
  }
  if (active) breakMs += active.to - active.from;
  return Math.floor(Math.max(0, duration - breakMs) / 60_000);
}

const transitions: Record<string, string[]> = {
  BACKLOG: ["TODO", "CANCELLED"], TODO: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["BLOCKED", "IN_REVIEW", "DONE", "CANCELLED"],
  BLOCKED: ["TODO", "IN_PROGRESS", "CANCELLED"],
  IN_REVIEW: ["IN_PROGRESS", "DONE", "CANCELLED"], DONE: ["IN_PROGRESS"], CANCELLED: ["TODO"],
};
export function canTransitionTask(from: string, to: string) { return transitions[from]?.includes(to) ?? false; }

export function hasEffectiveRole(roles: string[], needed: string[]) { return needed.some(role => roles.includes(role)); }
