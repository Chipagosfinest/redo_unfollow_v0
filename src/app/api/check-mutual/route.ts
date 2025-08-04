import { NextRequest, NextResponse } from "next/server";

// Logging utility for API endpoints
const logApiCall = (endpoint: string, method: string, data: any) => {
  console.log(`[API ${method.toUpperCase()}] ${endpoint}`, {
    timestamp: new Date().toISOString(),
    ...data
  });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userFid = searchParams.get("userFid");
    const targetFid = searchParams.get("targetFid");

    logApiCall('/api/check-mutual', 'GET', { userFid, targetFid, url: request.url });

    if (!userFid || !targetFid) {
      logApiCall('/api/check-mutual', 'GET', { error: 'Missing required parameters' });
      return NextResponse.json(
        { error: "Query parameters 'userFid' and 'targetFid' are required" },
        { status: 400 }
      );
    }

    // Check if user follows target using official Farcaster API
    const userFollowsTargetResponse = await fetch(`https://api.farcaster.xyz/v2/following?fid=${userFid}&targetFid=${targetFid}&limit=1`);
    const userFollowsTarget = userFollowsTargetResponse.ok && (await userFollowsTargetResponse.json()).result?.users?.length > 0;

    // Check if target follows user using official Farcaster API
    const targetFollowsUserResponse = await fetch(`https://api.farcaster.xyz/v2/following?fid=${targetFid}&targetFid=${userFid}&limit=1`);
    const targetFollowsUser = targetFollowsUserResponse.ok && (await targetFollowsUserResponse.json()).result?.users?.length > 0;

    const isMutualFollow = userFollowsTarget && targetFollowsUser;

    logApiCall('/api/check-mutual', 'GET', { 
      success: true, 
      isMutualFollow, 
      userFollowsTarget, 
      targetFollowsUser 
    });

    return NextResponse.json({
      success: true,
      isMutualFollow,
      userFollowsTarget,
      targetFollowsUser
    });
  } catch (error) {
    logApiCall('/api/check-mutual', 'GET', { 
      error: 'Check mutual follow error', 
      errorMessage: error instanceof Error ? error.message : String(error) 
    });
    return NextResponse.json(
      { error: "Failed to check mutual follow" },
      { status: 500 }
    );
  }
} 