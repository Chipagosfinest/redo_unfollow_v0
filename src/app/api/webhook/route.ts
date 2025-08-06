import { NextRequest, NextResponse } from 'next/server'
import { parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/miniapp-node'
import { addNotificationToken, removeNotificationTokensForFid } from '@/lib/notification-storage'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📨 Received webhook event:', body)

    // Verify the webhook event
    const data = await parseWebhookEvent(body, verifyAppKeyWithNeynar)
    console.log('✅ Verified webhook event:', data)

    const eventType = data.event as unknown as string
    const fid = data.fid as unknown as number

    switch (eventType) {
      case 'miniapp_added':
        console.log(`📱 Mini App added for FID: ${fid}`)
        // Handle notification details if available
        if ('notificationDetails' in data && data.notificationDetails) {
          const details = data.notificationDetails as { token: string; url: string }
          addNotificationToken(fid, details.token, details.url)
          console.log(`💾 Saved notification token for FID: ${fid}`)
        }
        break

      case 'miniapp_removed':
        console.log(`📱 Mini App removed for FID: ${fid}`)
        removeNotificationTokensForFid(fid)
        console.log(`🗑️ Removed notification tokens for FID: ${fid}`)
        break

      case 'notifications_disabled':
        console.log(`🔕 Notifications disabled for FID: ${fid}`)
        removeNotificationTokensForFid(fid)
        console.log(`🗑️ Removed notification tokens for FID: ${fid}`)
        break

      case 'notifications_enabled':
        console.log(`🔔 Notifications enabled for FID: ${fid}`)
        // Handle notification details if available
        if ('notificationDetails' in data && data.notificationDetails) {
          const details = data.notificationDetails as { token: string; url: string }
          addNotificationToken(fid, details.token, details.url)
          console.log(`💾 Saved notification token for FID: ${fid}`)
        }
        break

      default:
        console.log(`❓ Unknown event type: ${eventType}`)
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
// Note: This is in-memory storage. In production, use Redis or a database 