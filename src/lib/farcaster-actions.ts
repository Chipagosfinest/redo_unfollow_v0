export interface FarcasterSigner {
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  getPublicKey: () => Promise<Uint8Array>;
  getFid: () => Promise<number>;
}

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName?: string;
  pfp?: { url?: string };
  followerCount?: number;
  followingCount?: number;
}

export interface UnfollowResult {
  success: boolean;
  error?: string;
  messageHash?: string;
}

// Get Farcaster native wallet signer
import { sdk } from '@farcaster/miniapp-sdk';

export async function getFarcasterSigner(): Promise<FarcasterSigner | null> {
  try {
    // Initialize the SDK
    await sdk.actions.ready();
    
    // In Mini App environment, get user from global window object
    if (typeof window !== 'undefined' && 'farcaster' in window) {
      // @ts-ignore - Farcaster global object
      const farcaster = (window as any).farcaster;
      
      if (farcaster?.user?.fid) {
        return {
          signMessage: async (message: Uint8Array) => {
            // For Mini Apps, we'll use a mock signing approach
            // In a real implementation, this would use the native signing
            console.log('Mock signing for Mini App environment');
            return new Uint8Array(32); // Mock signature
          },
          getPublicKey: async () => {
            // Get public key from user data
            return new Uint8Array(0); // Placeholder - SDK will handle this
          },
          getFid: async () => {
            return farcaster.user.fid;
          }
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error getting Farcaster signer:", error);
    return null;
  }
}

// Real unfollow implementation using Farcaster native wallet
export async function unfollowUser(signer: FarcasterSigner, targetFid: number): Promise<UnfollowResult> {
  try {
    console.log(`Attempting to unfollow user ${targetFid}...`);
    
    // Get user's FID
    const userFid = await signer.getFid();
    
    // Create FollowRemoveMessage
    const followRemoveMessage = {
      data: {
        type: "follow-remove",
        fid: userFid,
        targetFid: targetFid,
        timestamp: Math.floor(Date.now() / 1000)
      }
    };
    
    // Sign the message
    const messageBytes = new TextEncoder().encode(JSON.stringify(followRemoveMessage));
    const signature = await signer.signMessage(messageBytes);
    
    // Submit to Farcaster Hub
    const hubResponse = await fetch('https://api.farcaster.xyz/v2/submit-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: followRemoveMessage,
        signature: Array.from(signature)
      })
    });
    
    if (!hubResponse.ok) {
      throw new Error(`Hub submission failed: ${hubResponse.statusText}`);
    }
    
    const result = await hubResponse.json();
    
    console.log(`Successfully unfollowed user ${targetFid}`);
    
    return {
      success: true,
      messageHash: result.hash
    };
  } catch (error) {
    console.error(`Failed to unfollow user ${targetFid}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Get following list with pagination (like UnfollowX scrolling)
export async function getFollowingList(userFid: number, cursor?: string): Promise<{
  users: Array<{
    fid: number;
    username: string;
    displayName: string;
    pfp: string;
  }>;
  nextCursor?: string;
}> {
  try {
    const url = cursor 
      ? `https://api.farcaster.xyz/v2/following?fid=${userFid}&cursor=${cursor}&limit=20`
      : `https://api.farcaster.xyz/v2/following?fid=${userFid}&limit=20`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch following list: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      users: data.result?.users?.map((user: FarcasterUser) => ({
        fid: user.fid,
        username: user.username,
        displayName: user.displayName || user.username,
        pfp: user.pfp?.url || "https://via.placeholder.com/40"
      })) || [],
      nextCursor: data.result?.next?.cursor
    };
  } catch (error) {
    console.error("Error fetching following list:", error);
    throw error;
  }
}

// Batch unfollow function like UnfollowX
export async function batchUnfollow(
  signer: FarcasterSigner, 
  targetFids: number[], 
  onProgress?: (current: number, total: number) => void
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ fid: number; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ fid: number; error: string }>
  };

  for (let i = 0; i < targetFids.length; i++) {
    const fid = targetFids[i];
    
    try {
      const result = await unfollowUser(signer, fid);
      
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ fid, error: result.error || "Unknown error" });
      }
      
      // Progress callback like UnfollowX logging
      onProgress?.(i + 1, targetFids.length);
      
      // Rate limiting like UnfollowX sleep
      if (i < targetFids.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ 
        fid, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  }

  return results;
} 