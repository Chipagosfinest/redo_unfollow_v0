import { NextRequest, NextResponse } from 'next/server'

interface UnfollowRequest {
  signerUuid: string
  targetFids: number[]
  mode?: 'selected' | 'all_unfollowable' | 'clean_slate'
}

interface UnfollowResponse {
  success: boolean
  message: string
  results: {
    successful: number[]
    failed: number[]
    total: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const { signerUuid, targetFids, mode = 'selected' }: UnfollowRequest = await request.json()

    if (!signerUuid) {
      return NextResponse.json(
        { error: 'Signer UUID is required' },
        { status: 400 }
      )
    }

    if (!targetFids || !Array.isArray(targetFids) || targetFids.length === 0) {
      return NextResponse.json(
        { error: 'Target FIDs are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      )
    }

    console.log(`Starting bulk unfollow operation: ${targetFids.length} users, mode: ${mode}`)

    const successful: number[] = []
    const failed: number[] = []

    // Process unfollows with rate limiting
    const batchSize = 10 // Process 10 at a time to avoid rate limits
    const batches = []
    
    for (let i = 0; i < targetFids.length; i += batchSize) {
      batches.push(targetFids.slice(i, i + batchSize))
    }

    for (const batch of batches) {
      // Process batch in parallel with individual error handling
      const batchPromises = batch.map(async (fid) => {
        try {
          const response = await fetch(
            'https://api.neynar.com/v2/farcaster/user/follow/',
            {
              method: 'DELETE',
              headers: {
                'api_key': apiKey,
                'accept': 'application/json',
                'content-type': 'application/json'
              },
              body: JSON.stringify({
                signer_uuid: signerUuid,
                target_fid: fid
              })
            }
          )

          if (response.ok) {
            successful.push(fid)
            console.log(`Successfully unfollowed FID: ${fid}`)
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error(`Failed to unfollow FID ${fid}:`, errorData)
            failed.push(fid)
          }
        } catch (error) {
          console.error(`Error unfollowing FID ${fid}:`, error)
          failed.push(fid)
        }
      })

      // Wait for batch to complete
      await Promise.all(batchPromises)
      
      // Small delay between batches to avoid rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const total = targetFids.length
    const successCount = successful.length
    const failureCount = failed.length

    let message = ''
    switch (mode) {
      case 'selected':
        message = `Unfollowed ${successCount} of ${total} selected users`
        break
      case 'all_unfollowable':
        message = `Unfollowed ${successCount} of ${total} unfollowable users`
        break
      case 'clean_slate':
        message = `Clean slate: Unfollowed ${successCount} of ${total} users`
        break
      default:
        message = `Unfollowed ${successCount} of ${total} users`
    }

    if (failureCount > 0) {
      message += ` (${failureCount} failed)`
    }

    const response: UnfollowResponse = {
      success: successCount > 0,
      message,
      results: {
        successful,
        failed,
        total
      }
    }

    console.log(`Bulk unfollow completed: ${successCount} successful, ${failureCount} failed`)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unfollow error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to unfollow users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 