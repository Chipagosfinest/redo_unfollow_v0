import { verifyMessage as verifyFarcasterMessage } from "@farcaster/quick-auth";
import { FollowRemoveMessage as FollowRemoveMessageType } from "@farcaster/core";

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
  followerCount: number;
  followingCount: number;
}

export class FarcasterService {
  constructor() {
    // Using official Farcaster API
  }

  async authenticateUser(messageBytes: string, signature: string): Promise<number> {
    const verificationResult = await verifyFarcasterMessage({
      messageBytes,
      signature,
    });

    if (!verificationResult.isOk()) {
      throw new Error("Invalid signature");
    }

    return verificationResult.value.data.fid;
  }

  async searchUsers(query: string): Promise<FarcasterUser[]> {
    try {
      // Use official Farcaster API to search for users
      const response = await fetch(`https://api.farcaster.xyz/v2/user-by-username?username=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error("Failed to search users");
      }

      const data = await response.json();
      
      if (!data.result || !data.result.user) {
        return [];
      }

      const user = data.result.user;
      
      return [{
        fid: user.fid,
        username: user.username,
        displayName: user.displayName || user.username,
        pfp: user.pfp?.url || "https://via.placeholder.com/40",
        followerCount: user.followerCount || 0,
        followingCount: user.followingCount || 0,
      }];
    } catch (error) {
      console.error("Search users error:", error);
      throw new Error("Failed to search users");
    }
  }

  async unfollowUser(userFid: number, targetFid: number): Promise<boolean> {
    try {
      // Create a FollowRemoveMessage to unfollow
      const followRemoveMessage = new FollowRemoveMessageType({
        fid: userFid,
        targetFid: targetFid,
        timestamp: Math.floor(Date.now() / 1000),
      });

      // TODO: Sign and submit the message to the hub
      // This requires proper message signing implementation
      console.log("Unfollow message created:", followRemoveMessage);
      
      return true;
    } catch (error) {
      console.error("Unfollow error:", error);
      throw new Error("Failed to unfollow user");
    }
  }

  async getFollowingList(userFid: number): Promise<FarcasterUser[]> {
    try {
      // Get following list from official Farcaster API
      const response = await fetch(`https://api.farcaster.xyz/v2/following?fid=${userFid}&limit=100`);
      
      if (!response.ok) {
        throw new Error("Failed to get following list");
      }

      const data = await response.json();
      
      if (!data.result || !data.result.users || data.result.users.length === 0) {
        return [];
      }

      return data.result.users.map((user: { fid: number; username: string; displayName?: string; pfp?: { url?: string }; followerCount?: number; followingCount?: number }) => ({
        fid: user.fid,
        username: user.username,
        displayName: user.displayName || user.username,
        pfp: user.pfp?.url || "https://via.placeholder.com/40",
        followerCount: user.followerCount || 0,
        followingCount: user.followingCount || 0,
      }));
    } catch (error) {
      console.error("Get following list error:", error);
      throw new Error("Failed to get following list");
    }
  }

  async getUserInfo(fid: number): Promise<FarcasterUser | null> {
    try {
      // Get user data from official Farcaster API
      const response = await fetch(`https://api.farcaster.xyz/v2/user?fid=${fid}`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (!data.result || !data.result.user) {
        return null;
      }

      const user = data.result.user;
      
      return {
        fid: user.fid,
        username: user.username,
        displayName: user.displayName || user.username,
        pfp: user.pfp?.url || "https://via.placeholder.com/40",
        followerCount: user.followerCount || 0,
        followingCount: user.followingCount || 0,
      };
    } catch (error) {
      console.error("Get user info error:", error);
      return null;
    }
  }

  async getFollowerCount(fid: number): Promise<number> {
    try {
      const response = await fetch(`https://api.farcaster.xyz/v2/user?fid=${fid}`);
      
      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return data.result?.user?.followerCount || 0;
    } catch (error) {
      console.error("Get follower count error:", error);
      return 0;
    }
  }

  async getFollowingCount(fid: number): Promise<number> {
    try {
      const response = await fetch(`https://api.farcaster.xyz/v2/user?fid=${fid}`);
      
      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return data.result?.user?.followingCount || 0;
    } catch (error) {
      console.error("Get following count error:", error);
      return 0;
    }
  }
}

export const farcasterService = new FarcasterService(); 