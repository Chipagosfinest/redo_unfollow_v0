"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserMinus, Activity, TrendingUp, Sparkles } from "lucide-react";
import FarcasterConnect from "@/components/FarcasterConnect";
import { sdk } from '@farcaster/miniapp-sdk';
import { Input } from "@/components/ui/input";

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
  followerCount: number;
  followingCount: number;
}

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

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userFid, setUserFid] = useState<number | null>(null);
  const [followingUsers, setFollowingUsers] = useState<Array<{
    fid: number;
    username: string;
    displayName: string;
    pfp: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());

  const [isUnfollowing, setIsUnfollowing] = useState(false);
  const [unfollowProgress, setUnfollowProgress] = useState({ current: 0, total: 0 });

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

  const handleAuth = (fid: number) => {
    setUserFid(fid);
    setIsAuthenticated(true);
    toast.success("Connected! Ready to scan your following list.");
  };

  const handleDisconnect = () => {
    setIsAuthenticated(false);
    setUserFid(null);
    setFollowingUsers([]);
    setSelectedUsers(new Set());
  };

  const handleScanFollowing = async () => {
    if (!userFid) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/following?fid=${userFid}&page=0&limit=50`);
      if (response.ok) {
        const data = await response.json();
        const analyzedUsers = await analyzeFollowingUsers(data.following, userFid);
        setFollowingUsers(analyzedUsers);
        toast.success(`Found ${analyzedUsers.length} users to review`);
      }
    } catch (error) {
      console.error("Error scanning following:", error);
      toast.error("Failed to scan following list");
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
    if (selectedUsers.size === 0) {
      toast.error("Please select users to unfollow");
      return;
    }

    setIsUnfollowing(true);
    setUnfollowProgress({ current: 0, total: selectedUsers.size });

    try {
      const selectedFids = Array.from(selectedUsers);
      
      for (let i = 0; i < selectedFids.length; i++) {
        const fid = selectedFids[i];
        
        // Simulate unfollow action
        await new Promise(resolve => setTimeout(resolve, 1000));
        

        setUnfollowProgress({ current: i + 1, total: selectedFids.length });
      }
      
      setSelectedUsers(new Set());
      toast.success(`Successfully unfollowed ${selectedFids.length} users!`);
    } catch (error) {
      console.error("Error unfollowing users:", error);
      toast.error("Failed to unfollow some users");
    } finally {
      setIsUnfollowing(false);
      setUnfollowProgress({ current: 0, total: 0 });
    }
  };

  const handleUnfollowUser = async (fid: number) => {
    if (!userFid) return;
    setIsLoading(true);
    try {
      await sdk.actions.unfollow(userFid, fid);
      toast.success(`Unfollowed user ${fid}`);
      setFollowingUsers(prev => prev.filter(user => user.fid !== fid));
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(fid);
        return newSet;
      });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchUnfollow = async () => {
    if (selectedUsers.size === 0) {
      toast.error("Please select users to unfollow");
      return;
    }
    setIsLoading(true);
    try {
      const fids = Array.from(selectedUsers);
      for (let i = 0; i < fids.length; i++) {
        const fid = fids[i];
        await sdk.actions.unfollow(userFid!, fid);
        setFollowingUsers(prev => prev.filter(user => user.fid !== fid));
        setSelectedUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(fid);
          return newSet;
        });
        setUnfollowProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }
      toast.success(`Successfully unfollowed ${fids.length} users!`);
    } catch (error) {
      console.error("Error batch unfollowing:", error);
      toast.error("Failed to unfollow some users");
    } finally {
      setIsLoading(false);
      setUnfollowProgress({ current: 0, total: 0 });
    }
  };

  const formatLastCasted = (timestamp: number | undefined) => {
    if (!timestamp) return "Never";
    const days = Math.floor((Date.now() / 1000 - timestamp) / (24 * 60 * 60));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  const filteredUsers = followingUsers.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-purple-600 mr-3" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Unfollow Tool
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Clean up your Farcaster following list automatically
          </p>
        </div>

        {/* Farcaster Connect */}
        <div className="mb-8">
          <FarcasterConnect
            onAuth={handleAuth}
            onDisconnect={handleDisconnect}
            isAuthenticated={isAuthenticated}
            userFid={userFid}
          />
        </div>

        {/* Main Content */}
        {isAuthenticated && userFid && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search users by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedUsers(new Set())}
                    variant="outline"
                    size="sm"
                  >
                    Clear Selection
                  </Button>
                  <Button
                    onClick={() => {
                      const allFids = followingUsers.map(user => user.fid);
                      setSelectedUsers(new Set(allFids));
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Select All
                  </Button>
                </div>
              </div>
            </div>

            {/* User List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Following ({followingUsers.length})
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <div
                    key={user.fid}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedUsers.has(user.fid)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(prev => new Set([...prev, user.fid]));
                            } else {
                              setSelectedUsers(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(user.fid);
                                return newSet;
                              });
                            }
                          }}
                        />
                        <img
                          src={user.pfp || "/icon.svg"}
                          alt={user.displayName}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="font-medium">{user.displayName}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleUnfollowUser(user.fid)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <UserMinus className="w-4 h-4 mr-1" />
                          Unfollow
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Batch Actions */}
            {selectedUsers.size > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Batch Unfollow ({selectedUsers.size} selected)
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Remove multiple users from your following list
                    </p>
                  </div>
                  <Button
                    onClick={handleBatchUnfollow}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4 mr-2" />
                        Unfollow Selected
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Features Section */}
        {!isAuthenticated && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  App Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">Name</h3>
                  <p className="text-gray-600">Unfollow Tool</p>
                </div>
                <div>
                  <h3 className="font-semibold">Description</h3>
                  <p className="text-gray-600">Clean up your Farcaster following list by identifying inactive users and mutual follows</p>
                </div>
                <div>
                  <h3 className="font-semibold">Category</h3>
                  <Badge variant="secondary">Utility</Badge>
                </div>
                <div>
                  <h3 className="font-semibold">Tags</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="outline">unfollow</Badge>
                    <Badge variant="outline">automation</Badge>
                    <Badge variant="outline">farcaster</Badge>
                    <Badge variant="outline">tool</Badge>
                    <Badge variant="outline">cleanup</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Auto-detect inactive users (60+ days)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Find non-mutual follows</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Batch unfollow with one click</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Zero manual input required</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Native Farcaster integration</span>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>App URLs</CardTitle>
                <CardDescription>All the links you need for Farcaster app registration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Main App</h3>
                  <p className="text-sm text-gray-600 break-all">https://redounfollowv0.vercel.app</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Manifest</h3>
                  <p className="text-sm text-gray-600 break-all">https://redounfollowv0.vercel.app/.well-known/farcaster.json</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Feed Integration</h3>
                  <p className="text-sm text-gray-600 break-all">https://redounfollowv0.vercel.app/feed</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Tool Integration</h3>
                  <p className="text-sm text-gray-600 break-all">https://redounfollowv0.vercel.app/tool</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Cast Embed</h3>
                  <p className="text-sm text-gray-600 break-all">https://redounfollowv0.vercel.app/embed/cast</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Profile Embed</h3>
                  <p className="text-sm text-gray-600 break-all">https://redounfollowv0.vercel.app/embed/profile</p>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>App Assets</CardTitle>
                <CardDescription>Images and icons for your app</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Icon</h3>
                  <p className="text-sm text-gray-600 break-all">https://redounfollowv0.vercel.app/icon.svg</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Thumbnail</h3>
                  <p className="text-sm text-gray-600 break-all">https://redounfollowv0.vercel.app/thumbnail.png</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Splash Screen</h3>
                  <p className="text-sm text-gray-600 break-all">https://redounfollowv0.vercel.app/splash.png</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-4 justify-center md:col-span-2">
              <Button
                onClick={() => window.open('https://redounfollowv0.vercel.app', '_blank')}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Open App
              </Button>
              <Button
                onClick={() => window.open('https://redounfollowv0.vercel.app/.well-known/farcaster.json', '_blank')}
                variant="outline"
              >
                View Manifest
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
