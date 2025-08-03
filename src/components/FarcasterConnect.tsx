"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, User } from "lucide-react";
import { sdk } from '@farcaster/miniapp-sdk';

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
  userFid,
}: FarcasterConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Protect against external wallet injection
  const getFarcasterWallet = useCallback(() => {
    if (typeof window !== 'undefined' && 'farcaster' in window) {
      // @ts-ignore - Farcaster global object
      const farcaster = (window as any).farcaster;
      // Only use native Farcaster wallet, ignore external injections
      if (farcaster && farcaster.user && farcaster.user.fid) {
        return farcaster;
      }
    }
    return null;
  }, []);

  const handleFarcasterAuth = useCallback(async (fid: number) => {
    setIsConnecting(true);
    try {
      // Initialize SDK first
      await sdk.actions.ready();
      
      // Get native Farcaster wallet
      const farcaster = getFarcasterWallet();
      if (farcaster?.user) {
        setUserProfile({
          fid: farcaster.user.fid,
          username: farcaster.user.username,
          displayName: farcaster.user.displayName,
          pfp: { url: farcaster.user.pfp?.url }
        });
      } else {
        // Fallback to API if global object doesn't have profile
        const response = await fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${fid}`);
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data.result?.user);
        }
      }
      
      onAuth(fid);
      toast.success("Connected to Farcaster!");
    } catch (error) {
      console.error("Error connecting to Farcaster:", error);
      toast.error("Failed to connect to Farcaster");
    } finally {
      setIsConnecting(false);
    }
  }, [onAuth, getFarcasterWallet]);

  useEffect(() => {
    // Auto-connect when in Farcaster native environment
    const initializeAuth = async () => {
      try {
        // Initialize SDK
        await sdk.actions.ready();
        
        // Check for native Farcaster environment
        const farcaster = getFarcasterWallet();
        if (farcaster?.user?.fid && !isAuthenticated) {
          // Set user profile immediately from native wallet
          if (farcaster.user) {
            setUserProfile({
              fid: farcaster.user.fid,
              username: farcaster.user.username,
              displayName: farcaster.user.displayName,
              pfp: { url: farcaster.user.pfp?.url }
            });
          }
          handleFarcasterAuth(farcaster.user.fid);
        }
      } catch (error) {
        console.log('Not in Farcaster native environment or user not authenticated');
      }
    };

    initializeAuth();
  }, [isAuthenticated, handleFarcasterAuth, getFarcasterWallet]);

  if (isAuthenticated && userFid) {
    return (
      <div className="space-y-4">
        {/* Connected User Profile */}
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center space-x-3">
            <img
              src={userProfile?.pfp?.url || "/icon.svg"}
              alt={userProfile?.displayName || "User"}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold">{userProfile?.displayName || "Farcaster User"}</h3>
                <Badge variant="secondary" className="text-xs">Connected</Badge>
              </div>
              <p className="text-sm text-gray-600">@{userProfile?.username || "user"}</p>
            </div>
          </div>
        </div>

        {/* Disconnect Button */}
        <Button
          onClick={onDisconnect}
          variant="outline"
          className="w-full"
        >
          <User className="w-4 h-4 mr-2" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={async () => {
        try {
          // Initialize SDK
          await sdk.actions.ready();
          
          // Check for native Farcaster wallet
          const farcaster = getFarcasterWallet();
          if (farcaster?.user?.fid) {
            // Set user profile immediately from native wallet
            if (farcaster.user) {
              setUserProfile({
                fid: farcaster.user.fid,
                username: farcaster.user.username,
                displayName: farcaster.user.displayName,
                pfp: { url: farcaster.user.pfp?.url }
              });
            }
            handleFarcasterAuth(farcaster.user.fid);
          } else {
            toast.error("Please connect your Farcaster native wallet first");
          }
        } catch (error) {
          toast.error("Farcaster native wallet not detected. Please use Farcaster app.");
        }
      }}
      disabled={isConnecting}
      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
    >
      {isConnecting ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Connecting...
        </div>
      ) : (
        <>
          <Wallet className="w-4 h-4 mr-2" />
          Connect Farcaster Native Wallet
        </>
      )}
    </Button>
  );
} 