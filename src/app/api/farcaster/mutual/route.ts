import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userFid = searchParams.get('userFid');
    const targetFid = searchParams.get('targetFid');
    
    if (!userFid || !targetFid) {
      return NextResponse.json({ 
        error: 'Both userFid and targetFid are required' 
      }, { status: 400 });
    }
    
    // Check if target user follows the user back
    const followingUrl = `https://api.farcaster.xyz/v2/following?fid=${targetFid}&limit=100`;
    
    const response = await fetch(followingUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FeedCleaner/1.0'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to check mutual follow status',
        isMutualFollow: false 
      }, { status: response.status });
    }
    
    const data = await response.json();
    const isMutualFollow = data.result?.users?.some((user: any) => user.fid.toString() === userFid) || false;
    
    return NextResponse.json({
      isMutualFollow,
      userFid: parseInt(userFid),
      targetFid: parseInt(targetFid)
    });
    
  } catch (error) {
    console.error('Mutual follow check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check mutual follow status',
      isMutualFollow: false 
    }, { status: 500 });
  }
} 