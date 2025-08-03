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
import { Users, UserMinus, Activity, TrendingUp, Shield, Sparkles } from "lucide-react";

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
        const mutualResponse = await fetch(`/api/check-mutual?userFid=${userFid}&targetFid=${user.fid}`);
        const mutualData = await mutualResponse.json();
        const isMutualFollow = mutualData.isMutualFollow;

        const castsResponse = await fetch(`/api/user-casts?fid=${user.fid}&limit=1`);
        const castsData = await castsResponse.json();
        const lastCasted = castsData.casts?.[0]?.timestamp || 0;

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
      
      const successfulFids = selectedFids.filter(fid => 
        !results.errors.find(error => error.fid === fid)
      );
      setUnfollowedUsers(prev => new Set([...prev, ...successfulFids]));
      
      setSelectedUsers(new Set());
      
      toast.success(`Batch unfollow completed: ${results.success} successful, ${results.failed} failed`);
      
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
  const notMutualUsers = followingUsers.filter(u => !u.isMutualFollow);
  const spamUsers = followingUsers.filter(u => u.followerCount < 10 && u.followingCount > 1000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto p-4 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold farcaster-gradient-text">
                UnfollowX
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Clean up your Farcaster following list
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Shield className="w-4 h-4" />
              <span>Privacy-focused</span>
            </div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Activity className="w-4 h-4" />
              <span>Real-time analysis</span>
            </div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <TrendingUp className="w-4 h-4" />
              <span>Smart recommendations</span>
            </div>
          </div>
          
          <div className="flex justify-center mt-4">
            <ThemeToggle />
          </div>
        </div>

        {/* Authentication Section */}
        {!isAuthenticated && (
          <Card className="max-w-md mx-auto farcaster-card border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">Connect Your Wallet</CardTitle>
              <CardDescription className="text-base">
                Sign in with Farcaster to analyze your follows
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
        )}

        {/* Main Dashboard */}
        {isAuthenticated && (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="farcaster-card border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Following</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalFollowing}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="farcaster-card border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">60+ Days Inactive</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{inactiveUsers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="farcaster-card border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                      <UserMinus className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Not Following Back</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{notMutualUsers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="farcaster-card border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Potential Spam</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{spamUsers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Following Management */}
            <Card className="farcaster-card border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <UserMinus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Following Management</CardTitle>
                      <CardDescription>
                        Browse your following list and unfollow inactive users
                      </CardDescription>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => loadFollowingPage(0)} 
                    disabled={isLoading}
                    className="farcaster-button-primary"
                  >
                    {isLoading ? "Loading..." : "Load Following List"}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Progress Bar for Batch Unfollow */}
                {isUnfollowing && unfollowProgress.total > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Unfollowing progress...</span>
                      <span>{unfollowProgress.current} / {unfollowProgress.total}</span>
                    </div>
                    <Progress value={(unfollowProgress.current / unfollowProgress.total) * 100} className="h-2" />
                  </div>
                )}

                {/* Batch Results */}
                {batchResults && (
                  <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold mb-4 text-green-800 dark:text-green-200">Batch Unfollow Results</h4>
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">{batchResults.success}</div>
                        <div className="text-sm text-green-700 dark:text-green-300">Successful</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400">{batchResults.failed}</div>
                        <div className="text-sm text-red-700 dark:text-red-300">Failed</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{batchResults.errors.length}</div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">Errors</div>
                      </div>
                    </div>
                    {batchResults.errors.length > 0 && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
                          Show error details
                        </summary>
                        <div className="mt-2 space-y-1 text-xs">
                          {batchResults.errors.map((error, index) => (
                            <div key={index} className="text-red-600 dark:text-red-400">
                              FID {error.fid}: {error.error}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {followingUsers.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Following Users (Page {currentPage + 1} of {totalPages})</h3>
                      <div className="flex items-center space-x-3">
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
                    
                    <div className="grid gap-4">
                      {followingUsers.map((user) => (
                        <div
                          key={user.fid}
                          className="flex items-center justify-between p-6 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-center space-x-4">
                            <Checkbox
                              checked={selectedUsers.has(user.fid)}
                              onCheckedChange={(checked) => 
                                handleSelectUser(user.fid, checked as boolean)
                              }
                              disabled={unfollowedUsers.has(user.fid)}
                              className="w-5 h-5"
                            />
                            <img
                              src={user.pfp}
                              alt={user.displayName}
                              className="w-14 h-14 rounded-full ring-4 ring-purple-200 dark:ring-purple-800 shadow-lg"
                            />
                            <div>
                              <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                                {user.displayName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                @{user.username}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Last cast: {formatLastCasted(user.lastCasted)}
                                {!user.isMutualFollow && (
                                  <span className="ml-2 text-red-500 font-medium">• No mutual follow</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {!user.isMutualFollow && (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-0">
                                No Mutual
                              </Badge>
                            )}
                            {user.lastCasted && user.lastCasted < (Date.now() / 1000 - 60 * 24 * 60 * 60) && (
                              <Badge variant="destructive" className="border-0">
                                Inactive
                              </Badge>
                            )}
                            {unfollowedUsers.has(user.fid) && (
                              <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20">
                                Unfollowed
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center space-x-4">
                        <Button
                          onClick={() => loadFollowingPage(currentPage - 1)}
                          disabled={currentPage === 0 || isLoading}
                          variant="outline"
                          size="sm"
                          className="farcaster-button-secondary"
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
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
          </div>
        )}
      </div>
      <Toaster />
    </div>
  );
}
