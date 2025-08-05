import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    const origin = request.headers.get('origin') || ''
    
    // Check for Farcaster context indicators
    const isWarpcast = userAgent.toLowerCase().includes('warpcast')
    const isFarcaster = userAgent.toLowerCase().includes('farcaster')
    const hasFarcasterOrigin = origin.includes('warpcast.com') || origin.includes('farcaster.com')
    const hasFarcasterReferer = referer.includes('warpcast.com') || referer.includes('farcaster.com')
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      farcasterDetection: {
        userAgent: userAgent.substring(0, 100),
        referer: referer.substring(0, 100),
        origin: origin.substring(0, 100),
        isWarpcast,
        isFarcaster,
        hasFarcasterOrigin,
        hasFarcasterReferer,
        detectedAsFarcaster: isWarpcast || isFarcaster || hasFarcasterOrigin || hasFarcasterReferer
      },
      testingInstructions: {
        standalone: 'Test in regular browser - should show "Create Signer" button',
        miniApp: 'Test in Warpcast or Farcaster client - should auto-detect user',
        manualTest: 'Add ?test=mini-app to URL to simulate mini app environment',
        debugMode: 'Check browser console for environment detection logs'
      },
      expectedBehavior: {
        miniApp: 'Should auto-connect if Farcaster context is detected',
        standalone: 'Should show signer creation flow',
        fallback: 'Should provide clear guidance for both modes'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 