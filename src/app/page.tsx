"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { unfollowUser, getFarcasterSigner } from "@/lib/farcaster-actions";
import FarcasterConnect from "@/components/FarcasterConnect";
import { Users, UserMinus, Activity, TrendingUp, Search, Filter } from "lucide-react";
import { toast } from "sonner";

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userFid, setUserFid] = useState<number | null>(null);
  const [followingUsers, setFollowingUsers] = useState<FarcasterUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());

  const handleAuth = useCallback(async (fid: number) => {
    setUserFid(fid);
    setIsAuthenticated(true);
    await handleScanFollowing(fid);
  }, []);

  const handleDisconnect = useCallback(() => {
    setIsAuthenticated(false);
    setUserFid(null);
    setFollowingUsers([]);
    setSelectedUsers(new Set());
  }, []);

  const handleScanFollowing = useCallback(async (fid: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/following?fid=${fid}&page=0&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setFollowingUsers(data.users || []);
      } else {
        toast.error("Failed to load following list");
      }
    } catch (error) {
      console.error("Error loading following:", error);
      toast.error("Failed to load following list");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUnfollowUser = useCallback(async (fid: number) => {
    if (!userFid) return;
    
    try {
      const signer = await getFarcasterSigner();
      if (!signer) {
        toast.error("Failed to get Farcaster signer");
        return;
      }
      
      const result = await unfollowUser(signer, fid);
      if (result.success) {
        toast.success("Successfully unfollowed user");
        setFollowingUsers(prev => prev.filter(user => user.fid !== fid));
      } else {
        toast.error(result.error || "Failed to unfollow user");
      }
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow user");
    }
  }, [userFid]);

  const handleBatchUnfollow = useCallback(async () => {
    if (!userFid || selectedUsers.size === 0) return;
    
    setIsLoading(true);
    try {
      const signer = await getFarcasterSigner();
      if (!signer) {
        toast.error("Failed to get Farcaster signer");
        return;
      }
      
      let successCount = 0;
      for (const fid of selectedUsers) {
        const result = await unfollowUser(signer, fid);
        if (result.success) {
          successCount++;
        }
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      toast.success(`Successfully unfollowed ${successCount} users`);
      setFollowingUsers(prev => prev.filter(user => !selectedUsers.has(user.fid)));
      setSelectedUsers(new Set());
    } catch (error) {
      console.error("Error batch unfollowing:", error);
      toast.error("Failed to batch unfollow users");
    } finally {
      setIsLoading(false);
    }
  }, [userFid, selectedUsers]);

  const handleSelectUser = useCallback((fid: number) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fid)) {
        newSet.delete(fid);
      } else {
        newSet.add(fid);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedUsers.size === followingUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(followingUsers.map(user => user.fid)));
    }
  }, [selectedUsers.size, followingUsers]);

  const filteredUsers = followingUsers.filter(user =>
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Unfollow Tool
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Clean up your Farcaster following list
            </p>
          </div>
          
          <FarcasterConnect
            onAuth={handleAuth}
            onDisconnect={handleDisconnect}
            isAuthenticated={isAuthenticated}
            userFid={userFid}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Unfollow Tool
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {followingUsers.length} following • {selectedUsers.size} selected
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleDisconnect}
              variant="outline"
              size="sm"
            >
              Disconnect
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            onClick={handleSelectAll}
            variant="outline"
            size="sm"
          >
            {selectedUsers.size === followingUsers.length ? "Deselect All" : "Select All"}
          </Button>
          
          {selectedUsers.size > 0 && (
            <Button
              onClick={handleBatchUnfollow}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              <UserMinus className="w-4 h-4 mr-2" />
              Unfollow {selectedUsers.size}
            </Button>
          )}
        </div>

        {/* User List */}
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.fid} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.fid)}
                      onChange={() => handleSelectUser(user.fid)}
                      className="w-4 h-4 text-purple-600"
                    />
                    
                    <img
                      src={user.pfp}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full"
                    />
                    
                    <div>
                      <div className="font-semibold">{user.displayName}</div>
                      <div className="text-sm text-gray-600">@{user.username}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleUnfollowUser(user.fid)}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserMinus className="w-4 h-4 mr-1" />
                      Unfollow
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredUsers.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm ? "No users found matching your search." : "No users to display."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
