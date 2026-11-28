export type LetterActor = { id: string; roles: readonly string[] };
export class LetterError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const isLetterAdmin = (actor: LetterActor) => actor.roles.some(role => ["OWNER", "HR"].includes(role));
export function assertLetterAccess(actor: LetterActor, letter: { createdBy: string }) {
  if (!isLetterAdmin(actor) && letter.createdBy !== actor.id) throw new LetterError(403, "You can only access your own letters.");
}
export function nextLetterStatus(actor: LetterActor, status: string, action: string) {
  if (action === "APPROVE" || action === "RETURN") {
    if (!actor.roles.includes("OWNER")) throw new LetterError(403, "Only the owner can approve or return a letter.");
    if (status !== "PENDING_APPROVAL") throw new LetterError(409, "This letter is no longer awaiting owner approval.");
    return action === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED";
  }
  if (action === "SUBMIT") {
    if (!["DRAFT", "CHANGES_REQUESTED"].includes(status)) throw new LetterError(409, "Only a draft or returned letter can be submitted.");
    return "PENDING_APPROVAL";
  }
  if (action === "SHARE") {
    if (!actor.roles.includes("HR")) throw new LetterError(403, "Only HR can share approved letters.");
    if (status !== "APPROVED") throw new LetterError(409, "Owner approval is required before sharing this letter.");
    return "APPROVED";
  }
  throw new LetterError(422, "Unknown letter action.");
}
