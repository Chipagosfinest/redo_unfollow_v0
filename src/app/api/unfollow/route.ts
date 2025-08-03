import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userFid, targetFid } = await request.json();

    if (!userFid || !targetFid) {
      return NextResponse.json(
        { error: 'Missing userFid or targetFid' },
        { status: 400 }
      );
    }

    // Validate both users exist
    const [userResponse, targetResponse] = await Promise.all([
      fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${userFid}`),
      fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${targetFid}`)
    ]);

    if (!userResponse.ok || !targetResponse.ok) {
      return NextResponse.json(
        { error: 'One or both users not found' },
        { status: 404 }
      );
    }

    // Check if user is actually following target
    const followingResponse = await fetch(
      `https://api.farcaster.xyz/v2/following?fid=${userFid}&targetFid=${targetFid}`
    );

    if (!followingResponse.ok) {
      return NextResponse.json(
        { error: 'Unable to verify following status' },
        { status: 500 }
      );
    }

    const followingData = await followingResponse.json();
    const isFollowing = followingData.result?.users?.some((user: any) => user.fid === targetFid);

    if (!isFollowing) {
      return NextResponse.json(
        { error: 'Not following this user' },
        { status: 400 }
      );
    }

    // In a real implementation, this would create and sign a follow-remove message
    // For now, we'll return success as the actual unfollow happens client-side
    return NextResponse.json({
      success: true,
      message: "Unfollow request processed",
      userFid,
      targetFid
    });

  } catch (error) {
    console.error('Unfollow error:', error);
    return NextResponse.json(
      { error: 'Unfollow failed' },
      { status: 500 }
    );
  }
} 