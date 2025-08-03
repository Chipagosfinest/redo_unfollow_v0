import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Unfollow Tool",
  description: "Automated unfollow tool for Farcaster - like UnfollowX but for FC",
  other: {
    "fc:miniapp": "https://redounfollowv0.vercel.app",
    "fc:miniapp:icon": "https://redounfollowv0.vercel.app/icon.svg",
    "fc:miniapp:name": "Unfollow Tool",
    "fc:miniapp:description": "Clean up your Farcaster following list by identifying inactive users and mutual follows",
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
        <meta 
          httpEquiv="Content-Security-Policy" 
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.farcaster.xyz https://explorer-api.walletconnect.com; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';"
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
