import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'test-neynar':
        // Test Neynar API with a real FID
        try {
          const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=12345`, {
            headers: {
              'api_key': process.env.NEYNAR_API_KEY || ''
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            return NextResponse.json({ 
              success: true, 
              message: 'Neynar API test successful',
              data: data.users[0]
            });
          } else {
            return NextResponse.json({ 
              success: false, 
              message: 'Neynar API test failed',
              status: response.status
            });
          }
        } catch (error) {
          return NextResponse.json({ 
            success: false, 
            message: 'Neynar API test error',
            error: error instanceof Error ? error.message : String(error)
          });
        }
        
      case 'test-mock-fid':
        // Test with mock FID
        return NextResponse.json({ 
          success: true, 
          message: 'Mock FID test',
          mockUser: {
            fid: 12345,
            username: 'stinos',
            displayName: 'Stijn den Engelse',
            bio: 'Decentralization maxi',
            followerCount: 195,
            followingCount: 180
          }
        });
        
      case 'environment':
        // Return environment information
        return NextResponse.json({ 
          success: true, 
          message: 'Environment info',
          environment: {
            nodeEnv: process.env.NODE_ENV,
            hasNeynarKey: !!process.env.NEYNAR_API_KEY,
            neynarKeyLength: process.env.NEYNAR_API_KEY?.length || 0
          }
        });
        
      default:
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid action',
          availableActions: ['test-neynar', 'test-mock-fid', 'environment']
        });
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Debug endpoint error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 