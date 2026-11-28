import type { LetterContent } from "@core/features/letters/content";

export type LetterEditorDraft = { content: LetterContent; documentId: string | null; revision: number | null; templateId: string; templateName: string; values: Record<string, string> };
type StoredDraft = { savedAt: number; draft: LetterEditorDraft };
async function storage() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("hexvault-letter-editor", 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("drafts"); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Unable to preserve this letter in this browser. Allow site storage before leaving to create an employee."));
  });
}
export async function saveLetterEditorDraft(userId: string, draft: LetterEditorDraft) {
  const database = await storage();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("drafts", "readwrite");
      transaction.objectStore("drafts").put({ savedAt: Date.now(), draft } satisfies StoredDraft, userId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(new Error("The letter could not be preserved. Free some browser storage before creating an employee."));
    });
  } finally { database.close(); }
}
export async function loadLetterEditorDraft(userId: string): Promise<LetterEditorDraft | null> {
  const database = await storage();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction("drafts", "readonly").objectStore("drafts").get(userId);
      request.onsuccess = () => {
        const stored = request.result as StoredDraft | undefined;
        resolve(stored && Date.now() - stored.savedAt < 24 * 60 * 60 * 1000 ? stored.draft : null);
      };
      request.onerror = () => reject(new Error("Unable to restore the letter from this browser."));
    });
  } finally { database.close(); }
}
export async function clearLetterEditorDraft(userId: string) {
  const database = await storage();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("drafts", "readwrite");
      transaction.objectStore("drafts").delete(userId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(new Error("Unable to clear the restored draft."));
    });
  } finally { database.close(); }
}
