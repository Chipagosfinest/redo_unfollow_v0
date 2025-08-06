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

    const { targetFid, userFid } = await request.json()
    
    if (!targetFid || !userFid) {
      return NextResponse.json(
        { error: 'Target FID and user FID are required' },
        { status: 400 }
      )
    }

    console.log(`🚫 Unfollowing user ${targetFid} for user ${userFid}...`)

    // Create unfollow message using Neynar API
    const unfollowResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/follow`,
      {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'api_key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          signer_uuid: process.env.NEYNAR_SIGNER_UUID, // You'll need to set this
          data: {
            type: 'MESSAGE_TYPE_FOLLOW',
            fid: userFid,
            timestamp: Math.floor(Date.now() / 1000),
            network: 'FARCASTER_NETWORK_MAINNET',
            followBody: {
              targetFid: targetFid
            }
          }
        })
      }
    )

    if (!unfollowResponse.ok) {
      const errorText = await unfollowResponse.text()
      console.error(`❌ Unfollow failed: ${unfollowResponse.status} - ${errorText}`)
      return NextResponse.json(
        { error: `Failed to unfollow: ${unfollowResponse.status} - ${errorText}` },
        { status: unfollowResponse.status }
      )
    }

    const result = await unfollowResponse.json()
    console.log(`✅ Successfully unfollowed user ${targetFid}`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully unfollowed user ${targetFid}`,
      data: result
    })

  } catch (error) {
    console.error('❌ Unfollow error:', error)
    return NextResponse.json(
      { error: 'Failed to unfollow user' },
      { status: 500 }
    )
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