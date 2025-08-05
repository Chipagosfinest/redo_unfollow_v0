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
    console.log('Auth /me endpoint called')
    
    const authorization = request.headers.get('Authorization')
    console.log('Authorization header:', authorization ? 'Present' : 'Missing')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header')
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 401 }
      )
    }

    const token = authorization.split(' ')[1]
    console.log('Token extracted, length:', token.length)
    
    try {
      const domain = process.env.NEXT_PUBLIC_APP_URL || 'https://redounfollowv0.vercel.app'
      console.log('Verifying token with domain:', domain)
      
      // Add timeout to token verification
      const tokenPromise = client.verifyJwt({
        token,
        domain,
      })
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Token verification timeout')), 10000)
      )
      
      const payload = await Promise.race([tokenPromise, timeoutPromise])
      console.log('Token verified successfully, FID:', payload.sub)

      // Get user data from Neynar API
      const apiKey = process.env.NEYNAR_API_KEY
      if (!apiKey) {
        console.error('Neynar API key not configured')
        return NextResponse.json(
          { error: 'Neynar API key not configured' },
          { status: 500 }
        )
      }

      console.log('Fetching user data from Neynar for FID:', payload.sub)

      // Fetch user data from Neynar with timeout
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
        setTimeout(() => reject(new Error('Neynar API timeout')), 15000)
      )
      
      const neynarResponse = await Promise.race([neynarPromise, neynarTimeoutPromise])

      console.log('Neynar response status:', neynarResponse.status)

      if (!neynarResponse.ok) {
        const errorText = await neynarResponse.text()
        console.error('Failed to fetch user data from Neynar:', neynarResponse.status, errorText)
        return NextResponse.json(
          { error: 'Failed to fetch user data' },
          { status: 500 }
        )
      }

      const userData = await neynarResponse.json()
      console.log('Neynar user data received:', userData.users?.length || 0, 'users')
      
      const user = userData.users?.[0]

      if (!user) {
        console.error('User not found in Neynar response')
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
      
      console.log('Returning user data:', responseData)
      
      const jsonResponse = NextResponse.json(responseData)
      jsonResponse.headers.set('Access-Control-Allow-Origin', '*')
      jsonResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      jsonResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      
      return jsonResponse

    } catch (error) {
      console.error('Token verification failed:', error)
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
    console.error('Auth error:', error)
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