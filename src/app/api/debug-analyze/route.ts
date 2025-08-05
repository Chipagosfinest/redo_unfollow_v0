import { NextRequest, NextResponse } from 'next/server'
import { NeynarAPIClient } from '@neynar/nodejs-sdk'

export async function POST(request: NextRequest) {
  try {
    const { fid } = await request.json()
    
    if (!fid) {
      return NextResponse.json({ error: 'FID required' }, { status: 400 })
    }

    const apiKey = process.env.NEYNAR_API_KEY
    console.log('Debug - API Key exists:', !!apiKey)
    console.log('Debug - API Key length:', apiKey?.length)
    
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key' }, { status: 500 })
    }

    const client = new NeynarAPIClient({ apiKey })
    
    // Test step 1: fetchBulkUsers
    console.log('Debug - Testing fetchBulkUsers...')
    const bulkUsers = await client.fetchBulkUsers({ fids: [fid] })
    console.log('Debug - fetchBulkUsers success:', bulkUsers.users?.length || 0)
    
    // Test step 2: fetchUserFollowing
    console.log('Debug - Testing fetchUserFollowing...')
    const following = await client.fetchUserFollowing({ fid, limit: 10 })
    console.log('Debug - fetchUserFollowing success:', following.users?.length || 0)
    
    // Test step 3: fetchUserFollowers
    console.log('Debug - Testing fetchUserFollowers...')
    const followers = await client.fetchUserFollowers({ fid, limit: 10 })
    console.log('Debug - fetchUserFollowers success:', followers.users?.length || 0)
    
    return NextResponse.json({
      success: true,
      apiKeyExists: !!apiKey,
      apiKeyLength: apiKey.length,
      bulkUsers: bulkUsers.users?.length || 0,
      following: following.users?.length || 0,
      followers: followers.users?.length || 0
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      apiKeyExists: !!process.env.NEYNAR_API_KEY,
      apiKeyLength: process.env.NEYNAR_API_KEY?.length
    }, { status: 500 })
  }
} 