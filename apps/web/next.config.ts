import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile the workspace DB package (ships TypeScript source).
  transpilePackages: ["@suplaykart/db"],
  // Portable build artifact (per ADR 0001), even though Vercel is the default host.
  output: "standalone",
};

export default nextConfig;
