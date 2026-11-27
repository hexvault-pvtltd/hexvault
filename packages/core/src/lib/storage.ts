import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { compressForStorage, decompressStoredObject } from "./compression";
import { DOCUMENT_MIMES, DOCX_MIME } from "../features/documents/formats";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_CDN_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ALLOWED_DOCUMENT_TYPES = [...DOCUMENT_MIMES, "application/zip"] as const;
export const ALLOWED_VERIFIED_FILE_TYPES = [...ALLOWED_DOCUMENT_TYPES, "audio/webm", "audio/ogg", "audio/mp4"] as const;
export class StorageConfigurationError extends Error {}
let s3: S3Client | undefined;
let browserSigningClient: S3Client | undefined;

function storageConfig() {
  const { S3_BUCKET: bucket, S3_ACCESS_KEY_ID: accessKeyId, S3_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
  if (!bucket || !accessKeyId || !secretAccessKey) throw new StorageConfigurationError("Private object storage is not configured.");
  return { bucket, accessKeyId, secretAccessKey, region: process.env.S3_REGION || "us-east-1", endpoint: process.env.S3_ENDPOINT || undefined };
}
function client() {
  if (!s3) {
    const config = storageConfig();
    s3 = new S3Client({ region: config.region, endpoint: config.endpoint, forcePathStyle: Boolean(config.endpoint), requestChecksumCalculation: "WHEN_REQUIRED", credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  }
  return s3;
}
function signerClient() {
  const config = storageConfig();
  const endpoint = process.env.S3_PUBLIC_ENDPOINT || config.endpoint;
  if (endpoint === config.endpoint) return client();
  if (!browserSigningClient) browserSigningClient = new S3Client({ region: config.region, endpoint, forcePathStyle: Boolean(endpoint), requestChecksumCalculation: "WHEN_REQUIRED", credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  return browserSigningClient;
}
export async function createPrivateUpload(key: string, mimeType: string, maxBytes = MAX_UPLOAD_BYTES, sizeBytes?: number) {
  const config = storageConfig();
  const endpoint = process.env.S3_PUBLIC_ENDPOINT || config.endpoint;
  const isR2 = endpoint && new URL(endpoint).hostname.endsWith(".r2.cloudflarestorage.com");
  if (isR2) {
    // R2 does not implement S3's browser form POST. Sign the exact size and
    // MIME type; the browser sets Content-Length from the raw File body.
    if (!sizeBytes || !Number.isSafeInteger(sizeBytes) || sizeBytes > maxBytes || sizeBytes < 1) throw new Error("INVALID_UPLOAD_SIZE");
    const url = await getSignedUrl(signerClient(), new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: mimeType, ContentLength: sizeBytes }), { expiresIn: 600, signableHeaders: new Set(["content-type", "content-length"]) });
    return { url, method: "PUT" as const, headers: { "Content-Type": mimeType }, fields: {} as Record<string, string> };
  }
  const post = await createPresignedPost(signerClient(), { Bucket: config.bucket, Key: key, Expires: 600, Fields: { "Content-Type": mimeType }, Conditions: [["content-length-range", 1, maxBytes], ["eq", "$Content-Type", mimeType]] });
  return { ...post, method: "POST" as const, headers: {} as Record<string, string> };
}
export async function readPrivateObject(key: string, maxBytes = MAX_UPLOAD_BYTES) {
  const { bucket } = storageConfig();
  const head = await client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (head.ContentLength === undefined || head.ContentLength < 1 || head.ContentLength > maxBytes) throw new Error("INVALID_OBJECT_SIZE");
  const result = await client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error("OBJECT_BODY_MISSING");
  const stored = Buffer.from(await result.Body.transformToByteArray());
  if (stored.length !== head.ContentLength) throw new Error("OBJECT_SIZE_MISMATCH");
  const encoding = head.Metadata?.["hv-optimized"] === "1" ? head.ContentEncoding : undefined;
  const bytes = await decompressStoredObject(stored, encoding, maxBytes, head.Metadata?.["hv-original-bytes"]);
  return { bytes, contentLength: bytes.length, storedLength: stored.length, optimized: head.Metadata?.["hv-optimized"] === "1", contentType: head.ContentType ?? "" };
}
export function hasAllowedSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "application/zip" || mimeType === DOCX_MIME) return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  if (mimeType === "application/pdf") return Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-";
  if (mimeType === "image/png") return Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/webp") return Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP";
  if (mimeType === "audio/webm") return Buffer.from(bytes.subarray(0, 4)).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (mimeType === "audio/ogg") return Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "OggS";
  if (mimeType === "audio/mp4") return Buffer.from(bytes.subarray(4, 8)).toString("ascii") === "ftyp";
  return false;
}

export async function createPrivateDownload(key: string, filename: string, mode: "attachment" | "inline" = "attachment", expiresInSeconds = 60) {
  const { bucket } = storageConfig();
  const safeFilename = filename.replace(/[\r\n"\\]/g, "_").slice(0, 180) || "document";
  const disposition = `${mode}; filename="${safeFilename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`;
  return getSignedUrl(signerClient(), new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: disposition }), { expiresIn: Math.min(Math.max(expiresInSeconds, 30), 3600) });
}
export async function deletePrivateObject(key: string) {
  const { bucket } = storageConfig();
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function writePrivateObject(key: string, bytes: Buffer, contentType: string) {
  const { bucket } = storageConfig();
  // Media players seek using byte ranges. Keep their stored representation
  // seekable rather than wrapping it in a whole-file compression stream.
  const encoded = /^(audio|video)\//i.test(contentType)
    ? { bytes, encoding: undefined, originalBytes: bytes.length }
    : await compressForStorage(bytes);
  await client().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: encoded.bytes, ContentType: contentType,
    ContentEncoding: encoded.encoding, Metadata: { "hv-optimized": "1", "hv-original-bytes": String(bytes.length) } }));
  return { originalBytes: bytes.length, storedBytes: encoded.bytes.length, encoding: encoded.encoding ?? "identity" };
}
