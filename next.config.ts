import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Image optimization
  images: {
    domains: [
      'imagedelivery.net',
      'i.seadn.io',
      'i.imgur.com',
      'lh3.googleusercontent.com',
      'supercast.mypinata.cloud',
      'tba-mobile.mypinata.cloud'
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers
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
            value: "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob: https://imagedelivery.net https://i.seadn.io https://i.imgur.com https://lh3.googleusercontent.com https://supercast.mypinata.cloud https://tba-mobile.mypinata.cloud; connect-src 'self' https: wss: blob: https://api.farcaster.xyz https://farcaster.xyz https://client.farcaster.xyz https://warpcast.com https://client.warpcast.com https://privy.farcaster.xyz https://privy.warpcast.com https://auth.privy.io https://rpc.privy.systems https://cloudflareinsights.com https://api.neynar.com https://explorer-api.walletconnect.com https://relay.walletconnect.com https://relay.walletconnect.org https://*.walletconnect.com https://*.walletconnect.org https://*.walletconnect.io https://*.datadoghq.com https://*.datadog.com https://browser-intake-datad0g.com https://public-trace-http-intake.logs.datadoghq.com https://rum-http-intake.logs.datadoghq.com; frame-src 'self' https: https://warpcast.com https://farcaster.xyz https://*.walletconnect.com https://*.walletconnect.org https://*.walletconnect.io https://*.datadoghq.com; frame-ancestors 'self' https://warpcast.com https://farcaster.xyz; object-src 'none'; base-uri 'self'; form-action 'self';",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "https://warpcast.com",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "X-Farcaster-App-Type",
            value: "miniapp",
          },
          {
            key: "X-Farcaster-App-Name",
            value: "Feed Cleaner",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
