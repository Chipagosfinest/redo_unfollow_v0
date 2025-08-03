export interface UnfollowResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export interface FarcasterSigner {
  getFid(): Promise<number>;
  signMessage(message: unknown): Promise<string>;
}

export async function unfollowUser(
  signer: FarcasterSigner,
  targetFid: number
): Promise<UnfollowResult> {
  try {
    // TODO: Implement real unfollow with proper message signing
    // For now, simulate successful unfollow
    console.log("Unfollow message created for:", { targetFid });
    
    return {
      success: true,
      hash: "mock_hash_" + Date.now(),
    };
  } catch (error) {
    console.error("Unfollow error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getFollowingList(signer: FarcasterSigner): Promise<number[]> {
  try {
    const userFid = await signer.getFid();
    const response = await fetch(`https://api.farcaster.xyz/v2/following?fid=${userFid}&limit=100`);
    
    if (!response.ok) {
      throw new Error("Failed to get following list");
    }

    const data = await response.json();
    
    if (!data.result || !data.result.users) {
      return [];
    }

    return data.result.users.map((user: { fid: number }) => user.fid);
  } catch (error) {
    console.error("Get following list error:", error);
    return [];
  }
} 