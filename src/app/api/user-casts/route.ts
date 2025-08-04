import { NextRequest, NextResponse } from "next/server";

// Logging utility for API endpoints
const logApiCall = (endpoint: string, method: string, data: any) => {
  console.log(`[API ${method.toUpperCase()}] ${endpoint}`, {
    timestamp: new Date().toISOString(),
    ...data
  });
};

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

    logApiCall('/api/user-casts', 'GET', { fid, limit, url: request.url });

    if (!fid) {
      logApiCall('/api/user-casts', 'GET', { error: 'Missing fid parameter' });
      return NextResponse.json(
        { error: "Query parameter 'fid' is required" },
        { status: 400 }
      );
    }

    // Get user's recent casts using official Farcaster API
    const response = await fetch(`https://api.farcaster.xyz/v2/casts?fid=${fid}&limit=${limit}`);

    if (!response.ok) {
      logApiCall('/api/user-casts', 'GET', { 
        error: 'Farcaster API error', 
        status: response.status, 
        statusText: response.statusText 
      });
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

    const casts = data.result.casts.map((cast: FarcasterCast) => ({
      hash: cast.hash,
      timestamp: cast.timestamp,
      text: cast.text,
      embeds: cast.embeds || [],
      mentions: cast.mentions || [],
      mentionsPositions: cast.mentionsPositions || [],
    }));

    logApiCall('/api/user-casts', 'GET', { 
      success: true, 
      count: casts.length 
    });

    return NextResponse.json({
      success: true,
      casts,
      count: casts.length
    });
  } catch (error) {
    logApiCall('/api/user-casts', 'GET', { 
      error: 'User casts error', 
      errorMessage: error instanceof Error ? error.message : String(error) 
    });
    return NextResponse.json(
      { error: "Failed to fetch user casts" },
      { status: 500 }
    );
  }
} 