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

    const { userFid, timeRange = '30d' } = await request.json()
    
    if (!userFid) {
      return NextResponse.json(
        { error: 'User FID is required' },
        { status: 400 }
      )
    }

    console.log(`📊 Generating analytics for user ${userFid} (${timeRange})`)

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

    // Step 2: Get user's followers list
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

    // Step 3: Calculate analytics
    const followerFids = new Set(followers.map((f: any) => f.fid))
    const mutualFollowers = followingUsers.filter((u: any) => followerFids.has(u.fid))
    const nonMutualFollowers = followingUsers.filter((u: any) => !followerFids.has(u.fid))

    // Calculate averages
    const totalFollowers = followers.length
    const totalFollowing = followingUsers.length
    const averageFollowers = totalFollowing > 0 ? 
      followingUsers.reduce((sum: number, u: any) => sum + (u.followerCount || 0), 0) / totalFollowing : 0
    const averageFollowing = totalFollowing > 0 ? 
      followingUsers.reduce((sum: number, u: any) => sum + (u.followingCount || 0), 0) / totalFollowing : 0

    // Simulate inactive users (in real implementation, you'd analyze activity)
    const inactiveUsers = Math.floor(totalFollowing * 0.3) // 30% inactive
    const activeUsers = totalFollowing - inactiveUsers

    // Calculate engagement rate (simulated)
    const engagementRate = Math.max(20, Math.min(80, 50 + (Math.random() - 0.5) * 30))

    // Generate user categories
    const userCategories = [
      { category: 'Mutual Followers', count: mutualFollowers.length, percentage: (mutualFollowers.length / totalFollowing) * 100 },
      { category: 'Non-Mutual Followers', count: nonMutualFollowers.length, percentage: (nonMutualFollowers.length / totalFollowing) * 100 },
      { category: 'Active Users', count: activeUsers, percentage: (activeUsers / totalFollowing) * 100 },
      { category: 'Inactive Users', count: inactiveUsers, percentage: (inactiveUsers / totalFollowing) * 100 }
    ]

    // Generate top reasons (simulated)
    const topReasons = [
      { reason: 'Non-mutual follow', count: nonMutualFollowers.length },
      { reason: 'No recent activity', count: Math.floor(inactiveUsers * 0.7) },
      { reason: 'Low engagement', count: Math.floor(totalFollowing * 0.2) },
      { reason: 'Spam/bot account', count: Math.floor(totalFollowing * 0.1) },
      { reason: 'Inactive for 60+ days', count: Math.floor(inactiveUsers * 0.5) }
    ].sort((a, b) => b.count - a.count).slice(0, 5)

    // Generate activity trend (simulated)
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const activityTrend = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      unfollows: Math.floor(Math.random() * 10) + (i % 3 === 0 ? 5 : 0) // Some days have more activity
    }))

    const analytics = {
      totalFollowing,
      totalFollowers,
      mutualFollowers: mutualFollowers.length,
      nonMutualFollowers: nonMutualFollowers.length,
      inactiveUsers,
      activeUsers,
      recentlyUnfollowed: Math.floor(totalFollowing * 0.1), // 10% recently unfollowed
      engagementRate,
      averageFollowers: Math.round(averageFollowers),
      averageFollowing: Math.round(averageFollowing),
      topReasons,
      activityTrend,
      userCategories
    }

    console.log(`✅ Analytics generated successfully`)
    
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