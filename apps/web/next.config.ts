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
  // Local development uses the separately running API app. Vercel Services
  // routes /api/* to the API service before requests reach this Next.js app.
  rewrites: process.env.VERCEL ? undefined : async () => [{ source: "/api/:path*", destination: `${apiInternalUrl}/api/:path*` }],
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
