import { NextRequest, NextResponse } from 'next/server'
import { NeynarAPIClient, isApiErrorResponse } from '@neynar/nodejs-sdk'

const client = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const { signerUuid } = await request.json()
    
    if (!signerUuid) {
      return NextResponse.json(
        { error: 'Signer UUID is required' },
        { status: 400 }
      )
    }

    // Get signer info to get the user FID
    const signerInfo = await client.lookupSigner({ signerUuid })
    
    if (!signerInfo.fid) {
      return NextResponse.json(
        { error: 'Signer not approved or no user FID found' },
        { status: 400 }
      )
    }

    // Get user data by FID
    const { users } = await client.fetchBulkUsers({ fids: [signerInfo.fid] })
    const userData = users[0]
    
    return NextResponse.json({
      fid: userData.fid,
      username: userData.username,
      display_name: userData.display_name,
      pfp_url: userData.pfp_url,
      follower_count: userData.follower_count,
      following_count: userData.following_count
    })
  } catch (error) {
    console.error('User data fetch error:', error)
    
    if (isApiErrorResponse(error)) {
      return NextResponse.json(
        { error: error.response.data.message || 'API Error' },
        { status: error.response.status }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
} 