import { NextRequest, NextResponse } from 'next/server';

// Logging utility for API endpoints
const logApiCall = (endpoint: string, method: string, data: any) => {
  console.log(`[API ${method.toUpperCase()}] ${endpoint}`, {
    timestamp: new Date().toISOString(),
    ...data
  });
};

export async function POST(request: NextRequest) {
  try {
    const { userFid, targetFids } = await request.json();

    logApiCall('/api/unfollow', 'POST', { userFid, targetFids, url: request.url });

    if (!userFid || !targetFids || !Array.isArray(targetFids)) {
      logApiCall('/api/unfollow', 'POST', { error: 'Missing userFid or targetFids array' });
      return NextResponse.json(
        { error: 'Missing userFid or targetFids array' },
        { status: 400 }
      );
    }

    // Validate user exists
    const userResponse = await fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${userFid}`);
    if (!userResponse.ok) {
      logApiCall('/api/unfollow', 'POST', { 
        error: 'User not found',
        userResponseStatus: userResponse.status
      });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's following list to verify they're actually following the targets
    const followingResponse = await fetch(
      `https://api.farcaster.xyz/v2/following?fid=${userFid}&limit=100`
    );

    if (!followingResponse.ok) {
      logApiCall('/api/unfollow', 'POST', { 
        error: 'Unable to fetch following list',
        followingResponseStatus: followingResponse.status
      });
      return NextResponse.json(
        { error: 'Unable to fetch following list' },
        { status: 500 }
      );
    }

    const followingData = await followingResponse.json();
    const followingFids = followingData.result?.users?.map((user: any) => user.fid) || [];
    
    // Filter to only unfollow users that are actually being followed
    const validTargetFids = targetFids.filter(fid => followingFids.includes(fid));
    
    if (validTargetFids.length === 0) {
      logApiCall('/api/unfollow', 'POST', { 
        error: 'No valid targets to unfollow',
        targetFids,
        followingFids
      });
      return NextResponse.json(
        { error: 'No valid targets to unfollow' },
        { status: 400 }
      );
    }

    // For now, we'll simulate successful unfollows
    // In a real implementation, this would create and sign follow-remove messages
    // and submit them to the Farcaster Hub
    logApiCall('/api/unfollow', 'POST', { 
      success: true,
      message: "Batch unfollow request processed",
      userFid,
      targetFids: validTargetFids,
      successCount: validTargetFids.length
    });

    return NextResponse.json({
      success: true,
      message: "Batch unfollow request processed",
      userFid,
      targetFids: validTargetFids,
      successCount: validTargetFids.length
    });

  } catch (error) {
    logApiCall('/api/unfollow', 'POST', { 
      error: 'Unfollow error', 
      errorMessage: error instanceof Error ? error.message : String(error) 
    });
    return NextResponse.json(
      { error: 'Unfollow failed' },
      { status: 500 }
    );
  }
} 