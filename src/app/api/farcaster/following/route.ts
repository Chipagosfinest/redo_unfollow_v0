import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

// Deployment timestamp to force fresh deployment
const DEPLOYMENT_TIMESTAMP = '2025-08-04-04-30';

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
    console.log('Farcaster following API called', {
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    });
    
    // Security validation
    if (!validateRequest(request)) {
      console.log('Request validation failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    console.log('Farcaster following API - FID parameter', { fid, type: typeof fid });
    
    if (!fid || !/^\d+$/.test(fid)) {
      console.log('Invalid FID provided', { fid });
      return NextResponse.json({ 
        error: 'Valid FID is required',
        message: 'Please provide a valid numeric FID'
      }, { status: 400 });
    }

    // Rate limiting check (simple implementation)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    console.log('Farcaster following API - Client info', { clientIP, fid });
    
    // Use official Farcaster API to get following list
    const farcasterUrl = `https://api.farcaster.xyz/v2/following?fid=${fid}&limit=100`;
    console.log('Farcaster following API - Making request', { url: farcasterUrl });
    
    const response = await fetch(farcasterUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FeedCleaner/1.0'
      }
    });
    
    if (!response.ok) {
      console.error('Farcaster API error', { 
        status: response.status, 
        statusText: response.statusText 
      });
      
      if (response.status === 404) {
        return NextResponse.json({ 
          error: 'User not found',
          message: `User with FID ${fid} not found`,
          users: []
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch following data',
        message: 'Unable to fetch following list from Farcaster API',
        users: []
      }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('Farcaster following API - Response received', { 
      userCount: data.result?.users?.length || 0,
      hasNextCursor: !!data.result?.next?.cursor
    });
    
    // Transform the data to match our expected format
    const users = (data.result?.users || []).map((user: any) => ({
      fid: user.fid,
      username: user.username,
      display_name: user.display_name,
      displayName: user.display_name,
      pfp_url: user.pfp?.url,
      pfp: user.pfp?.url,
      follower_count: user.follower_count,
      following_count: user.following_count,
      followerCount: user.follower_count,
      followingCount: user.following_count,
      bio: user.profile?.bio?.text,
      verified_addresses: user.verified_addresses,
      power_badge: user.power_badge
    }));
    
    return NextResponse.json({
      users,
      total: users.length,
      nextCursor: data.result?.next?.cursor,
      deploymentTimestamp: DEPLOYMENT_TIMESTAMP
    });
    
  } catch (error) {
    console.error('Farcaster following API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Failed to fetch following data',
      users: []
    }, { status: 500 });
  }
} 