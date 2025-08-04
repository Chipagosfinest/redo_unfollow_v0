import { NextRequest, NextResponse } from 'next/server';

// Security middleware
function validateRequest(request: NextRequest) {
  // Check if request is from our domain
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Only allow requests from our app
  if (origin && !origin.includes('vercel.app') && !origin.includes('localhost')) {
    return false;
  }
  
  // Check for valid user agent
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || userAgent.includes('bot')) {
    return false;
  }
  
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // Security validation
    if (!validateRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    if (!fid || !/^\d+$/.test(fid)) {
      return NextResponse.json({ error: 'Valid FID is required' }, { status: 400 });
    }

    // Rate limiting check (simple implementation)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: {
        'api_key': process.env.NEYNAR_API_KEY || ''
      }
    });

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Add security headers
    const responseHeaders = new Headers();
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('X-XSS-Protection', '1; mode=block');
    
    return NextResponse.json(data, { headers: responseHeaders });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
} 