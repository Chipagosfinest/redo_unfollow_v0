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
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const successful: number[] = []
    const failed: number[] = []
    const batchSize = 5
    const batches = []
    for (let i = 0; i < targetFids.length; i += batchSize) {
      batches.push(targetFids.slice(i, i + batchSize))
    }
    for (const batch of batches) {
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
                signer_uuid: request.headers.get('x-signer-uuid') || '',
                target_fid: fid
              })
            }
          )
          if (response.ok) {
            successful.push(fid)
          } else {
            const errorData = await response.json().catch(() => ({}))
            failed.push(fid)
          }
        } catch (error) {
          failed.push(fid)
        }
      })
      await Promise.all(batchPromises)
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
    
    const jsonResponse = NextResponse.json(response)
    jsonResponse.headers.set('Access-Control-Allow-Origin', '*')
    jsonResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    jsonResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return jsonResponse
  } catch (error) {
    const errorResponse = NextResponse.json(
      {
        error: 'Failed to unfollow users',
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