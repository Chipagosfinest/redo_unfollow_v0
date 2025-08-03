import { FollowRemoveMessage } from "@farcaster/core";

export interface UnfollowResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export async function unfollowUser(
  signer: any,
  targetFid: number
): Promise<UnfollowResult> {
  try {
    // Create a FollowRemoveMessage
    const followRemoveMessage = new FollowRemoveMessage({
      fid: await signer.getFid(),
      targetFid: targetFid,
      timestamp: Math.floor(Date.now() / 1000),
    });

    // Sign the message
    const signature = await signer.signMessage(followRemoveMessage);
    
    // Submit to hub
    const hubResponse = await fetch("https://nemes.farcaster.xyz:2281/v1/submitMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messageBytes: followRemoveMessage.encode(),
        signature: signature,
      }),
    });

    if (!hubResponse.ok) {
      throw new Error("Failed to submit message to hub");
    }

    const result = await hubResponse.json();
    
    return {
      success: true,
      hash: result.hash,
    };
  } catch (error) {
    console.error("Unfollow error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getFollowingList(signer: any): Promise<number[]> {
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

    return data.result.users.map((user: any) => user.fid);
  } catch (error) {
    console.error("Get following list error:", error);
    return [];
  }
} 