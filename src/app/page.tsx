"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import FarcasterConnect from "@/components/FarcasterConnect";
import { unfollowUser, FarcasterSigner } from "@/lib/farcaster-actions";

interface FollowingUser {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
  followerCount: number;
  followingCount: number;
  lastCasted?: number; // timestamp of last cast
  isMutualFollow: boolean;
  isInactive: boolean; // hasn't casted in 60+ days or no mutual follow
}

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
  followerCount: number;
  followingCount: number;
}

export default function FarcasterUnfollowApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  const handleAuth = (fid: number) => {
    setIsAuthenticated(true);
    setUserFid(fid);
  };

  const handleDisconnect = () => {
    setIsAuthenticated(false);
    setUserFid(null);
    setSigner(null);
    setFollowingUsers([]);
    setSelectedUsers(new Set());
    setUnfollowedUsers(new Set());
    setCurrentPage(0);
    setTotalPages(0);
    setTotalFollowing(0);
  };

  const loadFollowingPage = async (page: number = 0) => {
    if (!userFid) {
      toast.error("Please authenticate first");
      return;
    }

    setIsLoading(true);
    try {
      // Get following users with pagination
      const response = await fetch(`/api/following?fid=${userFid}&page=${page}&limit=10`);
      
      if (response.ok) {
        const data = await response.json();
        const analyzedUsers = await analyzeFollowingUsers(data.following);
        setFollowingUsers(analyzedUsers);
        setTotalPages(data.totalPages);
        setTotalFollowing(data.totalFollowing);
        setCurrentPage(page);
        toast.success(`Loaded page ${page + 1} of ${data.totalPages}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load following users");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load following users");
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeFollowingUsers = async (users: FarcasterUser[]): Promise<FollowingUser[]> => {
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
        // Add with default values if analysis fails
        analyzedUsers.push({
          ...user,
          lastCasted: 0,
          isMutualFollow: false,
          isInactive: true,
        });
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

  const handleSelectAllOnPage = () => {
    const pageUserIds = followingUsers.map(u => u.fid);
    setSelectedUsers(new Set(pageUserIds));
  };

  const handleUnfollowSelected = async () => {
    if (!signer || selectedUsers.size === 0) {
      toast.error("Please select users to unfollow");
      return;
    }

    setIsUnfollowing(true);
    try {
      for (const fid of selectedUsers) {
        const result = await unfollowUser(signer, fid);
        
        if (result.success) {
          setUnfollowedUsers(prev => new Set([...prev, fid]));
          const user = followingUsers.find(u => u.fid === fid);
          toast.success(`Successfully unfollowed @${user?.username || fid}`);
        } else {
          throw new Error(result.error || `Failed to unfollow ${fid}`);
        }
        
        // Add delay between unfollows to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Clear selection after successful unfollow
      setSelectedUsers(new Set());
      toast.success(`Successfully unfollowed ${selectedUsers.size} users`);
      
      // Reload current page to update the list
      await loadFollowingPage(currentPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk unfollow failed");
    } finally {
      setIsUnfollowing(false);
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
  const selectedInactiveCount = Array.from(selectedUsers).filter(fid => 
    followingUsers.find(u => u.fid === fid)?.isInactive
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Farcaster Unfollow App</h1>
          <p className="text-gray-600">Manage your following list and unfollow inactive users</p>
        </div>

        {/* Authentication Section */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Connect your Farcaster account to manage your following list
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FarcasterConnect
              onAuth={handleAuth}
              onDisconnect={handleDisconnect}
              isAuthenticated={isAuthenticated}
              userFid={userFid}
            />
          </CardContent>
        </Card>

        {/* Following Management Section */}
        {isAuthenticated && (
          <Card>
            <CardHeader>
              <CardTitle>Following Management</CardTitle>
              <CardDescription>
                Browse your following list and unfollow inactive users (10 users per page)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Button 
                  onClick={() => loadFollowingPage(0)} 
                  disabled={isLoading}
                  className="w-full max-w-xs"
                >
                  {isLoading ? "Loading..." : "Load Following List"}
                </Button>
                
                {totalFollowing > 0 && (
                  <div className="text-sm text-gray-600">
                    {inactiveUsers.length} inactive on this page • {totalFollowing} total following
                  </div>
                )}
              </div>

              {followingUsers.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Following Users (Page {currentPage + 1} of {totalPages})</h3>
                    <div className="flex items-center space-x-2">
                      <Button 
                        onClick={handleSelectAllInactive}
                        variant="outline"
                        size="sm"
                      >
                        Select All Inactive
                      </Button>
                      <Button 
                        onClick={handleSelectAllOnPage}
                        variant="outline"
                        size="sm"
                      >
                        Select All on Page
                      </Button>
                      <Button 
                        onClick={handleUnfollowSelected}
                        disabled={isUnfollowing || selectedUsers.size === 0}
                        variant="destructive"
                        size="sm"
                      >
                        {isUnfollowing ? "Unfollowing..." : `Unfollow Selected (${selectedUsers.size})`}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {followingUsers.map((user) => (
                      <div
                        key={user.fid}
                        className="flex items-center justify-between p-3 border rounded-lg"
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
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                            <div className="text-xs text-gray-400">
                              Last cast: {formatLastCasted(user.lastCasted)}
                              {!user.isMutualFollow && (
                                <span className="ml-2 text-red-500">• No mutual follow</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!user.isMutualFollow && (
                            <Badge variant="secondary">No Mutual</Badge>
                          )}
                          {user.lastCasted && user.lastCasted < (Date.now() / 1000 - 60 * 24 * 60 * 60) && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                          {unfollowedUsers.has(user.fid) && (
                            <Badge variant="outline">Unfollowed</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        onClick={() => loadFollowingPage(currentPage - 1)}
                        disabled={currentPage === 0 || isLoading}
                        variant="outline"
                        size="sm"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <Button
                        onClick={() => loadFollowingPage(currentPage + 1)}
                        disabled={currentPage === totalPages - 1 || isLoading}
                        variant="outline"
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Section */}
        {unfollowedUsers.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Unfollow Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {unfollowedUsers.size}
                  </div>
                  <div className="text-sm text-gray-600">Users Unfollowed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {totalFollowing}
                  </div>
                  <div className="text-sm text-gray-600">Total Following</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {inactiveUsers.length}
                  </div>
                  <div className="text-sm text-gray-600">Inactive on This Page</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Toaster />
    </div>
  );
}
