"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Users, UserMinus, Share2, CheckCircle, AlertTriangle, Filter, Trash2, LogIn, BarChart3 } from "lucide-react"
import { toast } from "sonner"
import { sdk } from '@farcaster/miniapp-sdk'
import { getFarcasterUser, detectEnvironment } from '@/lib/environment'
import { authManager, AuthContext } from '@/lib/auth-context'

interface User {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  follower_count: number
  following_count: number
  reason: "inactive" | "not_following_back"
}

interface AuthenticatedUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  isAuthenticated: boolean
  authMethod: 'miniapp' | 'web'
}

interface AnalyticsData {
  totalFollowing: number
  inactiveUsers: number
  nonMutualUsers: number
  mutualFollowers: number
  averageFollowers: number
  averageFollowing: number
  topReasons: { reason: string; count: number }[]
}

export default function FarcasterUnfollowApp() {
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set())
  const [isScanning, setIsScanning] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isMiniApp, setIsMiniApp] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isUnfollowing, setIsUnfollowing] = useState(false)
  const [showConfirmUnfollow, setShowConfirmUnfollow] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [unfollowProgress, setUnfollowProgress] = useState<{
    current: number
    total: number
    isActive: boolean
  }>({ current: 0, total: 0, isActive: false })
  const [filterReason, setFilterReason] = useState<'all' | 'inactive' | 'not_following_back'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'followers' | 'following' | 'reason'>('reason')

  // Suppress browser extension conflicts
  useEffect(() => {
    const originalError = console.error
    console.error = (...args) => {
      const message = args.join(' ')
      if (message.includes('ethereum') || message.includes('isZerion') || message.includes('window.ethereum')) {
        // Suppress browser extension conflicts
        return
      }
      originalError.apply(console, args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

  // CRITICAL: Call ready() immediately for Mini App
  useEffect(() => {
    const callReadyImmediately = async () => {
      try {
        const isMiniAppCheck = await sdk.isInMiniApp()
        if (isMiniAppCheck) {
          console.log('🔄 Calling ready() immediately...')
          await sdk.actions.ready()
          console.log('✅ Ready called immediately')
        }
      } catch (error) {
        console.error('Failed to call ready() immediately:', error)
      }
    }
    
    callReadyImmediately()
  }, [])

  // Initialize auth context
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Initialize auth manager
        const authContext = await authManager.initialize()
        console.log('Auth context initialized:', authContext)
        
        setIsMiniApp(authContext.isMiniApp)
        
        if (authContext.isAuthenticated && authContext.fid) {
          console.log('User authenticated via', authContext.authMethod)
          const authenticatedUser: AuthenticatedUser = {
            fid: authContext.fid,
            username: authContext.username || `user_${authContext.fid}`,
            displayName: authContext.displayName || `User ${authContext.fid}`,
            pfpUrl: authContext.pfpUrl || '',
            isAuthenticated: true,
            authMethod: authContext.authMethod || 'miniapp'
          }
          
          setAuthenticatedUser(authenticatedUser)
          setIsAuthenticated(true)
          console.log('User authenticated, starting scan...')
          
          // Automatically start scanning
          await startScan(authenticatedUser.fid)
        } else {
          console.log('No authenticated user available')
        }
        
        // Always call ready() for Mini App - CRITICAL for splash screen
        if (authContext.isMiniApp) {
          try {
            console.log('Calling sdk.actions.ready() to hide splash screen...')
            await sdk.actions.ready()
            console.log('✅ Splash screen hidden successfully')
          } catch (readyError) {
            console.error('Failed to call ready():', readyError)
            // Still try to call ready even if there are errors
            try {
              await sdk.actions.ready()
            } catch (retryError) {
              console.error('Retry failed:', retryError)
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setIsMiniApp(false)
        
        // Still try to call ready() even if auth fails
        try {
          const isMiniAppCheck = await sdk.isInMiniApp()
          if (isMiniAppCheck) {
            console.log('Auth failed, but still calling ready()...')
            await sdk.actions.ready()
            console.log('✅ Ready called after auth failure')
          }
        } catch (readyError) {
          console.error('Failed to call ready() after auth error:', readyError)
        }
      } finally {
        setIsInitialized(true)
      }
    }

    initializeAuth()
  }, [])

  // User-initiated authentication
  const handleAuthenticate = async () => {
    setIsLoading(true)
    setAuthError(null)
    
    try {
      // Use the auth manager to handle authentication
      const authContext = await authManager.refreshContext()
      
      if (authContext.isAuthenticated && authContext.fid) {
        const authenticatedUser: AuthenticatedUser = {
          fid: authContext.fid,
          username: authContext.username || `user_${authContext.fid}`,
          displayName: authContext.displayName || `User ${authContext.fid}`,
          pfpUrl: authContext.pfpUrl || '',
          isAuthenticated: true,
          authMethod: authContext.authMethod || 'miniapp'
        }
        
        setAuthenticatedUser(authenticatedUser)
        setIsAuthenticated(true)
        toast.success('Successfully authenticated!')
        
        // Automatically start scanning
        await startScan(authenticatedUser.fid)
        return
      }
      
      // Show appropriate error based on auth method
      if (authContext.isMiniApp) {
        setAuthError('User context not available. Please refresh the app.')
        toast.error('User context not available. Please refresh the app.')
      } else {
        setAuthError('This app requires a Farcaster client. Please open it in Warpcast or another Farcaster app.')
        toast.error('This app requires a Farcaster client. Please open it in Warpcast or another Farcaster app.')
      }
    } catch (error) {
      setAuthError('Failed to authenticate')
      toast.error('Failed to authenticate: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate analytics from user data
  const calculateAnalytics = (userList: User[]): AnalyticsData => {
    const totalFollowing = userList.length
    const inactiveUsers = userList.filter(u => u.reason === 'inactive').length
    const nonMutualUsers = userList.filter(u => u.reason === 'not_following_back').length
    const mutualFollowers = totalFollowing - nonMutualUsers
    
    const totalFollowers = userList.reduce((sum, u) => sum + u.follower_count, 0)
    const totalFollowingCount = userList.reduce((sum, u) => sum + u.following_count, 0)
    const averageFollowers = totalFollowing > 0 ? Math.round(totalFollowers / totalFollowing) : 0
    const averageFollowing = totalFollowing > 0 ? Math.round(totalFollowingCount / totalFollowing) : 0
    
    const reasonCounts = userList.reduce((acc, user) => {
      acc[user.reason] = (acc[user.reason] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const topReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
    
    return {
      totalFollowing,
      inactiveUsers,
      nonMutualUsers,
      mutualFollowers,
      averageFollowers,
      averageFollowing,
      topReasons
    }
  }

  // Filter and sort users
  const getFilteredAndSortedUsers = () => {
    let filteredUsers = users

    // Apply reason filter
    if (filterReason !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.reason === filterReason)
    }

    // Apply sorting
    filteredUsers.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.display_name.localeCompare(b.display_name)
        case 'followers':
          return b.follower_count - a.follower_count
        case 'following':
          return b.following_count - a.following_count
        case 'reason':
          // Sort by reason priority: inactive first, then not_following_back
          if (a.reason === 'inactive' && b.reason !== 'inactive') return -1
          if (a.reason !== 'inactive' && b.reason === 'inactive') return 1
          return 0
        default:
          return 0
      }
    })

    return filteredUsers
  }

  // Scan following list
  const startScan = async (fid?: number) => {
    const targetFid = fid || authenticatedUser?.fid
    if (!targetFid) {
      toast.error("Please authenticate first")
      return
    }

    setIsScanning(true)
    try {
      // Analyze following list
      const response = await fetch("/api/neynar/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fid: targetFid, 
          page: 1, 
          limit: 50,
          authMethod: authenticatedUser?.authMethod || 'miniapp'
        }),
      })
      
      if (response.ok) {
        const data = await response.json()

        const allUsers: User[] = data.users.map((user: any) => ({
          fid: user.fid,
          username: user.username,
          display_name: user.displayName,
          pfp_url: user.pfpUrl,
          follower_count: user.followerCount,
          following_count: user.followingCount,
          reason: user.isInactive ? "inactive" : "not_following_back" as const,
        }))

        setUsers(allUsers)
        
        // Calculate and set analytics
        const analyticsData = calculateAnalytics(allUsers)
        setAnalytics(analyticsData)
        
        toast.success(`Found ${allUsers.length} accounts to review`)
      } else {
        // API failed - show the actual error
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API failed:', response.status, errorData)
        
        // Show detailed error message
        let errorMessage = `API failed: ${response.status}`
        if (errorData.error) {
          errorMessage += ` - ${errorData.error}`
        }
        if (errorData.details?.message) {
          errorMessage += ` (${errorData.details.message})`
        }
        
        toast.error(errorMessage)
        
        // Show error in UI
        setUsers([])
        setAnalytics(null)
        
        // Log detailed error for debugging
        console.error('Full error details:', errorData)
      }
    } catch (error) {
      console.error('Scan failed:', error)
      toast.error("Scan failed - please try again")
    } finally {
      setIsScanning(false)
    }
  }

  const selectInactive = () => {
    const inactiveUsers = users.filter((u) => u.reason === "inactive").map((u) => u.fid)
    setSelectedUsers(new Set(inactiveUsers))
  }

  const selectNotFollowingBack = () => {
    const notFollowingUsers = users.filter((u) => u.reason === "not_following_back").map((u) => u.fid)
    setSelectedUsers(new Set(notFollowingUsers))
  }

  const selectAll = () => {
    setSelectedUsers(new Set(users.map((u) => u.fid)))
  }

  const clearSelection = () => {
    setSelectedUsers(new Set())
  }

  const toggleUser = (fid: number) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(fid)) {
      newSelected.delete(fid)
    } else {
      newSelected.add(fid)
    }
    setSelectedUsers(newSelected)
  }



  // Show confirmation modal first, then unfollow
  const unfollowSelected = () => {
    if (selectedUsers.size === 0) return
    setShowConfirmUnfollow(true)
  }

  // Actually perform the unfollow operation
  const performUnfollow = async () => {
    if (selectedUsers.size === 0) return

    setIsUnfollowing(true)
    setShowConfirmUnfollow(false)
    setUnfollowProgress({ current: 0, total: selectedUsers.size, isActive: true })
    let successCount = 0

    try {
      const targetFids = Array.from(selectedUsers)
      const batchSize = 5
      const batches = []
      
      for (let i = 0; i < targetFids.length; i += batchSize) {
        batches.push(targetFids.slice(i, i + batchSize))
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        
        // Use Neynar MCP for batch unfollow
        const response = await fetch("/api/neynar/unfollow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            targetFids: batch,
            mode: 'selected'
          }),
        })

        if (response.ok) {
          const result = await response.json()
          successCount += result.results?.successful?.length || 0
          
          // Update progress
          setUnfollowProgress(prev => ({
            ...prev,
            current: prev.current + batch.length
          }))
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('Batch unfollow failed:', errorData)
        }

        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      // Remove unfollowed users from the list
      setUsers(users.filter((u) => !selectedUsers.has(u.fid)))
      setSelectedUsers(new Set())
      
      // Recalculate analytics
      const remainingUsers = users.filter((u) => !selectedUsers.has(u.fid))
      const updatedAnalytics = calculateAnalytics(remainingUsers)
      setAnalytics(updatedAnalytics)
      
      toast.success(`Successfully unfollowed ${successCount} users`)
    } catch (error) {
      console.error('Unfollow failed:', error)
      toast.error("Failed to unfollow users")
    } finally {
      setIsUnfollowing(false)
      setUnfollowProgress({ current: 0, total: 0, isActive: false })
    }
  }

  // Use Neynar MCP for single unfollow
  const unfollowSingle = async (fid: number) => {
    try {
      const response = await fetch("/api/neynar/unfollow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          targetFids: [fid],
          mode: 'selected'
        }),
      })

      if (response.ok) {
        setUsers(users.filter((u) => u.fid !== fid))
        toast.success("User unfollowed successfully")
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || "Failed to unfollow user")
      }
    } catch (error) {
      toast.error("Failed to unfollow user")
    }
  }

  const unfollowAllFollowers = async () => {
    setShowConfirmUnfollow(true)
    // This would be a separate API call to unfollow all followers
    // For now, we'll use the same confirmation flow
  }

  const shareResults = () => {
    const text = `Just cleaned up my Farcaster following list! 🧹 Found ${users.length} accounts to unfollow. Try it yourself!`
    try {
      if (navigator.share) {
        navigator.share({ text }).catch(() => {
          // Fallback to clipboard if share fails
          navigator.clipboard.writeText(text)
          toast.success("Share text copied to clipboard")
        })
      } else {
        navigator.clipboard.writeText(text)
        toast.success("Share text copied to clipboard")
      }
    } catch (error) {
      // Fallback to clipboard on any error
      navigator.clipboard.writeText(text)
      toast.success("Share text copied to clipboard")
    }
  }

  const exportResults = () => {
    const csvData = [
      ['Username', 'Display Name', 'Followers', 'Following', 'Reason', 'FID'],
      ...getFilteredAndSortedUsers().map(user => [
        user.username,
        user.display_name,
        user.follower_count.toString(),
        user.following_count.toString(),
        user.reason,
        user.fid.toString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `farcaster-unfollow-list-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success("Results exported to CSV")
  }

  // Show loading screen during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Farcaster Cleanup</h1>
          <p className="text-gray-600">Initializing Mini App...</p>
        </div>
      </div>
    )
  }

  // Show error if not in Mini App
  if (!isMiniApp) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Farcaster Cleanup</h1>
          <p className="text-gray-600 mb-6">
            This app works best in Farcaster Mini App
          </p>
          <p className="text-sm text-gray-500">
            Please open this app within the Farcaster client
          </p>
        </div>
      </div>
    )
  }

  // Show authentication screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Farcaster Cleanup</h1>
          <p className="text-gray-600 mb-6">
            {isMiniApp 
              ? 'Connect your Farcaster account to start scanning'
              : 'This app works in Farcaster clients like Warpcast'
            }
          </p>
          
          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">{authError}</p>
              {!isMiniApp && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-blue-700 text-sm">
                    💡 <strong>Tip:</strong> This app works best in Warpcast or other Farcaster clients. 
                    The browser version has limited functionality.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <Button 
            onClick={handleAuthenticate}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting to scan...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Connect to Scan
              </>
            )}
          </Button>
          
          <p className="text-sm text-gray-500 mt-4">
            This will authenticate you and load your following list
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header with user info */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <Avatar className="w-12 h-12 mr-3">
              <AvatarImage src={authenticatedUser?.pfpUrl} />
              <AvatarFallback>{authenticatedUser?.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <h2 className="font-semibold text-gray-900">{authenticatedUser?.displayName}</h2>
              <p className="text-sm text-gray-600">@{authenticatedUser?.username}</p>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Farcaster Cleanup</h1>
          <p className="text-gray-600">Find and unfollow inactive accounts</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            {process.env.NODE_ENV === 'development' && (
              <span className="text-xs text-orange-600">🔧 Development Mode</span>
            )}
            {authenticatedUser?.authMethod && (
              <span className={`text-xs px-2 py-1 rounded ${
                authenticatedUser.authMethod === 'miniapp' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {authenticatedUser.authMethod === 'miniapp' ? '📱 Mini App' : '🌐 Web App'}
              </span>
            )}
          </div>
        </div>

        {/* Analytics Dashboard */}
        {analytics && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Analytics Dashboard
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="text-xs p-2 h-auto bg-transparent"
              >
                {showAnalytics ? 'Hide' : 'Show'} Details
              </Button>
            </div>
            
            {showAnalytics && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{analytics.totalFollowing}</div>
                    <div className="text-sm text-blue-700">Total Following</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{analytics.inactiveUsers}</div>
                    <div className="text-sm text-orange-700">Inactive Users</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{analytics.nonMutualUsers}</div>
                    <div className="text-sm text-red-700">Not Following Back</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{analytics.mutualFollowers}</div>
                    <div className="text-sm text-green-700">Mutual Followers</div>
                  </div>
                </div>
                
                {/* Averages */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">{analytics.averageFollowers}</div>
                    <div className="text-sm text-purple-700">Avg Followers</div>
                  </div>
                  <div className="text-center p-3 bg-indigo-50 rounded-lg">
                    <div className="text-lg font-bold text-indigo-600">{analytics.averageFollowing}</div>
                    <div className="text-sm text-indigo-700">Avg Following</div>
                  </div>
                </div>
                
                {/* Top Reasons */}
                {analytics.topReasons.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Top Reasons for Unfollow</h3>
                    <div className="space-y-2">
                      {analytics.topReasons.map((reason, index) => (
                        <div key={reason.reason} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 capitalize">
                            {reason.reason.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">{reason.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress Indicator */}
        {unfollowProgress.isActive && (
          <div className="mb-4 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Unfollowing Progress</h3>
              <span className="text-sm text-gray-600">
                {unfollowProgress.current} / {unfollowProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${unfollowProgress.total > 0 ? (unfollowProgress.current / unfollowProgress.total) * 100 : 0}%` 
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Processing batch {Math.ceil(unfollowProgress.current / 5)} of {Math.ceil(unfollowProgress.total / 5)}
            </p>
          </div>
        )}

        {/* Filter Buttons */}
        {users.length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Quick Select
            </h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={selectInactive}
                className="text-xs p-2 h-auto bg-transparent"
              >
                <Users className="w-3 h-3 mr-1" />
                Inactive (75+ days)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={selectNotFollowingBack}
                className="text-xs p-2 h-auto bg-transparent"
              >
                <UserMinus className="w-3 h-3 mr-1" />
                Not Following Back
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Button variant="outline" size="sm" onClick={selectAll} className="text-xs p-2 h-auto bg-transparent">
                <CheckCircle className="w-3 h-3 mr-1" />
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection} className="text-xs p-2 h-auto bg-transparent">
                <Trash2 className="w-3 h-3 mr-1" />
                Clear Selection
              </Button>
              <Button variant="outline" size="sm" onClick={unfollowAllFollowers} className="text-xs p-2 h-auto bg-red-50 text-red-700 border-red-200">
                <UserMinus className="w-3 h-3 mr-1" />
                Unfollow All
              </Button>
            </div>

            {/* Progress Indicator */}
            {unfollowProgress.isActive && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">Unfollowing Progress</span>
                  <span className="text-sm text-blue-600">
                    {unfollowProgress.current} / {unfollowProgress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${unfollowProgress.total > 0 ? (unfollowProgress.current / unfollowProgress.total) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={unfollowSelected}
                disabled={selectedUsers.size === 0 || isUnfollowing}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isUnfollowing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <UserMinus className="w-4 h-4 mr-1" />
                )}
                Unfollow {selectedUsers.size}
              </Button>
              <Button
                onClick={shareResults}
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 bg-transparent"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button
                onClick={exportResults}
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50 bg-transparent"
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        )}

        {/* User List */}
        {users.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Following List</h2>
              <span className="text-sm text-gray-600">
                {getFilteredAndSortedUsers().length} of {users.length} users
              </span>
            </div>
            
            {/* Filter Controls */}
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterReason === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterReason('all')}
                  className="text-xs"
                >
                  All ({users.length})
                </Button>
                <Button
                  variant={filterReason === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterReason('inactive')}
                  className="text-xs"
                >
                  Inactive ({users.filter(u => u.reason === 'inactive').length})
                </Button>
                <Button
                  variant={filterReason === 'not_following_back' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterReason('not_following_back')}
                  className="text-xs"
                >
                  Not Following Back ({users.filter(u => u.reason === 'not_following_back').length})
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                >
                  <option value="reason">Reason</option>
                  <option value="name">Name</option>
                  <option value="followers">Followers</option>
                  <option value="following">Following</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {getFilteredAndSortedUsers().map((user) => (
                <div key={user.fid} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start space-x-3">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedUsers.has(user.fid)}
                      onCheckedChange={() => toggleUser(user.fid)}
                      className="mt-1"
                    />

                    {/* Avatar */}
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={user.pfp_url || "/placeholder.svg"} />
                      <AvatarFallback>{user.display_name[0]}</AvatarFallback>
                    </Avatar>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 truncate">{user.display_name}</h3>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500">
                              {user.follower_count.toLocaleString()} followers
                            </span>
                            <span className="text-xs text-gray-500">
                              {user.following_count.toLocaleString()} following
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${
                            user.reason === "inactive" 
                              ? "text-orange-600 bg-orange-50 px-2 py-1 rounded" 
                              : "text-red-600 bg-red-50 px-2 py-1 rounded"
                          }`}>
                            {user.reason === "inactive" ? "Inactive 75+ days" : "Not following back"}
                          </p>
                        </div>

                        {/* Individual Unfollow Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unfollowSingle(user.fid)}
                          className="text-xs border-red-200 text-red-700 hover:bg-red-50 ml-2"
                        >
                          <UserMinus className="w-3 h-3 mr-1" />
                          Unfollow
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rescan Button */}
        <Button onClick={() => startScan()} disabled={isScanning} variant="outline" className="w-full bg-transparent">
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Rescanning with Neynar...
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Rescan Following List
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmUnfollow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Unfollow</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to unfollow {selectedUsers.size} users? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={performUnfollow}
                className="bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                Yes, Unfollow
              </Button>
              <Button
                onClick={() => setShowConfirmUnfollow(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
