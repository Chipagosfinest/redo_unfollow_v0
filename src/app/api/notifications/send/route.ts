import { NextRequest, NextResponse } from 'next/server'
import { notificationTokens } from '../../webhook/route'

export async function POST(request: NextRequest) {
  try {
    const { notificationId, title, body, targetUrl, fids } = await request.json()
    
    if (!notificationId || !title || !body || !targetUrl || !fids) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`📤 Sending notification to ${fids.length} users:`, { notificationId, title, body })

    const tokens: string[] = []
    const urls: string[] = []

    // Collect tokens for the specified FIDs
    for (const [key, value] of notificationTokens.entries()) {
      if (fids.includes(value.fid)) {
        tokens.push(value.token)
        urls.push(value.url)
      }
    }

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'No notification tokens found for the specified FIDs' },
        { status: 404 }
      )
    }

    // Send notifications in batches of 100 (max allowed)
    const batchSize = 100
    const results = {
      successfulTokens: [] as string[],
      invalidTokens: [] as string[],
      rateLimitedTokens: [] as string[]
    }

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batchTokens = tokens.slice(i, i + batchSize)
      const batchUrls = urls.slice(i, i + batchSize)

      // Use the first URL in the batch (they should all be the same)
      const notificationUrl = batchUrls[0]

      try {
        const response = await fetch(notificationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notificationId,
            title,
            body,
            targetUrl,
            tokens: batchTokens
          })
        })

        if (response.ok) {
          const result = await response.json()
          results.successfulTokens.push(...(result.successfulTokens || []))
          results.invalidTokens.push(...(result.invalidTokens || []))
          results.rateLimitedTokens.push(...(result.rateLimitedTokens || []))
        } else {
          console.error(`Failed to send notification batch: ${response.status}`)
        }
      } catch (error) {
        console.error('Error sending notification batch:', error)
      }
    }

    // Clean up invalid tokens
    for (const invalidToken of results.invalidTokens) {
      for (const [key, value] of notificationTokens.entries()) {
        if (value.token === invalidToken) {
          notificationTokens.delete(key)
        }
      }
    }

    console.log(`✅ Notification sent successfully:`, {
      successful: results.successfulTokens.length,
      invalid: results.invalidTokens.length,
      rateLimited: results.rateLimitedTokens.length
    })

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('❌ Failed to send notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
} 