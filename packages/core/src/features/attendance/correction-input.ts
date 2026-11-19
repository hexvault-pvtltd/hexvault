import { z } from "zod";
import { companyWorkDate, localShiftStart } from "../../lib/time";

export function correctionTime(value: string, timeZone = process.env.COMPANY_TIMEZONE ?? "Asia/Kolkata") {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    const date = localShiftStart(new Date(value.slice(0, 10)), value.slice(11), timeZone);
    if (!date) return null;
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` === value ? date : null;
  }
  const valid = z.iso.datetime({ offset: true }).safeParse(value);
  return valid.success ? new Date(value) : null;
}
const time = z.string().transform((value, context) => {
  const date = correctionTime(value);
  if (date) return date;
  context.addIssue({ code: "custom", message: "Enter a valid time in the company timezone." });
  return z.NEVER;
});
export const correctionRequestSchema = z.object({
  workDate: z.iso.date().transform(value => new Date(value)),
  sessionId: z.string().uuid().optional(),
  checkInAt: time.optional(), checkOutAt: time.optional(), reason: z.string().trim().min(5).max(1000),
}).strict().refine(value => value.checkInAt || value.checkOutAt, "Provide a corrected check-in or check-out time.")
  .refine(value => !(value.checkInAt instanceof Date) || !(value.workDate instanceof Date) || companyWorkDate(value.checkInAt).getTime() === value.workDate.getTime(), { message: "Check-in must fall on the selected work date in the company timezone.", path: ["checkInAt"] })
  .refine(value => !value.checkInAt || !value.checkOutAt || value.checkOutAt > value.checkInAt, { message: "Check-out must be after check-in.", path: ["checkOutAt"] });
