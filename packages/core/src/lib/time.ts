export function companyWorkDate(now = new Date()) {
  const timeZone = process.env.COMPANY_TIMEZONE ?? "Asia/Kolkata";
  const date = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return new Date(`${date}T00:00:00.000Z`);
}

export function localShiftStart(workDate: Date, localTime: string, timeZone: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(localTime);
  if (!match) return null;
  const year = workDate.getUTCFullYear(); const month = workDate.getUTCMonth(); const day = workDate.getUTCDate();
  const hour = Number(match[1]); const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const wanted = Date.UTC(year, month, day, hour, minute);
  let candidate = wanted;
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    for (let attempt = 0; attempt < 2; attempt++) {
      const values = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map(part => [part.type, part.value]));
      const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
      candidate += wanted - represented;
    }
    return new Date(candidate);
  } catch {
    return null;
  }
}
