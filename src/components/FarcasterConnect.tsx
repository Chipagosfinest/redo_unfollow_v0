"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
  walletAddress: string;
}

interface FarcasterConnectProps {
  onAuth: (fid: number) => void;
  onDisconnect: () => void;
  isAuthenticated: boolean;
  userFid: number | null;
}

export default function FarcasterConnect({
  onAuth,
  onDisconnect,
  isAuthenticated,
  userFid
}: FarcasterConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if we're in a Farcaster environment
  const isInFarcaster = typeof window !== 'undefined' && 
    (window.location.hostname.includes('warpcast.com') || 
     window.location.hostname.includes('farcaster.xyz') ||
     window.location.hostname.includes('fcast.me'));

  useEffect(() => {
    // Auto-connect if we're in Farcaster environment
    if (isInFarcaster && !isAuthenticated) {
      handleFarcasterAuth();
    }
  }, [isInFarcaster, isAuthenticated]);

  const handleFarcasterAuth = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Use Farcaster's native wallet integration
      if (typeof window !== 'undefined' && 'farcaster' in window) {
        // @ts-ignore - Farcaster global object
        const farcaster = (window as any).farcaster;
        
        if (farcaster && farcaster.user) {
          const userData = farcaster.user;
          const userInfo: FarcasterUser = {
            fid: userData.fid,
            username: userData.username,
            displayName: userData.displayName || userData.username,
            pfp: userData.pfp?.url || "https://via.placeholder.com/40",
            walletAddress: userData.walletAddress
          };
          
          setUser(userInfo);
          onAuth(userInfo.fid);
          return;
        }
      }

      // Fallback: Try to get user from URL params or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const fid = urlParams.get('fid') || localStorage.getItem('farcaster_fid');
      
      if (fid) {
        const fidNumber = parseInt(fid);
        if (!isNaN(fidNumber)) {
          // Fetch user details from Farcaster API
          const response = await fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${fidNumber}`);
          if (response.ok) {
            const data = await response.json();
            const userData = data.result?.user;
            
            if (userData) {
              const userInfo: FarcasterUser = {
                fid: userData.fid,
                username: userData.username,
                displayName: userData.displayName || userData.username,
                pfp: userData.pfp?.url || "https://via.placeholder.com/40",
                walletAddress: userData.verifications?.[0]?.address || "unknown"
              };
              
              setUser(userInfo);
              onAuth(userInfo.fid);
              return;
            }
          }
        }
      }

      // If no native auth available, show manual connect option
      throw new Error("Farcaster native wallet not available");
      
    } catch (error) {
      console.error("Farcaster auth error:", error);
      setError("Unable to connect to Farcaster wallet. Please ensure you're using Farcaster's native app.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualAuth = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // For development/testing, allow manual FID input
      const fid = prompt("Enter your Farcaster FID (for testing only):");
      if (fid) {
        const fidNumber = parseInt(fid);
        if (!isNaN(fidNumber)) {
          onAuth(fidNumber);
          localStorage.setItem('farcaster_fid', fid);
        } else {
          setError("Invalid FID");
        }
      }
    } catch (error) {
      setError("Manual authentication failed");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setUser(null);
    setError(null);
    localStorage.removeItem('farcaster_fid');
    onDisconnect();
  };

  if (isAuthenticated && user) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <img
            src={user.pfp}
            alt={user.displayName}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <div className="font-semibold">{user.displayName}</div>
            <div className="text-sm text-gray-500">@{user.username}</div>
            <div className="text-xs text-gray-400">FID: {user.fid}</div>
          </div>
          <Badge variant="secondary" className="ml-auto">
            Connected
          </Badge>
        </div>
        <Button 
          onClick={handleDisconnect}
          variant="outline"
          className="w-full"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <div className="space-y-3">
        <Button 
          onClick={handleFarcasterAuth}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting ? "Connecting..." : "Connect with Farcaster Wallet"}
        </Button>
        
        {!isInFarcaster && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              For best experience, use Farcaster's native app
            </p>
            <Button 
              onClick={handleManualAuth}
              variant="outline"
              size="sm"
            >
              Manual Connect (Testing)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 