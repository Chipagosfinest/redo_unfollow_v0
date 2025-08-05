import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { signerUuid, targetFids } = await request.json()

    if (!signerUuid) {
      return NextResponse.json(
        { error: 'Signer UUID is required' },
        { status: 400 }
      )
    }

    if (!targetFids || !Array.isArray(targetFids) || targetFids.length === 0) {
      return NextResponse.json(
        { error: 'Target FIDs array is required' },
        { status: 400 }
      )
    }

    // Unfollow users using Neynar REST API
    const apiKey = process.env.NEYNAR_API_KEY
    const response = await fetch('https://api.neynar.com/v2/farcaster/user/follow/', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'api_key': apiKey as string,
      },
      body: JSON.stringify({ signer_uuid: signerUuid, target_fids: targetFids })
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: result.message || 'Failed to unfollow users', details: result }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully unfollowed ${targetFids.length} users`,
      details: result
    })

  } catch (error) {
    console.error('Unfollow error:', error)
    return NextResponse.json(
      { error: 'Failed to unfollow users' },
      { status: 500 }
    )
  }
} 