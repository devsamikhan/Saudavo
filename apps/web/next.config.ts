import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@saudavo/contracts"],
  async rewrites() {
    const proxyTarget = process.env.API_PROXY_TARGET?.trim().replace(/\/+$/g, "");
    if (!proxyTarget) {
      return [];
    }
    return [
      {
        source: "/api/v1/:path*",
        destination: `${proxyTarget}/api/v1/:path*`
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, max-age=0"
          }
        ]
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
