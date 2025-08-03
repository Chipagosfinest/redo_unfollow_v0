import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.farcaster.xyz https://farcaster.xyz"
          },
          {
            key: 'X-Farcaster-App-Type',
            value: 'miniapp'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
