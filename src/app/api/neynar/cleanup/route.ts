import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    console.log(`📥 Request body:`, requestBody)
    
    const { 
      fid, 
      filters = {
        nonMutual: true,
        noInteractionWithYou: true,
        youNoInteraction: true,
        nuclear: false
      },
      limit = 100,
      threshold = 60, // 60 days for interaction analysis
      testMode = false // Show all users for debugging
    } = requestBody
    
    // Validate FID
    if (!fid || typeof fid !== 'number') {
      console.error(`❌ Invalid FID: ${fid} (type: ${typeof fid})`)
      return NextResponse.json(
        { error: `Invalid FID: ${fid}. Expected a number.` },
        { status: 400 }
      )
    }
    
    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      console.error(`❌ API key not configured`)
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    console.log(`🧹 Starting comprehensive cleanup analysis for FID: ${fid}`)
    console.log(`📊 Filters:`, filters)
    console.log(`⏰ Threshold: ${threshold} days`)
    console.log(`🔑 API Key present: ${apiKey ? 'Yes' : 'No'} (length: ${apiKey?.length})`)

    // 1. Fetch following list
    console.log(`🔍 Fetching following list...`)
    const followingUrl = `https://api.neynar.com/v2/farcaster/following?fid=${fid}&viewer_fid=${fid}&limit=${limit}`
    console.log(`🌐 Following URL: ${followingUrl}`)
    
    const followingResponse = await fetch(followingUrl, {
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey,
      },
    })

    console.log(`📡 Following response status: ${followingResponse.status}`)
    console.log(`📡 Following response headers:`, Object.fromEntries(followingResponse.headers.entries()))

    if (!followingResponse.ok) {
      const errorText = await followingResponse.text()
      console.error(`❌ Following API error: ${followingResponse.status} - ${errorText}`)
      console.error(`❌ Request URL: ${followingUrl}`)
      console.error(`❌ API Key length: ${apiKey.length}`)
      return NextResponse.json(
        { error: `Failed to fetch following list: ${followingResponse.status} - ${errorText}` },
        { status: 500 }
      )
    }

    const followingData = await followingResponse.json()
    const following = followingData.users || []
    console.log(`📊 Found ${following.length} following users`)

    // 2. Fetch followers list for mutual analysis
    console.log(`🔍 Fetching followers list...`)
    const followersResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/followers?fid=${fid}&viewer_fid=${fid}&limit=${limit}`,
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
    
    // Sort following list by priority: non-mutual first, then by FID (lower = older)
    following.sort((a: any, b: any) => {
      // First, prioritize non-mutual follows
      const aIsMutual = followerFids.has(a.fid)
      const bIsMutual = followerFids.has(b.fid)
      
      if (!aIsMutual && bIsMutual) return -1
      if (aIsMutual && !bIsMutual) return 1
      
      // Then sort by FID (lower = older)
      return a.fid - b.fid
    })
    
    console.log(`🔄 Sorted following list - prioritizing oldest and non-mutual follows first`)

    // 4. Analyze each following user with rate limiting
    const analyzedUsers: any[] = []
    const filterCounts = {
      nonMutual: 0,
      noInteractionWithYou: 0,
      youNoInteraction: 0,
      nuclear: 0
    }

    // Helper function to add delay between API calls
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // Process users in batches to respect rate limits (Growth plan: 600 RPM = 10 RPS)
    const batchSize = 20 // Process 20 users at a time (doubled from 10)
    const delayBetweenBatches = 1000 // 1 second between batches (600 RPM = 10 RPS, so we stay well under)
    
    console.log(`🔄 Processing ${following.length} users in batches of ${batchSize}...`)

    for (let i = 0; i < following.length; i += batchSize) {
      const batch = following.slice(i, i + batchSize)
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(following.length / batchSize)} (${batch.length} users)`)
      
      // Process batch in parallel with individual delays
      const batchPromises = batch.map(async (user: any, index: number) => {
        // Add small delay between individual requests within batch (faster for Growth plan)
        await delay(index * 50) // 50ms between each request in batch (halved from 100ms)
        
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

        // Check non-mutual follows first (no API call needed)
        if (!analysis.isMutual) {
          analysis.reasons.push('Non-mutual follow')
          filterCounts.nonMutual++
          if (filters.nonMutual) {
            analysis.shouldUnfollow = true
          }
        }

        // Only check interactions if we need to (not already marked for unfollow)
        if (!analysis.shouldUnfollow && filters.noInteractionWithYou) {
          try {
            const interactionsResponse = await fetch(
              `https://api.neynar.com/v2/farcaster/user/interactions?fids=${fid},${user.fid}&type=follows`,
              {
                headers: {
                  'accept': 'application/json',
                  'x-api-key': apiKey,
                },
              }
            )

            if (interactionsResponse.ok) {
              const interactionsData = await interactionsResponse.json()
              const interactions = interactionsData.interactions || []
              
              // Check if there are recent interactions (within last 60 days)
              const recentInteractions = interactions.filter((interaction: any) => {
                const interactionTime = new Date(interaction.most_recent_timestamp).getTime()
                const daysSinceInteraction = (Date.now() - interactionTime) / (1000 * 60 * 60 * 24)
                return daysSinceInteraction <= threshold
              })

              if (recentInteractions.length === 0) {
                analysis.reasons.push('No recent interactions')
                filterCounts.noInteractionWithYou++
                if (filters.noInteractionWithYou) {
                  analysis.shouldUnfollow = true
                }
              }
            }
          } catch (error) {
            console.error(`❌ Failed to fetch interactions for user ${user.fid}:`, error)
            // Skip this user if we can't fetch interaction data
            analysis.reasons.push('Unable to verify interactions')
          }
        }

        // Nuclear option - unfollow everyone
        if (filters.nuclear) {
          analysis.reasons.push('Nuclear option')
          filterCounts.nuclear++
          analysis.shouldUnfollow = true
        }

        return analysis
      })

      const batchResults = await Promise.all(batchPromises)
      analyzedUsers.push(...batchResults)
      
      // Add delay between batches
      if (i + batchSize < following.length) {
        console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`)
        await delay(delayBetweenBatches)
      }
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
    
    // Debug: Show some sample users for testing
    if (analyzedUsers.length > 0) {
      console.log(`🔍 Sample analyzed users:`, analyzedUsers.slice(0, 3).map(u => ({
        fid: u.fid,
        username: u.username,
        isMutual: u.isMutual,
        reasons: u.reasons,
        shouldUnfollow: u.shouldUnfollow
      })))
    }

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