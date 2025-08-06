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

    const { userFid } = await request.json()
    
    if (!userFid) {
      return NextResponse.json(
        { error: 'User FID is required' },
        { status: 400 }
      )
    }

    console.log(`🛡️ Getting whitelist for user ${userFid}`)

    // For now, return an empty whitelist
    // In a real implementation, you would store this in a database
    const whitelist = {
      users: []
    }

    console.log(`✅ Whitelist retrieved successfully`)
    
    const response = NextResponse.json(whitelist)
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error) {
    console.error('❌ Failed to get whitelist:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to get whitelist', 
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