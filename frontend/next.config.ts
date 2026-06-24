import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://macropulse-in.vercel.app https://sourabh08.vercel.app;",
          },
          // X-Frame-Options removed — CSP frame-ancestors supersedes it (WR-06)
        ],
      },
    ];
  },
};

export default nextConfig;
