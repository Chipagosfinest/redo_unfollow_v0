"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, User } from "lucide-react";

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

  const handleFarcasterAuth = useCallback(async (fid: number) => {
    setIsConnecting(true);
    try {
      // Try to get user profile from Farcaster API
      const response = await fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${fid}`);
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.result?.user);
      }
      
      onAuth(fid);
      toast.success("Connected to Farcaster!");
    } catch (error) {
      console.error("Error connecting to Farcaster:", error);
      toast.error("Failed to connect to Farcaster");
    } finally {
      setIsConnecting(false);
    }
  }, [onAuth]);

  useEffect(() => {
    // Auto-connect when in Farcaster native environment
    if (typeof window !== 'undefined' && 'farcaster' in window) {
      // @ts-ignore - Farcaster global object
      const farcaster = (window as any).farcaster;
      if (farcaster?.user?.fid && !isAuthenticated) {
        handleFarcasterAuth(farcaster.user.fid);
      }
    }
  }, [isAuthenticated, handleFarcasterAuth]);

  if (isAuthenticated && userFid) {
    return (
      <div className="space-y-4">
        {/* Connected User Profile */}
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center space-x-3">
            <img
              src={userProfile?.pfp?.url || "https://via.placeholder.com/40"}
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
      onClick={() => {
        if (typeof window !== 'undefined' && 'farcaster' in window) {
          // @ts-ignore - Farcaster global object
          const farcaster = (window as any).farcaster;
          if (farcaster?.user?.fid) {
            handleFarcasterAuth(farcaster.user.fid);
          } else {
            toast.error("Please connect your Farcaster wallet first");
          }
        } else {
          toast.error("Farcaster wallet not detected. Please use Farcaster app.");
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
          Connect Farcaster Wallet
        </>
      )}
    </Button>
  );
} 