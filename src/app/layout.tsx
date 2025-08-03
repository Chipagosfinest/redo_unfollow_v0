import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unfollow Tool",
  description: "Automated unfollow tool for Farcaster - like UnfollowX but for FC",
  other: {
    "fc:miniapp": "https://redounfollowv0-cuzj0n6lw-chipagosfinests-projects.vercel.app",
    "fc:miniapp:icon": "https://redounfollowv0-cuzj0n6lw-chipagosfinests-projects.vercel.app/icon.svg",
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
      <body
        className={`${geist.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          defaultTheme="system"
          storageKey="farcaster-ui-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
