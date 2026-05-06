import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${process.env.TAPADDIS_API_BASE ?? "http://localhost:3000"}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
