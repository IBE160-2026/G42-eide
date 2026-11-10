import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Keep `next dev` from generating an unreviewed AGENTS.md (the starter ran with --no-agents-md).
  agentRules: false,
};

export default nextConfig;
