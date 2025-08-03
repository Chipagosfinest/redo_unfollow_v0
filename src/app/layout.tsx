import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Unfollow Tool",
  description: "Clean up your Farcaster following list by identifying inactive users and mutual follows",
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
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; connect-src 'self' https: wss: blob:; frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self';"
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          defaultTheme="system"
          storageKey="farcaster-ui-theme"
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
