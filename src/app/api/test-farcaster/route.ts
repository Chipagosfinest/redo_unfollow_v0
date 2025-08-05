import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    const origin = request.headers.get('origin') || ''
    
    // Check for Farcaster context indicators
    const isFarcaster = userAgent.toLowerCase().includes('farcaster')
    const hasFarcasterOrigin = origin.includes('farcaster.com')
    const hasFarcasterReferer = referer.includes('farcaster.com')
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      farcasterDetection: {
        userAgent: userAgent.substring(0, 100),
        referer: referer.substring(0, 100),
        origin: origin.substring(0, 100),
        isFarcaster,
        hasFarcasterOrigin,
        hasFarcasterReferer,
        detectedAsFarcaster: isFarcaster || hasFarcasterOrigin || hasFarcasterReferer
      },
      testingInstructions: {
        standalone: 'Test in regular browser - should show "Create Signer" button',
        miniApp: 'Test in Farcaster client - should auto-detect user',
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
    console.error('Test Farcaster error:', error)
    return NextResponse.json(
      { error: 'Failed to test Farcaster detection' },
      { status: 500 }
    )
  }
} 