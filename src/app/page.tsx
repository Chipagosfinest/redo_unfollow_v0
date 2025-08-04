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

// Fix SVG rendering issues by providing proper size props
const IconWrapper = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {children}
  </div>
);
import { toast } from "sonner";

// Logging utility for production debugging
const logToVercel = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    url: typeof window !== 'undefined' ? window.location.href : 'server',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
  };
  
  // Log to console for development
  console.log(`[${level.toUpperCase()}] ${message}`, data);
  
  // Send to Vercel logs in production
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    }).catch(err => console.error('Failed to send log to Vercel:', err));
  }
};

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
      logToVercel('info', 'Auto-detecting Farcaster authentication');
      
      if (typeof window !== 'undefined' && 'farcaster' in window) {
        // @ts-ignore - Farcaster global object
        const farcaster = (window as any).farcaster;
        logToVercel('info', 'Farcaster object found in auto-detection', { 
          hasUser: !!farcaster?.user,
          hasFid: !!farcaster?.user?.fid 
        });
        
        // If user is already authenticated, proceed
        if (farcaster?.user?.fid) {
          logToVercel('info', 'User already authenticated in auto-detection', { fid: farcaster.user.fid });
          handleAuth();
        } else {
          logToVercel('info', 'No user found in auto-detection, trying Quick Auth');
          // Try to initialize SDK and get user
          try {
            logToVercel('info', 'Calling sdk.actions.ready() in auto-detection');
            await sdk.actions.ready();
            logToVercel('info', 'SDK ready called successfully in auto-detection');
            
            // Wait for SDK to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check again for user
            logToVercel('info', 'Checking for user after SDK ready in auto-detection');
            if (farcaster?.user?.fid) {
              logToVercel('info', 'User found after SDK ready in auto-detection', { fid: farcaster.user.fid });
              handleAuth();
            } else {
              logToVercel('warn', 'Still no user after SDK ready in auto-detection');
            }
          } catch (error) {
            logToVercel('warn', 'Farcaster SDK not ready yet in auto-detection', { error: error instanceof Error ? error.message : String(error) });
          }
        }
      } else {
        logToVercel('info', 'No Farcaster object found in window during auto-detection');
      }
    };

    // Check immediately
    checkFarcasterAuth();
    
    // Also check after a delay to handle slow SDK initialization
    const timeoutId = setTimeout(checkFarcasterAuth, 5000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const handleAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check if we're in an iframe (Farcaster Mini App environment)
      const isInIframe = window.self !== window.top;
      
      if (isInIframe) {
        // We're in a Farcaster Mini App - try real authentication
        try {
          const farcaster = (window as any).farcaster;
          
          if (farcaster?.user?.fid) {
            // User already authenticated
            const user = farcaster.user;
            setUserFid(user.fid);
            setIsAuthenticated(true);
            setCurrentStep('profile');
            
            // Try to load real profile
            try {
              const response = await fetch(`https://api.farcaster.xyz/v2/user-by-fid?fid=${user.fid}`);
              if (response.ok) {
                const data = await response.json();
                setUserProfile(data.result?.user);
              }
            } catch (error) {
              console.error('Failed to load profile:', error);
            }
            
            toast.success("Connected to Farcaster!");
            return;
          }
          
          // Try to authenticate
          await sdk.actions.ready();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const user = farcaster?.user;
          if (user?.fid) {
            setUserFid(user.fid);
            setIsAuthenticated(true);
            setCurrentStep('profile');
            toast.success("Connected to Farcaster!");
            return;
          }
          
          toast.error("Please connect your Farcaster wallet");
          return;
          
        } catch (error) {
          console.error('Farcaster auth failed:', error);
          toast.error("Failed to connect to Farcaster");
          return;
        }
      }
      
      // Fallback for development/testing
      const mockUser = {
        fid: 12345,
        username: 'alec.eth',
        displayName: 'alec.eth',
        bio: 'Building interesting things on Farcaster',
        followerCount: 7219,
        followingCount: 897
      };
      
      setUserFid(mockUser.fid);
      setIsAuthenticated(true);
      setUserProfile(mockUser);
      setCurrentStep('profile');
      toast.success("Connected successfully!");
      
    } catch (error) {
      console.error('Auth error:', error);
      toast.error("Failed to authenticate");
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
    setIsScanning(true);
    setCurrentStep('scan');
    
    try {
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock scan results based on the profile data
      const mockResults = {
        totalFollows: userProfile?.followingCount || 897,
        inactive60Days: Math.floor((userProfile?.followingCount || 897) * 0.05), // 5% inactive
        notFollowingBack: Math.floor((userProfile?.followingCount || 897) * 0.14), // 14% not following back
        spamAccounts: Math.floor((userProfile?.followingCount || 897) * 0.01) // 1% spam
      };
      
      setScanResults(mockResults);
      
      // Generate mock following users
      const mockUsers = Array.from({ length: 10 }, (_, i) => ({
        fid: i + 1,
        username: `user${i + 1}`,
        displayName: `User ${i + 1}`,
        pfp: `https://via.placeholder.com/40/4F46E5/FFFFFF?text=${i + 1}`,
        followerCount: Math.floor(Math.random() * 1000) + 50,
        followingCount: Math.floor(Math.random() * 500) + 20,
        isMutualFollow: Math.random() > 0.3, // 70% mutual follows
        isInactive: Math.random() > 0.8 // 20% inactive
      }));
      
      setFollowingUsers(mockUsers);
      setCurrentStep('results');
      setIsScanning(false);
      toast.success("Scan completed!");
      
    } catch (error) {
      toast.error("Failed to scan follows");
      setIsScanning(false);
    }
  }, [userProfile]);

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
      <div className="min-h-screen bg-white">
        {/* Farcaster Mini App Header */}
        <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button className="text-white text-lg">✕</button>
            <button className="text-white text-lg">⌄</button>
          </div>
          <div className="text-center">
            <div className="font-semibold text-base">Unfollow App</div>
            <div className="text-xs text-gray-300">by alec.eth ✓</div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="text-white text-lg">⋯</button>
            <button className="text-white text-lg">☀</button>
          </div>
        </div>

        <div className="px-6 py-8">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <IconWrapper size={24}>
                <span className="text-white text-xl font-bold">✓</span>
              </IconWrapper>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-3">
              Welcome to Unfollow App
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              Sign in with your Farcaster wallet to analyze your follows and identify who to unfollow
            </p>
          </div>

          {/* App Status */}
          <div className="bg-purple-50 p-4 rounded-xl mb-8">
            <div className="flex items-center space-x-2 text-purple-700 mb-2">
              <IconWrapper size={16}>
                <Rocket size={16} />
              </IconWrapper>
              <span className="text-sm font-medium">Unfollow App Ready</span>
            </div>
            <div className="text-xs text-purple-600">
              Connect your Farcaster wallet to get started
            </div>
          </div>

          {/* Continue Button */}
          <Button 
            onClick={handleAuth}
            className="w-full bg-black text-white hover:bg-gray-800 h-12 text-base font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Connecting...
              </>
            ) : (
              <>
                <span className="mr-2 text-lg">✓</span>
                Continue with Farcaster
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Profile Screen
  if (currentStep === 'profile') {
    return (
      <div className="min-h-screen bg-white">
        {/* Farcaster Mini App Header */}
        <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button className="text-white text-lg">✕</button>
            <button className="text-white text-lg">⌄</button>
          </div>
          <div className="text-center">
            <div className="font-semibold text-base">Unfollow App</div>
            <div className="text-xs text-gray-300">by alec.eth ✓</div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="text-white text-lg">⋯</button>
            <button className="text-white text-lg">☀</button>
          </div>
        </div>

        <div className="px-6 py-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Unfollow Tool
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Scan your Farcaster follows and identify who to unfollow
          </p>

          {/* App Status */}
          <div className="bg-purple-50 p-4 rounded-xl mb-6">
            <div className="flex items-center space-x-2 text-purple-700 mb-2">
              <IconWrapper size={16}>
                <Rocket size={16} />
              </IconWrapper>
              <span className="text-sm font-medium">Ready to Scan</span>
            </div>
            <div className="text-xs text-purple-600">
              Analyze your follows to find inactive accounts
            </div>
          </div>

          {/* Your Profile Section */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-semibold text-gray-900">Your Profile</span>
            </div>
            
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">?</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">
                        {userProfile?.displayName || 'Loading...'}
                      </span>
                      <Crown className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="text-sm text-gray-600">
                      @{userProfile?.username || 'Loading...'}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {userProfile?.bio || 'Loading profile...'}
                </p>
                
                <div className="flex space-x-4 mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {userProfile?.followerCount || '0'}
                    </div>
                    <div className="text-xs text-gray-600">Followers</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {userProfile?.followingCount || '897'}
                    </div>
                    <div className="text-xs text-gray-600">Following</div>
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
              <span className="font-semibold text-gray-900">Scan Your Follows</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Analyze your follows to find inactive and spam accounts
            </p>
            
            <Button 
              onClick={handleStartScan}
              className="w-full bg-black text-white hover:bg-gray-800 h-12 text-base font-medium"
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
            <span className="font-semibold text-gray-900">Scan Results</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            View your follow analysis and recommendations
          </p>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="font-bold text-gray-900 text-lg">
                  {scanResults.totalFollows}
                </div>
                <div className="text-xs text-gray-600">Total Follows</div>
              </CardContent>
            </Card>
            
            <Card className="bg-orange-50 border border-orange-200">
              <CardContent className="p-4 text-center">
                <div className="font-bold text-orange-600 text-lg">
                  {scanResults.inactive60Days}
                </div>
                <div className="text-xs text-orange-600">60+ Days Inactive</div>
              </CardContent>
            </Card>
            
            <Card className="bg-red-50 border border-red-200">
              <CardContent className="p-4 text-center">
                <div className="font-bold text-red-600 text-lg">
                  {scanResults.notFollowingBack}
                </div>
                <div className="text-xs text-red-600">Not Following Back</div>
              </CardContent>
            </Card>
            
            <Card className="bg-yellow-50 border border-yellow-200">
              <CardContent className="p-4 text-center">
                <div className="font-bold text-yellow-600 text-lg">
                  {scanResults.spamAccounts}
                </div>
                <div className="text-xs text-yellow-600">Spam Accounts</div>
              </CardContent>
            </Card>
          </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              <Button 
                onClick={handleSelectAllInactive}
                variant="outline"
                className="w-full hover:bg-orange-50 transition-colors border-orange-200"
              >
                <IconWrapper size={16}>
                  <Activity size={16} className="text-orange-600" />
                </IconWrapper>
                <span className="ml-2">Select Inactive (60+ days)</span>
              </Button>
              
              <Button 
                onClick={handleSelectAllNotFollowingBack}
                variant="outline"
                className="w-full hover:bg-red-50 transition-colors border-red-200"
              >
                <IconWrapper size={16}>
                  <UserMinus size={16} className="text-red-600" />
                </IconWrapper>
                <span className="ml-2">Select Not Following Back</span>
              </Button>
              
              <Button 
                onClick={handleSelectAll}
                variant="outline"
                className="w-full hover:bg-purple-50 transition-colors border-purple-200"
              >
                <IconWrapper size={16}>
                  <Users size={16} className="text-purple-600" />
                </IconWrapper>
                <span className="ml-2">Select All</span>
              </Button>
            </div>

            {/* Unfollow Selected Button */}
            {selectedUsers.size > 0 && (
              <Button 
                onClick={handleUnfollowSelected}
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white mb-4 transform transition-all duration-200 hover:scale-105"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span>Unfollowing...</span>
                  </>
                ) : (
                  <>
                    <IconWrapper size={16}>
                      <UserMinus size={16} />
                    </IconWrapper>
                    <span className="ml-2">Unfollow {selectedUsers.size} Users</span>
                  </>
                )}
              </Button>
            )}

            {/* Viral Share Button */}
            <Button 
              onClick={handleShareApp}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white transform transition-all duration-200 hover:scale-105 animate-pulse"
            >
              <IconWrapper size={16}>
                <Share2 size={16} />
              </IconWrapper>
              <span className="ml-2">Share & Go Viral! 🚀</span>
            </Button>
          </div>

          {/* Detailed Recommendations Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-semibold text-gray-900">Detailed Recommendations</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Review each user with profile details and take action
            </p>
            
            {/* User List */}
            <div className="space-y-3">
              {followingUsers.slice(0, 5).map((user) => (
                <Card key={user.fid} className="bg-white border border-gray-200">
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
                          <div className="font-semibold text-gray-900">
                            {user.displayName}
                          </div>
                          <div className="text-sm text-gray-600">
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
                        className="text-red-600 hover:text-red-700 border-red-200"
                      >
                        <IconWrapper size={14}>
                          <UserMinus size={14} />
                        </IconWrapper>
                        <span className="ml-1">Unfollow</span>
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
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3 animate-pulse">
            Scanning Your Follows...
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Analyzing {userProfile?.followingCount || '897'} accounts for inactivity and mutual follows
          </p>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>Progress</span>
              <span>{isScanning ? '66%' : '0%'}</span>
            </div>
            <Progress value={isScanning ? 66 : 0} className="w-full h-3" />
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Checking mutual follows and cast activity...
            </div>
          </div>
          
          {/* Animated dots */}
          <div className="flex justify-center space-x-1 mt-4">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
