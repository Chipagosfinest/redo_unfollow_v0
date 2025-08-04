import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Feed Cleaner - Farcaster Unfollow Tool",
  description: "Sweep who doesn't follow you back or is inactive. Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users.",
  icons: {
    icon: "🧹",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="description" content="Sweep who doesn't follow you back or is inactive. Clean up your Farcaster feed with our intelligent unfollow tool" />
        
        {/* Farcaster Mini App Meta Tags */}
        <meta name="farcaster:app" content="feed-cleaner" />
        <meta name="farcaster:frame" content="vNext" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Feed Cleaner - Farcaster Unfollow Tool" />
        <meta property="og:description" content="Sweep who doesn't follow you back or is inactive. Clean up your Farcaster feed by identifying and unfollowing inactive accounts" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://redounfollowv0.vercel.app" />
        <meta property="og:image" content="🧹" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Feed Cleaner - Farcaster Unfollow Tool" />
        <meta name="twitter:description" content="Sweep who doesn't follow you back or is inactive. Clean up your Farcaster feed with intelligent unfollow recommendations" />
        <meta name="twitter:image" content="🧹" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider defaultTheme="system" storageKey="farcaster-ui-theme">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
