import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://sourabh08.vercel.app https://*.sourabh08.vercel.app;",
          },
          {
            key: "X-Frame-Options",
            value: "ALLOW-FROM https://sourabh08.vercel.app",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
