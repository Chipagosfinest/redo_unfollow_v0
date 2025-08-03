"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sdk } from '@farcaster/miniapp-sdk';

interface ProfileData {
  displayName?: string;
  username?: string;
  fid?: number;
  pfp?: {
    url?: string;
  };
  followerCount?: number;
  followingCount?: number;
}

export default function ProfileEmbedPage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    // Get profile data from URL params or Farcaster context
    const urlParams = new URLSearchParams(window.location.search);
    const fid = urlParams.get('fid');
    const username = urlParams.get('username');

    if (fid) {
      loadProfileData(parseInt(fid));
    } else if (username) {
      loadProfileByUsername(username);
    }
  }, []);

  const loadProfileData = async (fid: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${fid}`);
      if (response.ok) {
        const data = await response.json();
        setProfileData(data.result?.user);
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfileByUsername = async (username: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.farcaster.xyz/v2/user-by-username?username=${username}`);
      if (response.ok) {
        const data = await response.json();
        setProfileData(data.result?.user);
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <Card className="farcaster-card">
          <CardContent className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="p-4">
        <Card className="farcaster-card">
          <CardHeader>
            <CardTitle className="farcaster-gradient-text">Unfollow Tool</CardTitle>
            <CardDescription>Profile embed - no profile data available</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.open('https://redounfollowv0-qybv2kphz-chipagosfinests-projects.vercel.app', '_blank')}
              className="farcaster-button-primary w-full"
            >
              Open UnfollowX Tool
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card className="farcaster-card">
        <CardHeader>
          <CardTitle className="farcaster-gradient-text">UnfollowX Profile Embed</CardTitle>
          <CardDescription>
            Manage your following list
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <img
              src={profileData.pfp?.url || "https://via.placeholder.com/40"}
              alt={profileData.displayName}
              className="w-12 h-12 rounded-full ring-2 ring-purple-200 dark:ring-purple-800"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {profileData.displayName}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                @{profileData.username}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                FID: {profileData.fid}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-purple-600 dark:text-purple-400">
                {profileData.followerCount?.toLocaleString() || 0}
              </div>
              <div className="text-gray-500">Followers</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-purple-600 dark:text-purple-400">
                {profileData.followingCount?.toLocaleString() || 0}
              </div>
              <div className="text-gray-500">Following</div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={() => window.open('https://redounfollowv0-qybv2kphz-chipagosfinests-projects.vercel.app/tool', '_blank')}
              size="sm"
              className="farcaster-button-primary"
            >
              Open Tool
            </Button>
            <Button
              onClick={() => window.open('https://redounfollowv0-qybv2kphz-chipagosfinests-projects.vercel.app/feed', '_blank')}
              variant="outline"
              size="sm"
              className="farcaster-button-secondary"
            >
              View Feed
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 