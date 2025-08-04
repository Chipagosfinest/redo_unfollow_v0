import { NextRequest, NextResponse } from "next/server";

// Logging utility for API endpoints
const logApiCall = (endpoint: string, method: string, data: any) => {
  console.log(`[API ${method.toUpperCase()}] ${endpoint}`, {
    timestamp: new Date().toISOString(),
    ...data
  });
};

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
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "10");

    logApiCall('/api/following', 'GET', { fid, page, limit, url: request.url });

    if (!fid) {
      logApiCall('/api/following', 'GET', { error: 'Missing fid parameter' });
      return NextResponse.json(
        { error: "Query parameter 'fid' is required" },
        { status: 400 }
      );
    }

    // For pagination, we need to fetch all users up to the current page
    // This is a limitation of the Farcaster API - we can't jump to specific pages
    let allUsers: FarcasterUser[] = [];
    let currentCursor = "";
    let currentPageCount = 0;
    const targetPage = page;

    // Fetch users until we reach the target page
    while (currentPageCount <= targetPage) {
      const url = currentCursor 
        ? `https://api.farcaster.xyz/v2/following?fid=${fid}&limit=${limit}&cursor=${currentCursor}`
        : `https://api.farcaster.xyz/v2/following?fid=${fid}&limit=${limit}`;

      const response = await fetch(url);

      if (!response.ok) {
        logApiCall('/api/following', 'GET', { 
          error: 'Farcaster API error', 
          status: response.status, 
          statusText: response.statusText,
          url 
        });
        return NextResponse.json(
          { error: "Failed to fetch following users" },
          { status: 500 }
        );
      }

      const data = await response.json();

      if (!data.result || !data.result.users) {
        break;
      }

      allUsers = allUsers.concat(data.result.users);
      currentCursor = data.result.next?.cursor || "";
      
      // If no more pages, break
      if (!currentCursor) {
        break;
      }

      currentPageCount++;
    }

    // Get the users for the target page
    const startIndex = targetPage * limit;
    const endIndex = startIndex + limit;
    const pageUsers = allUsers.slice(startIndex, endIndex);

    const following = pageUsers.map((user: FarcasterUser) => ({
      fid: user.fid,
      username: user.username,
      displayName: user.displayName || user.username,
      pfp: user.pfp?.url || "/icon.svg",
      followerCount: user.followerCount || 0,
      followingCount: user.followingCount || 0,
    }));

    const totalFollowing = allUsers.length;
    const totalPages = Math.ceil(totalFollowing / limit);

    logApiCall('/api/following', 'GET', { 
      success: true, 
      totalFollowing, 
      totalPages, 
      currentPage: page,
      hasMore: currentCursor ? true : false 
    });

    return NextResponse.json({
      success: true,
      following,
      totalFollowing,
      totalPages,
      currentPage: page,
      hasMore: currentCursor ? true : false
    });
  } catch (error) {
    logApiCall('/api/following', 'GET', { 
      error: 'Following API error', 
      errorMessage: error instanceof Error ? error.message : String(error) 
    });
    return NextResponse.json(
      { error: "Failed to fetch following users" },
      { status: 500 }
    );
  }
} 