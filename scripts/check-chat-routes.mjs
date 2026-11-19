// Run against a local web or API server after building:
// node --test scripts/check-chat-routes.mjs
// CHAT_TEST_ORIGIN=http://localhost:4000 node --test scripts/check-chat-routes.mjs
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../packages/core/src/features/chat/", import.meta.url));
const origin = process.env.CHAT_TEST_ORIGIN ?? "http://localhost:3000";
const id = "00000000-0000-0000-0000-000000000001";

async function routes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? routes(filename) : entry.name === "route.ts" ? [filename] : [];
  }));
  return nested.flat();
}

for (const filename of await routes(root)) {
  const relative = path.relative(root, filename).split(path.sep).join("/");
  const url = "/api/v1/chat/" + relative.replace(/\/route\.ts$/, "").replace(/\[[^\]]+\]/g, id);
  const source = await readFile(filename, "utf8");
  for (const match of source.matchAll(/export async function (GET|POST|PATCH|DELETE|PUT)\(/g)) {
    const method = match[1];
    test(`${method} ${url} exists and requires authentication`, async () => {
      const response = await fetch(new URL(url, origin), { method, redirect: "manual", signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, 401, "Expected the chat handler's 401, not a missing route or proxy error");
      const body = await response.json();
      assert.equal(body.error.code, "UNAUTHENTICATED");
    });
  }
}
