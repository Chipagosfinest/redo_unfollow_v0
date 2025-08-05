import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const envVars = {
    NEYNAR_API_KEY: process.env.NEYNAR_API_KEY ? 'Set' : 'Not set',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'Not set',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  }
  
  return NextResponse.json(envVars)
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'flush_cache') {
      console.log('🔄 Cache flush requested')
      
      // Clear any in-memory caches
      if (global.cache) {
        global.cache.clear()
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      // Clear any module caches
      Object.keys(require.cache).forEach(key => {
        if (key.includes('node_modules')) {
          delete require.cache[key]
        }
      })
      
      console.log('✅ Cache flushed successfully')
      
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
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 