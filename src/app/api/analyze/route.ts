import { NextRequest, NextResponse } from 'next/server'
import { NeynarAPIClient, isApiErrorResponse } from '@neynar/nodejs-sdk'

const client = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY! })

interface User {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  followerCount: number
  followingCount: number
  lastActive?: string
  isMutual?: boolean
  isInactive?: boolean
}

interface AnalysisResult {
  totalFollowing: number
  inactiveUsers: User[]
  nonMutualUsers: User[]
  spamUsers: User[]
  mutualUsers: User[]
}

export async function POST(request: NextRequest) {
  try {
    const { fid } = await request.json()

    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      )
    }

    // Get user's following list
    const followingResponse = await client.fetchUserFollowing(fid)
    const following = followingResponse.users || []

    // Get user's followers list
    const followersResponse = await client.fetchUserFollowers(fid)
    const followers = followersResponse.users || []

    // Create sets for efficient lookup
    const followingFids = new Set(following.map(user => user.user.fid))
    const followerFids = new Set(followers.map(user => user.user.fid))

    // Analyze users
    const analysis: AnalysisResult = {
      totalFollowing: following.length,
      inactiveUsers: [],
      nonMutualUsers: [],
      spamUsers: [],
      mutualUsers: []
    }

    for (const user of following) {
      const userData = user.user
      const isMutual = followerFids.has(userData.fid)
      
      // Convert to our User interface
      const analyzedUser: User = {
        fid: userData.fid,
        username: userData.username || 'unknown',
        displayName: userData.display_name || userData.username || 'Unknown User',
        pfpUrl: userData.pfp_url || '',
        followerCount: userData.follower_count || 0,
        followingCount: userData.following_count || 0,
        isMutual
      }

      // Categorize users
      if (isMutual) {
        analysis.mutualUsers.push(analyzedUser)
      } else {
        analysis.nonMutualUsers.push(analyzedUser)
      }

      // Detect potential spam (low followers, high following ratio)
      if (userData.follower_count < 10 && userData.following_count > 500) {
        analysis.spamUsers.push(analyzedUser)
      }

      // Detect inactive users (no recent activity - this would need more data)
      // For now, we'll use a simple heuristic based on follower/following ratio
      if (userData.follower_count < 5 && userData.following_count > 100) {
        analyzedUser.isInactive = true
        analysis.inactiveUsers.push(analyzedUser)
      }
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Analysis error:', error)
    
    if (isApiErrorResponse(error)) {
      return NextResponse.json(
        { error: error.response.data.message || 'API Error' },
        { status: error.response.status }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze following' },
      { status: 500 }
    )
  }
} 