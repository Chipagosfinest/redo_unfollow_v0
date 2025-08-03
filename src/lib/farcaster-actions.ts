export interface FarcasterSigner {
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  getPublicKey: () => Promise<Uint8Array>;
}

export interface UnfollowResult {
  success: boolean;
  error?: string;
  messageHash?: string;
}

// Mock implementation for now - in production this would use real Farcaster signing
export async function unfollowUser(signer: FarcasterSigner, targetFid: number): Promise<UnfollowResult> {
  try {
    console.log(`Attempting to unfollow user ${targetFid}...`);
    
    // Simulate the unfollow process like UnfollowX does
    // In a real implementation, this would:
    // 1. Create a FollowRemoveMessage
    // 2. Sign it with the user's private key
    // 3. Submit to Farcaster Hub
    
    // Simulate network delay like UnfollowX
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success (in production, this would be real unfollow)
    console.log(`Successfully unfollowed user ${targetFid}`);
    
    return {
      success: true,
      messageHash: `mock_hash_${Date.now()}`
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