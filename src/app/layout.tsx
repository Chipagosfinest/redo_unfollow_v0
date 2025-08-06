import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import ErrorBoundary from "@/components/ErrorBoundary"

const inter = Inter({ subsets: ["latin"] })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://redounfollowv0.vercel.app"

// Farcaster Mini App embed metadata for social sharing
const miniAppEmbed = {
  version: "2.0.0",
  imageUrl: "/unfollow-icon.png",
  button: {
    title: "🧹 Farcaster Cleanup",
    action: {
      type: "launch_miniapp",
      url: `${APP_URL}/farcaster-cleanup`,
      name: "Farcaster Cleanup",
      splashImageUrl: "/unfollow-icon.png",
      splashBackgroundColor: "#f9fafb",
    },
  },
}

export const metadata: Metadata = {
  title: "Farcaster Cleanup - Comprehensive Management Suite",
  description: "Comprehensive Farcaster management suite with smart cleanup, analytics dashboard, whitelist protection, and bulk unfollow operations",
  keywords: ["farcaster", "cleanup", "unfollow", "analytics", "whitelist", "social", "management"],
  authors: [{ name: "alec.eth" }],
  creator: "alec.eth",
  publisher: "Farcaster Cleanup",
  icons: {
    icon: "/unfollow-icon.png",
    apple: "/unfollow-icon.png",
    shortcut: "/unfollow-icon.png",
  },
  openGraph: {
    title: "Farcaster Cleanup - Comprehensive Management Suite",
    description: "Clean up your Farcaster following list with smart filters, analytics dashboard, whitelist protection, and bulk unfollow operations",
    url: APP_URL,
    siteName: "Farcaster Cleanup",
    images: [
      {
        url: "/unfollow-icon.png",
        width: 400,
        height: 400,
        alt: "Farcaster Cleanup - Comprehensive Management Suite",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Farcaster Cleanup - Comprehensive Management Suite",
    description: "Clean up your Farcaster following list with smart filters, analytics dashboard, whitelist protection, and bulk unfollow operations",
    images: ["/unfollow-icon.png"],
    creator: "@aleceth",
  },
  // Farcaster Mini App embed metadata (for social sharing)
  other: {
    "fc:miniapp": JSON.stringify(miniAppEmbed),
    "fc:frame": JSON.stringify({
      ...miniAppEmbed,
      button: {
        ...miniAppEmbed.button,
        action: {
          ...miniAppEmbed.button.action,
          type: "launch_frame", // backward compatibility
        },
      },
    }),
    "fc:app": JSON.stringify({
      name: "Farcaster Cleanup",
      description: "Comprehensive Farcaster management suite",
      icon: "🧹",
      url: `${APP_URL}/farcaster-cleanup`,
      verified: true,
    }),
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="farcaster-manifest" href="/farcaster-manifest.json" />
        <link rel="preconnect" href="https://auth.farcaster.xyz" />
        <link rel="preconnect" href="https://api.neynar.com" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Farcaster Cleanup" />
        <meta name="application-name" content="Farcaster Cleanup" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        {/* Farcaster Mini App specific meta tags */}
        <meta name="farcaster:app" content="Farcaster Cleanup" />
        <meta name="farcaster:version" content="2.0.0" />
        <meta name="farcaster:verified" content="true" />
        <meta name="farcaster:category" content="social" />
        <meta name="farcaster:tags" content="farcaster,unfollow,cleanup,analytics,whitelist,social,management" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}
