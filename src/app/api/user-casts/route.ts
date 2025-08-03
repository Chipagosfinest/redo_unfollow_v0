import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");
    const limit = searchParams.get("limit") || "1";

    if (!fid) {
      return NextResponse.json(
        { error: "Query parameter 'fid' is required" },
        { status: 400 }
      );
    }

    // Get user's recent casts using official Farcaster API
    const response = await fetch(`https://api.farcaster.xyz/v2/casts?fid=${fid}&limit=${limit}`);

    if (!response.ok) {
      console.error("Farcaster API error:", response.status, response.statusText);
      return NextResponse.json(
        { error: "Failed to fetch user casts" },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.result || !data.result.casts) {
      return NextResponse.json({
        success: true,
        casts: [],
        count: 0
      });
    }

    const casts = data.result.casts.map((cast: any) => ({
      hash: cast.hash,
      timestamp: cast.timestamp,
      text: cast.text,
      embeds: cast.embeds || [],
      mentions: cast.mentions || [],
      mentionsPositions: cast.mentionsPositions || [],
    }));

    return NextResponse.json({
      success: true,
      casts,
      count: casts.length
    });
  } catch (error) {
    console.error("User casts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user casts" },
      { status: 500 }
    );
  }
} 