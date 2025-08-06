// Removed Supabase dependency - using Neynar API only

export interface InactiveUser {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  last_cast_date: string
  days_since_last_cast: number
  inactive_score: number
  followers_count: number
  following_count: number
  last_updated: string
}

export interface BatchProcessResult {
  success: boolean
  processed: number
  inactive_found: number
  errors: string[]
  results: InactiveUser[]
}

// Batch process FIDs to find inactive users
export async function batchProcessInactiveUsers(
  fids: number[], 
  batchSize: number = 5,
  delayBetweenBatches: number = 2000
): Promise<BatchProcessResult> {
  const results: InactiveUser[] = []
  const errors: string[] = []
  let processed = 0

  console.log(`Starting batch processing of ${fids.length} FIDs in batches of ${batchSize}`)

  for (let i = 0; i < fids.length; i += batchSize) {
    const batch = fids.slice(i, i + batchSize)
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fids.length / batchSize)}`)

    try {
      const response = await fetch('/api/neynar/inactive-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fids: batch,
          limit: batchSize
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${errorText}`)
        continue
      }

      const data = await response.json()
      
      if (data.success) {
        results.push(...data.results)
        processed += data.processed
        console.log(`Batch completed: ${data.inactive_users_found} inactive users found`)
      } else {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1} returned error: ${data.error}`)
      }

    } catch (error) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${error}`)
    }

    // Add delay between batches to avoid overwhelming the API
    if (i + batchSize < fids.length) {
      console.log(`Waiting ${delayBetweenBatches}ms before next batch...`)
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }
  }

  return {
    success: errors.length === 0,
    processed,
    inactive_found: results.length,
    errors,
    results: results.sort((a, b) => b.inactive_score - a.inactive_score)
  }
}

// Get inactive users that a specific user follows
export async function getInactiveUsersForUser(userFid: number): Promise<InactiveUser[]> {
  try {
    // First get the user's following list
    const followingResponse = await fetch(`/api/neynar/user/following?fid=${userFid}`)
    if (!followingResponse.ok) {
      console.error('Failed to fetch user following list')
      return []
    }

    const followingData = await followingResponse.json()
    const followingFids = followingData.following?.map((user: any) => user.fid) || []

    if (followingFids.length === 0) {
      return []
    }

    // Process the following list to find inactive users
    const batchResult = await batchProcessInactiveUsers(followingFids, 10, 1000)
    return batchResult.results
  } catch (error) {
    console.error('Error getting inactive users for user:', error)
    return []
  }
} 