"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, User, Sparkles, Shield } from "lucide-react";

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

  useEffect(() => {
    // Auto-connect when in Farcaster native environment
    if (typeof window !== 'undefined' && 'farcaster' in window) {
      // @ts-ignore - Farcaster global object
      const farcaster = (window as any).farcaster;
      if (farcaster?.user?.fid && !isAuthenticated) {
        handleFarcasterAuth(farcaster.user.fid);
      }
    }
  }, [isAuthenticated]);

  const handleFarcasterAuth = async (fid: number) => {
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
  };

  const handleManualAuth = () => {
    const fid = prompt("Enter your FID:");
    if (fid && !isNaN(parseInt(fid))) {
      handleFarcasterAuth(parseInt(fid));
    } else {
      toast.error("Please enter a valid FID");
    }
  };

  if (isAuthenticated && userFid) {
    return (
      <div className="space-y-4">
        {/* Connected User Profile */}
        <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={userProfile?.pfp?.url || "https://via.placeholder.com/60"}
                alt={userProfile?.displayName || "User"}
                className="w-16 h-16 rounded-full ring-4 ring-purple-200 dark:ring-purple-800 shadow-lg"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Shield className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {userProfile?.displayName || "Farcaster User"}
                </h3>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0">
                  Connected
                </Badge>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                @{userProfile?.username || "user"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                FID: {userFid}
              </p>
            </div>
          </div>
        </div>

        {/* Disconnect Button */}
        <Button
          onClick={onDisconnect}
          variant="outline"
          className="w-full farcaster-button-secondary"
        >
          <User className="w-4 h-4 mr-2" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary Connect Button */}
      <Button
        onClick={() => {
          if (typeof window !== 'undefined' && 'farcaster' in window) {
            // @ts-ignore - Farcaster global object
            const farcaster = (window as any).farcaster;
            if (farcaster?.user?.fid) {
              handleFarcasterAuth(farcaster.user.fid);
            } else {
              toast.info("Please open this app in Farcaster for the best experience");
              handleManualAuth();
            }
          } else {
            handleManualAuth();
          }
        }}
        disabled={isConnecting}
        className="w-full farcaster-button-primary h-12 text-lg font-semibold"
      >
        {isConnecting ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="w-5 h-5 mr-2" />
            Connect with Farcaster Wallet
          </>
        )}
      </Button>

      {/* Features List */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span>Privacy-focused - your data stays local</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span>Real-time analysis of your following list</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span>Smart recommendations for inactive users</span>
        </div>
      </div>

      {/* Manual Connect for Testing */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3">
          For best experience, use Farcaster&apos;s native app
        </p>
        <Button
          onClick={handleManualAuth}
          variant="outline"
          className="w-full farcaster-button-secondary"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Manual Connect (Testing)
        </Button>
      </div>
    </div>
  );
} 