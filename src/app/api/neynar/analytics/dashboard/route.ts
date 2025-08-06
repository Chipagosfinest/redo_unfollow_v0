import { NextRequest, NextResponse } from 'next/server'

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { userFid, timeRange = '30d' } = await request.json()

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

    console.log(`📊 Generating analytics for user ${userFid} (${timeRange})`)

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

    // Calculate mutual vs non-mutual followers
    const mutualFollowers = followingUsers.filter((u: any) => followerFids.has(u.fid))
    const nonMutualFollowers = followingUsers.filter((u: any) => !followerFids.has(u.fid))

    // Calculate averages
    const totalFollowers = followers.length
    const totalFollowing = followingUsers.length
    const averageFollowers = totalFollowing > 0 ? 
      followingUsers.reduce((sum: number, u: any) => sum + (u.follower_count || 0), 0) / totalFollowing : 0
    const averageFollowing = totalFollowing > 0 ? 
      followingUsers.reduce((sum: number, u: any) => sum + (u.following_count || 0), 0) / totalFollowing : 0

    // Analyze activity patterns
    const now = Date.now()
    const activeUsers = followingUsers.filter((u: any) => {
      if (!u.last_cast_date) return false
      const lastCastDate = new Date(u.last_cast_date)
      const daysSinceLastCast = (now - lastCastDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceLastCast <= 30 // Active in last 30 days
    })

    const inactiveUsers = followingUsers.filter((u: any) => {
      if (!u.last_cast_date) return true
      const lastCastDate = new Date(u.last_cast_date)
      const daysSinceLastCast = (now - lastCastDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceLastCast > 60 // Inactive for 60+ days
    })

    const semiActiveUsers = followingUsers.filter((u: any) => {
      if (!u.last_cast_date) return false
      const lastCastDate = new Date(u.last_cast_date)
      const daysSinceLastCast = (now - lastCastDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceLastCast > 30 && daysSinceLastCast <= 60
    })

    // Calculate engagement metrics
    const totalEngagement = followingUsers.reduce((sum: number, u: any) => {
      return sum + (u.follower_count || 0) + (u.following_count || 0)
    }, 0)
    const averageEngagement = totalFollowing > 0 ? totalEngagement / totalFollowing : 0

    // Generate user categories
    const userCategories = [
      { category: 'Mutual Followers', count: mutualFollowers.length, percentage: (mutualFollowers.length / totalFollowing) * 100 },
      { category: 'Non-Mutual Followers', count: nonMutualFollowers.length, percentage: (nonMutualFollowers.length / totalFollowing) * 100 },
      { category: 'Active Users (30d)', count: activeUsers.length, percentage: (activeUsers.length / totalFollowing) * 100 },
      { category: 'Semi-Active Users', count: semiActiveUsers.length, percentage: (semiActiveUsers.length / totalFollowing) * 100 },
      { category: 'Inactive Users (60d+)', count: inactiveUsers.length, percentage: (inactiveUsers.length / totalFollowing) * 100 }
    ]

    // Generate top reasons for unfollowing
    const topReasons = [
      { reason: 'Non-mutual follow', count: nonMutualFollowers.length },
      { reason: 'No recent activity (60d+)', count: inactiveUsers.length },
      { reason: 'Low engagement ratio', count: followingUsers.filter((u: any) => {
        const ratio = u.follower_count > 0 ? u.following_count / u.follower_count : 0
        return ratio > 5
      }).length },
      { reason: 'Suspicious account', count: followingUsers.filter((u: any) => {
        return !u.display_name || u.follower_count < 5
      }).length },
      { reason: 'No profile picture', count: followingUsers.filter((u: any) => {
        return !u.pfp_url || u.pfp_url === ''
      }).length }
    ].sort((a, b) => b.count - a.count).slice(0, 5)

    // Generate activity trend based on time range
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const activityTrend = Array.from({ length: days }, (_, i) => {
      const date = new Date(now - (days - i - 1) * 24 * 60 * 60 * 1000)
      const usersActiveOnDate = followingUsers.filter((u: any) => {
        if (!u.last_cast_date) return false
        const lastCastDate = new Date(u.last_cast_date)
        const diffDays = Math.floor((now - lastCastDate.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays === days - i - 1
      }).length
      
      return {
        date: date.toLocaleDateString(),
        activeUsers: usersActiveOnDate,
        unfollows: 0 // This would be tracked from actual unfollow data
      }
    })

    const analytics = {
      totalFollowing,
      totalFollowers,
      mutualFollowers: mutualFollowers.length,
      nonMutualFollowers: nonMutualFollowers.length,
      activeUsers: activeUsers.length,
      semiActiveUsers: semiActiveUsers.length,
      inactiveUsers: inactiveUsers.length,
      recentlyUnfollowed: 0, // This would be tracked from actual unfollow data
      engagementRate: Math.round((activeUsers.length / totalFollowing) * 100),
      averageFollowers: Math.round(averageFollowers),
      averageFollowing: Math.round(averageFollowing),
      averageEngagement: Math.round(averageEngagement),
      topReasons,
      activityTrend,
      userCategories
    }

    console.log(`✅ Analytics generated successfully for user ${userFid}`)
    
    const response = NextResponse.json(analytics)
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error) {
    console.error('❌ Analytics generation failed:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to generate analytics', 
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