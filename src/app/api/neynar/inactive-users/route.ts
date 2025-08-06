import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY
const RATE_LIMIT_DELAY = 100 // 100ms between requests to avoid rate limiting

interface Cast {
  hash: string
  text: string
  timestamp: string
  author: {
    fid: number
    username: string
    display_name: string
    pfp_url: string
  }
}

interface InactiveUserData {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  last_cast_date: string
  days_since_last_cast: number
  inactive_score: number
  followers_count: number
  following_count: number
}

// Helper function to calculate days since last cast
function calculateDaysSinceLastCast(lastCastDate: string): number {
  const lastCast = new Date(lastCastDate)
  const now = new Date()
  const diffTime = now.getTime() - lastCast.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

// Helper function to calculate inactive score
function calculateInactiveScore(daysSinceLastCast: number, followersCount: number): number {
  // Base score from days inactive
  let score = Math.min(daysSinceLastCast * 2, 100)
  
  // Bonus for high follower counts (more impactful when inactive)
  if (followersCount > 1000) {
    score += 10
  }
  if (followersCount > 5000) {
    score += 15
  }
  
  return Math.min(score, 100)
}

// Fetch user's recent casts from Neynar
async function fetchUserCasts(fid: number): Promise<Cast[]> {
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/feed/user/casts/?fid=${fid}&limit=50`,
      {
        headers: {
          'x-api-key': NEYNAR_API_KEY!,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status}`)
    }

    const data = await response.json()
    return data.casts || []
  } catch (error) {
    console.error(`Error fetching casts for FID ${fid}:`, error)
    return []
  }
}

// Fetch user profile from Neynar
async function fetchUserProfile(fid: number) {
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'x-api-key': NEYNAR_API_KEY!,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status}`)
    }

    const data = await response.json()
    return data.users?.[0] || null
  } catch (error) {
    console.error(`Error fetching profile for FID ${fid}:`, error)
    return null
  }
}

// Check if user is inactive (75+ days since last cast)
async function checkUserInactivity(fid: number, minFollowers: number = 10, maxFollowers: number = 50): Promise<InactiveUserData | null> {
  try {
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))

    const casts = await fetchUserCasts(fid)
    
    if (casts.length === 0) {
      // No casts found - consider as inactive
      const profile = await fetchUserProfile(fid)
      if (!profile) return null

      // Check follower count filter
      const followerCount = profile.follower_count || 0
      if (followerCount < minFollowers || followerCount > maxFollowers) {
        return null
      }

      return {
        fid,
        username: profile.username || 'unknown',
        display_name: profile.display_name || 'Unknown User',
        pfp_url: profile.pfp_url || '',
        last_cast_date: new Date(0).toISOString(), // Never cast
        days_since_last_cast: 999, // Very high number
        inactive_score: 100,
        followers_count: followerCount,
        following_count: profile.following_count || 0,
      }
    }

    // Get the most recent cast
    const mostRecentCast = casts[0]
    const lastCastDate = mostRecentCast.timestamp
    const daysSinceLastCast = calculateDaysSinceLastCast(lastCastDate)

    // Only consider inactive if 75+ days
    if (daysSinceLastCast < 75) {
      return null
    }

    const profile = await fetchUserProfile(fid)
    if (!profile) return null

    // Check follower count filter
    const followerCount = profile.follower_count || 0
    if (followerCount < minFollowers || followerCount > maxFollowers) {
      return null
    }

    const inactiveScore = calculateInactiveScore(daysSinceLastCast, followerCount)

    return {
      fid,
      username: profile.username || mostRecentCast.author.username,
      display_name: profile.display_name || mostRecentCast.author.display_name,
      pfp_url: profile.pfp_url || mostRecentCast.author.pfp_url,
      last_cast_date: lastCastDate,
      days_since_last_cast: daysSinceLastCast,
      inactive_score: inactiveScore,
      followers_count: followerCount,
      following_count: profile.following_count || 0,
    }
  } catch (error) {
    console.error(`Error checking inactivity for FID ${fid}:`, error)
    return null
  }
}

// Cache inactive user data in Supabase
async function cacheInactiveUser(userData: InactiveUserData): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('inactive_users')
      .upsert({
        fid: userData.fid,
        username: userData.username,
        display_name: userData.display_name,
        pfp_url: userData.pfp_url,
        last_cast: userData.last_cast_date,
        last_active_status: userData.last_cast_date,
        inactive_score: userData.inactive_score,
        followers_count: userData.followers_count,
        following_count: userData.following_count,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error caching inactive user:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error caching inactive user:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { fids, limit = 10, minFollowers = 10, maxFollowers = 50 } = await request.json()

    if (!fids || !Array.isArray(fids)) {
      return NextResponse.json(
        { error: 'fids array is required' },
        { status: 400 }
      )
    }

    const results: InactiveUserData[] = []
    const processedCount = Math.min(fids.length, limit)

    console.log(`Processing ${processedCount} FIDs for inactivity check (${minFollowers}-${maxFollowers} followers)...`)

    for (let i = 0; i < processedCount; i++) {
      const fid = fids[i]
      console.log(`Checking FID ${fid} (${i + 1}/${processedCount})`)

      const inactiveUser = await checkUserInactivity(fid, minFollowers, maxFollowers)
      
      if (inactiveUser) {
        // Cache the inactive user
        await cacheInactiveUser(inactiveUser)
        results.push(inactiveUser)
        
        console.log(`Found inactive user: ${inactiveUser.username} (${inactiveUser.days_since_last_cast} days, ${inactiveUser.followers_count} followers)`)
      }

      // Add delay between requests to avoid rate limiting
      if (i < processedCount - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      inactive_users_found: results.length,
      results: results.sort((a, b) => b.inactive_score - a.inactive_score)
    })

  } catch (error) {
    console.error('Error in inactive users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const minScore = parseInt(searchParams.get('min_score') || '30')

    const { data, error } = await supabase
      .from('inactive_users')
      .select('*')
      .gte('inactive_score', minScore)
      .order('inactive_score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching inactive users:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      results: data || []
    })

  } catch (error) {
    console.error('Error in inactive users GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 