import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://redounfollowv0.vercel.app"

// Farcaster Mini App embed metadata for social sharing
const miniAppEmbed = {
  version: "1",
  imageUrl: "/unfollow-icon.png",
  button: {
    title: "🧹 Clean Following",
    action: {
      type: "launch_miniapp",
      url: APP_URL,
      name: "Unfollow Tool",
      splashImageUrl: "/unfollow-icon.png",
      splashBackgroundColor: "#f9fafb",
    },
  },
}

export const metadata: Metadata = {
  title: "Farcaster Cleanup - Unfollow Tool",
  description: "Clean up your Farcaster following list",
  icons: {
    icon: "/unfollow-icon.png",
    apple: "/unfollow-icon.png",
  },
  openGraph: {
    title: "Unfollow Tool",
    description: "Clean up your Farcaster following list",
    url: APP_URL,
    siteName: "Unfollow Tool",
    images: [
      {
        url: "/unfollow-icon.png",
        width: 400,
        height: 400,
        alt: "Unfollow Tool - Farcaster Cleanup",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Unfollow Tool",
    description: "Clean up your Farcaster following list",
    images: ["/unfollow-icon.png"],
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
        <link rel="preconnect" href="https://auth.farcaster.xyz" />
        <meta name="theme-color" content="#1f2937" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Unfollow Tool" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
