"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface FarcasterConnectProps {
  onAuth: (userFid: number) => void;
  onDisconnect: () => void;
  isAuthenticated: boolean;
  userFid: number | null;
}

export default function FarcasterConnect({ onAuth, onDisconnect, isAuthenticated, userFid }: FarcasterConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Initialize Farcaster Auth Kit
      const { FarcasterAuthKit } = await import("@farcaster/auth-kit");
      
      const authKit = new FarcasterAuthKit({
        appName: "Farcaster Unfollow App",
        appDescription: "Manage your Farcaster follows efficiently",
        appIcon: "https://redounfollowv0-xd7u1lti8-chipagosfinests-projects.vercel.app/icon.svg",
        appUrl: "https://redounfollowv0-xd7u1lti8-chipagosfinests-projects.vercel.app",
        walletConnectProjectId: "your-walletconnect-project-id", // You'll need to get this
      });

      // Connect to user's wallet
      const { account, signer } = await authKit.connect();
      
      if (account && signer) {
        // Get user's FID
        const userFid = await signer.getFid();
        onAuth(userFid);
        toast.success("Successfully connected to Farcaster!");
      } else {
        throw new Error("Failed to connect to wallet");
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to connect to Farcaster. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isAuthenticated ? (
        <div className="space-y-4">
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? "Connecting..." : "Connect Farcaster Account"}
          </Button>
          <p className="text-sm text-gray-500 text-center">
            Connect your wallet to use Farcaster features
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">Connected</Badge>
            <span className="text-sm text-gray-600">FID: {userFid}</span>
          </div>
          <Button variant="outline" onClick={onDisconnect}>
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
} 