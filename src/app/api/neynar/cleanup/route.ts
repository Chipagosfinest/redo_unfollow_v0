import { NextRequest, NextResponse } from 'next/server'

// Rate limiting and retry configuration
const RATE_LIMIT_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second base delay
  maxDelay: 10000, // 10 seconds max delay
  batchSize: 20,
  delayBetweenBatches: 1000,
  delayBetweenRequests: 50
}

// Circuit breaker state
const circuitBreaker = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false,
  threshold: 5,
  timeout: 30000 // 30 seconds
} as {
  failures: number
  lastFailureTime: number
  isOpen: boolean
  threshold: number
  timeout: number
}

// Helper function for exponential backoff delay
const exponentialBackoff = (attempt: number, baseDelay: number = 1000) => {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), RATE_LIMIT_CONFIG.maxDelay)
  return new Promise(resolve => setTimeout(resolve, delay))
}

// Helper function to check if circuit breaker should be open
const shouldOpenCircuitBreaker = () => {
  const now = Date.now()
  if (circuitBreaker.failures >= circuitBreaker.threshold) {
    if (now - circuitBreaker.lastFailureTime < circuitBreaker.timeout) {
      return true
    } else {
      // Reset circuit breaker after timeout
      circuitBreaker.failures = 0
      circuitBreaker.isOpen = false
    }
  }
  return false
}

// Robust API request function with retry logic
async function makeApiRequest(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
  if (shouldOpenCircuitBreaker()) {
    throw new Error('Circuit breaker is open - too many recent failures')
  }

  try {
    console.log(`🌐 Making API request to: ${url}`)
    const startTime = Date.now()
    
    const response = await fetch(url, options)
    const duration = Date.now() - startTime
    
    console.log(`📡 API response: ${response.status} (${duration}ms)`)
    
    if (response.ok) {
      // Reset failure count on success
      circuitBreaker.failures = 0
      return response
    }
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : RATE_LIMIT_CONFIG.baseDelay * Math.pow(2, retryCount)
      
      console.log(`⏳ Rate limited (429). Waiting ${waitTime}ms before retry ${retryCount + 1}`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      
      if (retryCount < RATE_LIMIT_CONFIG.maxRetries) {
        return makeApiRequest(url, options, retryCount + 1)
      }
    }
    
    // Handle other errors
    if (response.status >= 500 && retryCount < RATE_LIMIT_CONFIG.maxRetries) {
      console.log(`🔄 Server error ${response.status}, retrying... (attempt ${retryCount + 1})`)
      await exponentialBackoff(retryCount)
      return makeApiRequest(url, options, retryCount + 1)
    }
    
    return response
    
  } catch (error) {
    console.error(`❌ API request failed:`, error)
    
    // Update circuit breaker
    circuitBreaker.failures++
    circuitBreaker.lastFailureTime = Date.now()
    
    if (retryCount < RATE_LIMIT_CONFIG.maxRetries) {
      console.log(`🔄 Network error, retrying... (attempt ${retryCount + 1})`)
      await exponentialBackoff(retryCount)
      return makeApiRequest(url, options, retryCount + 1)
    }
    
    throw error
  }
}

// Queue for managing concurrent requests
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private concurrentLimit = 5
  private activeRequests = 0

  async add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.activeRequests++
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.activeRequests--
          this.processQueue()
        }
      })
      
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0 || this.activeRequests >= this.concurrentLimit) {
      return
    }

    this.processing = true
    
    while (this.queue.length > 0 && this.activeRequests < this.concurrentLimit) {
      const requestFn = this.queue.shift()
      if (requestFn) {
        requestFn()
      }
    }
    
    this.processing = false
  }
}

const requestQueue = new RequestQueue()

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    console.log(`📥 Request body:`, requestBody)
    
    const { 
      fid, 
      filters = {
        nonMutual: true,
        noInteractionWithYou: true,
        youNoInteraction: true,
        nuclear: false
      },
      limit = 100,
      threshold = 60, // 60 days for interaction analysis
      testMode = false // Show all users for debugging
    } = requestBody
    
    // Validate FID
    if (!fid || typeof fid !== 'number') {
      console.error(`❌ Invalid FID: ${fid} (type: ${typeof fid})`)
      return NextResponse.json(
        { error: `Invalid FID: ${fid}. Expected a number.` },
        { status: 400 }
      )
    }
    
    const apiKey = process.env.NEYNAR_API_KEY
    if (!apiKey) {
      console.error(`❌ API key not configured`)
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    console.log(`🧹 Starting comprehensive cleanup analysis for FID: ${fid}`)
    console.log(`📊 Filters:`, filters)
    console.log(`⏰ Threshold: ${threshold} days`)
    console.log(`🔑 API Key present: ${apiKey ? 'Yes' : 'No'} (length: ${apiKey?.length})`)

    // 1. Fetch following list with retry logic
    console.log(`🔍 Fetching following list...`)
    const followingUrl = `https://api.neynar.com/v2/farcaster/following?fid=${fid}&viewer_fid=${fid}&limit=${limit}`
    
    const followingResponse = await requestQueue.add(() => 
      makeApiRequest(followingUrl, {
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey,
        },
      })
    )

    if (!followingResponse.ok) {
      const errorText = await followingResponse.text()
      console.error(`❌ Following API error: ${followingResponse.status} - ${errorText}`)
      return NextResponse.json(
        { error: `Failed to fetch following list: ${followingResponse.status} - ${errorText}` },
        { status: 500 }
      )
    }

    const followingData = await followingResponse.json()
    const following = followingData.users || []
    console.log(`📊 Found ${following.length} following users`)

    // 2. Fetch followers list for mutual analysis
    console.log(`🔍 Fetching followers list...`)
    const followersResponse = await requestQueue.add(() => 
      makeApiRequest(
        `https://api.neynar.com/v2/farcaster/followers?fid=${fid}&viewer_fid=${fid}&limit=${limit}`,
        {
          headers: {
            'accept': 'application/json',
            'x-api-key': apiKey,
          },
        }
      )
    )

    if (!followersResponse.ok) {
      const errorText = await followersResponse.text()
      console.error(`❌ Followers API error: ${followersResponse.status} - ${errorText}`)
      return NextResponse.json(
        { error: `Failed to fetch followers list: ${followersResponse.status}` },
        { status: 500 }
      )
    }

    const followersData = await followersResponse.json()
    const followers = followersData.users || []
    console.log(`📊 Found ${followers.length} followers`)

    // 3. Create sets for efficient lookup
    const followerFids = new Set(followers.map((f: any) => f.fid))
    const followingFids = new Set(following.map((f: any) => f.fid))
    
    // Sort following list by priority: non-mutual first, then by FID (lower = older)
    following.sort((a: any, b: any) => {
      // First, prioritize non-mutual follows
      const aIsMutual = followerFids.has(a.fid)
      const bIsMutual = followerFids.has(b.fid)
      
      if (!aIsMutual && bIsMutual) return -1
      if (aIsMutual && !bIsMutual) return 1
      
      // Then sort by FID (lower = older)
      return a.fid - b.fid
    })
    
    console.log(`🔄 Sorted following list - prioritizing oldest and non-mutual follows first`)

    // 4. Analyze each following user with improved rate limiting
    const analyzedUsers: any[] = []
    const filterCounts = {
      nonMutual: 0,
      noInteractionWithYou: 0,
      youNoInteraction: 0,
      nuclear: 0
    }

    // Process users in batches with improved rate limiting
    console.log(`🔄 Processing ${following.length} users in batches of ${RATE_LIMIT_CONFIG.batchSize}...`)

    for (let i = 0; i < following.length; i += RATE_LIMIT_CONFIG.batchSize) {
      const batch = following.slice(i, i + RATE_LIMIT_CONFIG.batchSize)
      console.log(`📦 Processing batch ${Math.floor(i / RATE_LIMIT_CONFIG.batchSize) + 1}/${Math.ceil(following.length / RATE_LIMIT_CONFIG.batchSize)} (${batch.length} users)`)
      
      // Process batch with controlled concurrency
      const batchPromises = batch.map(async (user: any, index: number) => {
        // Add delay between individual requests within batch
        await new Promise(resolve => setTimeout(resolve, index * RATE_LIMIT_CONFIG.delayBetweenRequests))
        
        return requestQueue.add(async () => {
          const analysis = {
            fid: user.fid,
            username: user.username,
            displayName: user.displayName,
            pfpUrl: user.pfp?.url || '',
            followerCount: user.followerCount,
            followingCount: user.followingCount,
            isMutual: followerFids.has(user.fid),
            lastActiveStatus: user.lastActiveStatus,
            reasons: [] as string[],
            shouldUnfollow: false
          }

          // Check non-mutual follows first (no API call needed)
          if (!analysis.isMutual) {
            analysis.reasons.push('Non-mutual follow')
            filterCounts.nonMutual++
            if (filters.nonMutual) {
              analysis.shouldUnfollow = true
            }
          }

          // Only check interactions if we need to (not already marked for unfollow)
          if (!analysis.shouldUnfollow && filters.noInteractionWithYou) {
            try {
              const interactionsResponse = await makeApiRequest(
                `https://api.neynar.com/v2/farcaster/user/interactions?fids=${fid},${user.fid}&type=follows`,
                {
                  headers: {
                    'accept': 'application/json',
                    'x-api-key': apiKey,
                  },
                }
              )

              if (interactionsResponse.ok) {
                const interactionsData = await interactionsResponse.json()
                const interactions = interactionsData.interactions || []
                
                // Check if there are recent interactions (within last 60 days)
                const recentInteractions = interactions.filter((interaction: any) => {
                  const interactionTime = new Date(interaction.most_recent_timestamp).getTime()
                  const daysSinceInteraction = (Date.now() - interactionTime) / (1000 * 60 * 60 * 24)
                  return daysSinceInteraction <= threshold
                })

                if (recentInteractions.length === 0) {
                  analysis.reasons.push('No recent interactions')
                  filterCounts.noInteractionWithYou++
                  if (filters.noInteractionWithYou) {
                    analysis.shouldUnfollow = true
                  }
                }
              }
            } catch (error) {
              console.error(`❌ Failed to fetch interactions for user ${user.fid}:`, error)
              // Skip this user if we can't fetch interaction data
              analysis.reasons.push('Unable to verify interactions')
            }
          }

          // Nuclear option - unfollow everyone
          if (filters.nuclear) {
            analysis.reasons.push('Nuclear option')
            filterCounts.nuclear++
            analysis.shouldUnfollow = true
          }

          return analysis
        })
      })

      const batchResults = await Promise.all(batchPromises)
      analyzedUsers.push(...batchResults)
      
      // Add delay between batches
      if (i + RATE_LIMIT_CONFIG.batchSize < following.length) {
        console.log(`⏳ Waiting ${RATE_LIMIT_CONFIG.delayBetweenBatches}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.delayBetweenBatches))
      }
    }

    // 5. Filter users based on selected filters
    const usersToUnfollow = analyzedUsers.filter(user => user.shouldUnfollow)

    console.log(`📊 Analysis complete:`, {
      totalFollowing: following.length,
      totalFollowers: followers.length,
      mutualFollows: analyzedUsers.filter(u => u.isMutual).length,
      nonMutualFollows: analyzedUsers.filter(u => !u.isMutual).length,
      usersToUnfollow: usersToUnfollow.length,
      filterCounts,
      circuitBreakerState: {
        failures: circuitBreaker.failures,
        isOpen: circuitBreaker.isOpen
      }
    })
    
    // Debug: Show some sample users for testing
    if (analyzedUsers.length > 0) {
      console.log(`🔍 Sample analyzed users:`, analyzedUsers.slice(0, 3).map(u => ({
        fid: u.fid,
        username: u.username,
        isMutual: u.isMutual,
        reasons: u.reasons,
        shouldUnfollow: u.shouldUnfollow
      })))
    }

    const response = NextResponse.json({
      success: true,
      users: usersToUnfollow,
      summary: {
        totalFollowing: following.length,
        totalFollowers: followers.length,
        mutualFollows: analyzedUsers.filter(u => u.isMutual).length,
        nonMutualFollows: analyzedUsers.filter(u => !u.isMutual).length,
        usersToUnfollow: usersToUnfollow.length,
        filterCounts
      }
    })
    
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error) {
    console.error('❌ Cleanup analysis failed:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to analyze following list', 
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