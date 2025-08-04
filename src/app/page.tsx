"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { getFarcasterSigner, batchUnfollow } from "@/lib/farcaster-actions";
import { sdk } from '@farcaster/miniapp-sdk';
import { Users, UserMinus, Activity, TrendingUp, Search, Filter, Share2, Crown, Sparkles, Rocket } from "lucide-react";
import { toast } from "sonner";

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
  followerCount: number;
  followingCount: number;
  lastCasted?: number;
  isMutualFollow: boolean;
  isInactive: boolean;
}

interface ScanResults {
  totalFollows: number;
  inactive60Days: number;
  notFollowingBack: number;
  spamAccounts: number;
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userFid, setUserFid] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [followingUsers, setFollowingUsers] = useState<FarcasterUser[]>([]);
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState<'auth' | 'profile' | 'scan' | 'results'>('auth');

  // Initialize Farcaster SDK
  useEffect(() => {
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

  // Auto-detect user from Farcaster context
  useEffect(() => {
    const checkFarcasterAuth = async () => {
      console.log("🔍 Checking Farcaster authentication...");
      
      if (typeof window !== 'undefined' && 'farcaster' in window) {
        // @ts-ignore - Farcaster global object
        const farcaster = (window as any).farcaster;
        console.log("🌐 Found Farcaster object:", farcaster);
        
        // If user is already authenticated, proceed
        if (farcaster?.user?.fid) {
          console.log("✅ User already authenticated:", farcaster.user);
          handleAuth();
        } else {
          console.log("🔑 No user found, trying SDK initialization...");
          // Try to initialize SDK and get user
          try {
            console.log("📞 Calling sdk.actions.ready()...");
            await sdk.actions.ready();
            console.log("✅ SDK ready called successfully");
            
            // Wait for SDK to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check again for user
            console.log("👤 Checking for user after SDK ready...");
            if (farcaster?.user?.fid) {
              console.log("✅ User found after SDK ready:", farcaster.user);
              handleAuth();
            } else {
              console.log("❌ Still no user after SDK ready");
            }
          } catch (error) {
            console.log("⚠️ Farcaster SDK not ready yet:", error);
          }
        }
      } else {
        console.log("❌ No Farcaster object found in window");
      }
    };

    // Check immediately
    checkFarcasterAuth();
    
    // Also check after a delay to handle slow SDK initialization
    const timeoutId = setTimeout(checkFarcasterAuth, 3000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const handleAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("🔐 Starting authentication...");
      
      // Check if we're in a Farcaster Mini App environment
      const farcaster = (window as any).farcaster;
      console.log("🌐 Farcaster object:", farcaster);
      
      if (!farcaster) {
        console.log("❌ No Farcaster object found");
        toast.error("Please open this app in Farcaster");
        return;
      }

      // Try to get user from Farcaster SDK
      let user = farcaster.user;
      console.log("👤 Initial user object:", user);
      
      // If no user, try to authenticate
      if (!user?.fid) {
        console.log("🔑 No user found, attempting authentication...");
        try {
          // Request authentication from Farcaster
          console.log("📞 Calling sdk.actions.ready()...");
          await sdk.actions.ready();
          console.log("✅ SDK ready called successfully");
          
          // Wait a bit for the SDK to initialize
          console.log("⏳ Waiting for SDK initialization...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try to get user again
          user = farcaster.user;
          console.log("👤 User after SDK ready:", user);
          
          if (!user?.fid) {
            console.log("❌ Still no user after SDK ready");
            toast.error("Please connect your Farcaster wallet");
            return;
          }
        } catch (error) {
          console.error("❌ Error during Farcaster authentication:", error);
          toast.error("Failed to connect to Farcaster");
          return;
        }
      }
      
      console.log("✅ User authenticated:", user);
      setUserFid(user.fid);
      setIsAuthenticated(true);
      setCurrentStep('profile');
      
      // Load user profile
      try {
        console.log("📥 Loading user profile for FID:", user.fid);
        const response = await fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${user.fid}`);
        console.log("📊 Profile response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("📋 Profile data:", data);
          setUserProfile(data.result?.user);
        } else {
          console.error("❌ Failed to load user profile:", response.status);
          toast.error("Failed to load user profile");
        }
      } catch (error) {
        console.error("❌ Error loading user profile:", error);
        toast.error("Failed to load user profile");
      }
    } catch (error) {
      console.error("❌ Error during authentication:", error);
      toast.error("Failed to authenticate with Farcaster");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setIsAuthenticated(false);
    setUserFid(null);
    setUserProfile(null);
    setFollowingUsers([]);
    setSelectedUsers(new Set());
    setScanResults(null);
    setCurrentStep('auth');
  }, []);

  const handleStartScan = useCallback(async () => {
    if (!userFid) return;
    
    setIsScanning(true);
    setCurrentStep('scan');
    
    try {
      // Simulate scan progress
      const totalSteps = 3;
      for (let i = 1; i <= totalSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Update progress
      }
      
      // Load following list
      const response = await fetch(`/api/following?fid=${userFid}&page=0&limit=100`);
      if (response.ok) {
        const data = await response.json();
        const users = data.users || [];
        
        // Analyze users
        const analyzedUsers = await analyzeFollowingUsers(users, userFid);
        setFollowingUsers(analyzedUsers);
        
        // Calculate scan results
        const results = {
          totalFollows: analyzedUsers.length,
          inactive60Days: analyzedUsers.filter(u => u.isInactive).length,
          notFollowingBack: analyzedUsers.filter(u => !u.isMutualFollow).length,
          spamAccounts: analyzedUsers.filter(u => u.followerCount < 10 && u.followingCount > 100).length,
        };
        
        setScanResults(results);
        setCurrentStep('results');
      } else {
        toast.error("Failed to load following list");
      }
    } catch (error) {
      console.error("Error scanning following:", error);
      toast.error("Failed to scan following list");
    } finally {
      setIsScanning(false);
    }
  }, [userFid]);

  const analyzeFollowingUsers = async (users: any[], userFid: number): Promise<FarcasterUser[]> => {
    const analyzedUsers = [];
    
    for (const user of users) {
      // Check mutual follow status
      const mutualResponse = await fetch(`/api/check-mutual?userFid=${userFid}&targetFid=${user.fid}`);
      const mutualData = mutualResponse.ok ? await mutualResponse.json() : { isMutualFollow: false };
      
      // Check last cast by fetching user's recent casts
      let lastCasted = 0;
      let isInactive = false;
      
      try {
        const castsResponse = await fetch(`/api/user-casts?fid=${user.fid}&limit=1`);
        if (castsResponse.ok) {
          const castsData = await castsResponse.json();
          if (castsData.casts && castsData.casts.length > 0) {
            lastCasted = new Date(castsData.casts[0].timestamp).getTime();
            isInactive = Date.now() - lastCasted > 60 * 24 * 60 * 60 * 1000; // 60 days
          } else {
            // No casts found, consider inactive
            isInactive = true;
          }
        }
      } catch (error) {
        console.error(`Error fetching casts for user ${user.fid}:`, error);
        // Default to inactive if we can't fetch casts
        isInactive = true;
      }
      
      analyzedUsers.push({
        ...user,
        lastCasted,
        isMutualFollow: mutualData.isMutualFollow,
        isInactive,
      });
    }
    
    return analyzedUsers;
  };

  const handleUnfollowSelected = useCallback(async () => {
    if (!userFid || selectedUsers.size === 0) return;
    
    setIsLoading(true);
    try {
      const signer = await getFarcasterSigner();
      if (!signer) {
        toast.error("Failed to get Farcaster signer");
        return;
      }
      
      const targetFids = Array.from(selectedUsers);
      const result = await batchUnfollow(signer, targetFids, (current, total) => {
        // Progress callback
        console.log(`Unfollowing ${current}/${total}`);
      });
      
      if (result.success > 0) {
        toast.success(`Successfully unfollowed ${result.success} users`);
        setFollowingUsers(prev => prev.filter(user => !selectedUsers.has(user.fid)));
        setSelectedUsers(new Set());
        
        // Update scan results
        if (scanResults) {
          setScanResults({
            ...scanResults,
            totalFollows: scanResults.totalFollows - result.success,
          });
        }
      } else {
        toast.error("Failed to unfollow users");
      }
    } catch (error) {
      console.error("Error batch unfollowing:", error);
      toast.error("Failed to batch unfollow users");
    } finally {
      setIsLoading(false);
    }
  }, [userFid, selectedUsers, scanResults]);

  const handleShareApp = useCallback(async () => {
    try {
      // Create a cast with embed of the mini app
      const shareText = `🚀 Just cleaned up my Farcaster following list with the Unfollow App! 
      
Found ${scanResults?.inactive60Days || 0} inactive accounts and ${scanResults?.notFollowingBack || 0} who don't follow back.

Try it yourself: ${window.location.origin}/embed`;
      
      // In a real implementation, you'd use Farcaster's cast API
      // For now, we'll copy to clipboard
      await navigator.clipboard.writeText(shareText);
      toast.success("Share text copied to clipboard! Post it on Farcaster to go viral! 🚀");
    } catch (error) {
      console.error("Error sharing:", error);
      toast.error("Failed to share");
    }
  }, [scanResults]);

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

  const handleSelectAllInactive = useCallback(() => {
    const inactiveUsers = followingUsers.filter(u => u.isInactive);
    setSelectedUsers(new Set(inactiveUsers.map(u => u.fid)));
  }, [followingUsers]);

  const handleSelectAllNotFollowingBack = useCallback(() => {
    const notFollowingBack = followingUsers.filter(u => !u.isMutualFollow);
    setSelectedUsers(new Set(notFollowingBack.map(u => u.fid)));
  }, [followingUsers]);

  const handleSelectAll = useCallback(() => {
    setSelectedUsers(new Set(followingUsers.map(u => u.fid)));
  }, [followingUsers]);

  // Authentication Screen
  if (currentStep === 'auth') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        {/* Farcaster Mini App Header */}
        <div className="bg-black text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button className="text-white">✕</button>
            <button className="text-white">⌄</button>
          </div>
          <div className="text-center">
            <div className="font-semibold">Unfollow App</div>
            <div className="text-sm text-gray-300">by alec.eth ✓</div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="text-white">⋯</button>
            <button className="text-white">☀</button>
          </div>
        </div>

        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Unfollow Tool
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Sign in with Farcaster to analyze your follows
          </p>

          {/* Farcaster Mini App Banner */}
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-6">
            <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300 mb-2">
              <Rocket className="w-4 h-4" />
              <span className="text-sm font-medium">Running in Farcaster Mini App</span>
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">
              Launched from: launcher
            </div>
            <div className="flex items-center space-x-2 text-sm text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span>Haptic feedback available</span>
            </div>
          </div>

          {/* Sign In Section */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-semibold text-gray-900 dark:text-white">Sign In</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Connect your Farcaster wallet to get started
            </p>
          </div>

          {/* Welcome Section */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">✓</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to Unfollow Tool
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Sign in with your Farcaster wallet to analyze your follows and identify who to unfollow
            </p>
          </div>

          {/* Continue Button */}
          <Button 
            onClick={handleAuth}
            className="w-full bg-black text-white hover:bg-gray-800"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <span className="mr-2">✓</span>
                Continue with Farcaster
              </>
            )}
          </Button>
          
          {/* Debug Info */}
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Debug Info (check console for details):
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              <div>Farcaster Object: {typeof window !== 'undefined' && (window as any).farcaster ? '✅ Found' : '❌ Not Found'}</div>
              <div>User: {typeof window !== 'undefined' && (window as any).farcaster?.user?.fid ? `✅ FID: ${(window as any).farcaster.user.fid}` : '❌ No User'}</div>
              <div>SDK Ready: {typeof sdk?.actions?.ready === 'function' ? '✅ Available' : '❌ Not Available'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Profile Screen
  if (currentStep === 'profile') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        {/* Farcaster Mini App Header */}
        <div className="bg-black text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button className="text-white">✕</button>
            <button className="text-white">⌄</button>
          </div>
          <div className="text-center">
            <div className="font-semibold">Unfollow App</div>
            <div className="text-sm text-gray-300">by alec.eth ✓</div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="text-white">⋯</button>
            <button className="text-white">☀</button>
          </div>
        </div>

        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Unfollow Tool
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Scan your Farcaster follows and identify who to unfollow
          </p>

          {/* Farcaster Mini App Banner */}
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-6">
            <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300 mb-2">
              <Rocket className="w-4 h-4" />
              <span className="text-sm font-medium">Running in Farcaster Mini App</span>
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">
              Launched from: launcher
            </div>
            <div className="flex items-center space-x-2 text-sm text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span>Haptic feedback available</span>
            </div>
          </div>

          {/* Your Profile Section */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-semibold text-gray-900 dark:text-white">Your Profile</span>
            </div>
            
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">?</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {userProfile?.displayName || 'Loading...'}
                      </span>
                      <Crown className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      @{userProfile?.username || 'Loading...'}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {userProfile?.bio || 'Loading profile...'}
                </p>
                
                <div className="flex space-x-4 mb-3">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {userProfile?.followerCount || '0'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Followers</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {userProfile?.followingCount || '897'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Following</div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleDisconnect}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Scan Your Follows Section */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-semibold text-gray-900 dark:text-white">Scan Your Follows</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Analyze your follows to find inactive and spam accounts
            </p>
            
            <Button 
              onClick={handleStartScan}
              className="w-full bg-black text-white hover:bg-gray-800"
              size="lg"
            >
              Start Scan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Scan Results Screen
  if (currentStep === 'results' && scanResults) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        {/* Farcaster Mini App Header */}
        <div className="bg-black text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button className="text-white">✕</button>
            <button className="text-white">⌄</button>
          </div>
          <div className="text-center">
            <div className="font-semibold">Unfollow App</div>
            <div className="text-sm text-gray-300">by alec.eth ✓</div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="text-white">⋯</button>
            <button className="text-white">☀</button>
          </div>
        </div>

        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Unfollow Tool
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Analyze your follows to find inactive and spam accounts
          </p>

          {/* Scan Results Section */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="font-semibold text-gray-900 dark:text-white">Scan Results</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              View your follow analysis and recommendations
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4 text-center">
                  <div className="font-bold text-gray-900 dark:text-white">
                    {scanResults.totalFollows}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">Total Follows</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4 text-center">
                  <div className="font-bold text-orange-600">
                    {scanResults.inactive60Days}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">60+ Days Inactive</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4 text-center">
                  <div className="font-bold text-red-600">
                    {scanResults.notFollowingBack}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">Not Following Back</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4 text-center">
                  <div className="font-bold text-orange-600">
                    {scanResults.spamAccounts}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">Spam Accounts</div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              <Button 
                onClick={handleSelectAllInactive}
                variant="outline"
                className="w-full"
              >
                Select Inactive (60+ days)
              </Button>
              
              <Button 
                onClick={handleSelectAllNotFollowingBack}
                variant="outline"
                className="w-full"
              >
                Select Not Following Back
              </Button>
              
              <Button 
                onClick={handleSelectAll}
                variant="outline"
                className="w-full"
              >
                Select All
              </Button>
            </div>

            {/* Unfollow Selected Button */}
            {selectedUsers.size > 0 && (
              <Button 
                onClick={handleUnfollowSelected}
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white mb-4"
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Unfollow {selectedUsers.size} Users
              </Button>
            )}

            {/* Viral Share Button */}
            <Button 
              onClick={handleShareApp}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share & Go Viral! 🚀
            </Button>
          </div>

          {/* Detailed Recommendations Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-semibold text-gray-900 dark:text-white">Detailed Recommendations</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Review each user with profile details and take action
            </p>
            
            {/* User List */}
            <div className="space-y-3">
              {followingUsers.slice(0, 5).map((user) => (
                <Card key={user.fid} className="bg-white dark:bg-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedUsers.has(user.fid)}
                          onCheckedChange={() => handleSelectUser(user.fid)}
                        />
                        
                        <img
                          src={user.pfp}
                          alt={user.displayName}
                          className="w-10 h-10 rounded-full"
                        />
                        
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {user.displayName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            @{user.username}
                          </div>
                          {user.isInactive && (
                            <Badge variant="destructive" className="text-xs">
                              Inactive 60+ days
                            </Badge>
                          )}
                          {!user.isMutualFollow && (
                            <Badge variant="outline" className="text-xs">
                              Not following back
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handleSelectUser(user.fid)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <UserMinus className="w-4 h-4 mr-1" />
                        Unfollow
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading/Scanning Screen
  if (currentStep === 'scan') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Scanning Your Follows...
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Analyzing {userProfile?.followingCount || '897'} accounts
          </p>
          <Progress value={isScanning ? 66 : 0} className="mt-4" />
        </div>
      </div>
    );
  }

  return null;
}
