"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import FarcasterConnect from "@/components/FarcasterConnect";
import { unfollowUser, FarcasterSigner } from "@/lib/farcaster-actions";

interface Follower {
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

export default function FarcasterUnfollowApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userFid, setUserFid] = useState<number | null>(null);
  const [signer, setSigner] = useState<FarcasterSigner | null>(null);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isUnfollowing, setIsUnfollowing] = useState(false);
  const [selectedFollowers, setSelectedFollowers] = useState<Set<number>>(new Set());
  const [unfollowedUsers, setUnfollowedUsers] = useState<Set<number>>(new Set());

  const handleAuth = (fid: number) => {
    setIsAuthenticated(true);
    setUserFid(fid);
  };

  const handleDisconnect = () => {
    setIsAuthenticated(false);
    setUserFid(null);
    setSigner(null);
    setFollowers([]);
    setSelectedFollowers(new Set());
    setUnfollowedUsers(new Set());
  };

  const scanFollowers = async () => {
    if (!userFid) {
      toast.error("Please authenticate first");
      return;
    }

    setIsScanning(true);
    try {
      // Get user's followers
      const response = await fetch(`/api/followers?fid=${userFid}`);
      
      if (response.ok) {
        const data = await response.json();
        const followersWithActivity = await analyzeFollowers(data.followers);
        setFollowers(followersWithActivity);
        toast.success(`Found ${followersWithActivity.length} followers`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scan followers");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to scan followers");
    } finally {
      setIsScanning(false);
    }
  };

  const analyzeFollowers = async (followers: any[]): Promise<Follower[]> => {
    const analyzedFollowers: Follower[] = [];
    
    for (const follower of followers) {
      try {
        // Check if mutual follow
        const mutualResponse = await fetch(`/api/check-mutual?userFid=${userFid}&targetFid=${follower.fid}`);
        const mutualData = await mutualResponse.json();
        const isMutualFollow = mutualData.isMutualFollow;

        // Get last cast timestamp
        const castsResponse = await fetch(`/api/user-casts?fid=${follower.fid}&limit=1`);
        const castsData = await castsResponse.json();
        const lastCasted = castsData.casts?.[0]?.timestamp || 0;

        // Calculate if inactive (60+ days or no mutual follow)
        const sixtyDaysAgo = Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60);
        const isInactive = !isMutualFollow || lastCasted < sixtyDaysAgo;

        analyzedFollowers.push({
          ...follower,
          lastCasted,
          isMutualFollow,
          isInactive,
        });
      } catch (error) {
        console.error(`Error analyzing follower ${follower.username}:`, error);
        // Add with default values if analysis fails
        analyzedFollowers.push({
          ...follower,
          lastCasted: 0,
          isMutualFollow: false,
          isInactive: true,
        });
      }
    }

    return analyzedFollowers;
  };

  const handleSelectFollower = (fid: number, checked: boolean) => {
    if (checked) {
      setSelectedFollowers(prev => new Set([...prev, fid]));
    } else {
      setSelectedFollowers(prev => {
        const newSet = new Set(prev);
        newSet.delete(fid);
        return newSet;
      });
    }
  };

  const handleSelectAllInactive = () => {
    const inactiveFollowerIds = followers
      .filter(f => f.isInactive)
      .map(f => f.fid);
    setSelectedFollowers(new Set(inactiveFollowerIds));
  };

  const handleUnfollowSelected = async () => {
    if (!signer || selectedFollowers.size === 0) {
      toast.error("Please select followers to unfollow");
      return;
    }

    setIsUnfollowing(true);
    try {
      for (const fid of selectedFollowers) {
        const result = await unfollowUser(signer, fid);
        
        if (result.success) {
          setUnfollowedUsers(prev => new Set([...prev, fid]));
          const follower = followers.find(f => f.fid === fid);
          toast.success(`Successfully unfollowed @${follower?.username || fid}`);
        } else {
          throw new Error(result.error || `Failed to unfollow ${fid}`);
        }
        
        // Add delay between unfollows to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Clear selection after successful unfollow
      setSelectedFollowers(new Set());
      toast.success(`Successfully unfollowed ${selectedFollowers.size} users`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk unfollow failed");
    } finally {
      setIsUnfollowing(false);
    }
  };

  const formatLastCasted = (timestamp: number) => {
    if (!timestamp) return "Never";
    const daysAgo = Math.floor((Date.now() / 1000 - timestamp) / (24 * 60 * 60));
    if (daysAgo === 0) return "Today";
    if (daysAgo === 1) return "Yesterday";
    return `${daysAgo} days ago`;
  };

  const inactiveFollowers = followers.filter(f => f.isInactive);
  const selectedInactiveCount = Array.from(selectedFollowers).filter(fid => 
    followers.find(f => f.fid === fid)?.isInactive
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Farcaster Unfollow App</h1>
          <p className="text-gray-600">Scan your followers and unfollow inactive users</p>
        </div>

        {/* Authentication Section */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Connect your Farcaster account to scan your followers
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

        {/* Scan Followers Section */}
        {isAuthenticated && (
          <Card>
            <CardHeader>
              <CardTitle>Scan Followers</CardTitle>
              <CardDescription>
                Scan your followers to identify inactive users (no mutual follow or haven't casted in 60+ days)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Button 
                  onClick={scanFollowers} 
                  disabled={isScanning}
                  className="w-full max-w-xs"
                >
                  {isScanning ? "Scanning Followers..." : "Scan Followers"}
                </Button>
                
                {followers.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {inactiveFollowers.length} inactive out of {followers.length} total
                  </div>
                )}
              </div>

              {followers.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Inactive Followers</h3>
                    <div className="flex items-center space-x-2">
                      <Button 
                        onClick={handleSelectAllInactive}
                        variant="outline"
                        size="sm"
                      >
                        Select All Inactive
                      </Button>
                      <Button 
                        onClick={handleUnfollowSelected}
                        disabled={isUnfollowing || selectedFollowers.size === 0}
                        variant="destructive"
                        size="sm"
                      >
                        {isUnfollowing ? "Unfollowing..." : `Unfollow Selected (${selectedFollowers.size})`}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {inactiveFollowers.map((follower) => (
                      <div
                        key={follower.fid}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={selectedFollowers.has(follower.fid)}
                            onCheckedChange={(checked) => 
                              handleSelectFollower(follower.fid, checked as boolean)
                            }
                            disabled={unfollowedUsers.has(follower.fid)}
                          />
                          <img
                            src={follower.pfp}
                            alt={follower.displayName}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <div className="font-medium">{follower.displayName}</div>
                            <div className="text-sm text-gray-500">@{follower.username}</div>
                            <div className="text-xs text-gray-400">
                              Last cast: {formatLastCasted(follower.lastCasted)}
                              {!follower.isMutualFollow && (
                                <span className="ml-2 text-red-500">• No mutual follow</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!follower.isMutualFollow && (
                            <Badge variant="secondary">No Mutual</Badge>
                          )}
                          {follower.lastCasted && follower.lastCasted < (Date.now() / 1000 - 60 * 24 * 60 * 60) && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                          {unfollowedUsers.has(follower.fid) && (
                            <Badge variant="outline">Unfollowed</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
                    {followers.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {inactiveFollowers.length}
                  </div>
                  <div className="text-sm text-gray-600">Inactive Found</div>
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
