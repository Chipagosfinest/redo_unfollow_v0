"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { batchUnfollow, getFarcasterSigner, FarcasterSigner } from "@/lib/farcaster-actions";

interface FollowingUser {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
  followerCount: number;
  followingCount: number;
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

export default function ToolPage() {
  const [userFid, setUserFid] = useState<number | null>(null);
  const [signer, setSigner] = useState<FarcasterSigner | null>(null);
  const [followingUsers, setFollowingUsers] = useState<FollowingUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnfollowing, setIsUnfollowing] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [unfollowedUsers, setUnfollowedUsers] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalFollowing, setTotalFollowing] = useState(0);
  const [unfollowProgress, setUnfollowProgress] = useState({ current: 0, total: 0 });

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
  }, []);

  const handleAuth = async (fid: number) => {
    setUserFid(fid);
    const signer = await getFarcasterSigner();
    if (signer) {
      setSigner(signer);
      loadFollowingPage(fid, 0);
    }
  };

  const loadFollowingPage = async (fid: number, page: number = 0) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/following?fid=${fid}&page=${page}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        const analyzedUsers = await analyzeFollowingUsers(data.following, fid);
        setFollowingUsers(analyzedUsers);
        setTotalPages(data.totalPages);
        setTotalFollowing(data.totalFollowing);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("Error loading following users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeFollowingUsers = async (users: FarcasterUser[], userFid: number): Promise<FollowingUser[]> => {
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

  const handleSelectAllInactive = () => {
    const inactiveUserIds = followingUsers
      .filter(u => u.isInactive)
      .map(u => u.fid);
    setSelectedUsers(new Set(inactiveUserIds));
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
      
      const results = await batchUnfollow(signer, selectedFids, (current, total) => {
        setUnfollowProgress({ current, total });
      });
      
      // Update unfollowed users
      const successfulFids = selectedFids.filter(fid => 
        !results.errors.find(error => error.fid === fid)
      );
      setUnfollowedUsers(prev => new Set([...prev, ...successfulFids]));
      
      setSelectedUsers(new Set());
      toast.success(`Successfully unfollowed ${results.success} users`);
      
      // Reload current page
      if (userFid) {
        loadFollowingPage(userFid, currentPage);
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

  const inactiveUsers = followingUsers.filter(u => u.isInactive);

  if (!userFid) {
    return (
      <div className="p-4">
        <Card className="farcaster-card">
          <CardHeader>
            <CardTitle className="farcaster-gradient-text">Farcaster UnfollowX Tool</CardTitle>
            <CardDescription>Connect to manage your following list</CardDescription>
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
          <CardTitle className="farcaster-gradient-text">Following Management</CardTitle>
          <CardDescription>
            Browse your following list and unfollow inactive users (10 users per page)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button 
              onClick={() => loadFollowingPage(userFid, 0)} 
              disabled={isLoading}
              className="farcaster-button-primary"
            >
              {isLoading ? "Loading..." : "Load Following List"}
            </Button>
            
            {totalFollowing > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {inactiveUsers.length} inactive on this page • {totalFollowing} total following
              </div>
            )}
          </div>

          {isUnfollowing && unfollowProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Unfollowing progress...</span>
                <span>{unfollowProgress.current} / {unfollowProgress.total}</span>
              </div>
              <Progress value={(unfollowProgress.current / unfollowProgress.total) * 100} />
            </div>
          )}

          {followingUsers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Following Users (Page {currentPage + 1} of {totalPages})</h3>
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={handleSelectAllInactive}
                    variant="outline"
                    size="sm"
                    className="farcaster-button-secondary"
                  >
                    Select All Inactive
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
              </div>
              
              <div className="grid gap-3">
                {followingUsers.map((user) => (
                  <div
                    key={user.fid}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedUsers.has(user.fid)}
                        onCheckedChange={(checked) => 
                          handleSelectUser(user.fid, checked as boolean)
                        }
                        disabled={unfollowedUsers.has(user.fid)}
                      />
                      <img
                        src={user.pfp}
                        alt={user.displayName}
                        className="w-12 h-12 rounded-full ring-2 ring-purple-200 dark:ring-purple-800"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{user.displayName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Last cast: {formatLastCasted(user.lastCasted)}
                          {!user.isMutualFollow && (
                            <span className="ml-2 text-red-500">• No mutual follow</span>
                          )}
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
                      {unfollowedUsers.has(user.fid) && (
                        <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                          Unfollowed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    onClick={() => loadFollowingPage(userFid, currentPage - 1)}
                    disabled={currentPage === 0 || isLoading}
                    variant="outline"
                    size="sm"
                    className="farcaster-button-secondary"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    onClick={() => loadFollowingPage(userFid, currentPage + 1)}
                    disabled={currentPage === totalPages - 1 || isLoading}
                    variant="outline"
                    size="sm"
                    className="farcaster-button-secondary"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 