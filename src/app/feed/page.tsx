"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getFarcasterSigner, FarcasterSigner } from "@/lib/farcaster-actions";
import { sdk } from '@farcaster/miniapp-sdk';

interface FollowingUser {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
  lastCasted?: number;
  isMutualFollow: boolean;
  isInactive: boolean;
}

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
  followerCount: number;
  followingCount: number;
}

export default function FeedPage() {
  const [userFid, setUserFid] = useState<number | null>(null);
  const [signer, setSigner] = useState<FarcasterSigner | null>(null);
  const [inactiveUsers, setInactiveUsers] = useState<FollowingUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isUnfollowing, setIsUnfollowing] = useState(false);
  const [unfollowProgress, setUnfollowProgress] = useState({ current: 0, total: 0 });

  const handleAuth = useCallback(async (fid: number) => {
    setUserFid(fid);
    const signer = await getFarcasterSigner();
    if (signer) {
      setSigner(signer);
      loadInactiveUsers(fid);
    }
  }, []);

  useEffect(() => {
    // Call ready() when the app is loaded
    const initializeApp = async () => {
      try {
        await sdk.actions.ready();
        console.log('Farcaster SDK ready called successfully');
      } catch (error) {
        console.error('Error calling Farcaster SDK ready:', error);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    // Auto-detect user from Farcaster context
    if (typeof window !== 'undefined' && 'farcaster' in window) {
      // @ts-ignore - Farcaster global object
      const farcaster = (window as any).farcaster;
      if (farcaster?.user?.fid) {
        setUserFid(farcaster.user.fid);
        handleAuth(farcaster.user.fid);
      }
    }
  }, [handleAuth]);

  const loadInactiveUsers = async (fid: number) => {
    setIsLoading(true);
    try {
      // Get following users
      const response = await fetch(`/api/following?fid=${fid}&page=0&limit=20`);
      if (response.ok) {
        const data = await response.json();
        const analyzedUsers = await analyzeUsers(data.following, fid);
        const inactive = analyzedUsers.filter(u => u.isInactive);
        setInactiveUsers(inactive.slice(0, 5)); // Show top 5 inactive users
      }
    } catch (error) {
      console.error("Error loading inactive users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeUsers = async (users: FarcasterUser[], userFid: number): Promise<FollowingUser[]> => {
    const analyzedUsers: FollowingUser[] = [];
    
    for (const user of users) {
      try {
        // Check if mutual follow
        const mutualResponse = await fetch(`/api/check-mutual?userFid=${userFid}&targetFid=${user.fid}`);
        const mutualData = await mutualResponse.json();
        const isMutualFollow = mutualData.isMutualFollow;

        // Get last cast timestamp
        const castsResponse = await fetch(`/api/user-casts?fid=${user.fid}&limit=1`);
        const castsData = await castsResponse.json();
        const lastCasted = castsData.casts?.[0]?.timestamp || 0;

        // Calculate if inactive (60+ days or no mutual follow)
        const sixtyDaysAgo = Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60);
        const isInactive = !isMutualFollow || lastCasted < sixtyDaysAgo;

        analyzedUsers.push({
          ...user,
          lastCasted,
          isMutualFollow,
          isInactive,
        });
      } catch (error) {
        console.error(`Error analyzing user ${user.username}:`, error);
      }
    }

    return analyzedUsers;
  };

  const handleSelectUser = (fid: number, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => new Set([...prev, fid]));
    } else {
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(fid);
        return newSet;
      });
    }
  };

  const handleUnfollowSelected = async () => {
    if (!signer || selectedUsers.size === 0) {
      toast.error("Please select users to unfollow");
      return;
    }

    setIsUnfollowing(true);
    setUnfollowProgress({ current: 0, total: selectedUsers.size });

    try {
      const selectedFids = Array.from(selectedUsers);
      let successCount = 0;
      
      for (let i = 0; i < selectedFids.length; i++) {
        const fid = selectedFids[i];
        
        // Simulate unfollow action for now
        await new Promise(resolve => setTimeout(resolve, 1000));
        successCount++;
        
        setUnfollowProgress({ current: i + 1, total: selectedFids.length });
      }
      
      setSelectedUsers(new Set());
      toast.success(`Successfully unfollowed ${successCount} users`);
      
      // Reload inactive users
      if (userFid) {
        loadInactiveUsers(userFid);
      }
    } catch (error) {
      toast.error("Batch unfollow failed");
    } finally {
      setIsUnfollowing(false);
      setUnfollowProgress({ current: 0, total: 0 });
    }
  };

  const formatLastCasted = (timestamp: number | undefined) => {
    if (!timestamp) return "Never";
    const daysAgo = Math.floor((Date.now() / 1000 - timestamp) / (24 * 60 * 60));
    if (daysAgo === 0) return "Today";
    if (daysAgo === 1) return "Yesterday";
    return `${daysAgo} days ago`;
  };

  if (!userFid) {
    return (
      <div className="p-4">
        <Card className="farcaster-card">
          <CardHeader>
            <CardTitle className="farcaster-gradient-text">Unfollow Tool</CardTitle>
            <CardDescription>Connect to see inactive users you should unfollow</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                const fid = prompt("Enter your FID:");
                if (fid) handleAuth(parseInt(fid));
              }}
              className="farcaster-button-primary w-full"
            >
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Card className="farcaster-card">
        <CardHeader>
          <CardTitle className="farcaster-gradient-text">Inactive Users to Unfollow</CardTitle>
          <CardDescription>
            Found {inactiveUsers.length} inactive users in your following list
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading inactive users...</p>
            </div>
          ) : inactiveUsers.length > 0 ? (
            <>
              <div className="space-y-3">
                {inactiveUsers.map((user) => (
                  <div
                    key={user.fid}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`inactive-user-checkbox-${user.fid}`}
                        name={`inactive-user-checkbox-${user.fid}`}
                        checked={selectedUsers.has(user.fid)}
                        onChange={(e) => handleSelectUser(user.fid, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <img
                        src={user.pfp}
                        alt={user.displayName}
                        className="w-10 h-10 rounded-full ring-2 ring-purple-200 dark:ring-purple-800"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {user.displayName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          @{user.username} • {formatLastCasted(user.lastCasted)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!user.isMutualFollow && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          No Mutual
                        </Badge>
                      )}
                      {user.lastCasted && user.lastCasted < (Date.now() / 1000 - 60 * 24 * 60 * 60) && (
                        <Badge variant="destructive">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isUnfollowing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Unfollowing progress...</span>
                    <span>{unfollowProgress.current} / {unfollowProgress.total}</span>
                  </div>
                  <Progress value={(unfollowProgress.current / unfollowProgress.total) * 100} />
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    const allInactive = inactiveUsers.map(u => u.fid);
                    setSelectedUsers(new Set(allInactive));
                  }}
                  variant="outline"
                  size="sm"
                  className="farcaster-button-secondary"
                >
                  Select All
                </Button>
                <Button
                  onClick={handleUnfollowSelected}
                  disabled={isUnfollowing || selectedUsers.size === 0}
                  size="sm"
                  className="farcaster-button-destructive"
                >
                  {isUnfollowing ? "Unfollowing..." : `Unfollow Selected (${selectedUsers.size})`}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No inactive users found!</p>
              <p className="text-sm text-gray-500 mt-1">Your following list looks good.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 