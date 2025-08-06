import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    "accountAssociation": {
      "header": "Farcaster Account Association",
      "payload": "I am associating this app with my Farcaster account",
      "signature": "0x..." // This would be generated dynamically
    },
    "miniapp": {
      "version": "1",
      "name": "Farcaster Cleanup",
      "iconUrl": "https://redounfollowv0.vercel.app/unfollow-icon.svg",
      "homeUrl": "https://redounfollowv0.vercel.app"
    }
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
} 