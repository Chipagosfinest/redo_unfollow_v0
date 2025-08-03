import { NextRequest, NextResponse } from "next/server";
import { verifyMessage as verifyFarcasterMessage } from "@farcaster/quick-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageBytes, signature } = body;

    if (!messageBytes || !signature) {
      return NextResponse.json(
        { error: "Missing messageBytes or signature" },
        { status: 400 }
      );
    }

    // Verify the Farcaster message
    const verificationResult = await verifyFarcasterMessage({
      messageBytes,
      signature,
    });

    if (!verificationResult.isOk()) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const userFid = verificationResult.value.data.fid;
    
    return NextResponse.json({
      success: true,
      userFid,
      message: "Authentication successful"
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
} 