import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { 
      fid, 
      filters = {
        nonMutual: true,
        noInteractionWithYou: true,
        youNoInteraction: true,
        nuclear: false
      },
      limit = 100,
      threshold = 60 // 60 days for interaction analysis
    } = await request.json()
    
    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    console.log(`🧹 Starting comprehensive cleanup analysis for FID: ${fid}`)
    console.log(`📊 Filters:`, filters)
    console.log(`⏰ Threshold: ${threshold} days`)

    // 1. Fetch following list
    console.log(`🔍 Fetching following list...`)
    const followingResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/following?viewer_fid=${fid}&fid=${fid}&limit=${limit}`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey,
        },
      }
    )

    if (!followingResponse.ok) {
      const errorText = await followingResponse.text()
      console.error(`Following API error: ${followingResponse.status} - ${errorText}`)
      return NextResponse.json(
        { error: `Failed to fetch following list: ${followingResponse.status}` },
        { status: 500 }
      )
    }

    const followingData = await followingResponse.json()
    const following = followingData.users || []
    console.log(`📊 Found ${following.length} following users`)

    // 2. Fetch followers list for mutual analysis
    console.log(`🔍 Fetching followers list...`)
    const followersResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/followers?viewer_fid=${fid}&fid=${fid}&limit=${limit}`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey,
        },
      }
    )

    if (!followersResponse.ok) {
      const errorText = await followersResponse.text()
      console.error(`Followers API error: ${followersResponse.status} - ${errorText}`)
      return NextResponse.json(
        { error: `Failed to fetch followers list: ${followersResponse.status}` },
        { status: 500 }
      )
    }

    const followersData = await followersResponse.json()
    const followers = followersData.users || []
    console.log(`📊 Found ${followers.length} followers`)

    // 3. Create sets for efficient lookup
    const followerFids = new Set(followers.map((f: any) => f.fid))
    const followingFids = new Set(following.map((f: any) => f.fid))

    // 4. Analyze each following user
    const analyzedUsers: any[] = []
    const filterCounts = {
      nonMutual: 0,
      noInteractionWithYou: 0,
      youNoInteraction: 0,
      nuclear: 0
    }

    for (const user of following) {
      const analysis = {
        fid: user.fid,
        username: user.username,
        displayName: user.displayName,
        pfpUrl: user.pfp?.url || '',
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        isMutual: followerFids.has(user.fid),
        lastActiveStatus: user.lastActiveStatus,
        reasons: [] as string[],
        shouldUnfollow: false
      }

      // Check non-mutual follows
      if (!analysis.isMutual) {
        analysis.reasons.push('Non-mutual follow')
        filterCounts.nonMutual++
        if (filters.nonMutual) {
          analysis.shouldUnfollow = true
        }
      }

      // Check inactivity (60+ days)
      const lastActiveTime = user.lastActiveStatus ? new Date(user.lastActiveStatus).getTime() : null
      const daysSinceActive = lastActiveTime ? (Date.now() - lastActiveTime) / (1000 * 60 * 60 * 24) : null
      
      if (daysSinceActive && daysSinceActive > threshold) {
        analysis.reasons.push(`No interaction for ${Math.round(daysSinceActive)} days`)
        filterCounts.noInteractionWithYou++
        if (filters.noInteractionWithYou) {
          analysis.shouldUnfollow = true
        }
      }

      // Check if user hasn't been active recently (simplified check)
      if (user.lastActiveStatus === 'inactive' || (daysSinceActive && daysSinceActive > threshold)) {
        analysis.reasons.push('You haven\'t interacted')
        filterCounts.youNoInteraction++
        if (filters.youNoInteraction) {
          analysis.shouldUnfollow = true
        }
      }

      // Nuclear option - unfollow everyone
      if (filters.nuclear) {
        analysis.reasons.push('Nuclear option')
        filterCounts.nuclear++
        analysis.shouldUnfollow = true
      }

      analyzedUsers.push(analysis)
    }

    // 5. Filter users based on selected filters
    const usersToUnfollow = analyzedUsers.filter(user => user.shouldUnfollow)

    console.log(`📊 Analysis complete:`, {
      totalFollowing: following.length,
      totalFollowers: followers.length,
      mutualFollows: analyzedUsers.filter(u => u.isMutual).length,
      nonMutualFollows: analyzedUsers.filter(u => !u.isMutual).length,
      usersToUnfollow: usersToUnfollow.length,
      filterCounts
    })

    const response = NextResponse.json({
      success: true,
      users: usersToUnfollow,
      summary: {
        totalFollowing: following.length,
        totalFollowers: followers.length,
        mutualFollows: analyzedUsers.filter(u => u.isMutual).length,
        nonMutualFollows: analyzedUsers.filter(u => !u.isMutual).length,
        usersToUnfollow: usersToUnfollow.length,
        filterCounts
      }
    })
    
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error) {
    console.error('❌ Cleanup analysis failed:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to analyze following list', 
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