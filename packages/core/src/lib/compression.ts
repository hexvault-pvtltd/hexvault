import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// Keep exact original bytes. Do not store a gzip wrapper when it costs more.
export async function compressForStorage(bytes: Buffer) {
  const compressed = await gzipAsync(bytes, { level: 9 });
  const worthwhile = compressed.length + 64 < bytes.length;
  return { bytes: worthwhile ? compressed : bytes, encoding: worthwhile ? "gzip" as const : undefined, originalBytes: bytes.length };
}

export async function decompressStoredObject(bytes: Buffer, encoding: string | undefined, maxBytes: number, originalBytes?: string) {
  if (encoding !== "gzip") return bytes;
  if (!originalBytes || !/^\d+$/.test(originalBytes) || Number(originalBytes) < 1 || Number(originalBytes) > maxBytes) throw new Error("INVALID_OBJECT_SIZE");
  const decoded = await gunzipAsync(bytes, { maxOutputLength: maxBytes });
  if (decoded.length !== Number(originalBytes)) throw new Error("OBJECT_SIZE_MISMATCH");
  return decoded;
}
