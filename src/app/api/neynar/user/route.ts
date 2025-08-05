import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Neynar MCP user endpoint called')
    
    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      console.error('Neynar API key not configured')
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      )
    }

    // For now, we'll use a simple approach - get the first user from the API
    // In a real implementation, you'd get the user from the Mini App context
    console.log('Fetching user data from Neynar MCP...')

    // This is a placeholder - in reality, you'd get the user from the Mini App context
    // For now, we'll return a mock user for testing
    const mockUser = {
      fid: 12345, // This would come from the Mini App context
      username: 'testuser',
      displayName: 'Test User',
      pfpUrl: '',
      followerCount: 100,
      followingCount: 50,
    }

    console.log('Returning Neynar user data:', mockUser)
    
    const response = NextResponse.json(mockUser)
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error) {
    console.error('Neynar user error:', error)
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