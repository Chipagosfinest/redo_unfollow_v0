import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.NEYNAR_API_KEY
    const clientId = process.env.NEYNAR_CLIENT_ID
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      apiKeyExists: !!apiKey,
      clientIdExists: !!clientId,
      environment: process.env.NODE_ENV
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 