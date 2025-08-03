"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import FarcasterConnect from "@/components/FarcasterConnect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { batchUnfollow, getFarcasterSigner, FarcasterSigner } from "@/lib/farcaster-actions";

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
  const [unfollowProgress, setUnfollowProgress] = useState({ current: 0, total: 0 });
  const [batchResults, setBatchResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ fid: number; error: string }>;
  } | null>(null);

  const handleAuth = async (fid: number) => {
    setIsAuthenticated(true);
    setUserFid(fid);
    
    // Get native wallet signer
    const signer = await getFarcasterSigner();
    if (signer) {
      setSigner(signer);
    } else {
      toast.warning("Native wallet not available - using mock mode");
    }
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
    setUnfollowProgress({ current: 0, total: 0 });
    setBatchResults(null);
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
    if (selectedUsers.size === 0) {
      toast.error("Please select users to unfollow");
      return;
    }

    if (!signer) {
      toast.error("Native wallet not available. Please use Farcaster's native app for real unfollows.");
      return;
    }

    setIsUnfollowing(true);
    setUnfollowProgress({ current: 0, total: selectedUsers.size });
    setBatchResults(null);

    try {
      const selectedFids = Array.from(selectedUsers);
      
      const results = await batchUnfollow(signer, selectedFids, (current, total) => {
        setUnfollowProgress({ current, total });
      });

      setBatchResults(results);
      
      // Update unfollowed users
      const successfulFids = selectedFids.filter(fid => 
        !results.errors.find(error => error.fid === fid)
      );
      setUnfollowedUsers(prev => new Set([...prev, ...successfulFids]));
      
      // Clear selection after successful unfollow
      setSelectedUsers(new Set());
      
      toast.success(`Batch unfollow completed: ${results.success} successful, ${results.failed} failed`);
      
      // Reload current page to update the list
      await loadFollowingPage(currentPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Batch unfollow failed");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header with Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold farcaster-gradient-text">
              Farcaster UnfollowX
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Automated unfollow tool for Farcaster - like UnfollowX but for FC
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Authentication Section */}
        <Card className="farcaster-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Authentication</span>
            </CardTitle>
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
          <Card className="farcaster-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Following Management</span>
              </CardTitle>
              <CardDescription>
                Browse your following list and unfollow inactive users (10 users per page)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Button 
                  onClick={() => loadFollowingPage(0)} 
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

              {/* Progress Bar for Batch Unfollow */}
              {isUnfollowing && unfollowProgress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Unfollowing progress...</span>
                    <span>{unfollowProgress.current} / {unfollowProgress.total}</span>
                  </div>
                  <Progress value={(unfollowProgress.current / unfollowProgress.total) * 100} />
                </div>
              )}

              {/* Batch Results */}
              {batchResults && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold mb-2">Batch Unfollow Results:</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-green-600 font-bold">{batchResults.success}</div>
                      <div>Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600 font-bold">{batchResults.failed}</div>
                      <div>Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-600 font-bold">{batchResults.errors.length}</div>
                      <div>Errors</div>
                    </div>
                  </div>
                  {batchResults.errors.length > 0 && (
                    <div className="mt-2">
                      <details className="text-xs">
                        <summary className="cursor-pointer">Show errors</summary>
                        <div className="mt-2 space-y-1">
                          {batchResults.errors.map((error, index) => (
                            <div key={index} className="text-red-600">
                              FID {error.fid}: {error.error}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
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
                        onClick={handleSelectAllOnPage}
                        variant="outline"
                        size="sm"
                        className="farcaster-button-secondary"
                      >
                        Select All on Page
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        onClick={() => loadFollowingPage(currentPage - 1)}
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
                        onClick={() => loadFollowingPage(currentPage + 1)}
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
        )}

        {/* Stats Section */}
        {unfollowedUsers.size > 0 && (
          <Card className="farcaster-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Unfollow Statistics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {unfollowedUsers.size}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Users Unfollowed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {totalFollowing}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Following</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {inactiveUsers.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Inactive on This Page</div>
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
