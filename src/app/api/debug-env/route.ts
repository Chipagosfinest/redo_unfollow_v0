import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    const origin = request.headers.get('origin') || ''
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      headers: {
        userAgent: userAgent.substring(0, 200), // First 200 chars for privacy
        referer: referer.substring(0, 200),
        origin: origin.substring(0, 200),
      },
      environment: process.env.NODE_ENV,
      apiKeyExists: !!process.env.NEYNAR_API_KEY,
      clientIdExists: !!process.env.NEYNAR_CLIENT_ID
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 