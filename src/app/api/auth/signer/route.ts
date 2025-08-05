import { NextRequest, NextResponse } from 'next/server'
import { NeynarAPIClient, isApiErrorResponse } from '@neynar/nodejs-sdk'

const client = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    // Create a new signer
    const result = await client.createSigner()
    
    console.log('Signer creation result:', result)
    
    return NextResponse.json({
      signer_uuid: result.signer_uuid,
      status: result.status,
      public_key: result.public_key,
      signer_approval_url: result.signer_approval_url || `https://warpcast.com/~/signer-approval?signer_uuid=${result.signer_uuid}`
    })
  } catch (error) {
    console.error('Signer creation error:', error)
    
    if (isApiErrorResponse(error)) {
      return NextResponse.json(
        { error: error.response.data.message || 'API Error' },
        { status: error.response.status }
      )
    }
    
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

    // Get signer status
    const result = await client.lookupSigner({ signerUuid })
    
    console.log('Signer lookup result:', result)
    
    return NextResponse.json({
      signer_uuid: result.signer_uuid,
      status: result.status,
      public_key: result.public_key,
      fid: result.fid
    })
  } catch (error) {
    console.error('Signer lookup error:', error)
    
    if (isApiErrorResponse(error)) {
      return NextResponse.json(
        { error: error.response.data.message || 'API Error' },
        { status: error.response.status }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to lookup signer' },
      { status: 500 }
    )
  }
} 