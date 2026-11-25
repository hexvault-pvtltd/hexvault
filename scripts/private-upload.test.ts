import assert from "node:assert/strict";
import { test } from "node:test";
import { createPrivateUpload } from "../packages/core/src/lib/storage";
import { uploadPrivateFile } from "../apps/web/src/lib/private-upload";

test("R2 signs PUT uploads with exact size, MIME type, and expiry; S3 retains POST", async () => {
  const previous = { ...process.env };
  try {
    Object.assign(process.env, {
      S3_BUCKET: "private-test",
      S3_ACCESS_KEY_ID: "test-access-key",
      S3_SECRET_ACCESS_KEY: "test-secret-key",
      S3_REGION: "auto",
      S3_ENDPOINT: "https://test-account.r2.cloudflarestorage.com",
    });
    delete process.env.S3_PUBLIC_ENDPOINT;
    const upload = await createPrivateUpload("quarantine/test", "application/pdf", 1024, 128);
    const url = new URL(upload.url);
    assert.equal(upload.method, "PUT");
    assert.equal(url.pathname, "/private-test/quarantine/test");
    assert.equal(url.searchParams.get("X-Amz-Expires"), "600");
    // The signer has no file body: an SDK-generated empty-body checksum would
    // incorrectly reject the real file sent later by the browser.
    assert.equal(url.searchParams.get("x-amz-checksum-crc32"), null);
    const signedHeaders = url.searchParams.get("X-Amz-SignedHeaders")!.split(";");
    assert(signedHeaders.includes("content-type"));
    assert(signedHeaders.includes("content-length"));
    assert.equal(upload.headers["Content-Type"], "application/pdf");
    for (const size of [undefined, 0, -1, 1025, 1.5]) {
      await assert.rejects(createPrivateUpload("quarantine/test", "application/pdf", 1024, size), /INVALID_UPLOAD_SIZE/);
    }
    process.env.S3_PUBLIC_ENDPOINT = "https://s3.example.com";
    const post = await createPrivateUpload("quarantine/test", "application/pdf", 1024, 128);
    assert.equal(post.method, "POST");
    const policy = JSON.parse(Buffer.from(post.fields.Policy, "base64").toString());
    assert(policy.conditions.some((condition: unknown) => JSON.stringify(condition) === '["content-length-range",1,1024]'));
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});

test("browser uploads raw bytes with PUT and retains legacy multipart POST", async () => {
  const previousFetch = globalThis.fetch;
  const file = new File(["%PDF-test"], "test.pdf", { type: "application/pdf" });
  const calls: RequestInit[] = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(options!);
    return new Response(null, { status: 200 });
  };
  try {
    await uploadPrivateFile("https://storage.example/upload", { method: "PUT", headers: { "Content-Type": file.type } }, file);
    assert.equal(calls[0].method, "PUT");
    assert.equal(calls[0].body, file);
    assert.deepEqual(calls[0].headers, { "Content-Type": file.type });
    await uploadPrivateFile("https://storage.example/upload", { fields: { key: "quarantine/test" } }, file);
    assert.equal(calls[1].method, "POST");
    const form = calls[1].body as FormData;
    assert.equal(form.get("key"), "quarantine/test");
    assert.equal(await (form.get("file") as File).text(), "%PDF-test");
    globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
    await assert.rejects(uploadPrivateFile("https://storage.example/upload", { method: "PUT" }, file), /Could not connect to private storage/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
