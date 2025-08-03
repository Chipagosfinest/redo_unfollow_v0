import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userFid, targetFid } = body;

    if (!userFid || !targetFid) {
      return NextResponse.json(
        { error: "Missing required parameters: userFid or targetFid" },
        { status: 400 }
      );
    }

    // TODO: Implement real unfollow with Farcaster message signing
    // For now, simulate successful unfollow
    
    console.log("Unfollow message created:", {
      userFid,
      targetFid,
      messageType: "FollowRemove",
      timestamp: Math.floor(Date.now() / 1000)
    });

    return NextResponse.json({
      success: true,
      message: "Unfollow message created (mock)",
      targetFid,
      messageType: "FollowRemove"
    });
  } catch (error) {
    console.error("Unfollow error:", error);
    return NextResponse.json(
      { error: "Unfollow failed" },
      { status: 500 }
    );
  }
} 