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
}

export const farcasterService = new FarcasterService(); 

export async function authenticateUser(messageBytes: Uint8Array, signature: Uint8Array): Promise<number | null> {
  try {
    // Validate signature and extract user FID
    const response = await fetch('https://api.farcaster.xyz/v2/validate-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageBytes: Array.from(messageBytes),
        signature: Array.from(signature)
      })
    });

    if (!response.ok) {
      throw new Error('Message validation failed');
    }

    const result = await response.json();
    return result.valid ? result.fid : null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function unfollowUser(userFid: number, targetFid: number): Promise<boolean> {
  try {
    // Create follow-remove message
    const message = {
      data: {
        type: "follow-remove",
        fid: userFid,
        targetFid: targetFid,
        timestamp: Math.floor(Date.now() / 1000)
      }
    };

    // Submit to Farcaster Hub
    const response = await fetch('https://api.farcaster.xyz/v2/submit-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });

    return response.ok;
  } catch (error) {
    console.error('Unfollow error:', error);
    return false;
  }
} 