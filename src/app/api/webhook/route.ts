import { NextRequest, NextResponse } from 'next/server'
import { parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/miniapp-node'
import { addNotificationToken, removeNotificationTokensForFid } from '@/lib/notification-storage'
import { db } from '@/lib/database'

// Webhook secret from Neynar dashboard
const WEBHOOK_SECRET = process.env.NEYNAR_WEBHOOK_SECRET || 's6ZDc2nbNrAbxpJZr9q1UmE0X'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📨 Received webhook event:', body)

    // Verify the webhook signature
    const signature = request.headers.get('x-neynar-signature')
    if (!signature) {
      console.error('❌ Missing webhook signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

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

      case 'payment_success':
        console.log(`💰 Payment successful for FID: ${fid}`)
        // Handle payment success events
        if ('paymentDetails' in data) {
          const paymentDetails = data.paymentDetails as any
          console.log('Payment details:', paymentDetails)
          
          // Update payment status in database
          if (paymentDetails.paymentId) {
            await db.updatePayment(paymentDetails.paymentId, {
              status: 'completed',
              completedAt: new Date()
            })
            console.log(`✅ Updated payment ${paymentDetails.paymentId} to completed`)
          }
        }
        break

      case 'payment_failed':
        console.log(`❌ Payment failed for FID: ${fid}`)
        // Handle payment failure events
        if ('paymentDetails' in data) {
          const paymentDetails = data.paymentDetails as any
          console.log('Payment failure details:', paymentDetails)
          
          // Update payment status in database
          if (paymentDetails.paymentId) {
            await db.updatePayment(paymentDetails.paymentId, {
              status: 'failed'
            })
            console.log(`❌ Updated payment ${paymentDetails.paymentId} to failed`)
          }
        }
        break

      case 'analysis_complete':
        console.log(`✅ Analysis complete for FID: ${fid}`)
        // Handle analysis completion events
        if ('analysisDetails' in data) {
          const analysisDetails = data.analysisDetails as any
          console.log('Analysis details:', analysisDetails)
          
          // Create notification for user
          await db.createNotification({
            userId: fid,
            type: 'analysis_complete',
            title: '🧹 Your Analysis is Ready!',
            body: `Found ${analysisDetails.usersToUnfollow || 0} accounts ready for review.`,
            targetUrl: `/analysis-results/${analysisDetails.jobId}`,
            read: false
          })
          console.log(`📧 Created notification for FID: ${fid}`)
        }
        break

      default:
        console.log(`📝 Unhandled webhook event type: ${eventType}`)
        break
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Webhook processing failed:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  const response = NextResponse.json({})
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-neynar-signature')
  return response
} 