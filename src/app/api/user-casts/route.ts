import { NextRequest, NextResponse } from "next/server";

interface FarcasterCast {
  hash: string;
  timestamp: number;
  text: string;
  embeds?: unknown[];
  mentions?: number[];
  mentionsPositions?: number[];
}

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

    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) {
      return NextResponse.json(
        { error: "Neynar API key not configured" },
        { status: 500 }
      );
    }

    // Get user's recent casts using Neynar API
    const response = await fetch(`https://api.neynar.com/v2/farcaster/cast/list?fid=${fid}&limit=${limit}`, {
      headers: {
        'api_key': neynarApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error("Neynar API error:", response.status, response.statusText);
      return NextResponse.json(
        { error: "Failed to fetch user casts" },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.casts) {
      return NextResponse.json({
        success: true,
        casts: [],
        count: 0
      });
    }

    const casts = data.casts.map((cast: FarcasterCast) => ({
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