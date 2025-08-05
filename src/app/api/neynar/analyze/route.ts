import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Neynar MCP analyze endpoint called')
    
    const { fid, page = 1, limit = 50 } = await request.json()
    
    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      console.error('Neynar API key not configured')
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      )
    }

    console.log(`Analyzing following list for FID: ${fid} using Neynar MCP`)

    // Fetch following list using Neynar API
    const followingResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/following?fid=${fid}&limit=1000`,
      {
        headers: {
          'api_key': apiKey,
          'accept': 'application/json',
        },
      }
    )

    if (!followingResponse.ok) {
      console.error('Failed to fetch following:', followingResponse.status)
      return NextResponse.json(
        { error: 'Failed to fetch following list' },
        { status: 500 }
      )
    }

    const followingData = await followingResponse.json()
    const following = followingData.users || []

    // Fetch followers list using Neynar API
    const followersResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/followers?fid=${fid}&limit=1000`,
      {
        headers: {
          'api_key': apiKey,
          'accept': 'application/json',
        },
      }
    )

    if (!followersResponse.ok) {
      console.error('Failed to fetch followers:', followersResponse.status)
      return NextResponse.json(
        { error: 'Failed to fetch followers list' },
        { status: 500 }
      )
    }

    const followersData = await followersResponse.json()
    const followers = followersData.users || []

    // Create sets for efficient lookup
    const followerFids = new Set(followers.map((f: any) => f.fid))
    const followingFids = new Set(following.map((f: any) => f.fid))

    // Analyze users using Neynar data
    const usersToUnfollow: any[] = []

    for (const user of following) {
      const isMutual = followerFids.has(user.fid)
      const isInactive = user.lastActiveStatus === 'inactive' || 
                        (user.lastActiveStatus && new Date(user.lastActiveStatus).getTime() < Date.now() - (75 * 24 * 60 * 60 * 1000))

      if (!isMutual || isInactive) {
        usersToUnfollow.push({
          fid: user.fid,
          username: user.username,
          displayName: user.displayName,
          pfpUrl: user.pfp?.url || '',
          followerCount: user.followerCount,
          followingCount: user.followingCount,
          isInactive,
          isMutual,
          reason: isInactive ? 'inactive' : 'not_following_back'
        })
      }
    }

    // Sort by reason (inactive first, then non-mutual)
    usersToUnfollow.sort((a, b) => {
      if (a.reason === 'inactive' && b.reason !== 'inactive') return -1
      if (a.reason !== 'inactive' && b.reason === 'inactive') return 1
      return 0
    })

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedUsers = usersToUnfollow.slice(startIndex, endIndex)

    console.log(`Found ${usersToUnfollow.length} users to unfollow using Neynar MCP (showing ${paginatedUsers.length})`)

    const response = NextResponse.json({
      users: paginatedUsers,
      summary: {
        total: usersToUnfollow.length,
        inactive: usersToUnfollow.filter(u => u.reason === 'inactive').length,
        notFollowingBack: usersToUnfollow.filter(u => u.reason === 'not_following_back').length,
        page,
        limit,
        hasMore: endIndex < usersToUnfollow.length
      }
    })
    
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error) {
    console.error('Neynar analyze error:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to analyze following', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
    errorResponse.headers.set('Access-Control-Allow-Origin', '*')
    return errorResponse
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  const response = NextResponse.json({})
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
} 