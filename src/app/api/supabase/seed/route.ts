import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'

// Sample inactive users to seed the database
const sampleInactiveUsers = [
  {
    fid: 99999,
    username: 'test_inactive_1',
    display_name: 'Test Inactive User 1',
    pfp_url: 'https://via.placeholder.com/150',
    last_cast_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
    days_since_last_cast: 90,
    inactive_score: 75,
    follows_back_percentage: 15.5,
    total_reports: 3
  },
  {
    fid: 99998,
    username: 'test_inactive_2',
    display_name: 'Test Inactive User 2',
    pfp_url: 'https://via.placeholder.com/150',
    last_cast_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days ago
    days_since_last_cast: 120,
    inactive_score: 85,
    follows_back_percentage: 8.2,
    total_reports: 5
  },
  {
    fid: 99997,
    username: 'test_inactive_3',
    display_name: 'Test Inactive User 3',
    pfp_url: 'https://via.placeholder.com/150',
    last_cast_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
    days_since_last_cast: 60,
    inactive_score: 60,
    follows_back_percentage: 25.0,
    total_reports: 2
  },
  {
    fid: 99996,
    username: 'test_inactive_4',
    display_name: 'Test Inactive User 4',
    pfp_url: 'https://via.placeholder.com/150',
    last_cast_date: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(), // 150 days ago
    days_since_last_cast: 150,
    inactive_score: 95,
    follows_back_percentage: 5.0,
    total_reports: 8
  },
  {
    fid: 99995,
    username: 'test_inactive_5',
    display_name: 'Test Inactive User 5',
    pfp_url: 'https://via.placeholder.com/150',
    last_cast_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    days_since_last_cast: 45,
    inactive_score: 45,
    follows_back_percentage: 30.0,
    total_reports: 1
  }
]

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Seeding database with sample inactive users...')
    
    let successCount = 0
    let errorCount = 0
    
    for (const user of sampleInactiveUsers) {
      try {
        const success = await db.upsertInactiveUser(user)
        if (success) {
          successCount++
          console.log(`✅ Added inactive user: ${user.username}`)
        } else {
          errorCount++
          console.error(`❌ Failed to add inactive user: ${user.username}`)
        }
      } catch (error) {
        errorCount++
        console.error(`❌ Error adding user ${user.username}:`, error)
      }
    }
    
    // Also add some sample reports
    const sampleReports = [
      { reporter_fid: 4044, reported_fid: 99999, reason: 'inactive' },
      { reporter_fid: 4044, reported_fid: 99998, reason: 'inactive' },
      { reporter_fid: 3, reported_fid: 99999, reason: 'inactive' },
      { reporter_fid: 3, reported_fid: 99997, reason: 'no_followback' }
    ]
    
    let reportSuccessCount = 0
    for (const report of sampleReports) {
      try {
        const success = await db.reportUser(report.reporter_fid, report.reported_fid, report.reason)
        if (success) {
          reportSuccessCount++
        }
      } catch (error) {
        console.error('Error adding report:', error)
      }
    }
    
    const response = NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      stats: {
        usersAdded: successCount,
        usersFailed: errorCount,
        reportsAdded: reportSuccessCount,
        totalUsers: sampleInactiveUsers.length
      }
    })
    
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
    
  } catch (error) {
    console.error('Seeding error:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to seed database', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
    errorResponse.headers.set('Access-Control-Allow-Origin', '*')
    return errorResponse
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return current database stats
    const inactiveUsers = await db.getInactiveUsers(1000)
    
    const response = NextResponse.json({
      success: true,
      stats: {
        totalInactiveUsers: inactiveUsers.length,
        averageInactiveScore: inactiveUsers.length > 0 
          ? Math.round(inactiveUsers.reduce((sum, u) => sum + u.inactive_score, 0) / inactiveUsers.length)
          : 0,
        topInactiveScore: inactiveUsers.length > 0 
          ? Math.max(...inactiveUsers.map(u => u.inactive_score))
          : 0,
        usersWithHighScores: inactiveUsers.filter(u => u.inactive_score >= 50).length
      }
    })
    
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
    
  } catch (error) {
    console.error('Stats error:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to get database stats', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
    errorResponse.headers.set('Access-Control-Allow-Origin', '*')
    return errorResponse
  }
} 