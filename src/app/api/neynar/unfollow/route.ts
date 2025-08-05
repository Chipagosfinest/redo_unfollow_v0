import { NextRequest, NextResponse } from 'next/server'

interface UnfollowRequest {
  targetFids: number[]
  mode?: 'selected' | 'all_unfollowable' | 'clean_slate'
}

interface UnfollowResponse {
  success: boolean
  message: string
  results?: {
    successful: number[]
    failed: number[]
    total: number
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Neynar MCP unfollow endpoint called')
    
    const { targetFids, mode = 'selected' }: UnfollowRequest = await request.json()

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

    console.log(`Starting Neynar MCP bulk unfollow operation: ${targetFids.length} users, mode: ${mode}`)

    const successful: number[] = []
    const failed: number[] = []

    // Process unfollows with rate limiting
    const batchSize = 5 // Reduced batch size for better rate limiting
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
                signer_uuid: 'test-signer', // This would come from the Mini App context
                target_fid: fid
              })
            }
          )

          if (response.ok) {
            successful.push(fid)
            console.log(`Successfully unfollowed FID: ${fid} using Neynar MCP`)
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error(`Failed to unfollow FID ${fid} using Neynar MCP:`, errorData)
            failed.push(fid)
          }
        } catch (error) {
          console.error(`Error unfollowing FID ${fid} using Neynar MCP:`, error)
          failed.push(fid)
        }
      })

      // Wait for batch to complete
      await Promise.all(batchPromises)
      
      // Small delay between batches to avoid rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const total = targetFids.length
    const successCount = successful.length
    const failureCount = failed.length

    let message = ''
    switch (mode) {
      case 'selected':
        message = `Unfollowed ${successCount} of ${total} selected users using Neynar MCP`
        break
      case 'all_unfollowable':
        message = `Unfollowed ${successCount} of ${total} unfollowable users using Neynar MCP`
        break
      case 'clean_slate':
        message = `Clean slate: Unfollowed ${successCount} of ${total} users using Neynar MCP`
        break
      default:
        message = `Unfollowed ${successCount} of ${total} users using Neynar MCP`
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

    console.log(`Neynar MCP bulk unfollow completed: ${successCount} successful, ${failureCount} failed`)

    const jsonResponse = NextResponse.json(response)
    jsonResponse.headers.set('Access-Control-Allow-Origin', '*')
    jsonResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    jsonResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return jsonResponse

  } catch (error) {
    console.error('Neynar unfollow error:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to unfollow users using Neynar MCP',
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