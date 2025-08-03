import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fid } = await request.json();

    if (!fid || typeof fid !== 'number') {
      return NextResponse.json(
        { error: 'Invalid FID provided' },
        { status: 400 }
      );
    }

    // Validate FID exists in Farcaster
    const userResponse = await fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${fid}`);
    
    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'User not found in Farcaster' },
        { status: 404 }
      );
    }

    const userData = await userResponse.json();
    
    if (!userData.result?.user) {
      return NextResponse.json(
        { error: 'User not found in Farcaster' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      userFid: fid,
      message: "Authentication successful"
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 