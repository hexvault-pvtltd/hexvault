type Actor = { id: string; roles: string[]; employee?: { id: string } | null };
type ProtectedDocument = { employeeId: string; visibility: string };
export function canReadDocument(actor: Actor, document: ProtectedDocument) {
  if (actor.roles.includes("OWNER")) return true;
  if (document.visibility === "OWNER") return false;
  if (actor.roles.includes("HR")) return true;
  return document.visibility === "SELF" && actor.employee?.id === document.employeeId;
}
export function canManageDocument(actor: Actor, document: ProtectedDocument) {
  if (actor.roles.includes("OWNER")) return true;
  if (actor.roles.includes("HR")) return document.visibility !== "OWNER";
  return document.visibility === "SELF" && actor.employee?.id === document.employeeId;
}
export function canUploadForEmployee(actor: Actor, employeeId: string) {
  if (actor.roles.some(role => ["OWNER", "HR"].includes(role))) return true;
  return Boolean(actor.employee?.id === employeeId && actor.roles.some(role => ["STAFF", "INTERN"].includes(role)));
}
