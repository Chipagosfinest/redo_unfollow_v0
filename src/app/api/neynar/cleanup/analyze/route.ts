import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const { userFid } = await request.json()
    
    if (!userFid) {
      return NextResponse.json(
        { error: 'User FID is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Analyzing following list for user ${userFid}...`)

    // Step 1: Get user's following list
    const followingResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/following?fid=${userFid}&limit=1000`,
      {
        headers: {
          'api_key': apiKey,
          'accept': 'application/json',
        },
      }
    )

    if (!followingResponse.ok) {
      console.error('❌ Failed to fetch following list:', followingResponse.status)
      return NextResponse.json(
        { error: 'Failed to fetch following list' },
        { status: 500 }
      )
    }

    const followingData = await followingResponse.json()
    const followingUsers = followingData.users || []
    console.log(`📊 Found ${followingUsers.length} following users`)

    // Step 2: Get user's followers list to determine mutual follows
    const followersResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/followers?fid=${userFid}&limit=1000`,
      {
        headers: {
          'api_key': apiKey,
          'accept': 'application/json',
        },
      }
    )

    if (!followersResponse.ok) {
      console.error('❌ Failed to fetch followers list:', followersResponse.status)
      return NextResponse.json(
        { error: 'Failed to fetch followers list' },
        { status: 500 }
      )
    }

    const followersData = await followersResponse.json()
    const followers = followersData.users || []
    console.log(`📊 Found ${followers.length} followers`)

    // Create a set of follower FIDs for quick lookup
    const followerFids = new Set(followers.map((f: any) => f.fid))

    // Step 3: Analyze each following user
    const analyzedUsers = await Promise.all(
      followingUsers.map(async (user: any) => {
        const isMutual = followerFids.has(user.fid)
        
        // Analyze actual interaction data from Neynar API
        let lastInteractionWithYou = null
        let lastInteractionByYou = null
        
        try {
          // Fetch recent interactions between users
          const interactionsResponse = await fetch(
            `https://api.neynar.com/v2/farcaster/user/interactions?fids=${userFid},${user.fid}&type=follows`,
            {
              headers: {
                'accept': 'application/json',
                'api_key': apiKey,
              },
            }
          )

          if (interactionsResponse.ok) {
            const interactionsData = await interactionsResponse.json()
            const interactions = interactionsData.interactions || []
            
            // Find most recent interactions
            const recentInteractions = interactions
              .filter((interaction: any) => {
                const interactionTime = new Date(interaction.most_recent_timestamp).getTime()
                const daysSinceInteraction = (Date.now() - interactionTime) / (1000 * 60 * 60 * 24)
                return daysSinceInteraction <= 60 // 60 days threshold
              })
              .sort((a: any, b: any) => 
                new Date(b.most_recent_timestamp).getTime() - new Date(a.most_recent_timestamp).getTime()
              )

            if (recentInteractions.length > 0) {
              const mostRecent = recentInteractions[0]
              lastInteractionWithYou = mostRecent.most_recent_timestamp
              lastInteractionByYou = mostRecent.most_recent_timestamp
            }
          }
        } catch (error) {
          console.error(`Failed to fetch interactions for user ${user.fid}:`, error)
          // Keep null values if interaction fetch fails
        }

        return {
          fid: user.fid,
          username: user.username,
          display_name: user.displayName,
          pfp_url: user.pfp?.url || '',
          follower_count: user.followerCount,
          following_count: user.followingCount,
          is_mutual: isMutual,
          last_interaction_with_you: lastInteractionWithYou,
          last_interaction_by_you: lastInteractionByYou,
          reasons: []
        }
      })
    )

    // Add reason tags based on analysis
    const usersWithReasons = analyzedUsers.map(user => {
      const reasons = []
      
      if (!user.is_mutual) {
        reasons.push('Non-mutual follow')
      }
      
      if (user.last_interaction_with_you === null) {
        reasons.push('No interaction with you')
      }
      
      if (user.last_interaction_by_you === null) {
        reasons.push('You no interaction')
      }
      
      return {
        ...user,
        reasons
      }
    })

    console.log(`✅ Analysis complete for ${usersWithReasons.length} users`)
    
    const response = NextResponse.json({
      users: usersWithReasons,
      total: usersWithReasons.length,
      mutual: usersWithReasons.filter(u => u.is_mutual).length,
      nonMutual: usersWithReasons.filter(u => !u.is_mutual).length
    })
    
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error) {
    console.error('❌ Analysis failed:', error)
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