import { NextRequest, NextResponse } from "next/server";

interface FarcasterUser {
  fid: number;
  username: string;
  displayName?: string;
  pfp?: { url?: string };
  followerCount?: number;
  followingCount?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

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

    // Get followers using Neynar API
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/followers?fid=${fid}&limit=100`, {
      headers: {
        'api_key': neynarApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error("Neynar API error:", response.status, response.statusText);
      return NextResponse.json(
        { error: "Failed to fetch followers" },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.users) {
      return NextResponse.json({
        success: true,
        followers: [],
        count: 0
      });
    }

    const followers = data.users.map((user: FarcasterUser) => ({
      fid: user.fid,
      username: user.username,
      displayName: user.displayName || user.username,
      pfp: user.pfp?.url || "https://via.placeholder.com/40",
      followerCount: user.followerCount || 0,
      followingCount: user.followingCount || 0,
    }));

    return NextResponse.json({
      success: true,
      followers,
      count: followers.length
    });
  } catch (error) {
    console.error("Followers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch followers" },
      { status: 500 }
    );
  }
} 