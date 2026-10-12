import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Keep type checking in-process. In this runtime Next's CLI child process can
  // lose TypeScript's --showConfig output even though tsc itself succeeds.
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
