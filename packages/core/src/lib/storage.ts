import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createConnection, Socket } from "node:net";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_CDN_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_SCANNED_FILE_TYPES = [...ALLOWED_DOCUMENT_TYPES, "audio/webm", "audio/ogg", "audio/mp4"] as const;
export class StorageConfigurationError extends Error {}
export class MalwareScannerUnavailableError extends Error {}
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
    s3 = new S3Client({ region: config.region, endpoint: config.endpoint, forcePathStyle: Boolean(config.endpoint), credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  }
  return s3;
}
function signerClient() {
  const config = storageConfig();
  const endpoint = process.env.S3_PUBLIC_ENDPOINT || config.endpoint;
  if (endpoint === config.endpoint) return client();
  if (!browserSigningClient) browserSigningClient = new S3Client({ region: config.region, endpoint, forcePathStyle: Boolean(endpoint), credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  return browserSigningClient;
}
export async function createPrivateUpload(key: string, mimeType: string, maxBytes = MAX_UPLOAD_BYTES) {
  const config = storageConfig();
  return createPresignedPost(signerClient(), { Bucket: config.bucket, Key: key, Expires: 600, Fields: { "Content-Type": mimeType }, Conditions: [["content-length-range", 1, maxBytes], ["eq", "$Content-Type", mimeType]] });
}
export async function readPrivateObject(key: string, maxBytes = MAX_UPLOAD_BYTES) {
  const { bucket } = storageConfig();
  const head = await client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (head.ContentLength === undefined || head.ContentLength < 1 || head.ContentLength > maxBytes) throw new Error("INVALID_OBJECT_SIZE");
  const result = await client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error("OBJECT_BODY_MISSING");
  const bytes = Buffer.from(await result.Body.transformToByteArray());
  if (bytes.length !== head.ContentLength) throw new Error("OBJECT_SIZE_MISMATCH");
  return { bytes, contentLength: head.ContentLength, contentType: head.ContentType ?? "" };
}
export function hasAllowedSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "application/pdf") return Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-";
  if (mimeType === "image/png") return Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/webp") return Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP";
  if (mimeType === "audio/webm") return Buffer.from(bytes.subarray(0, 4)).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (mimeType === "audio/ogg") return Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "OggS";
  if (mimeType === "audio/mp4") return Buffer.from(bytes.subarray(4, 8)).toString("ascii") === "ftyp";
  return false;
}

export async function scanWithClamAv(bytes: Buffer): Promise<"CLEAN" | "INFECTED"> {
  const host = process.env.CLAMAV_HOST;
  const port = Number(process.env.CLAMAV_PORT || "3310");
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) throw new MalwareScannerUnavailableError("Malware scanning is not configured.");
  return new Promise((resolve, reject) => {
    let settled = false;
    let response = "";
    const socket: Socket = createConnection({ host, port });
    const finish = (error?: Error, verdict?: "CLEAN" | "INFECTED") => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error); else resolve(verdict!);
    };
    socket.setTimeout(20_000, () => finish(new MalwareScannerUnavailableError("Malware scanner timed out.")));
    socket.once("error", () => finish(new MalwareScannerUnavailableError("Malware scanner is unavailable.")));
    socket.on("data", chunk => {
      response += chunk.toString("utf8");
      if (!response.includes("\0")) return;
      if (response.includes("FOUND")) finish(undefined, "INFECTED");
      else if (response.includes("OK")) finish(undefined, "CLEAN");
      else finish(new MalwareScannerUnavailableError("Malware scanner returned an unknown response."));
    });
    socket.once("connect", () => {
      socket.write(Buffer.from("zINSTREAM\0", "ascii"));
      for (let offset = 0; offset < bytes.length; offset += 64 * 1024) {
        const part = bytes.subarray(offset, Math.min(offset + 64 * 1024, bytes.length));
        const length = Buffer.alloc(4); length.writeUInt32BE(part.length);
        socket.write(length); socket.write(part);
      }
      socket.write(Buffer.alloc(4));
    });
  });
}

export async function createPrivateDownload(key: string, filename: string, mode: "attachment" | "inline" = "attachment", expiresInSeconds = 60) {
  const { bucket } = storageConfig();
  const safeFilename = filename.replace(/[\r\n"\\]/g, "_").slice(0, 180) || "document";
  const disposition = `${mode}; filename="${safeFilename}"`;
  return getSignedUrl(signerClient(), new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: disposition }), { expiresIn: Math.min(Math.max(expiresInSeconds, 30), 3600) });
}
export async function deletePrivateObject(key: string) {
  const { bucket } = storageConfig();
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
