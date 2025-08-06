import { NextRequest, NextResponse } from 'next/server'
import { NeynarAPIClient } from '@neynar/nodejs-sdk'

const client = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const result = await client.createSigner()
    
    return NextResponse.json({
      signer_uuid: result.signer_uuid,
      signer_approval_url: result.signer_approval_url
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create signer' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const signerUuid = searchParams.get('signer_uuid')
    
    if (!signerUuid) {
      return NextResponse.json(
        { error: 'Signer UUID is required' },
        { status: 400 }
      )
    }

    const result = await client.lookupSigner({ signerUuid })
    
    return NextResponse.json({
      status: result.status
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check signer status' },
      { status: 500 }
    )
  }
} 