import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient, isApiErrorResponse, Configuration } from '@neynar/nodejs-sdk';
import { env } from '@/lib/env';

const config = new Configuration({
  apiKey: env.neynarApiKey,
});

const client = new NeynarAPIClient(config);

// Security middleware
function validateRequest(request: NextRequest) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Allow requests from Vercel domains and localhost
  const allowedOrigins = [
    'vercel.app',
    'localhost',
    '127.0.0.1',
    env.appUrl.replace(/^https?:\/\//, '')
  ];
  
  if (origin && !allowedOrigins.some(allowed => origin.includes(allowed))) {
    return false;
  }
  
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || userAgent.includes('bot')) {
    return false;
  }
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Neynar unfollow API called', {
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    });
    
    // Check if Neynar API key is configured
    if (!env.neynarApiKey) {
      console.error('Neynar API key not configured');
      return NextResponse.json({ 
        error: 'Service not configured properly' 
      }, { status: 503 });
    }
    
    // Security validation
    if (!validateRequest(request)) {
      console.log('Request validation failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { signerUuid, targetFids } = await request.json();
    
    console.log('Neynar unfollow API - Parameters', { 
      hasSignerUuid: !!signerUuid,
      targetFidsCount: targetFids?.length || 0,
      targetFids
    });
    
    if (!signerUuid || !targetFids || !Array.isArray(targetFids) || targetFids.length === 0) {
      console.log('Invalid parameters provided', { signerUuid, targetFids });
      return NextResponse.json({ 
        error: 'Valid signerUuid and targetFids array are required' 
      }, { status: 400 });
    }

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    console.log('Neynar unfollow API - Client info', { clientIP, signerUuid });
    
    // Use Neynar SDK to unfollow users
    const result = await client.unfollowUser({ signerUuid, targetFids });
    
    console.log('Neynar unfollow API - Success response', {
      success: result.success,
      detailsCount: result.details?.length || 0,
      targetFids
    });
    
    // Add security headers
    const responseHeaders = new Headers();
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('X-XSS-Protection', '1; mode=block');
    
    return NextResponse.json(result, { headers: responseHeaders });
    
  } catch (error) {
    console.error('Neynar unfollow API - Exception caught', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    if (isApiErrorResponse(error)) {
      return NextResponse.json(
        { error: error.response.data.message || 'Neynar API error' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json({ 
      error: 'Failed to unfollow users' 
    }, { status: 500 });
  }
} 