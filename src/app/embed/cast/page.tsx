"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CastData {
  author?: {
    displayName?: string;
    username?: string;
    pfp?: {
      url?: string;
    };
  };
  text?: string;
}

export default function CastEmbedPage() {
  const [castData, setCastData] = useState<CastData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get cast data from URL params or Farcaster context
    const urlParams = new URLSearchParams(window.location.search);
    const castHash = urlParams.get('castHash');

    if (castHash) {
      loadCastData(castHash);
    }
  }, []);

  const loadCastData = async (castHash: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.farcaster.xyz/v2/cast?hash=${castHash}`);
      if (response.ok) {
        const data = await response.json();
        setCastData(data.result?.cast);
      }
    } catch (error) {
      console.error("Error loading cast data:", error);
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
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!castData) {
    return (
      <div className="p-4">
        <Card className="farcaster-card">
          <CardHeader>
            <CardTitle className="farcaster-gradient-text">Farcaster UnfollowX</CardTitle>
            <CardDescription>Cast embed - no cast data available</CardDescription>
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
          <CardTitle className="farcaster-gradient-text">UnfollowX Cast Embed</CardTitle>
          <CardDescription>
            Manage your following list with this cast
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <img
              src={castData.author?.pfp?.url || "https://via.placeholder.com/40"}
              alt={castData.author?.displayName}
              className="w-10 h-10 rounded-full ring-2 ring-purple-200 dark:ring-purple-800"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {castData.author?.displayName}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                @{castData.author?.username}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {castData.text}
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