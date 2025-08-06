import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY
    const clientId = process.env.NEYNAR_CLIENT_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    
    return NextResponse.json({
      success: true,
      debug: {
        apiKeyPresent: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        apiKeyPrefix: apiKey?.substring(0, 10) + '...' || 'none',
        clientIdPresent: !!clientId,
        appUrlPresent: !!appUrl,
        appUrl: appUrl,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { error: 'Debug endpoint failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'flush_cache') {
      // Clear any in-memory caches
      if ((global as any).cache) {
        (global as any).cache.clear()
      }
      
      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc()
      }
      
      // Clear any module caches
      Object.keys(require.cache).forEach(key => {
        if (key.includes('node_modules')) {
          delete require.cache[key]
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Cache flushed successfully',
        timestamp: new Date().toISOString(),
        action: 'flush_cache'
      })
    }
    
    return NextResponse.json({
      success: false,
      message: 'Unknown action',
      availableActions: ['flush_cache']
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 