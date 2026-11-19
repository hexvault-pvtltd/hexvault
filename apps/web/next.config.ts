import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";
const root = path.resolve(process.cwd(), "../..");
loadEnvConfig(root);
const apiInternalUrl = process.env.API_INTERNAL_URL
  ?? (process.env.API_INTERNAL_HOSTPORT ? `http://${process.env.API_INTERNAL_HOSTPORT}` : "http://localhost:4000");
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: root,
  transpilePackages: ["@hexvault/core"],
  // A standalone web deployment can forward missing API routes to Render.
  // Root Vercel Services deployments route API requests before reaching web.
  // Local route handlers take precedence over this fallback.
  rewrites: process.env.VERCEL && !process.env.API_INTERNAL_URL && !process.env.API_INTERNAL_HOSTPORT
    ? undefined
    : async () => ({ fallback: [{ source: "/api/:path*", destination: `${apiInternalUrl.replace(/\/$/, "")}/api/:path*` }] }),
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(process.cwd(), "src"),
      "@core": path.resolve(root, "packages/core/src")
    };
    return config;
  },
  turbopack: { root }
};
export default nextConfig;
