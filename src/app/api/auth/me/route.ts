import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@farcaster/quick-auth'

const client = createClient()

export async function GET(request: NextRequest) {
  // Add CORS headers
  const response = NextResponse.next()
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

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
      const domain = process.env.NEXT_PUBLIC_APP_URL || 'https://redounfollowv0.vercel.app'
      
      // Add timeout to token verification
      const tokenPromise = client.verifyJwt({
        token,
        domain,
      })
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Token verification timeout')), 10000)
      )
      
      const payload = await Promise.race([tokenPromise, timeoutPromise])

      // Get user data from API
      const apiKey = process.env.NEYNAR_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: 'API key not configured' },
          { status: 500 }
        )
      }

      // Fetch user data from API with timeout
      const neynarPromise = fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${payload.sub}`,
        {
          headers: {
            'api_key': apiKey,
            'accept': 'application/json',
          },
        }
      )
      
      const neynarTimeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('API timeout')), 15000)
      )
      
      const neynarResponse = await Promise.race([neynarPromise, neynarTimeoutPromise])

      if (!neynarResponse.ok) {
        const errorText = await neynarResponse.text()
        return NextResponse.json(
          { error: 'Failed to fetch user data' },
          { status: 500 }
        )
      }

      const userData = await neynarResponse.json()
      
      const user = userData.users?.[0]

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      const responseData = {
        fid: user.fid,
        username: user.username,
        displayName: user.displayName,
        pfpUrl: user.pfp?.url || '',
        followerCount: user.followerCount,
        followingCount: user.followingCount,
      }
      
      const jsonResponse = NextResponse.json(responseData)
      jsonResponse.headers.set('Access-Control-Allow-Origin', '*')
      jsonResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      jsonResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      
      return jsonResponse

    } catch (error) {
      const errorResponse = NextResponse.json(
        { 
          error: 'Invalid token', 
          details: error instanceof Error ? error.message : 'Unknown error',
          timeout: error instanceof Error && error.message?.includes('timeout') ? true : false
        },
        { status: 401 }
      )
      errorResponse.headers.set('Access-Control-Allow-Origin', '*')
      return errorResponse
    }

  } catch (error) {
    const errorResponse = NextResponse.json(
      { 
        error: 'Authentication failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timeout: error instanceof Error && error.message?.includes('timeout') ? true : false
      },
      { status: 500 }
    )
    errorResponse.headers.set('Access-Control-Allow-Origin', '*')
    return errorResponse
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  const response = NextResponse.json({})
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
} 