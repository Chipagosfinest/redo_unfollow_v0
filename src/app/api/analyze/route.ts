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
  isSpam?: boolean
  shouldUnfollow?: boolean
}

interface AnalysisResult {
  totalFollowing: number
  totalPages: number
  currentPage: number
  users: User[]
  summary: {
    inactiveCount: number
    nonMutualCount: number
    spamCount: number
    mutualCount: number
    unfollowableCount: number
  }
}

// Cache for API responses (2 minutes for faster updates)
const cache = new Map<string, { data: AnalysisResult; timestamp: number }>()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

export async function POST(request: NextRequest) {
  try {
    const { fid, page = 1, limit = 50 } = await request.json()

    if (!fid || typeof fid !== 'number') {
      return NextResponse.json(
        { error: 'Valid FID is required' },
        { status: 400 }
      )
    }

    // Check cache first
    const cacheKey = `analyze_${fid}_${page}_${limit}`
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
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      // Get following list with pagination
      const followingResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/following?fid=${fid}&limit=1000`,
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
      const allFollowing = followingData.users || []

      // Get followers list for mutual detection
      const followersResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/followers?fid=${fid}&limit=1000`,
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
      const allFollowers = followersData.users || []

      clearTimeout(timeoutId)

      // Create sets for efficient lookup
      const followerFids = new Set(allFollowers.map((user: any) => user.user.fid))

      // Analyze all users first
      const allAnalyzedUsers: User[] = allFollowing.map((user: any) => {
        const userData = user.user
        const isMutual = followerFids.has(userData.fid)
        
        // Calculate metrics
        const followerCount = userData.follower_count || 0
        const followingCount = userData.following_count || 0
        const isInactive = followerCount < 5 && followingCount > 100
        const isSpam = followerCount < 10 && followingCount > 500
        const shouldUnfollow = !isMutual || isInactive || isSpam

        return {
          fid: userData.fid,
          username: userData.username || 'unknown',
          displayName: userData.display_name || userData.username || 'Unknown User',
          pfpUrl: userData.pfp_url || '',
          followerCount,
          followingCount,
          isMutual,
          isInactive,
          isSpam,
          shouldUnfollow
        }
      })

      // Calculate summary
      const summary = {
        inactiveCount: allAnalyzedUsers.filter(u => u.isInactive).length,
        nonMutualCount: allAnalyzedUsers.filter(u => !u.isMutual).length,
        spamCount: allAnalyzedUsers.filter(u => u.isSpam).length,
        mutualCount: allAnalyzedUsers.filter(u => u.isMutual).length,
        unfollowableCount: allAnalyzedUsers.filter(u => u.shouldUnfollow).length
      }

      // Paginate results
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedUsers = allAnalyzedUsers.slice(startIndex, endIndex)
      const totalPages = Math.ceil(allAnalyzedUsers.length / limit)

      const analysis: AnalysisResult = {
        totalFollowing: allAnalyzedUsers.length,
        totalPages,
        currentPage: page,
        users: paginatedUsers,
        summary
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