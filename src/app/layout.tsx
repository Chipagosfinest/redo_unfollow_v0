import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Farcaster Feed Cleaner",
  description: "Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users.",
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
        <meta name="description" content="Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users" />
        
        {/* Farcaster Mini App Meta Tags */}
        <meta name="farcaster:app" content="feed-cleaner" />
        <meta name="farcaster:frame" content="vNext" />
        
        {/* WalletConnect Meta Tags */}
        <meta name="walletconnect:projectId" content="3435763a8b4b4b4b4b4b4b4b4b4b4b4b" />
        <meta name="walletconnect:relayUrl" content="https://relay.walletconnect.com" />
        
        {/* Security Meta Tags */}
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Farcaster Feed Cleaner" />
        <meta property="og:description" content="Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://redounfollowv0.vercel.app" />
        <meta property="og:image" content="🧹" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Farcaster Feed Cleaner" />
        <meta name="twitter:description" content="Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users" />
        <meta name="twitter:image" content="🧹" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider defaultTheme="system" storageKey="farcaster-ui-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
