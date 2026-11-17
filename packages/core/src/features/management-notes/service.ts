import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@core/lib/db";

const key = () => {
  const secret = process.env.NOTES_ENCRYPTION_KEY ?? (process.env.NODE_ENV === "production" ? undefined : process.env.AUTH_SECRET);
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error("NOTES_ENCRYPTION_KEY must contain at least 32 bytes.");
  return createHash("sha256").update(secret).digest();
};

export function encryptNoteContent(content: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(content, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function decryptNoteContent(value: string) {
  const [version, iv, tag, ciphertext] = value.split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Unsupported encrypted management note format.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export class ManagementNoteError extends Error {
  constructor(public status: 403 | 404, public code: "FORBIDDEN" | "NOT_FOUND", message: string) { super(message); }
}

type NoteInput = { category: string; content: string; followUpAt?: string | null };
type NoteUpdate = { category?: string; content?: string; followUpAt?: string | null };

async function assertOwner(tx: Prisma.TransactionClient, actorId: string) {
  const assignment = await tx.userRole.findFirst({ where: { userId: actorId, revokedAt: null, role: { code: "OWNER" } }, select: { id: true } });
  if (!assignment) throw new ManagementNoteError(403, "FORBIDDEN", "Owner access is required for management notes.");
}

export async function getOwnerNote(noteId: string, actorId: string) {
  return db.$transaction(async tx => {
    await assertOwner(tx, actorId);
    const note = await tx.managementNote.findUnique({ where: { id: noteId } });
    if (!note) throw new ManagementNoteError(404, "NOT_FOUND", "Management note not found.");
    await tx.auditLog.create({ data: { actorId, action: "management_note.read", resourceType: "management_note", resourceId: noteId } });
    return { ...note, content: decryptNoteContent(note.content) };
  });
}

export async function listOwnerNotes(employeeId: string, actorId: string) {
  return db.$transaction(async tx => {
    await assertOwner(tx, actorId);
    const employee = await tx.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!employee) throw new ManagementNoteError(404, "NOT_FOUND", "Employee not found.");
    const notes = await tx.managementNote.findMany({ where: { employeeId }, orderBy: [{ followUpAt: "asc" }, { createdAt: "desc" }] });
    await tx.auditLog.create({ data: { actorId, action: "management_note.listed", resourceType: "employee_management_notes", resourceId: employeeId, metadata: { count: notes.length } } });
    return notes.map(note => ({ ...note, content: decryptNoteContent(note.content) }));
  });
}

export async function createOwnerNote(employeeId: string, actorId: string, input: NoteInput) {
  return db.$transaction(async tx => {
    await assertOwner(tx, actorId);
    const employee = await tx.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!employee) throw new ManagementNoteError(404, "NOT_FOUND", "Employee not found.");
    const note = await tx.managementNote.create({ data: { employeeId, authorId: actorId, category: input.category, content: encryptNoteContent(input.content), visibility: "OWNER", followUpAt: input.followUpAt ? new Date(input.followUpAt) : null } });
    await tx.auditLog.create({ data: { actorId, action: "management_note.created", resourceType: "management_note", resourceId: note.id } });
    return { ...note, content: input.content };
  });
}

export async function updateOwnerNote(noteId: string, actorId: string, input: NoteUpdate) {
  return db.$transaction(async tx => {
    await assertOwner(tx, actorId);
    const note = await tx.managementNote.findUnique({ where: { id: noteId } });
    if (!note) throw new ManagementNoteError(404, "NOT_FOUND", "Management note not found.");
    const data = {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.content !== undefined ? { content: encryptNoteContent(input.content) } : {}),
      ...(input.followUpAt !== undefined ? { followUpAt: input.followUpAt ? new Date(input.followUpAt) : null } : {}),
    };
    if (input.content !== undefined) await tx.managementNoteRevision.create({ data: { noteId, editorId: actorId, previousContent: note.content } });
    const updated = await tx.managementNote.update({ where: { id: noteId }, data });
    await tx.auditLog.create({ data: { actorId, action: "management_note.updated", resourceType: "management_note", resourceId: noteId, metadata: { contentChanged: input.content !== undefined } } });
    return { ...updated, content: input.content ?? decryptNoteContent(updated.content) };
  });
}

export async function listOwnerNoteRevisions(noteId: string, actorId: string) {
  return db.$transaction(async tx => {
    await assertOwner(tx, actorId);
    const note = await tx.managementNote.findUnique({ where: { id: noteId }, select: { id: true } });
    if (!note) throw new ManagementNoteError(404, "NOT_FOUND", "Management note not found.");
    const revisions = await tx.managementNoteRevision.findMany({ where: { noteId }, orderBy: { editedAt: "desc" } });
    await tx.auditLog.create({ data: { actorId, action: "management_note.revisions_read", resourceType: "management_note", resourceId: noteId, metadata: { count: revisions.length } } });
    return revisions.map(revision => ({ ...revision, previousContent: decryptNoteContent(revision.previousContent) }));
  });
}
