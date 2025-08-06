import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('User endpoint called')
    
    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      console.error('API key not configured')
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    // Get user from request headers (Mini App context)
    const userFid = request.headers.get('x-user-fid')
    const userUsername = request.headers.get('x-user-username')
    const userDisplayName = request.headers.get('x-user-display-name')
    
    if (!userFid) {
      console.error('No user FID provided in headers')
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    console.log('Fetching live user data for FID:', userFid)

    // Get real user data from API
    const userResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${userFid}`,
      {
        headers: {
          'api_key': apiKey,
          'accept': 'application/json',
        },
      }
    )

    if (!userResponse.ok) {
      console.error('Failed to fetch user data:', userResponse.status)
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    const userData = await userResponse.json()
    const user = userData.users?.[0]

    if (!user) {
      console.error('User not found in API response')
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const liveUser = {
      fid: user.fid,
      username: user.username,
      displayName: user.displayName,
      pfpUrl: user.pfp?.url || '',
      followerCount: user.followerCount,
      followingCount: user.followingCount,
    }

    console.log('Returning live user data:', liveUser)
    
    const response = NextResponse.json(liveUser)
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error) {
    console.error('User endpoint error:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to get user data', 
        details: error instanceof Error ? error.message : 'Unknown error'
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