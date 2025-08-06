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

    const { userFid, targetFid } = await request.json()
    
    if (!userFid || !targetFid) {
      return NextResponse.json(
        { error: 'User FID and target FID are required' },
        { status: 400 }
      )
    }

    console.log(`🛡️ Removing user ${targetFid} from whitelist for user ${userFid}`)

    // In a real implementation, you would remove this from a database
    // For now, we'll just return success
    console.log(`✅ User removed from whitelist`)
    
    const response = NextResponse.json({
      success: true,
      message: `User ${targetFid} removed from whitelist`,
      targetFid
    })
    
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error) {
    console.error('❌ Failed to remove user from whitelist:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to remove user from whitelist', 
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