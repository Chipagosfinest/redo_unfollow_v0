import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    console.log('Debug endpoint called', { action, url: request.url });
    
    switch (action) {
      case 'test-neynar':
        // Test Neynar API with a known valid FID
        const testFid = '194'; // Dwr (known valid FID)
        console.log('Testing Neynar API with known FID', { testFid });
        
        const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${testFid}`, {
          headers: {
            'api_key': process.env.NEYNAR_API_KEY || ''
          }
        });
        
        const data = await response.json();
        console.log('Neynar test response', { 
          status: response.status, 
          ok: response.ok,
          hasData: !!data,
          hasUsers: !!data.users,
          userCount: data.users?.length || 0
        });
        
        return NextResponse.json({
          success: true,
          neynarTest: {
            status: response.status,
            ok: response.ok,
            hasData: !!data,
            hasUsers: !!data.users,
            userCount: data.users?.length || 0,
            data: data
          }
        });
        
      case 'test-mock-fid':
        // Test with the mock FID that's causing issues
        const mockFid = '12345';
        console.log('Testing with mock FID', { mockFid });
        
        const mockResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${mockFid}`, {
          headers: {
            'api_key': process.env.NEYNAR_API_KEY || ''
          }
        });
        
        const mockData = await mockResponse.json();
        console.log('Mock FID test response', { 
          status: mockResponse.status, 
          ok: mockResponse.ok,
          hasData: !!mockData,
          hasUsers: !!mockData.users,
          userCount: mockData.users?.length || 0
        });
        
        return NextResponse.json({
          success: true,
          mockFidTest: {
            status: mockResponse.status,
            ok: mockResponse.ok,
            hasData: !!mockData,
            hasUsers: !!mockData.users,
            userCount: mockData.users?.length || 0,
            data: mockData
          }
        });
        
      case 'environment':
        // Return environment info
        return NextResponse.json({
          success: true,
          environment: {
            nodeEnv: process.env.NODE_ENV,
            vercelUrl: process.env.VERCEL_URL,
            hasNeynarKey: !!process.env.NEYNAR_API_KEY,
            neynarKeyLength: process.env.NEYNAR_API_KEY?.length || 0,
            timestamp: new Date().toISOString()
          }
        });
        
      default:
        return NextResponse.json({
          success: true,
          availableActions: ['test-neynar', 'test-mock-fid', 'environment'],
          message: 'Use ?action= to test specific functionality'
        });
    }
  } catch (error) {
    console.error('Debug endpoint error', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 