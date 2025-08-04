import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'user';
    
    const apiKey = env.neynarApiKey;
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Neynar API key not configured',
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasApiKey: false,
          envValidation: 'failed'
        }
      });
    }

    const results: any = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasApiKey: true,
        apiKeyLength: apiKey.length,
        envValidation: 'passed'
      }
    };

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
        // Test following endpoint
        try {
          const response = await fetch(`https://api.neynar.com/v2/farcaster/user/following?fid=194&viewer_fid=194`, {
            headers: { 'api_key': apiKey }
          });
          
          if (response.ok) {
            const data = await response.json();
            results.following = {
              success: true,
              userCount: data.users?.length || 0,
              hasUsers: !!data.users
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

      case 'environment':
        // Return environment information
        return NextResponse.json({ 
          success: true, 
          message: 'Environment info',
          environment: {
            nodeEnv: process.env.NODE_ENV,
            hasNeynarKey: !!apiKey,
            neynarKeyLength: apiKey.length,
            envValidation: 'passed'
          }
        });
        
      default:
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid action',
          availableActions: ['user', 'following', 'environment']
        });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test completed',
      results 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Test endpoint error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 