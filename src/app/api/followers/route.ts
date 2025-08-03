import { NextRequest, NextResponse } from "next/server";

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

    // Get followers using official Farcaster API
    const response = await fetch(`https://api.farcaster.xyz/v2/followers?fid=${fid}&limit=100`);

    if (!response.ok) {
      console.error("Farcaster API error:", response.status, response.statusText);
      return NextResponse.json(
        { error: "Failed to fetch followers" },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.result || !data.result.users) {
      return NextResponse.json({
        success: true,
        followers: [],
        count: 0
      });
    }

    const followers = data.result.users.map((user: any) => ({
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