import { NextRequest, NextResponse } from 'next/server'

// Generate random FIDs in a reasonable range
function generateRandomFids(count: number, minFid: number = 1, maxFid: number = 100000): number[] {
  const fids: number[] = []
  const used = new Set<number>()
  
  while (fids.length < count) {
    const randomFid = Math.floor(Math.random() * (maxFid - minFid + 1)) + minFid
    
    if (!used.has(randomFid)) {
      used.add(randomFid)
      fids.push(randomFid)
    }
  }
  
  return fids
}

// Aggressive rate limiting - pushing 80% of limits
const RATE_LIMIT_CONFIG = {
  // Assuming Growth plan (10 RPS = 600 RPM)
  REQUESTS_PER_SECOND: 8, // 80% of 10 RPS
  DELAY_BETWEEN_REQUESTS: 125, // 1000ms / 8 = 125ms
  BATCH_SIZE: 8, // Process 8 FIDs at once
  CONCURRENT_BATCHES: 3 // Run 3 batches concurrently
}

// Fetch user's recent casts from Neynar
async function fetchUserCasts(fid: number): Promise<any[]> {
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/feed/user/casts/?fid=${fid}&limit=50`,
      {
        headers: {
          'x-api-key': process.env.NEYNAR_API_KEY!,
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
          'x-api-key': process.env.NEYNAR_API_KEY!,
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

// Check if user is inactive with aggressive processing
async function checkUserInactivity(fid: number, minFollowers: number = 10, maxFollowers: number = 50): Promise<any | null> {
  try {
    // Fetch both casts and profile concurrently
    const [casts, profile] = await Promise.all([
      fetchUserCasts(fid),
      fetchUserProfile(fid)
    ])
    
    if (!profile) return null

    // Check follower count filter first
    const followerCount = profile.follower_count || 0
    if (followerCount < minFollowers || followerCount > maxFollowers) {
      return null
    }

    if (casts.length === 0) {
      // No casts found - consider as inactive
      return {
        fid,
        username: profile.username || 'unknown',
        display_name: profile.display_name || 'Unknown User',
        pfp_url: profile.pfp_url || '',
        last_cast_date: new Date(0).toISOString(),
        days_since_last_cast: 999,
        inactive_score: 100,
        followers_count: followerCount,
        following_count: profile.following_count || 0,
      }
    }

    // Get the most recent cast
    const mostRecentCast = casts[0]
    const lastCastDate = mostRecentCast.timestamp
    const daysSinceLastCast = Math.floor((Date.now() - new Date(lastCastDate).getTime()) / (1000 * 60 * 60 * 24))

    // Only consider inactive if 75+ days
    if (daysSinceLastCast < 75) {
      return null
    }

    const inactiveScore = Math.min(daysSinceLastCast * 2, 100)

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

// Process a batch of FIDs aggressively
async function processBatch(fids: number[], minFollowers: number, maxFollowers: number): Promise<any[]> {
  const results: any[] = []
  
  // Process all FIDs in the batch concurrently
  const promises = fids.map(fid => checkUserInactivity(fid, minFollowers, maxFollowers))
  const batchResults = await Promise.all(promises)
  
  // Filter out null results
  return batchResults.filter(result => result !== null)
}

export async function POST(request: NextRequest) {
  try {
    const { count = 100, minFollowers = 10, maxFollowers = 50 } = await request.json()
    
    // Generate random FIDs
    const randomFids = generateRandomFids(count)
    
    console.log(`🚀 AGGRESSIVE MODE: Processing ${count} FIDs with ${RATE_LIMIT_CONFIG.REQUESTS_PER_SECOND} RPS`)
    console.log(`Filtering for ${minFollowers}-${maxFollowers} followers`)
    
    const results: any[] = []
    const errors: string[] = []
    
    // Process in aggressive batches
    for (let i = 0; i < randomFids.length; i += RATE_LIMIT_CONFIG.BATCH_SIZE) {
      const batch = randomFids.slice(i, i + RATE_LIMIT_CONFIG.BATCH_SIZE)
      const batchNumber = Math.floor(i / RATE_LIMIT_CONFIG.BATCH_SIZE) + 1
      const totalBatches = Math.ceil(randomFids.length / RATE_LIMIT_CONFIG.BATCH_SIZE)
      
      console.log(`🔥 Processing batch ${batchNumber}/${totalBatches} (${batch.length} FIDs)`)
      
      try {
        const batchResults = await processBatch(batch, minFollowers, maxFollowers)
        results.push(...batchResults)
        
        console.log(`✅ Batch ${batchNumber} found ${batchResults.length} inactive users`)
        
        // Add minimal delay between batches to stay under rate limit
        if (i + RATE_LIMIT_CONFIG.BATCH_SIZE < randomFids.length) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.DELAY_BETWEEN_REQUESTS))
        }
        
      } catch (error) {
        const errorMsg = `Batch ${batchNumber} failed: ${error}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    console.log(`🎯 AGGRESSIVE SEARCH COMPLETE: Found ${results.length} inactive users from ${randomFids.length} FIDs`)

    return NextResponse.json({
      success: true,
      total_fids_processed: randomFids.length,
      inactive_users_found: results.length,
      success_rate: ((results.length / randomFids.length) * 100).toFixed(1),
      errors: errors,
      results: results.sort((a, b) => b.inactive_score - a.inactive_score),
      rate_limit_info: {
        requests_per_second: RATE_LIMIT_CONFIG.REQUESTS_PER_SECOND,
        batch_size: RATE_LIMIT_CONFIG.BATCH_SIZE,
        delay_ms: RATE_LIMIT_CONFIG.DELAY_BETWEEN_REQUESTS
      }
    })

  } catch (error) {
    console.error('Error in aggressive inactive users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '50')
    const minFollowers = parseInt(searchParams.get('min_followers') || '10')
    const maxFollowers = parseInt(searchParams.get('max_followers') || '50')
    
    // Generate and process random FIDs aggressively
    const randomFids = generateRandomFids(count)
    
    console.log(`🚀 AGGRESSIVE GET: Processing ${count} FIDs`)
    
    const results: any[] = []
    
    // Process in aggressive batches
    for (let i = 0; i < randomFids.length; i += RATE_LIMIT_CONFIG.BATCH_SIZE) {
      const batch = randomFids.slice(i, i + RATE_LIMIT_CONFIG.BATCH_SIZE)
      
      try {
        const batchResults = await processBatch(batch, minFollowers, maxFollowers)
        results.push(...batchResults)
        
        // Minimal delay between batches
        if (i + RATE_LIMIT_CONFIG.BATCH_SIZE < randomFids.length) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.DELAY_BETWEEN_REQUESTS))
        }
        
      } catch (error) {
        console.error('Error processing batch:', error)
      }
    }

    return NextResponse.json({
      success: true,
      total_fids_processed: randomFids.length,
      inactive_users_found: results.length,
      success_rate: ((results.length / randomFids.length) * 100).toFixed(1),
      results: results.sort((a, b) => b.inactive_score - a.inactive_score)
    })

  } catch (error) {
    console.error('Error in aggressive inactive users GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 