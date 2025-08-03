import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userFid = searchParams.get("userFid");
    const targetFid = searchParams.get("targetFid");

    if (!userFid || !targetFid) {
      return NextResponse.json(
        { error: "Query parameters 'userFid' and 'targetFid' are required" },
        { status: 400 }
      );
    }

    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) {
      return NextResponse.json(
        { error: "Neynar API key not configured" },
        { status: 500 }
      );
    }

    // Check if user follows target using Neynar API
    const userFollowsTargetResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/following?fid=${userFid}&targetFid=${targetFid}&limit=1`, {
      headers: {
        'api_key': neynarApiKey,
        'Content-Type': 'application/json'
      }
    });
    const userFollowsTarget = userFollowsTargetResponse.ok && (await userFollowsTargetResponse.json()).users?.length > 0;

    // Check if target follows user using Neynar API
    const targetFollowsUserResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/following?fid=${targetFid}&targetFid=${userFid}&limit=1`, {
      headers: {
        'api_key': neynarApiKey,
        'Content-Type': 'application/json'
      }
    });
    const targetFollowsUser = targetFollowsUserResponse.ok && (await targetFollowsUserResponse.json()).users?.length > 0;

    const isMutualFollow = userFollowsTarget && targetFollowsUser;

    return NextResponse.json({
      success: true,
      isMutualFollow,
      userFollowsTarget,
      targetFollowsUser
    });
  } catch (error) {
    console.error("Check mutual follow error:", error);
    return NextResponse.json(
      { error: "Failed to check mutual follow" },
      { status: 500 }
    );
  }
} 