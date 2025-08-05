import { NextRequest, NextResponse } from 'next/server'
import { NeynarAPIClient } from '@neynar/nodejs-sdk'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY
    console.log('API Key exists:', !!apiKey)
    console.log('API Key length:', apiKey?.length)
    
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key found' }, { status: 500 })
    }

    const client = new NeynarAPIClient({ apiKey })
    
    // Test with a simple API call
    const userData = await client.fetchBulkUsers({ fids: [2] })
    
    return NextResponse.json({
      success: true,
      apiKeyExists: !!apiKey,
      apiKeyLength: apiKey.length,
      userData: userData.users?.length || 0
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      apiKeyExists: !!process.env.NEYNAR_API_KEY,
      apiKeyLength: process.env.NEYNAR_API_KEY?.length
    }, { status: 500 })
  }
} 