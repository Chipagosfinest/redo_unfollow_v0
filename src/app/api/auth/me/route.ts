import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@farcaster/quick-auth'

const client = createClient()

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 401 }
      )
    }

    const token = authorization.split(' ')[1]
    
    try {
      const payload = await client.verifyJwt({
        token,
        domain: process.env.NEXT_PUBLIC_APP_URL || 'https://redounfollowv0-oyjqxoqm5-chipagosfinests-projects.vercel.app',
      })

      // Get user data from Neynar API
      const apiKey = process.env.NEYNAR_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: 'Neynar API key not configured' },
          { status: 500 }
        )
      }

      // Fetch user data from Neynar
      const response = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${payload.sub}`,
        {
          headers: {
            'api_key': apiKey,
            'accept': 'application/json',
          },
        }
      )

      if (!response.ok) {
        console.error('Failed to fetch user data from Neynar:', response.status)
        return NextResponse.json(
          { error: 'Failed to fetch user data' },
          { status: 500 }
        )
      }

      const userData = await response.json()
      const user = userData.users[0]

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        fid: user.fid,
        username: user.username,
        displayName: user.displayName,
        pfpUrl: user.pfp?.url || '',
        followerCount: user.followerCount,
        followingCount: user.followingCount,
      })

    } catch (error) {
      console.error('Token verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
} 