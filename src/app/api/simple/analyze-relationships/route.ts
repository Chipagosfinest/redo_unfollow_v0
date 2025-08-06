import { NextRequest, NextResponse } from 'next/server'

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY

interface Relationship {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  followerCount: number
  followingCount: number
  isMutual: boolean
  daysSinceInteraction: number
  reasons: string[]
  shouldUnfollow: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { userFid } = await request.json()

    if (!userFid) {
      return NextResponse.json(
        { error: 'userFid is required' },
        { status: 400 }
      )
    }

    if (!NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    console.log(`🔍 Analyzing relationships for user ${userFid}`)

    // Fetch user's following list
    const followingResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/following?fid=${userFid}&limit=100`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY,
          'accept': 'application/json',
        }
      }
    )

    if (!followingResponse.ok) {
      const errorData = await followingResponse.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to fetch following list: ${followingResponse.status}`)
    }

    const followingData = await followingResponse.json()
    const followingUsers = followingData.users || []

    // Fetch user's followers list
    const followersResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/followers?fid=${userFid}&limit=100`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY,
          'accept': 'application/json',
        }
      }
    )

    if (!followersResponse.ok) {
      const errorData = await followersResponse.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to fetch followers list: ${followersResponse.status}`)
    }

    const followersData = await followersResponse.json()
    const followers = followersData.users || []

    // Create a set of follower FIDs for quick lookup
    const followerFids = new Set(followers.map((f: any) => f.fid))

    // Analyze each following relationship
    const relationships: Relationship[] = []

    for (const user of followingUsers) {
      const isMutual = followerFids.has(user.fid)
      const reasons: string[] = []

      // Check if they don't follow back
      if (!isMutual) {
        reasons.push('Does not follow you back')
      }

      // Check for recent activity (last 60 days)
      const lastCastDate = user.last_cast_date ? new Date(user.last_cast_date) : null
      const daysSinceLastCast = lastCastDate ? 
        Math.floor((Date.now() - lastCastDate.getTime()) / (1000 * 60 * 60 * 24)) : 
        null

      if (daysSinceLastCast && daysSinceLastCast > 60) {
        reasons.push(`No activity for ${daysSinceLastCast} days`)
      }

      // Check follower/following ratio for potential bot detection
      const followerRatio = user.follower_count > 0 ? user.following_count / user.follower_count : 0
      if (followerRatio > 10) {
        reasons.push('Suspicious follower/following ratio')
      }

      // Determine if should unfollow based on criteria
      const shouldUnfollow = reasons.length > 0

      relationships.push({
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        pfpUrl: user.pfp_url,
        followerCount: user.follower_count,
        followingCount: user.following_count,
        isMutual,
        daysSinceInteraction: daysSinceLastCast || 0,
        reasons,
        shouldUnfollow
      })
    }

    // Sort by priority (non-mutual first, then by activity)
    relationships.sort((a, b) => {
      if (!a.isMutual && b.isMutual) return -1
      if (a.isMutual && !b.isMutual) return 1
      return b.daysSinceInteraction - a.daysSinceInteraction
    })

    const unfollowCandidates = relationships.filter(r => r.shouldUnfollow)
    const mutualFollowers = relationships.filter(r => r.isMutual)

    console.log(`✅ Analysis complete: ${relationships.length} total, ${unfollowCandidates.length} candidates`)

    return NextResponse.json({
      success: true,
      relationships,
      summary: {
        total: relationships.length,
        mutual: mutualFollowers.length,
        nonMutual: relationships.length - mutualFollowers.length,
        unfollowCandidates: unfollowCandidates.length,
        inactiveUsers: relationships.filter(r => r.daysSinceInteraction > 60).length
      }
    })

  } catch (error) {
    console.error('❌ Relationship analysis failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze relationships', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 