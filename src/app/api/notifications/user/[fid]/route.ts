import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params
    const userId = parseInt(fid)

    if (!userId || isNaN(userId)) {
      return NextResponse.json(
        { error: 'Valid FID is required' },
        { status: 400 }
      )
    }

    console.log(`🔔 Fetching notifications for user: ${userId}`)

    const notifications = await db.getNotificationsByUser(userId)

    return NextResponse.json({
      success: true,
      notifications: notifications.map(notif => ({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        targetUrl: notif.targetUrl,
        read: notif.read,
        createdAt: notif.createdAt
      }))
    })

  } catch (error) {
    console.error('❌ Failed to fetch notifications:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params
    const userId = parseInt(fid)
    const { notificationId } = await request.json()

    if (!userId || isNaN(userId)) {
      return NextResponse.json(
        { error: 'Valid FID is required' },
        { status: 400 }
      )
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    console.log(`📝 Marking notification ${notificationId} as read for user ${userId}`)

    const updatedNotification = await db.markNotificationAsRead(notificationId)

    if (!updatedNotification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      notification: {
        id: updatedNotification.id,
        read: updatedNotification.read
      }
    })

  } catch (error) {
    console.error('❌ Failed to mark notification as read:', error)
    return NextResponse.json(
      { 
        error: 'Failed to mark notification as read',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 