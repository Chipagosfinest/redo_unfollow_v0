import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { fid, page = 1, limit = 50, useCache = true } = await request.json()
    
    console.log(`🔍 Analyzing FID ${fid} using Supabase database...`)
    
    // Get inactive users from database
    const inactiveUsers = await db.getInactiveUsers(200) // Get top 200 inactive users
    
    console.log(`📊 Found ${inactiveUsers.length} inactive users in database`)
    
    if (inactiveUsers.length === 0) {
      return NextResponse.json({
        users: [],
        summary: {
          total: 0,
          inactive: 0,
          notFollowingBack: 0,
          page,
          limit,
          hasMore: false,
          source: 'supabase',
          message: 'No inactive users found in database'
        }
      })
    }
    
    // For now, return all inactive users as suggestions
    // In the future, we'll cross-reference with user's actual following list
    const usersToUnfollow = inactiveUsers.map(user => ({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url,
      followerCount: 0, // We'll get this from Neynar if needed
      followingCount: 0,
      isInactive: true,
      isMutual: false, // We'll determine this from user's following list
      reason: 'inactive',
      daysSinceActive: user.days_since_last_cast,
      inactiveScore: user.inactive_score,
      totalReports: user.total_reports
    }))
    
    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedUsers = usersToUnfollow.slice(startIndex, endIndex)
    
    const response = NextResponse.json({
      users: paginatedUsers,
      summary: {
        total: usersToUnfollow.length,
        inactive: usersToUnfollow.length,
        notFollowingBack: 0,
        page,
        limit,
        hasMore: endIndex < usersToUnfollow.length,
        source: 'supabase',
        databaseStats: {
          totalInactiveUsers: inactiveUsers.length,
          averageInactiveScore: Math.round(inactiveUsers.reduce((sum, u) => sum + u.inactive_score, 0) / inactiveUsers.length),
          topInactiveScore: Math.max(...inactiveUsers.map(u => u.inactive_score))
        }
      }
    })
    
    // Add proper CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
    
  } catch (error) {
    console.error('Supabase analysis error:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to analyze using Supabase', 
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