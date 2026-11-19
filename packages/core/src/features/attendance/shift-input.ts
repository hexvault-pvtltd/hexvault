import { z } from "zod";

export const shiftTimeZone = z.string().trim().min(3).max(80).refine(value => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date(0)); return true; }
  catch { return false; }
}, "Enter a valid timezone such as Asia/Kolkata.");
const day = z.union([z.iso.date(), z.iso.datetime({ offset: true })]).transform(value => new Date(value.slice(0, 10)));
export const shiftAssignmentSchema = z.object({
  employeeId: z.string().uuid(), shiftId: z.string().uuid(), validFrom: day,
  validTo: z.preprocess(value => value === "" ? undefined : value, day.optional()),
}).strict().refine(value => !(value.validTo instanceof Date) || !(value.validFrom instanceof Date) || value.validTo >= value.validFrom, { message: "End date must be on or after the start date.", path: ["validTo"] });
export const shiftEndSchema = z.object({ validTo: day }).strict();
