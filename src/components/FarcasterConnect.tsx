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

  // Get Farcaster native wallet user (Privy-based)
  const getFarcasterUser = useCallback(async () => {
    try {
      // Check if we're in Farcaster environment
      const isInIframe = window.self !== window.top;
      const farcaster = (window as any).farcaster;
      
      console.log('FarcasterConnect: Environment check', {
        isInIframe,
        hasFarcasterObject: !!farcaster,
        hasUser: !!farcaster?.user,
        hasFid: !!farcaster?.user?.fid
      });
      
      // If user is already available, return it
      if (farcaster?.user?.fid) {
        console.log('FarcasterConnect: Found existing user:', farcaster.user);
        return farcaster.user;
      }
      
      // If we're in iframe, try to initialize SDK
      if (isInIframe) {
        console.log('FarcasterConnect: Initializing SDK in iframe');
        await sdk.actions.ready();
        
        // Wait for SDK to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check again for user
        if (farcaster?.user?.fid) {
          console.log('FarcasterConnect: Found user after SDK init:', farcaster.user);
          return farcaster.user;
        }
        
        // Check for Privy wallet integration
        if (farcaster?.privy?.user) {
          console.log('FarcasterConnect: Found Privy user:', farcaster.privy.user);
          return farcaster.privy.user;
        }
      }
      
      console.log('FarcasterConnect: No user found');
      return null;
    } catch (error) {
      console.error("Error getting Farcaster user:", error);
      return null;
    }
  }, []);

  const handleFarcasterAuth = useCallback(async (fid: number) => {
    setIsConnecting(true);
    try {
      // Get user using native Farcaster wallet (Privy-based)
      const user = await getFarcasterUser();
      
      if (user) {
        setUserProfile({
          fid: user.fid,
          username: user.username,
          displayName: user.displayName,
          pfp: { url: user.pfp?.url }
        });
        
        onAuth(fid);
        toast.success("Connected to Farcaster!");
      } else {
        // Fallback to API if user not available
        const response = await fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${fid}`);
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data.result?.user);
          onAuth(fid);
          toast.success("Connected to Farcaster!");
        } else {
          throw new Error("Failed to get user data");
        }
      }
    } catch (error) {
      console.error("Error connecting to Farcaster:", error);
      toast.error("Failed to connect to Farcaster");
    } finally {
      setIsConnecting(false);
    }
  }, [onAuth, getFarcasterUser]);

  useEffect(() => {
    // Auto-connect when in Farcaster native environment
    const initializeAuth = async () => {
      try {
        // Get user using native Farcaster wallet (Privy-based)
        const user = await getFarcasterUser();
        
        if (user?.fid && !isAuthenticated) {
          // Set user profile immediately
          setUserProfile({
            fid: user.fid,
            username: user.username,
            displayName: user.displayName,
            pfp: { url: user.pfp?.url }
          });
          
          handleFarcasterAuth(user.fid);
        }
      } catch (error) {
        console.log('Not in Farcaster native environment or user not authenticated');
      }
    };

    initializeAuth();
  }, [isAuthenticated, handleFarcasterAuth, getFarcasterUser]);

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
          id="farcaster-disconnect-button"
          name="farcaster-disconnect-button"
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
          // Get user using native Farcaster wallet (Privy-based)
          const user = await getFarcasterUser();
          
          if (user?.fid) {
            // Set user profile immediately
            setUserProfile({
              fid: user.fid,
              username: user.username,
              displayName: user.displayName,
              pfp: { url: user.pfp?.url }
            });
            
            handleFarcasterAuth(user.fid);
          } else {
            const isInIframe = window.self !== window.top;
            if (isInIframe) {
              toast.error("Please connect your Farcaster wallet first");
            } else {
              toast.error("Please open this app in Farcaster to connect your wallet");
            }
          }
        } catch (error) {
          console.error('Connection error:', error);
          const isInIframe = window.self !== window.top;
          if (isInIframe) {
            toast.error("Failed to connect to Farcaster wallet");
          } else {
            toast.error("Please open this app in Farcaster to connect your wallet");
          }
        }
      }}
      disabled={isConnecting}
      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
      id="farcaster-connect-button"
      name="farcaster-connect-button"
    >
      {isConnecting ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Connecting...
        </div>
      ) : (
        <>
          <Wallet className="w-4 h-4 mr-2" />
          {window.self !== window.top ? 'Connect Farcaster Wallet' : 'Open in Farcaster App'}
        </>
      )}
    </Button>
  );
} 