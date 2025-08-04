import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const logData = await request.json();
    
    // Enhanced logging with more context
    const enhancedLog = {
      ...logData,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      deployment: process.env.VERCEL_URL || 'local',
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      origin: request.headers.get('origin'),
    };
    
    console.log(`[${enhancedLog.level.toUpperCase()}] ${enhancedLog.message}`, enhancedLog);
    
    // In production, we could send to external logging service
    if (process.env.NODE_ENV === 'production') {
      // Could integrate with Sentry, LogRocket, etc.
      console.log('Production log:', enhancedLog);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Log endpoint error:', error);
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
} 