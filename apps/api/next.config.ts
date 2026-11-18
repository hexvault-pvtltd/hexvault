import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";
const root = path.resolve(process.cwd(), "../..");
loadEnvConfig(root);
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: root,
  transpilePackages: ["@hexvault/core"],
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
