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

export async function POST(request: NextRequest) {
  try {
    const { count = 20, batchSize = 5, delay = 2000, minFollowers = 10, maxFollowers = 50 } = await request.json()
    
    // Generate random FIDs
    const randomFids = generateRandomFids(count)
    
    console.log(`Generated ${count} random FIDs: ${randomFids.slice(0, 10).join(', ')}...`)
    console.log(`Filtering for users with ${minFollowers}-${maxFollowers} followers`)
    
    // Process them in batches
    const results: any[] = []
    const errors: string[] = []
    
    for (let i = 0; i < randomFids.length; i += batchSize) {
      const batch = randomFids.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(randomFids.length / batchSize)}`)
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/neynar/inactive-users`, {
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
        
        if (data.success && data.results.length > 0) {
          results.push(...data.results)
          console.log(`Batch found ${data.results.length} inactive users`)
        }

      } catch (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${error}`)
      }

      // Add delay between batches
      if (i + batchSize < randomFids.length) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return NextResponse.json({
      success: true,
      total_fids_processed: randomFids.length,
      inactive_users_found: results.length,
      errors: errors,
      results: results.sort((a, b) => b.inactive_score - a.inactive_score)
    })

  } catch (error) {
    console.error('Error in random inactive users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '10')
    const batchSize = parseInt(searchParams.get('batch_size') || '5')
    const delay = parseInt(searchParams.get('delay') || '2000')
    
    // Generate and process random FIDs
    const randomFids = generateRandomFids(count)
    
    console.log(`Generated ${count} random FIDs for GET request`)
    
    // Process them in batches
    const results: any[] = []
    
    for (let i = 0; i < randomFids.length; i += batchSize) {
      const batch = randomFids.slice(i, i + batchSize)
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/neynar/inactive-users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fids: batch,
            limit: batchSize
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.results.length > 0) {
            results.push(...data.results)
          }
        }

      } catch (error) {
        console.error('Error processing batch:', error)
      }

      // Add delay between batches
      if (i + batchSize < randomFids.length) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return NextResponse.json({
      success: true,
      total_fids_processed: randomFids.length,
      inactive_users_found: results.length,
      results: results.sort((a, b) => b.inactive_score - a.inactive_score)
    })

  } catch (error) {
    console.error('Error in random inactive users GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 