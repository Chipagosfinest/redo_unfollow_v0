import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Search for users using official Farcaster API
    const response = await fetch(`https://api.farcaster.xyz/v2/user-by-username?username=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      console.error("Farcaster API error:", response.status, response.statusText);
      return NextResponse.json(
        { error: "Failed to search users" },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    if (!data.result || !data.result.user) {
      return NextResponse.json({
        success: true,
        users: [],
        count: 0
      });
    }

    const user = data.result.user;
    
    const users = [{
      fid: user.fid,
      username: user.username,
      displayName: user.displayName || user.username,
      pfp: user.pfp?.url || "https://via.placeholder.com/40",
      followerCount: user.followerCount || 0,
      followingCount: user.followingCount || 0,
    }];

    return NextResponse.json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
} 