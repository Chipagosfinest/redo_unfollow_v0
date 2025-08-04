import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const logData = await request.json();
    
    // Log to Vercel's built-in logging
    console.log(`[${logData.level.toUpperCase()}] ${logData.message}`, {
      timestamp: logData.timestamp,
      url: logData.url,
      userAgent: logData.userAgent,
      data: logData.data
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in logging endpoint:', error);
    return NextResponse.json({ success: false, error: 'Failed to log' }, { status: 500 });
  }
} 