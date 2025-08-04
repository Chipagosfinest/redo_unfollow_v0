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
    const { userFid, targetFid } = await request.json();

    logApiCall('/api/unfollow', 'POST', { userFid, targetFid, url: request.url });

    if (!userFid || !targetFid) {
      logApiCall('/api/unfollow', 'POST', { error: 'Missing userFid or targetFid' });
      return NextResponse.json(
        { error: 'Missing userFid or targetFid' },
        { status: 400 }
      );
    }

    // Validate both users exist
    const [userResponse, targetResponse] = await Promise.all([
      fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${userFid}`),
      fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${targetFid}`)
    ]);

    if (!userResponse.ok || !targetResponse.ok) {
      logApiCall('/api/unfollow', 'POST', { 
        error: 'One or both users not found',
        userResponseStatus: userResponse.status,
        targetResponseStatus: targetResponse.status
      });
      return NextResponse.json(
        { error: 'One or both users not found' },
        { status: 404 }
      );
    }

    // Check if user is actually following target
    const followingResponse = await fetch(
      `https://api.farcaster.xyz/v2/following?fid=${userFid}&targetFid=${targetFid}`
    );

    if (!followingResponse.ok) {
      logApiCall('/api/unfollow', 'POST', { 
        error: 'Unable to verify following status',
        followingResponseStatus: followingResponse.status
      });
      return NextResponse.json(
        { error: 'Unable to verify following status' },
        { status: 500 }
      );
    }

    const followingData = await followingResponse.json();
    const isFollowing = followingData.result?.users?.some((user: any) => user.fid === targetFid);

    if (!isFollowing) {
      logApiCall('/api/unfollow', 'POST', { 
        error: 'Not following this user',
        userFid,
        targetFid
      });
      return NextResponse.json(
        { error: 'Not following this user' },
        { status: 400 }
      );
    }

    // In a real implementation, this would create and sign a follow-remove message
    // For now, we'll return success as the actual unfollow happens client-side
    logApiCall('/api/unfollow', 'POST', { 
      success: true,
      message: "Unfollow request processed",
      userFid,
      targetFid
    });

    return NextResponse.json({
      success: true,
      message: "Unfollow request processed",
      userFid,
      targetFid
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