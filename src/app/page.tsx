"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

interface User {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUnfollowing, setIsUnfollowing] = useState(false);
  const [unfollowedUsers, setUnfollowedUsers] = useState<Set<number>>(new Set());

  const handleAuth = async () => {
    try {
      // TODO: Implement real Farcaster authentication with message signing
      // This requires integration with a wallet or signer
      toast.error("Authentication requires wallet integration. Please implement Farcaster Connect.");
      return;
      
      // Example of what the real implementation would look like:
      // const messageBytes = await signMessage(authMessage);
      // const response = await fetch("/api/auth", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ messageBytes, signature }),
      // });
    } catch (error) {
      toast.error("Authentication failed. Please try again.");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a username to search");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Please authenticate first");
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users);
        toast.success(`Found ${data.users.length} users`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUnfollow = async (user: User) => {
    if (!userFid) {
      toast.error("Please authenticate first");
      return;
    }

    setIsUnfollowing(true);
    try {
      const response = await fetch("/api/unfollow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userFid,
          targetFid: user.fid,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUnfollowedUsers(prev => new Set([...prev, user.fid]));
        toast.success(`Unfollow message created for @${user.username}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Unfollow failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to unfollow @${user.username}`);
    } finally {
      setIsUnfollowing(false);
    }
  };

  const handleBulkUnfollow = async () => {
    if (!userFid) {
      toast.error("Please authenticate first");
      return;
    }

    const usersToUnfollow = searchResults.filter(user => !unfollowedUsers.has(user.fid));
    if (usersToUnfollow.length === 0) {
      toast.info("No users to unfollow");
      return;
    }

    setIsUnfollowing(true);
    try {
      for (const user of usersToUnfollow) {
        const response = await fetch("/api/unfollow", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userFid,
            targetFid: user.fid,
          }),
        });

        if (response.ok) {
          setUnfollowedUsers(prev => new Set([...prev, user.fid]));
          toast.success(`Unfollow message created for @${user.username}`);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to unfollow @${user.username}`);
        }
        
        // Add delay between unfollows to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk unfollow failed. Please try again.");
    } finally {
      setIsUnfollowing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Farcaster Unfollow App</h1>
          <p className="text-gray-600">Manage your Farcaster follows efficiently</p>
        </div>

        {/* Authentication Section */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Connect your Farcaster account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isAuthenticated ? (
              <div className="space-y-4">
                <Button onClick={handleAuth} className="w-full">
                  Connect Farcaster Account
                </Button>
                <p className="text-sm text-gray-500 text-center">
                  Requires wallet integration for message signing
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Connected</Badge>
                  <span className="text-sm text-gray-600">FID: {userFid}</span>
                </div>
                <Button variant="outline" onClick={() => {
                  setIsAuthenticated(false);
                  setUserFid(null);
                  setSearchResults([]);
                  setUnfollowedUsers(new Set());
                }}>
                  Disconnect
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>Search Users</CardTitle>
            <CardDescription>
              Search for users to unfollow by username
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label htmlFor="search">Username</Label>
                <Input
                  id="search"
                  placeholder="Enter username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !isAuthenticated}
                className="mt-6"
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Search Results</h3>
                  <Button 
                    onClick={handleBulkUnfollow}
                    disabled={isUnfollowing || searchResults.every(user => unfollowedUsers.has(user.fid))}
                    variant="destructive"
                  >
                    {isUnfollowing ? "Unfollowing..." : "Unfollow All"}
                  </Button>
                </div>
                
                <div className="grid gap-3">
                  {searchResults.map((user) => (
                    <div
                      key={user.fid}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={user.pfp}
                          alt={user.displayName}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="font-medium">{user.displayName}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                          <div className="text-xs text-gray-400">
                            {user.followerCount} followers • {user.followingCount} following
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleUnfollow(user)}
                        disabled={isUnfollowing || unfollowedUsers.has(user.fid)}
                        variant={unfollowedUsers.has(user.fid) ? "secondary" : "destructive"}
                        size="sm"
                      >
                        {unfollowedUsers.has(user.fid) ? "Unfollowed" : "Unfollow"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Section */}
        {unfollowedUsers.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Unfollow Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {unfollowedUsers.size}
                  </div>
                  <div className="text-sm text-gray-600">Users Unfollowed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {searchResults.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Searched</div>
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
