import { NextRequest, NextResponse } from 'next/server'

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { userFid } = await request.json()

    if (!userFid) {
      return NextResponse.json(
        { error: 'userFid is required' },
        { status: 400 }
      )
    }

    console.log(`Analyzing relationships for user ${userFid}`)

    // Get user's following list
    const followingResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/following?fid=${userFid}&limit=1000`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY || '',
        },
      }
    )

    if (!followingResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch following list' },
        { status: 500 }
      )
    }

    const followingData = await followingResponse.json()
    const followingUsers = followingData.users || []

    console.log(`Found ${followingUsers.length} users that ${userFid} follows`)

    const relationships = []
    let processed = 0

    // Process in small batches to avoid rate limits
    const batchSize = 3
    for (let i = 0; i < followingUsers.length; i += batchSize) {
      const batch = followingUsers.slice(i, i + batchSize)
      
      for (const user of batch) {
        try {
          // Check if they follow back
          const followersResponse = await fetch(
            `https://api.neynar.com/v2/farcaster/user/followers?fid=${userFid}&limit=1000`,
            {
              headers: {
                'api_key': NEYNAR_API_KEY || '',
              },
            }
          )

          let isMutualFollow = false
          if (followersResponse.ok) {
            const followersData = await followersResponse.json()
            isMutualFollow = followersData.users?.some((follower: any) => follower.fid === user.fid) || false
          }

          // Simple interaction check (we'll use a default for demo)
          // In a real implementation, you'd check actual interaction history
          const daysSinceInteraction = Math.floor(Math.random() * 120) + 1 // Demo: random 1-120 days

          // Determine if they should be unfollowed
          const shouldUnfollow = !isMutualFollow || daysSinceInteraction >= 60

          if (shouldUnfollow) {
            relationships.push({
              fid: user.fid,
              username: user.username,
              display_name: user.display_name,
              pfp_url: user.pfp_url,
              is_mutual_follow: isMutualFollow,
              days_since_interaction: daysSinceInteraction,
              should_unfollow: true
            })
          }

          processed++
          console.log(`Processed ${processed}/${followingUsers.length}: @${user.username}`)

        } catch (error) {
          console.error(`Error processing user ${user.fid}:`, error)
        }

        // Small delay between users
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Delay between batches
      if (i + batchSize < followingUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(`Analysis complete: ${relationships.length} relationships to review`)

    return NextResponse.json({
      success: true,
      total_processed: processed,
      relationships_found: relationships.length,
      relationships: relationships.sort((a, b) => {
        // Sort by priority: non-mutual first, then by days since interaction
        if (!a.is_mutual_follow && b.is_mutual_follow) return -1
        if (a.is_mutual_follow && !b.is_mutual_follow) return 1
        return b.days_since_interaction - a.days_since_interaction
      })
    })

  } catch (error) {
    console.error('Error in analyze-relationships:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 