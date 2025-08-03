export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
  followerCount: number;
  followingCount: number;
}

export class FarcasterService {
  private baseUrl = "https://api.farcaster.xyz/v2";

  async getUserByUsername(username: string) {
    try {
      const response = await fetch(`${this.baseUrl}/user-by-username?username=${username}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result?.user || null;
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  }

  async getFollowers(fid: number) {
    try {
      const response = await fetch(`${this.baseUrl}/followers?fid=${fid}&limit=100`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch followers: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result?.users || [];
    } catch (error) {
      console.error("Error fetching followers:", error);
      throw error;
    }
  }

  async getFollowing(fid: number) {
    try {
      const response = await fetch(`${this.baseUrl}/following?fid=${fid}&limit=100`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch following: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result?.users || [];
    } catch (error) {
      console.error("Error fetching following:", error);
      throw error;
    }
  }

  async getUserCasts(fid: number, limit: number = 10) {
    try {
      const response = await fetch(`${this.baseUrl}/casts?fid=${fid}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch casts: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result?.casts || [];
    } catch (error) {
      console.error("Error fetching casts:", error);
      throw error;
    }
  }

  // Mock authentication - in production this would use real Farcaster Connect
  async authenticateUser(fid: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Simulate authentication process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Authentication failed" 
      };
    }
  }

  // Mock unfollow - in production this would sign and submit messages
  async unfollowUser(targetFid: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Simulate unfollow process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unfollow failed" 
      };
    }
  }
}

export const farcasterService = new FarcasterService(); 