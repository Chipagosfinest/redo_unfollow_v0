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

    // Check if user follows target
    const userFollowsTargetResponse = await fetch(`https://api.farcaster.xyz/v2/following?fid=${userFid}&targetFid=${targetFid}&limit=1`);
    const userFollowsTarget = userFollowsTargetResponse.ok && (await userFollowsTargetResponse.json()).result?.users?.length > 0;

    // Check if target follows user
    const targetFollowsUserResponse = await fetch(`https://api.farcaster.xyz/v2/following?fid=${targetFid}&targetFid=${userFid}&limit=1`);
    const targetFollowsUser = targetFollowsUserResponse.ok && (await targetFollowsUserResponse.json()).result?.users?.length > 0;

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