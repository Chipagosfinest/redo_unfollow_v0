"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserMinus, Activity, TrendingUp, Search, Filter, Share2, Crown, Sparkles, Rocket, X, CheckCircle, AlertCircle, Clock, UserCheck, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import NeynarAuth from "@/components/NeynarAuth";

// Fix SVG rendering issues by providing proper size props
const IconWrapper = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {children}
  </div>
);

// Helper function to safely render icons with proper sizing
const SafeIcon = ({ icon: Icon, size = 16, className = "" }: { icon: any; size?: number; className?: string }) => {
  const numericSize = typeof size === 'number' ? size : 16;
  return <Icon size={numericSize} className={className} />;
};

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
  
  console.log(`[${level.toUpperCase()}] ${message}`, data);
  
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
  const [allFollowingUsers, setAllFollowingUsers] = useState<FarcasterUser[]>([]);
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState<'auth' | 'profile' | 'scan' | 'results'>('auth');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  // Calculate pagination
  const totalPages = Math.ceil(allFollowingUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = allFollowingUsers.slice(startIndex, endIndex);

  // SDK Ready call for Mini App
  useEffect(() => {
    const callSdkReady = async () => {
      try {
        // Check if we're in a Mini App environment
        if (typeof window !== 'undefined' && (window as any).farcaster) {
          const sdk = (window as any).farcaster;
          if (sdk && sdk.actions && sdk.actions.ready) {
            console.log('Calling SDK ready...');
            await sdk.actions.ready();
            console.log('SDK ready called successfully');
          }
        }
      } catch (error) {
        console.error('Error calling SDK ready:', error);
      }
    };

    // Call SDK ready after component mounts
    callSdkReady();
  }, []);

  const handleAuthenticated = useCallback((user: any) => {
    logToVercel('info', 'User authenticated with Neynar', { 
      fid: user.fid,
      username: user.username,
      hasSignerUuid: !!user.signer_uuid
    });
    
    setUserFid(user.fid);
    setUserProfile(user);
    setIsAuthenticated(true);
    setCurrentStep('profile');
  }, []);

  const handleDisconnect = useCallback(() => {
    setIsAuthenticated(false);
    setUserFid(null);
    setUserProfile(null);
    setAllFollowingUsers([]);
    setSelectedUsers(new Set());
    setScanResults(null);
    setCurrentStep('auth');
    setCurrentPage(1);
  }, []);

  const handleStartScan = useCallback(async () => {
    setIsScanning(true);
    setCurrentStep('scan');
    
    try {
      if (!userFid) {
        toast.error("Please authenticate first");
        setIsScanning(false);
        return;
      }
      
      logToVercel('info', 'Starting scan with real Farcaster data', { userFid });
      
      // Get following list using Neynar API
      const followingResponse = await fetch(`/api/neynar/following?fid=${userFid}`);
      const followingData = await followingResponse.json();
      
      logToVercel('info', 'Following API response', { 
        status: followingResponse.status,
        userCount: followingData.users?.length || 0,
        demoMode: followingData.demoMode,
        error: followingData.error,
        userFid 
      });
      
      // Check if we're in demo mode or have an error
      if (followingData.demoMode || followingData.error || !followingData.users || followingData.users.length === 0) {
        console.log('Using demo data due to:', {
          demoMode: followingData.demoMode,
          error: followingData.error,
          userCount: followingData.users?.length || 0
        });
        
        const demoUsers: FarcasterUser[] = Array.from({ length: 20 }, (_, i) => ({
          fid: 1000 + i,
          username: `user${i + 1}`,
          displayName: `Demo User ${i + 1}`,
          pfp: `https://via.placeholder.com/40/4F46E5/FFFFFF?text=${i + 1}`,
          followerCount: Math.floor(Math.random() * 1000) + 50,
          followingCount: Math.floor(Math.random() * 500) + 20,
          isMutualFollow: Math.random() > 0.3,
          isInactive: Math.random() > 0.8
        }));
        
        setAllFollowingUsers(demoUsers);
        
        const results = {
          totalFollows: demoUsers.length,
          inactive60Days: demoUsers.filter(u => u.isInactive).length,
          notFollowingBack: demoUsers.filter(u => !u.isMutualFollow).length,
          spamAccounts: demoUsers.filter(u => u.followerCount < 10 && u.followingCount > 100).length,
        };
        
        setScanResults(results);
        setCurrentStep('results');
        setIsScanning(false);
        
        if (followingData.demoMode) {
          toast.success("Scan completed with demo data - configure NEYNAR_API_KEY for real data!");
        } else if (followingData.error) {
          toast.error(`API Error: ${followingData.message || followingData.error}`);
        } else {
          toast.success("Scan completed with demo data for testing!");
        }
        return;
      }
        
        // Analyze users for inactivity and mutual follows
        const analyzedUsers = await Promise.all(
          followingUsers.slice(0, 50).map(async (user: any) => {
            // Check mutual follow status
            const mutualResponse = await fetch(`/api/check-mutual?userFid=${userFid}&targetFid=${user.fid}`);
            
            let isMutualFollow = false;
            if (mutualResponse.ok) {
              const mutualData = await mutualResponse.json();
              isMutualFollow = mutualData.isMutualFollow || false;
            }
            
            // Check for recent casts to determine inactivity
            let isInactive = false;
            try {
              const castsResponse = await fetch(`/api/user-casts?fid=${user.fid}&limit=1`);
              if (castsResponse.ok) {
                const castsData = await castsResponse.json();
                if (castsData.casts && castsData.casts.length > 0) {
                  const lastCast = castsData.casts[0];
                  const lastCastTime = new Date(lastCast.timestamp);
                  const sixtyDaysAgo = new Date();
                  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                  isInactive = lastCastTime < sixtyDaysAgo;
                } else {
                  // No casts found, consider inactive
                  isInactive = true;
                }
              } else {
                // If we can't fetch casts, use a conservative approach
                isInactive = false;
              }
            } catch (error) {
              console.error(`Error checking casts for user ${user.fid}:`, error);
              // If we can't determine, assume active
              isInactive = false;
            }
            
            return {
              fid: user.fid,
              username: user.username,
              displayName: user.display_name,
              pfp: user.pfp_url,
              followerCount: user.follower_count,
              followingCount: user.following_count,
              isMutualFollow,
              isInactive
            };
          })
        );
        
        setAllFollowingUsers(analyzedUsers);
        
        // Calculate scan results
        const results = {
          totalFollows: analyzedUsers.length,
          inactive60Days: analyzedUsers.filter(u => u.isInactive).length,
          notFollowingBack: analyzedUsers.filter(u => !u.isMutualFollow).length,
          spamAccounts: analyzedUsers.filter(u => u.followerCount < 10 && u.followingCount > 100).length,
        };
        
        setScanResults(results);
        setCurrentStep('results');
        setIsScanning(false);
        toast.success("Scan completed with real Farcaster data!");
        

      
    } catch (error) {
      logToVercel('error', 'Scan error', { 
        error: error instanceof Error ? error.message : String(error),
        userFid 
      });
      console.error('Scan error:', error);
      toast.error("Failed to scan follows");
      setIsScanning(false);
    }
  }, [userFid]);

  const handleUnfollowSelected = useCallback(async () => {
    if (!userProfile?.signer_uuid || selectedUsers.size === 0) {
      toast.error("No signer available or no users selected");
      return;
    }
    
    setIsLoading(true);
    try {
      const targetFids = Array.from(selectedUsers);
      
      logToVercel('info', 'Starting batch unfollow', { 
        targetFidsCount: targetFids.length,
        targetFids,
        hasSignerUuid: !!userProfile.signer_uuid
      });
      
      const response = await fetch('/api/neynar/unfollow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signerUuid: userProfile.signer_uuid,
          targetFids
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        logToVercel('info', 'Unfollow successful', { result });
        
        if (result.success) {
          const successCount = result.details?.filter((d: any) => d.success).length || 0;
          toast.success(`Successfully unfollowed ${successCount} users`);
          
          // Remove unfollowed users from the list
          setAllFollowingUsers(prev => prev.filter(user => !selectedUsers.has(user.fid)));
          setSelectedUsers(new Set());
          
          // Update scan results
          if (scanResults) {
            setScanResults({
              ...scanResults,
              totalFollows: scanResults.totalFollows - successCount,
            });
          }
        } else {
          toast.error("Failed to unfollow users");
        }
      } else {
        const errorData = await response.json();
        logToVercel('error', 'Unfollow failed', { 
          status: response.status,
          error: errorData 
        });
        toast.error("Failed to unfollow users");
      }
    } catch (error) {
      logToVercel('error', 'Unfollow error', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      console.error("Error batch unfollowing:", error);
      toast.error("Failed to batch unfollow users");
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, selectedUsers, scanResults]);

  const handleShareApp = useCallback(async () => {
    try {
      const shareText = `🚀 Just cleaned up my Farcaster following list with the Unfollow App! 
      
Found ${scanResults?.inactive60Days || 0} inactive accounts and ${scanResults?.notFollowingBack || 0} who don't follow back.

Try it yourself: ${window.location.origin}/embed`;
      
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
    const inactiveUsers = allFollowingUsers.filter(u => u.isInactive);
    setSelectedUsers(new Set(inactiveUsers.map(u => u.fid)));
  }, [allFollowingUsers]);

  const handleSelectAllNotFollowingBack = useCallback(() => {
    const notFollowingBack = allFollowingUsers.filter(u => !u.isMutualFollow);
    setSelectedUsers(new Set(notFollowingBack.map(u => u.fid)));
  }, [allFollowingUsers]);

  const handleSelectAll = useCallback(() => {
    setSelectedUsers(new Set(allFollowingUsers.map(u => u.fid)));
  }, [allFollowingUsers]);

  const handleSelectCurrentPage = useCallback(() => {
    const currentPageFids = currentUsers.map(u => u.fid);
    setSelectedUsers(new Set(currentPageFids));
  }, [currentUsers]);

  const handleClearSelection = useCallback(() => {
    setSelectedUsers(new Set());
  }, []);

  // Authentication Screen
  if (currentStep === 'auth') {
    return <NeynarAuth onAuthenticated={handleAuthenticated} onDisconnect={handleDisconnect} />;
  }

  // Profile Screen
  if (currentStep === 'profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Unfollow Tool</h1>
                  <p className="text-sm text-slate-600">Clean your Farcaster feed</p>
                </div>
              </div>
              <Button 
                onClick={handleDisconnect}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900"
              >
                <X className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-6">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Welcome back, {userProfile?.display_name || userProfile?.displayName || 'Farcaster User'}!
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Let's analyze your Farcaster follows and identify accounts that might be cluttering your feed.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-white border-slate-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Following</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {userProfile?.following_count || userProfile?.followingCount || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Followers</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {userProfile?.follower_count || userProfile?.followerCount || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Ready to Scan</p>
                    <p className="text-2xl font-bold text-slate-900">Analyze</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Section */}
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white border-slate-200 shadow-xl">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-slate-900">
                  Start Your Analysis
                </CardTitle>
                <p className="text-slate-600 mt-2">
                  We'll scan your follows to find inactive accounts and non-mutual follows
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Features List */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-slate-700">Identify accounts inactive for 60+ days</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-slate-700">Find users who don't follow you back</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-slate-700">Detect potential spam accounts</span>
                  </div>
                </div>

                {/* Start Button */}
                <Button 
                  onClick={handleStartScan}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-14 text-lg font-semibold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
                >
                  <Activity className="w-5 h-5 mr-3" />
                  Start Analysis
                </Button>

                <div className="text-center">
                  <p className="text-xs text-slate-500">
                    Powered by Neynar • Secure & Private
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Scan Results Screen
  if (currentStep === 'results' && scanResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Unfollow Tool</h1>
                  <p className="text-sm text-slate-600">Analysis Complete</p>
                </div>
              </div>
              <Button 
                onClick={handleDisconnect}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900"
              >
                <X className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Demo Mode Banner */}
          {allFollowingUsers.length > 0 && allFollowingUsers[0].username.includes('user') && (
            <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800">Demo Mode</h3>
                  <p className="text-sm text-yellow-700">
                    This is sample data for testing. To see your real Farcaster data, you need to configure the Neynar API key in the Vercel deployment.
                  </p>
                  <div className="mt-2 text-xs text-yellow-600">
                    <strong>For Production:</strong> Add NEYNAR_API_KEY to your Vercel environment variables
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-6">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Analysis Complete!
            </h1>
            <p className="text-xl text-slate-600">
              Here's what we found in your {scanResults.totalFollows} follows
            </p>
          </div>

          {/* Results Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="bg-white border-slate-200 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 mb-2">
                  {scanResults.totalFollows}
                </p>
                <p className="text-sm text-slate-600">Total Analyzed</p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-orange-600 mb-2">
                  {scanResults.inactive60Days}
                </p>
                <p className="text-sm text-orange-600">Inactive 60+ Days</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserMinus className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-600 mb-2">
                  {scanResults.notFollowingBack}
                </p>
                <p className="text-sm text-red-600">Not Following Back</p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-yellow-600 mb-2">
                  {scanResults.spamAccounts}
                </p>
                <p className="text-sm text-yellow-600">Potential Spam</p>
              </CardContent>
            </Card>
          </div>

          {/* Selection Controls */}
          <div className="max-w-4xl mx-auto mb-8">
            <Card className="bg-white border-slate-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Quick Selection Options
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Select users to unfollow based on different criteria
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Button 
                    onClick={handleSelectAllInactive}
                    variant="outline"
                    className="hover:bg-orange-50 transition-colors border-orange-200 h-12 text-sm"
                  >
                    <Clock className="w-4 h-4 text-orange-600 mr-2" />
                    Inactive ({scanResults.inactive60Days})
                  </Button>
                  
                  <Button 
                    onClick={handleSelectAllNotFollowingBack}
                    variant="outline"
                    className="hover:bg-red-50 transition-colors border-red-200 h-12 text-sm"
                  >
                    <UserMinus className="w-4 h-4 text-red-600 mr-2" />
                    Not Following Back ({scanResults.notFollowingBack})
                  </Button>
                  
                  <Button 
                    onClick={handleSelectCurrentPage}
                    variant="outline"
                    className="hover:bg-blue-50 transition-colors border-blue-200 h-12 text-sm"
                  >
                    <Users className="w-4 h-4 text-blue-600 mr-2" />
                    Current Page ({currentUsers.length})
                  </Button>
                  
                  <Button 
                    onClick={handleSelectAll}
                    variant="outline"
                    className="hover:bg-purple-50 transition-colors border-purple-200 h-12 text-sm"
                  >
                    <Crown className="w-4 h-4 text-purple-600 mr-2" />
                    All ({scanResults.totalFollows})
                  </Button>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-slate-600">
                      Selected: {selectedUsers.size} users
                    </span>
                    {selectedUsers.size > 0 && (
                      <Button 
                        onClick={handleClearSelection}
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-700"
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>
                  
                  {selectedUsers.size > 0 && (
                    <Button 
                      onClick={handleUnfollowSelected}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-2 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          <span>Unfollowing {selectedUsers.size} Users...</span>
                        </>
                      ) : (
                        <>
                          <UserMinus className="w-4 h-4 mr-2" />
                          <span>Unfollow {selectedUsers.size} Users</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Share Button */}
          <div className="max-w-2xl mx-auto mb-12">
            <Button 
              onClick={handleShareApp}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-14 text-lg font-semibold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              <Share2 className="w-5 h-5 mr-3" />
              Share & Go Viral! 🚀
            </Button>
          </div>

          {/* User List with Pagination */}
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Detailed Recommendations</h2>
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1}-{Math.min(endIndex, allFollowingUsers.length)} of {allFollowingUsers.length} users
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              {currentUsers.map((user) => (
                <Card key={user.fid} className="bg-white border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Checkbox
                          checked={selectedUsers.has(user.fid)}
                          onCheckedChange={() => handleSelectUser(user.fid)}
                          className="w-5 h-5"
                        />
                        
                        <img
                          src={user.pfp}
                          alt={user.displayName}
                          className="w-12 h-12 rounded-full border-2 border-slate-200"
                        />
                        
                        <div>
                          <div className="font-bold text-slate-900 text-lg">
                            {user.displayName}
                          </div>
                          <div className="text-slate-600">
                            @{user.username}
                          </div>
                          <div className="flex space-x-2 mt-2">
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
                            <Badge variant="secondary" className="text-xs">
                              {user.followerCount} followers
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handleSelectUser(user.fid)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 border-red-200 h-10"
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Unfollow
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>
                
                <div className="flex items-center space-x-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="w-10 h-10"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading/Scanning Screen
  if (currentStep === 'scan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4 animate-pulse">
            Analyzing Your Follows...
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Scanning {userProfile?.following_count || userProfile?.followingCount || '0'} accounts for inactivity and mutual follows
          </p>
          
          <div className="space-y-4">
            <div className="flex justify-between text-base text-slate-600">
              <span>Progress</span>
              <span>{isScanning ? '66%' : '0%'}</span>
            </div>
            <Progress value={isScanning ? 66 : 0} className="w-full h-4" />
            <div className="text-sm text-slate-500 text-center">
              Checking mutual follows and cast activity...
            </div>
          </div>
          
          {/* Animated dots */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
