import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { fid, page = 1, limit = 50, authMethod = 'miniapp', testMode = false, debugMode = false, threshold = 75, strategy = 'oldest' } = await request.json()
    
    // Enhanced environment checking
    const apiKey = process.env.NEYNAR_API_KEY
    const nodeEnv = process.env.NODE_ENV
    const vercelEnv = process.env.VERCEL_ENV
    
    console.log(`Environment: NODE_ENV=${nodeEnv}, VERCEL_ENV=${vercelEnv}`)
    console.log(`Auth method: ${authMethod}`)
    console.log(`Analyzing following list for FID: ${fid}`)
    console.log(`API Key present: ${apiKey ? 'YES' : 'NO'}`)
    console.log(`API Key length: ${apiKey?.length || 0}`)
    console.log(`API Key preview: ${apiKey ? `${apiKey.substring(0, 8)}...` : 'NONE'}`)
    console.log(`Using correct Neynar endpoints: /v2/farcaster/following and /v2/farcaster/followers`)
    console.log(`🧪 Test Mode: ${testMode}, Debug Mode: ${debugMode}, Threshold: ${threshold} days, Strategy: ${strategy}`)
    
    if (!apiKey) {
      console.error('NEYNAR_API_KEY not configured')
      return NextResponse.json(
        { 
          error: 'API key not configured',
          details: {
            nodeEnv,
            vercelEnv,
            message: 'Please ensure NEYNAR_API_KEY is set in your Vercel environment variables'
          }
        },
        { status: 500 }
      )
    }

    // Fetch following list using API - support different strategies
    console.log(`🔍 Fetching following data for FID ${fid} with strategy: ${strategy}...`)
    
    let followingResponse
    
    if (strategy === 'oldest') {
      // Get oldest follows first (most likely to be inactive)
      const countResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/following?viewer_fid=${fid}&fid=${fid}&limit=1`,
        {
          headers: {
            'accept': 'application/json',
            'x-api-key': apiKey,
          },
        }
      )

      if (!countResponse.ok) {
        const errorText = await countResponse.text()
        console.error(`Count API error: ${countResponse.status} - ${errorText}`)
        return NextResponse.json(
          { error: `Failed to get following count: ${countResponse.status}`, details: errorText },
          { status: 500 }
        )
      }

      const countData = await countResponse.json()
      const totalFollowing = countData.users?.length || 0
      
      console.log(`📊 Total following count: ${totalFollowing}`)
      
      // Calculate offset to get oldest follows (last 100 instead of first 100)
      const limit = 100
      const offset = Math.max(0, totalFollowing - limit)
      
      console.log(`🔍 Fetching oldest ${limit} follows (offset: ${offset})`)
      
      // For now, let's use the simple approach without cursor
      console.log(`🔍 Fetching following data (simple approach)`)
      followingResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/following?viewer_fid=${fid}&fid=${fid}&limit=${limit}`,
        {
          headers: {
            'accept': 'application/json',
            'x-api-key': apiKey,
          },
        }
      )
    } else {
      // Default strategy: get newest follows (original behavior)
      console.log(`🔍 Fetching newest 100 follows (default strategy)`)
      followingResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/following?viewer_fid=${fid}&fid=${fid}&limit=100`,
        {
          headers: {
            'accept': 'application/json',
            'x-api-key': apiKey,
          },
        }
      )
    }

    console.log(`Following API response status: ${followingResponse.status}`)
    console.log(`Following API response headers:`, Object.fromEntries(followingResponse.headers.entries()))

    if (!followingResponse.ok) {
      const errorText = await followingResponse.text()
      console.error(`Following API error: ${followingResponse.status} - ${errorText}`)
      console.error(`Following API URL: https://api.neynar.com/v2/farcaster/following?viewer_fid=${fid}&fid=${fid}&limit=100`)
      return NextResponse.json(
        { error: `Failed to fetch following list: ${followingResponse.status}`, details: errorText },
        { status: 500 }
      )
    }

    const followingData = await followingResponse.json()
    const following = followingData.users || []
    
    // If we didn't get enough data with cursor, try without cursor as fallback
    if (following.length < 10 && totalFollowing > 100) {
      console.log(`⚠️ Cursor approach didn't work, trying without cursor...`)
      const fallbackResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/following?viewer_fid=${fid}&fid=${fid}&limit=100`,
        {
          headers: {
            'accept': 'application/json',
            'x-api-key': apiKey,
          },
        }
      )
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        const fallbackFollowing = fallbackData.users || []
        console.log(`📊 Fallback following data: ${fallbackFollowing.length} users`)
        
        // Use fallback data if it has more users
        if (fallbackFollowing.length > following.length) {
          following.length = 0
          following.push(...fallbackFollowing)
        }
      }
    }
    
    console.log(`📊 Raw following data:`, {
      totalFollowing: following.length,
      sampleUser: following[0] ? {
        fid: following[0].fid,
        username: following[0].username,
        displayName: following[0].displayName,
        lastActiveStatus: following[0].lastActiveStatus,
        followerCount: following[0].followerCount
      } : 'No users found',
      hasFollowingData: !!following.length
    })
    
    if (debugMode) {
      console.log(`🔍 DEBUG: Full following data:`, following)
    }

    // Fetch followers list using API
    const followersResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/followers?viewer_fid=${fid}&fid=${fid}&limit=100`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey,
        },
      }
    )

    console.log(`Followers API response status: ${followersResponse.status}`)
    console.log(`Followers API response headers:`, Object.fromEntries(followersResponse.headers.entries()))

    if (!followersResponse.ok) {
      const errorText = await followersResponse.text()
      console.error(`Followers API error: ${followersResponse.status} - ${errorText}`)
      console.error(`Followers API URL: https://api.neynar.com/v2/farcaster/followers?viewer_fid=${fid}&fid=${fid}&limit=100`)
      return NextResponse.json(
        { error: `Failed to fetch followers list: ${followersResponse.status}`, details: errorText },
        { status: 500 }
      )
    }

    const followersData = await followersResponse.json()
    const followers = followersData.users || []
    console.log(`📊 Raw followers data:`, {
      totalFollowers: followers.length,
      sampleUser: followers[0] ? {
        fid: followers[0].fid,
        username: followers[0].username,
        displayName: followers[0].displayName
      } : 'No users found',
      hasFollowersData: !!followers.length
    })

    // Create sets for efficient lookup
    const followerFids = new Set(followers.map((f: any) => f.fid))
    const followingFids = new Set(following.map((f: any) => f.fid))

    console.log(`🔍 Analysis setup:`, {
      totalFollowing: following.length,
      totalFollowers: followers.length,
      mutualFollows: following.filter(f => followerFids.has(f.fid)).length,
      thresholdDays: threshold
    })

    // Analyze users using API data with enhanced logging
    const usersToUnfollow: any[] = []
    const analysisLog: any[] = []

    for (const user of following) {
      const isMutual = followerFids.has(user.fid)
      const lastActiveTime = user.lastActiveStatus ? new Date(user.lastActiveStatus).getTime() : null
      const daysSinceActive = lastActiveTime ? (Date.now() - lastActiveTime) / (1000 * 60 * 60 * 24) : null
      const isInactive = user.lastActiveStatus === 'inactive' || 
                        (lastActiveTime && daysSinceActive > threshold)

      const analysis = {
        fid: user.fid,
        username: user.username,
        displayName: user.displayName,
        isMutual,
        lastActiveStatus: user.lastActiveStatus,
        daysSinceActive: daysSinceActive ? Math.round(daysSinceActive) : 'unknown',
        isInactive,
        shouldUnfollow: !isMutual || isInactive,
        reason: isInactive ? `inactive (${daysSinceActive ? Math.round(daysSinceActive) : 'unknown'} days)` : 
                !isMutual ? 'not_following_back' : 'active_mutual'
      }

      analysisLog.push(analysis)

      if (testMode || !isMutual || isInactive) {
        usersToUnfollow.push({
          fid: user.fid,
          username: user.username,
          displayName: user.displayName,
          pfpUrl: user.pfp?.url || '',
          followerCount: user.followerCount,
          followingCount: user.followingCount,
          isInactive,
          isMutual,
          reason: isInactive ? 'inactive' : 'not_following_back',
          daysSinceActive: daysSinceActive ? Math.round(daysSinceActive) : null
        })
      }
    }

    console.log(`📊 Analysis results:`, {
      totalAnalyzed: analysisLog.length,
      mutualFollows: analysisLog.filter(u => u.isMutual).length,
      nonMutualFollows: analysisLog.filter(u => !u.isMutual).length,
      inactiveUsers: analysisLog.filter(u => u.isInactive).length,
      usersToUnfollow: usersToUnfollow.length,
      sampleAnalysis: analysisLog.slice(0, 3)
    })

    if (debugMode) {
      console.log(`🔍 DEBUG: Full analysis log:`, analysisLog)
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

    const response = NextResponse.json({
      users: paginatedUsers,
      summary: {
        total: usersToUnfollow.length,
        inactive: usersToUnfollow.filter(u => u.reason === 'inactive').length,
        notFollowingBack: usersToUnfollow.filter(u => u.reason === 'not_following_back').length,
        page,
        limit,
        hasMore: endIndex < usersToUnfollow.length,
        debug: {
          testMode,
          debugMode,
          threshold,
          totalFollowing: following.length,
          totalFollowers: followers.length,
          mutualFollows: analysisLog.filter(u => u.isMutual).length,
          analysisLog: debugMode ? analysisLog : undefined
        }
      }
    })
    
    // Add proper CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error) {
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