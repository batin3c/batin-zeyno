import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.4", "localhost", "127.0.0.1"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    // keep RSC payloads in client cache so tab switches feel instant
    staleTimes: {
      dynamic: 120,
      static: 300,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vpczoygfaeurizkfqnba.supabase.co",
      },
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
