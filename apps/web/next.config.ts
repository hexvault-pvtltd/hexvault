import type { NextConfig } from "next";
import path from "node:path";
const root = path.resolve(process.cwd(), "../..");
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: root,
  transpilePackages: ["@hexvault/core"],
  // Local development uses the separately running API app. Vercel Services
  // routes /api/* to the API service before requests reach this Next.js app.
  rewrites: process.env.VERCEL ? undefined : async () => [{ source: "/api/:path*", destination: `${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/api/:path*` }],
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
