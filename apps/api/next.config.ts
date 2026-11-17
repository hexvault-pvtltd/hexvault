import type { NextConfig } from "next";
import path from "node:path";
const root = path.resolve(process.cwd(), "../..");
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: root,
  transpilePackages: ["@hexvault/core"],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@core": path.resolve(root, "packages/core/src")
    };
    return config;
  },
  turbopack: { root }
};
export default nextConfig;
