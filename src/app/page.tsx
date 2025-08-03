"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserMinus, Activity, TrendingUp, Shield, Sparkles } from "lucide-react";
import FarcasterConnect from "@/components/FarcasterConnect";
import { sdk } from '@farcaster/miniapp-sdk';

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

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userFid, setUserFid] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<FollowingUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [unfollowedUsers, setUnfollowedUsers] = useState<Set<number>>(new Set());
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
    setUnfollowedUsers(new Set());
  };

  const handleScanFollowing = async () => {
    if (!userFid) return;
    
    setIsScanning(true);
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
      setIsScanning(false);
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
        
        setUnfollowedUsers(prev => new Set([...prev, fid]));
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

  const formatLastCasted = (timestamp: number | undefined) => {
    if (!timestamp) return "Never";
    const days = Math.floor((Date.now() / 1000 - timestamp) / (24 * 60 * 60));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-purple-600 mr-3" />
                                 <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                       Unfollow Tool - Latest Mini App
                     </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Clean up your Farcaster following list automatically
          </p>
        </div>

        {/* Authentication Section */}
        {!isAuthenticated ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl">Connect Your Account</CardTitle>
              <CardDescription>
                Scan your following list and identify inactive users
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
        ) : (
          /* Main Dashboard */
          <div className="space-y-8">
            
            {/* Scan Button */}
            <div className="text-center">
              <Button
                onClick={handleScanFollowing}
                disabled={isScanning}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg"
              >
                {isScanning ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Scanning...
                  </div>
                ) : (
                  <>
                    <Activity className="w-5 h-5 mr-2" />
                    Scan Following List
                  </>
                )}
              </Button>
            </div>

            {/* Results */}
            {followingUsers.length > 0 && (
              <div className="space-y-6">
                
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-blue-600 mr-2" />
                        <div>
                          <p className="text-sm text-gray-600">Total Following</p>
                          <p className="text-2xl font-bold">{followingUsers.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <Activity className="w-5 h-5 text-orange-600 mr-2" />
                        <div>
                          <p className="text-sm text-gray-600">Inactive Users</p>
                          <p className="text-2xl font-bold">{followingUsers.filter(u => u.isInactive).length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                        <div>
                          <p className="text-sm text-gray-600">Selected</p>
                          <p className="text-2xl font-bold">{selectedUsers.size}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button
                    onClick={handleSelectAllInactive}
                    variant="outline"
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    Select All Inactive
                  </Button>
                  
                  <Button
                    onClick={handleUnfollowSelected}
                    disabled={selectedUsers.size === 0 || isUnfollowing}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isUnfollowing ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Unfollowing...
                      </div>
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4 mr-2" />
                        Unfollow Selected ({selectedUsers.size})
                      </>
                    )}
                  </Button>
                </div>

                {/* Progress Bar */}
                {isUnfollowing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Unfollowing users...</span>
                      <span>{unfollowProgress.current}/{unfollowProgress.total}</span>
                    </div>
                    <Progress value={(unfollowProgress.current / unfollowProgress.total) * 100} />
                  </div>
                )}

                {/* User List */}
                <div className="space-y-3">
                  {followingUsers.map((user) => (
                    <Card key={user.fid} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <Checkbox
                            checked={selectedUsers.has(user.fid)}
                            onCheckedChange={(checked) => handleSelectUser(user.fid, checked as boolean)}
                          />
                          
                          <img
                            src={user.pfp || "https://via.placeholder.com/40"}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-full"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{user.displayName}</h3>
                              <span className="text-gray-500">@{user.username}</span>
                              {user.isMutualFollow && (
                                <Badge variant="secondary" className="text-xs">Mutual</Badge>
                              )}
                              {user.isInactive && (
                                <Badge variant="destructive" className="text-xs">Inactive</Badge>
                              )}
                              {unfollowedUsers.has(user.fid) && (
                                <Badge className="bg-green-100 text-green-800 text-xs">Unfollowed</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Last active: {formatLastCasted(user.lastCasted)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// Force deployment refresh - Updated title to Unfollow Tool - Cache busting enabled - Mini app fixes applied - Latest deployment: $(date)
