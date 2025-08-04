import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'user';
    
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Neynar API key not configured' 
      });
    }

    const results: any = {};

    switch (testType) {
      case 'user':
        // Test user lookup with different FIDs
        const testFids = [12345, 194, 2, 3]; // Known Farcaster FIDs
        for (const fid of testFids) {
          try {
            const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
              headers: { 'api_key': apiKey }
            });
            
            if (response.ok) {
              const data = await response.json();
              results[`fid_${fid}`] = {
                success: true,
                data: data.users?.[0] || null
              };
            } else {
              results[`fid_${fid}`] = {
                success: false,
                status: response.status,
                error: `HTTP ${response.status}`
              };
            }
          } catch (error) {
            results[`fid_${fid}`] = {
              success: false,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        }
        break;

      case 'following':
        // Test following list for a known user
        try {
          const response = await fetch(`https://api.neynar.com/v2/farcaster/user/following?fid=12345&viewer_fid=12345`, {
            headers: { 'api_key': apiKey }
          });
          
          if (response.ok) {
            const data = await response.json();
            results.following = {
              success: true,
              count: data.users?.length || 0,
              sample: data.users?.slice(0, 5) || []
            };
          } else {
            results.following = {
              success: false,
              status: response.status,
              error: `HTTP ${response.status}`
            };
          }
        } catch (error) {
          results.following = {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
        break;

      case 'casts':
        // Test getting user casts
        try {
          const response = await fetch(`https://api.neynar.com/v2/farcaster/cast/user?fid=12345&viewer_fid=12345`, {
            headers: { 'api_key': apiKey }
          });
          
          if (response.ok) {
            const data = await response.json();
            results.casts = {
              success: true,
              count: data.casts?.length || 0,
              sample: data.casts?.slice(0, 3) || []
            };
          } else {
            results.casts = {
              success: false,
              status: response.status,
              error: `HTTP ${response.status}`
            };
          }
        } catch (error) {
          results.casts = {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
        break;

      case 'mutual':
        // Test mutual follow checking
        try {
          const response = await fetch(`https://api.neynar.com/v2/farcaster/user/followers?fid=12345&viewer_fid=194`, {
            headers: { 'api_key': apiKey }
          });
          
          if (response.ok) {
            const data = await response.json();
            const isMutual = data.users?.some((user: any) => user.fid === 194);
            results.mutual = {
              success: true,
              isMutual,
              followerCount: data.users?.length || 0
            };
          } else {
            results.mutual = {
              success: false,
              status: response.status,
              error: `HTTP ${response.status}`
            };
          }
        } catch (error) {
          results.mutual = {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
        break;

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid test type. Use: user, following, casts, or mutual' 
        });
    }

    return NextResponse.json({
      success: true,
      testType,
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 