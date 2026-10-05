import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The dev server is opened via 127.94.0.1; without this, Next blocks its dev
  // resources from that host and the page never hydrates (buttons do nothing).
  allowedDevOrigins: ["127.94.0.1"],
};

export default nextConfig;
