import type { NextConfig } from "next";
import path from "node:path";
const root = path.resolve(process.cwd(), "../..");
const nextConfig: NextConfig = { output: "standalone", outputFileTracingRoot: root, transpilePackages: ["@hexvault/core"], turbopack: { root } };
export default nextConfig;
