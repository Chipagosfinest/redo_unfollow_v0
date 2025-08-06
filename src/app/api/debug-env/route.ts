import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Only allow in development or with special header
  const debugHeader = request.headers.get('x-debug-env')
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  if (!isDevelopment && !debugHeader) {
    return NextResponse.json(
      { error: 'Debug endpoint only available in development' },
      { status: 403 }
    )
  }

  const envInfo = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    neynarApiKeyPresent: !!process.env.NEYNAR_API_KEY,
    neynarApiKeyLength: process.env.NEYNAR_API_KEY?.length || 0,
    neynarApiKeyPreview: process.env.NEYNAR_API_KEY ? 
      `${process.env.NEYNAR_API_KEY.substring(0, 8)}...` : 'NONE',
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(envInfo)
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