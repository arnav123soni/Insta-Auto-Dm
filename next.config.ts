import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: "/automations",
        destination: "/campaigns",
        permanent: true,
      },
      {
        source: "/automations/new",
        destination: "/campaigns/new",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
