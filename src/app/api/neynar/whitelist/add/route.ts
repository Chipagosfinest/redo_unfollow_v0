import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const { userFid, targetFid, reason } = await request.json()
    
    if (!userFid || !targetFid) {
      return NextResponse.json(
        { error: 'User FID and target FID are required' },
        { status: 400 }
      )
    }

    console.log(`🛡️ Adding user ${targetFid} to whitelist for user ${userFid}`)

    // Get user data from Neynar API
    const userResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${targetFid}`,
      {
        headers: {
          'api_key': apiKey,
          'accept': 'application/json',
        },
      }
    )

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    const userData = await userResponse.json()
    const user = userData.users?.[0]

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create whitelist entry
    const whitelistUser = {
      fid: user.fid,
      username: user.username,
      display_name: user.displayName,
      pfp_url: user.pfp?.url || '',
      reason: reason || 'Protected by user',
      added_at: new Date().toISOString()
    }

    // In a real implementation, you would save this to a database
    console.log(`✅ User added to whitelist: ${user.username}`)
    
    const response = NextResponse.json({
      success: true,
      message: `User ${user.username} added to whitelist`,
      user: whitelistUser
    })
    
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error) {
    console.error('❌ Failed to add user to whitelist:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to add user to whitelist', 
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