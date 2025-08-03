import { NextRequest, NextResponse } from "next/server";

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

  async authenticateUser(): Promise<number> {
    // TODO: Implement real Farcaster authentication
    // For now, return mock FID
    return 12345;
  }

  async searchUsers(query: string): Promise<FarcasterUser[]> {
    try {
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
      console.error("Search error:", error);
      return [];
    }
  }

  async getFollowingList(userFid: number): Promise<number[]> {
    try {
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

  async getUserInfo(fid: number): Promise<FarcasterUser | null> {
    try {
      const response = await fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${fid}`);
      
      if (!response.ok) {
        throw new Error("Failed to get user info");
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
      const response = await fetch(`https://api.farcaster.xyz/v2/followers?fid=${fid}&limit=1`);
      
      if (!response.ok) {
        throw new Error("Failed to get follower count");
      }

      const data = await response.json();
      return data.result?.users?.length || 0;
    } catch (error) {
      console.error("Get follower count error:", error);
      return 0;
    }
  }

  async getFollowingCount(fid: number): Promise<number> {
    try {
      const response = await fetch(`https://api.farcaster.xyz/v2/following?fid=${fid}&limit=1`);
      
      if (!response.ok) {
        throw new Error("Failed to get following count");
      }

      const data = await response.json();
      return data.result?.users?.length || 0;
    } catch (error) {
      console.error("Get following count error:", error);
      return 0;
    }
  }

  async unfollowUser(): Promise<boolean> {
    // TODO: Implement real unfollow with Farcaster message signing
    // For now, simulate successful unfollow
    return true;
  }
}

export const farcasterService = new FarcasterService(); 