import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

// Deployment timestamp to force fresh deployment
const DEPLOYMENT_TIMESTAMP = '2025-08-04-03-55';

// Security middleware
function validateRequest(request: NextRequest) {
  // Check if request is from our domain
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Allow requests from our app and localhost
  const allowedOrigins = [
    'vercel.app',
    'localhost',
    '127.0.0.1',
    env.appUrl.replace(/^https?:\/\//, '')
  ];
  
  if (origin && !allowedOrigins.some(allowed => origin.includes(allowed))) {
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
    console.log('Neynar following API called', {
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    });
    
    // Check if Neynar API key is configured
    if (!env.neynarApiKey) {
      console.warn('Neynar API key not configured - returning demo mode response');
      return NextResponse.json({ 
        error: 'Service not configured properly',
        message: 'Running in demo mode - add NEYNAR_API_KEY to environment variables',
        users: [],
        demoMode: true
      }, { status: 503 });
    }
    
    // Security validation
    if (!validateRequest(request)) {
      console.log('Request validation failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    console.log('Neynar following API - FID parameter', { fid, type: typeof fid });
    
    if (!fid || !/^\d+$/.test(fid)) {
      console.log('Invalid FID provided', { fid });
      return NextResponse.json({ 
        error: 'Valid FID is required',
        message: 'Please provide a valid numeric FID'
      }, { status: 400 });
    }

    // Rate limiting check (simple implementation)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    console.log('Neynar following API - Client info', { clientIP, fid });
    
    // IMPORTANT: The Neynar v2 API doesn't have a following endpoint
    // This is a limitation of the current Neynar API
    console.error('Neynar v2 API does not have a following endpoint');
    
    return NextResponse.json({ 
      error: 'Following endpoint not available',
      message: 'The Neynar v2 API does not currently support fetching following lists. This feature is not available.',
      users: [],
      demoMode: true,
      apiLimitation: true,
      deploymentTimestamp: DEPLOYMENT_TIMESTAMP
    }, { status: 501 });
    
    // The following code is commented out because the endpoint doesn't exist
    /*
    const neynarUrl = `https://api.neynar.com/v2/farcaster/user/following?fid=${fid}&viewer_fid=${fid}`;
    console.log('Neynar following API - Making request', { 
      url: neynarUrl,
      hasApiKey: !!env.neynarApiKey,
      apiKeyLength: env.neynarApiKey.length
    });
    
    const response = await fetch(neynarUrl, {
      headers: {
        'api_key': env.neynarApiKey
      }
    });

    console.log('Neynar following API - Response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Neynar API error for FID ${fid}: ${response.status} ${response.statusText}`, {
        errorText,
        fid
      });
      
      if (response.status === 404) {
        return NextResponse.json({ 
          error: `User with FID ${fid} not found`,
          message: 'This FID does not exist in the Farcaster network. Please check the FID and try again.',
          users: [],
          demoMode: false
        }, { status: 404 });
      }
      
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Invalid API key',
          message: 'The Neynar API key is invalid. Please check your configuration.',
          users: [],
          demoMode: false
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: `Neynar API error: ${response.status} ${response.statusText}`,
        message: 'There was an error communicating with the Farcaster API.',
        users: [],
        demoMode: false
      }, { status: response.status });
    }

    const data = await response.json();
    
    console.log('Neynar following API - Success response', {
      userCount: data.users?.length || 0,
      hasUsers: !!data.users,
      fid
    });
    
    // Add security headers
    const responseHeaders = new Headers();
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('X-XSS-Protection', '1; mode=block');
    
    return NextResponse.json({
      ...data,
      demoMode: false
    }, { headers: responseHeaders });
    */
  } catch (error) {
    console.error('Error fetching following data:', error);
    
    // Return empty users array so the app can fall back to demo data
    return NextResponse.json({ 
      error: 'Failed to fetch following data',
      message: 'There was an unexpected error. Please try again later.',
      users: [],
      demoMode: false
    }, { status: 500 });
  }
} 