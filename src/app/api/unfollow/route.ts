import { NextRequest, NextResponse } from "next/server";
import { FollowRemoveMessage } from "@farcaster/core";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userFid, targetFid, signerUuid } = body;

    if (!userFid || !targetFid) {
      return NextResponse.json(
        { error: "Missing required parameters: userFid or targetFid" },
        { status: 400 }
      );
    }

    // Create a FollowRemoveMessage to unfollow
    const followRemoveMessage = new FollowRemoveMessage({
      fid: userFid,
      targetFid: targetFid,
      timestamp: Math.floor(Date.now() / 1000),
    });

    // TODO: Sign and submit the message to the hub
    // This requires proper message signing implementation with a wallet
    // For now, we'll simulate the unfollow action
    
    console.log("Unfollow message created:", {
      userFid,
      targetFid,
      messageType: "FollowRemove",
      timestamp: followRemoveMessage.data.timestamp
    });

    return NextResponse.json({
      success: true,
      message: "Unfollow message created (requires signing)",
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