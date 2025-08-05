import { NextRequest, NextResponse } from 'next/server'

interface User {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  followerCount: number
  followingCount: number
  lastActive?: string
  isMutual?: boolean
  isInactive?: boolean
}

interface AnalysisResult {
  totalFollowing: number
  inactiveUsers: User[]
  nonMutualUsers: User[]
  spamUsers: User[]
  mutualUsers: User[]
}

export async function POST(request: NextRequest) {
  try {
    const { fid } = await request.json()

    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      )
    }

    console.log('Analyzing FID:', fid)

    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      )
    }

    // Use direct API calls for reliability
    const followingResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/following?fid=${fid}&limit=100`,
      {
        headers: {
          'api_key': apiKey,
          'accept': 'application/json'
        }
      }
    )

    if (!followingResponse.ok) {
      const errorText = await followingResponse.text()
      console.error('Following API error:', followingResponse.status, errorText)
      return NextResponse.json(
        { error: `Failed to fetch following data: ${followingResponse.status}` },
        { status: followingResponse.status }
      )
    }

    const followingData = await followingResponse.json()
    const following = followingData.users || []

    console.log('Following count:', following.length)

    const followersResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/followers?fid=${fid}&limit=100`,
      {
        headers: {
          'api_key': apiKey,
          'accept': 'application/json'
        }
      }
    )

    if (!followersResponse.ok) {
      const errorText = await followersResponse.text()
      console.error('Followers API error:', followersResponse.status, errorText)
      return NextResponse.json(
        { error: `Failed to fetch followers data: ${followersResponse.status}` },
        { status: followersResponse.status }
      )
    }

    const followersData = await followersResponse.json()
    const followers = followersData.users || []

    console.log('Followers count:', followers.length)

    // Create sets for efficient lookup
    const followingFids = new Set(following.map((user: any) => user.user.fid))
    const followerFids = new Set(followers.map((user: any) => user.user.fid))

    // Analyze users
    const analysis: AnalysisResult = {
      totalFollowing: following.length,
      inactiveUsers: [],
      nonMutualUsers: [],
      spamUsers: [],
      mutualUsers: []
    }

    for (const user of following) {
      const userData = user.user
      const isMutual = followerFids.has(userData.fid)
      
      // Convert to our User interface
      const analyzedUser: User = {
        fid: userData.fid,
        username: userData.username || 'unknown',
        displayName: userData.display_name || userData.username || 'Unknown User',
        pfpUrl: userData.pfp_url || '',
        followerCount: userData.follower_count || 0,
        followingCount: userData.following_count || 0,
        isMutual
      }

      // Categorize users
      if (isMutual) {
        analysis.mutualUsers.push(analyzedUser)
      } else {
        analysis.nonMutualUsers.push(analyzedUser)
      }

      // Detect potential spam (low followers, high following ratio)
      if (userData.follower_count < 10 && userData.following_count > 500) {
        analysis.spamUsers.push(analyzedUser)
      }

      // Detect inactive users (no recent activity - this would need more data)
      // For now, we'll use a simple heuristic based on follower/following ratio
      if (userData.follower_count < 5 && userData.following_count > 100) {
        analyzedUser.isInactive = true
        analysis.inactiveUsers.push(analyzedUser)
      }
    }

    console.log('Analysis complete:', {
      total: analysis.totalFollowing,
      mutual: analysis.mutualUsers.length,
      nonMutual: analysis.nonMutualUsers.length,
      inactive: analysis.inactiveUsers.length,
      spam: analysis.spamUsers.length
    })

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze following' },
      { status: 500 }
    )
  }
} 