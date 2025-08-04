import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOW-FROM https://warpcast.com",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; connect-src 'self' https: wss: blob: https://api.farcaster.xyz https://farcaster.xyz https://client.farcaster.xyz https://warpcast.com https://client.warpcast.com https://privy.farcaster.xyz https://privy.warpcast.com https://auth.privy.io https://rpc.privy.systems https://cloudflareinsights.com https://api.neynar.com; frame-src 'self' https: https://warpcast.com https://farcaster.xyz; frame-ancestors 'self' https://warpcast.com https://farcaster.xyz; object-src 'none'; base-uri 'self'; form-action 'self';",
          },
          {
            key: "X-Farcaster-App-Type",
            value: "miniapp",
          },
          {
            key: "X-Farcaster-App-Name",
            value: "Unfollow App",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
