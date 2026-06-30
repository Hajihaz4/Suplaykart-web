import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile the workspace DB package (ships TypeScript source).
  transpilePackages: ["@suplaykart/db"],
  // Keep node-postgres out of the bundle (native/server-only dependency).
  serverExternalPackages: ["pg"],
  // Portable build artifact (per ADR 0001), even though Vercel is the default host.
  output: "standalone",
};

export default nextConfig;
