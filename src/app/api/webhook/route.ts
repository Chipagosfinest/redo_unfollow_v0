import { NextRequest, NextResponse } from 'next/server'
import { parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/miniapp-node'

// In-memory storage for notification tokens (replace with Redis in production)
const notificationTokens = new Map<string, { token: string; url: string; fid: number }>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📨 Received webhook event:', body)

    // Verify the webhook event
    const data = await parseWebhookEvent(body, verifyAppKeyWithNeynar)
    console.log('✅ Verified webhook event:', data)

    const { event, fid } = data

    switch (event) {
      case 'miniapp_added':
        console.log(`📱 Mini App added for FID: ${fid}`)
        if (data.notificationDetails) {
          const key = `${fid}-${data.notificationDetails.token}`
          notificationTokens.set(key, {
            token: data.notificationDetails.token,
            url: data.notificationDetails.url,
            fid
          })
          console.log(`💾 Saved notification token for FID: ${fid}`)
        }
        break

      case 'miniapp_removed':
        console.log(`📱 Mini App removed for FID: ${fid}`)
        // Remove all tokens for this FID
        for (const [key, value] of notificationTokens.entries()) {
          if (value.fid === fid) {
            notificationTokens.delete(key)
          }
        }
        console.log(`🗑️ Removed notification tokens for FID: ${fid}`)
        break

      case 'notifications_disabled':
        console.log(`🔕 Notifications disabled for FID: ${fid}`)
        // Remove all tokens for this FID
        for (const [key, value] of notificationTokens.entries()) {
          if (value.fid === fid) {
            notificationTokens.delete(key)
          }
        }
        console.log(`🗑️ Removed notification tokens for FID: ${fid}`)
        break

      case 'notifications_enabled':
        console.log(`🔔 Notifications enabled for FID: ${fid}`)
        if (data.notificationDetails) {
          const key = `${fid}-${data.notificationDetails.token}`
          notificationTokens.set(key, {
            token: data.notificationDetails.token,
            url: data.notificationDetails.url,
            fid
          })
          console.log(`💾 Saved notification token for FID: ${fid}`)
        }
        break

      default:
        console.log(`❓ Unknown event type: ${event}`)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    )
  }
}

// Export the notification tokens for use in other parts of the app
export { notificationTokens } 