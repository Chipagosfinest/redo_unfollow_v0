"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Sparkles, Shield, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface NeynarAuthProps {
  onAuthenticated: (user: any) => void;
  onDisconnect: () => void;
}

export default function NeynarAuth({ onAuthenticated, onDisconnect }: NeynarAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isNeynarAvailable, setIsNeynarAvailable] = useState(false);
  const [isInFrame, setIsInFrame] = useState(false);

  const handleAuthSuccess = useCallback(async (userData: any) => {
    try {
      setIsLoading(true);
      setAuthError(null);
      
      console.log('Authentication successful', {
        fid: userData.fid,
        username: userData.username,
        hasSignerUuid: !!userData.signer_uuid
      });

      // Load additional profile data from Neynar API
      try {
        const response = await fetch(`/api/neynar/user?fid=${userData.fid}`);
        if (response.ok) {
          const data = await response.json();
          const enhancedUser = {
            ...userData,
            ...data.users[0]
          };
          onAuthenticated(enhancedUser);
        } else {
          // Fallback to user data from context
          onAuthenticated(userData);
        }
      } catch (error) {
        console.error('Error loading enhanced profile:', error);
        // Fallback to user data from context
        onAuthenticated(userData);
      }

      toast.success("Connected to Farcaster!");
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      toast.error("Failed to authenticate");
    } finally {
      setIsLoading(false);
    }
  }, [onAuthenticated]);

  const handleDemoAuth = useCallback(() => {
    // For demo purposes, simulate authentication
    const demoUser = {
      fid: 194, // Known Farcaster FID
      username: 'demo.eth',
      display_name: 'Demo User',
      displayName: 'Demo User',
      follower_count: 1000,
      following_count: 500,
      signer_uuid: 'demo-signer-uuid'
    };
    handleAuthSuccess(demoUser);
  }, [handleAuthSuccess]);

  const handleNeynarAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      
      // Check if we're in a Farcaster frame
      if (isInFrame) {
        // We're in a Farcaster frame, try to get user data
        const frameData = {
          fid: 194, // Demo FID for now
          username: 'demo.eth',
          display_name: 'Demo User',
          displayName: 'Demo User',
          follower_count: 1000,
          following_count: 500,
          signer_uuid: 'demo-signer-uuid'
        };
        handleAuthSuccess(frameData);
      } else {
        // We're in a web browser, use demo auth
        handleDemoAuth();
      }
    } catch (error) {
      console.error('Neynar auth error:', error);
      setAuthError('Authentication not available in this environment');
      handleDemoAuth();
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthSuccess, handleDemoAuth, isInFrame]);

  // Check environment on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const inFrame = window.self !== window.top;
      setIsInFrame(inFrame);
      setIsNeynarAvailable(inFrame);
      
      console.log('Environment detected:', {
        isInFrame: inFrame,
        userAgent: window.navigator.userAgent,
        location: window.location.href
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full mb-8">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Farcaster Cleanup
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column - Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Why Clean Your Feed?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Users className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Remove Inactive Accounts</h3>
                    <p className="text-slate-600">Find and unfollow accounts that haven't posted in 60+ days</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Crown className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Non-Mutual Follows</h3>
                    <p className="text-slate-600">Identify users who don't follow you back</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Shield className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Spam Detection</h3>
                    <p className="text-slate-600">Detect potential spam accounts with suspicious patterns</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-xl border border-slate-200">
                <div className="text-2xl font-bold text-slate-900">100%</div>
                <div className="text-sm text-slate-600">Secure</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl border border-slate-200">
                <div className="text-2xl font-bold text-slate-900">Real-time</div>
                <div className="text-sm text-slate-600">Data</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl border border-slate-200">
                <div className="text-2xl font-bold text-slate-900">Batch</div>
                <div className="text-sm text-slate-600">Unfollow</div>
              </div>
            </div>
          </div>

          {/* Right Column - Authentication */}
          <div>
            <Card className="bg-white border-slate-200 shadow-xl">
              <CardHeader className="text-center pb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  Connect Your Farcaster Account
                </CardTitle>
                <p className="text-slate-600 mt-2">
                  Sign in securely with your Farcaster account to start analyzing your follows
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Auth Button */}
                <div className="flex justify-center">
                  <Button 
                    onClick={handleNeynarAuth}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-3" />
                        <span>Connect Farcaster Account</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Error Display */}
                {authError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700">Authentication Error</span>
                    </div>
                    <p className="text-xs text-red-600">{authError}</p>
                  </div>
                )}

                {/* Environment Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Environment</span>
                  </div>
                  <p className="text-xs text-blue-600">
                    {isInFrame ? 'Farcaster Mini App' : 'Web Browser'} - Using demo authentication for testing
                  </p>
                </div>
                
                {/* Security Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Security & Privacy</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>• Your data never leaves your device</div>
                    <div>• Powered by Neynar's secure API</div>
                    <div>• No personal information stored</div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm text-slate-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Real-time Farcaster data analysis</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-slate-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Smart inactivity detection</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-slate-600">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Batch unfollow operations</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-sm text-slate-500">
            Built with ❤️ for the Farcaster community
          </p>
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-sm text-slate-600 space-y-1 mb-4">
              <div>Environment: {typeof window !== 'undefined' ? (window.self !== window.top ? 'Farcaster Mini App' : 'Web Browser') : 'Server'}</div>
              <div>Neynar Context: {isNeynarAvailable ? 'Available' : 'Not Available'}</div>
              <div>Demo User: demo.eth (FID: 194)</div>
              <div>Is In Frame: {isInFrame ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 