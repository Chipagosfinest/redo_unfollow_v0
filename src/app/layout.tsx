import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Farcaster Feed Cleaner',
  description: 'Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users',
  openGraph: {
    title: 'Farcaster Feed Cleaner',
    description: 'Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users',
    type: 'website',
    url: 'https://redounfollowv0.vercel.app',
    images: [
      {
        url: '/unfollow-icon.png',
        width: 1200,
        height: 630,
        alt: 'Farcaster Feed Cleaner - Unfollow Tool'
      },
      {
        url: '/unfollow-icon.svg',
        width: 1200,
        height: 630,
        alt: 'Farcaster Feed Cleaner - Unfollow Tool'
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Farcaster Feed Cleaner',
    description: 'Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users',
    images: ['/unfollow-icon.png'],
  },
  other: {
    'farcaster:app': 'feed-cleaner',
    'farcaster:frame': 'vNext',
    'walletconnect:projectId': '3435763a8b4b4b4b4b4b4b4b4b4b4b4b',
    'walletconnect:relayUrl': 'https://relay.walletconnect.com',
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
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="description" content="Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users" />
        <meta name="farcaster:app" content="feed-cleaner" />
        <meta name="farcaster:frame" content="vNext" />
        <meta name="walletconnect:projectId" content="3435763a8b4b4b4b4b4b4b4b4b4b4b4b" />
        <meta name="walletconnect:relayUrl" content="https://relay.walletconnect.com" />
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        <meta property="og:title" content="Farcaster Feed Cleaner" />
        <meta property="og:description" content="Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://redounfollowv0.vercel.app" />
        <meta property="og:image" content="/unfollow-icon.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Farcaster Feed Cleaner" />
        <meta name="twitter:description" content="Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users" />
        <meta name="twitter:image" content="/unfollow-icon.png" />
        <meta name="next-size-adjust" content="" />
        <title>Farcaster Feed Cleaner</title>
        <meta name="description" content="Clean up your Farcaster feed by identifying and unfollowing inactive accounts" />
        <link rel="icon" href="/unfollow-icon.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/unfollow-icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/unfollow-icon.png" />
        <link rel="shortcut icon" href="/unfollow-icon.png" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
