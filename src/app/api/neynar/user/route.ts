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
    // Enhanced logging
    console.log('Neynar user API called', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: new Date().toISOString()
    });
    
    // Security validation
    if (!validateRequest(request)) {
      console.log('Request validation failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    console.log('Neynar user API - FID parameter', { fid, type: typeof fid });
    
    if (!fid || !/^\d+$/.test(fid)) {
      console.log('Invalid FID provided', { fid });
      return NextResponse.json({ error: 'Valid FID is required' }, { status: 400 });
    }

    // Rate limiting check (simple implementation)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    console.log('Neynar user API - Client info', { clientIP, fid });
    
    const neynarUrl = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`;
    console.log('Neynar user API - Making request', { 
      url: neynarUrl,
      hasApiKey: !!process.env.NEYNAR_API_KEY,
      apiKeyLength: process.env.NEYNAR_API_KEY?.length || 0
    });
    
    const response = await fetch(neynarUrl, {
      headers: {
        'api_key': process.env.NEYNAR_API_KEY || ''
      }
    });

    console.log('Neynar user API - Response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Neynar user API - Error response', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        fid
      });
      throw new Error(`Neynar API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Neynar user API - Success response', {
      hasData: !!data,
      hasUsers: !!data.users,
      userCount: data.users?.length || 0,
      fid
    });
    
    // Add security headers
    const responseHeaders = new Headers();
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('X-XSS-Protection', '1; mode=block');
    
    return NextResponse.json(data, { headers: responseHeaders });
  } catch (error) {
    console.error('Neynar user API - Exception caught', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
} 