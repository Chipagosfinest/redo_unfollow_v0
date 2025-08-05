import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@farcaster/quick-auth'

const client = createClient()

export async function POST(request: NextRequest) {
  try {
    // Verify Quick Auth token
    const authorization = request.headers.get('Authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 401 }
      )
    }

    const token = authorization.split(' ')[1]
    
    try {
      const payload = await client.verifyJwt({
        token,
        domain: process.env.NEXT_PUBLIC_APP_URL || 'https://redounfollowv0-oyjqxoqm5-chipagosfinests-projects.vercel.app',
      })

      const { fid, page = 1, limit = 50 } = await request.json()

      const apiKey = process.env.NEYNAR_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: 'Neynar API key not configured' },
          { status: 500 }
        )
      }

      console.log(`Analyzing following list for FID: ${fid}`)

      // Fetch following list
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

      // Fetch followers list
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

      // Analyze users
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

      console.log(`Found ${usersToUnfollow.length} users to unfollow (showing ${paginatedUsers.length})`)

      return NextResponse.json({
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

    } catch (error) {
      console.error('Token verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze following' },
      { status: 500 }
    )
  }
} 