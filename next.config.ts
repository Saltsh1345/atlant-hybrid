import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 blocks dev assets when opened via 127.0.0.1 instead of localhost
  allowedDevOrigins: ["127.0.0.1", "192.168.0.224"],
};

export default nextConfig;
