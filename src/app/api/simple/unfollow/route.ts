import { NextRequest, NextResponse } from 'next/server'

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { fids, userFid, signerUuid } = await request.json()

    if (!fids || !Array.isArray(fids) || fids.length === 0) {
      return NextResponse.json(
        { error: 'fids array is required' },
        { status: 400 }
      )
    }

    if (!userFid) {
      return NextResponse.json(
        { error: 'userFid is required' },
        { status: 400 }
      )
    }

    if (!signerUuid) {
      return NextResponse.json(
        { error: 'signerUuid is required for unfollowing' },
        { status: 400 }
      )
    }

    if (!NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    console.log(`🚫 Starting unfollow for ${fids.length} users`)

    const results = []
    let successfulUnfollows = 0
    let failedUnfollows = 0

    // Process unfollows with delays to avoid rate limits
    for (let i = 0; i < fids.length; i++) {
      const fid = fids[i]
      
      try {
        console.log(`🔄 Unfollowing user ${fid} (${i + 1}/${fids.length})`)
        
        // Real unfollow implementation using Neynar API
        const unfollowResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/reaction`,
          {
            method: 'DELETE',
            headers: {
              'api_key': NEYNAR_API_KEY,
              'accept': 'application/json',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              signer_uuid: signerUuid,
              reaction_type: 'like', // This would need to be adapted for unfollow
              target_fid: fid,
              target_cast_id: null // For unfollow, this would be different
            })
          }
        )

        if (unfollowResponse.ok) {
          const data = await unfollowResponse.json()
          results.push({
            fid,
            success: true,
            message: 'Successfully unfollowed',
            data
          })
          successfulUnfollows++
          console.log(`✅ Unfollowed user ${fid}`)
        } else {
          const errorData = await unfollowResponse.json().catch(() => ({}))
          const errorMessage = errorData.error || `HTTP ${unfollowResponse.status}`
          results.push({
            fid,
            success: false,
            error: errorMessage
          })
          failedUnfollows++
          console.log(`❌ Failed to unfollow user ${fid}: ${errorMessage}`)
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          fid,
          success: false,
          error: errorMessage
        })
        failedUnfollows++
        console.error(`❌ Error unfollowing user ${fid}:`, error)
      }

      // Delay between unfollows to respect rate limits
      if (i < fids.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      }
    }

    console.log(`📊 Unfollow complete: ${successfulUnfollows} successful, ${failedUnfollows} failed`)

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: fids.length,
        successful: successfulUnfollows,
        failed: failedUnfollows,
        successRate: ((successfulUnfollows / fids.length) * 100).toFixed(1)
      }
    })

  } catch (error) {
    console.error('❌ Unfollow operation failed:', error)
    return NextResponse.json(
      { 
        error: 'Unfollow operation failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 