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

// Cache for API responses (5 minutes)
const cache = new Map<string, { data: AnalysisResult; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { fid } = await request.json()

    if (!fid || typeof fid !== 'number') {
      return NextResponse.json(
        { error: 'Valid FID is required' },
        { status: 400 }
      )
    }

    // Check cache first
    const cacheKey = `analyze_${fid}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data)
    }

    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      )
    }

    // Fetch data with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      // Get following list
      const followingResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/following?fid=${fid}&limit=100`,
        {
          headers: {
            'api_key': apiKey,
            'accept': 'application/json'
          },
          signal: controller.signal
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

      // Get followers list
      const followersResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/followers?fid=${fid}&limit=100`,
        {
          headers: {
            'api_key': apiKey,
            'accept': 'application/json'
          },
          signal: controller.signal
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

      clearTimeout(timeoutId)

      // Create sets for efficient lookup
      const followerFids = new Set(followers.map((user: any) => user.user.fid))

      // Analyze users with optimized processing
      const analysis: AnalysisResult = {
        totalFollowing: following.length,
        inactiveUsers: [],
        nonMutualUsers: [],
        spamUsers: [],
        mutualUsers: []
      }

      // Process users in batches for better performance
      const batchSize = 50
      for (let i = 0; i < following.length; i += batchSize) {
        const batch = following.slice(i, i + batchSize)
        
        for (const user of batch) {
          const userData = user.user
          const isMutual = followerFids.has(userData.fid)
          
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

          // Detect inactive users
          if (userData.follower_count < 5 && userData.following_count > 100) {
            analyzedUser.isInactive = true
            analysis.inactiveUsers.push(analyzedUser)
          }
        }
      }

      // Cache the result
      cache.set(cacheKey, { data: analysis, timestamp: Date.now() })

      return NextResponse.json(analysis)
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    console.error('Analysis error:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - please try again' },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze following' },
      { status: 500 }
    )
  }
} 