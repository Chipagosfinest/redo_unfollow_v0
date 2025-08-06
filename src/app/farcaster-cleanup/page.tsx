"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Users, UserMinus, Share2, CheckCircle, AlertTriangle, Filter, Trash2, LogIn, BarChart3, X, ChevronDown, ChevronUp, Bell, BellOff } from "lucide-react"
import { toast } from "sonner"
import { sdk } from '@farcaster/miniapp-sdk'
import { getFarcasterUser, detectEnvironment } from '@/lib/environment'
import { authManager, AuthContext } from '@/lib/auth-context'

// CRITICAL: Call ready() immediately when module loads
if (typeof window !== 'undefined') {
  (async () => {
    try {
      console.log('🔄 Module-level ready() call...')
      await sdk.actions.ready()
      console.log('✅ Module-level ready() success!')
    } catch (error) {
      console.error('❌ Module-level ready() failed:', error)
    }
  })()
}

interface User {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  followerCount: number
  followingCount: number
  isMutual: boolean
  reasons: string[]
  shouldUnfollow: boolean
}

interface AuthenticatedUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  isAuthenticated: boolean
  authMethod: 'miniapp' | 'web'
}

interface FilterCounts {
  nonMutual: number
  noInteractionWithYou: number
  youNoInteraction: number
  nuclear: number
}

interface Filters {
  nonMutual: boolean
  noInteractionWithYou: boolean
  youNoInteraction: boolean
  nuclear: boolean
}

export default function FarcasterCleanupApp() {
  // CRITICAL: Call ready() synchronously at component start
  if (typeof window !== 'undefined') {
    // Try to call ready immediately
    sdk.actions.ready().catch(() => {
      // Ignore errors here, we'll retry in useEffect
    })
  }

  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isMiniApp, setIsMiniApp] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isUnfollowing, setIsUnfollowing] = useState(false)
  const [showConfirmUnfollow, setShowConfirmUnfollow] = useState(false)
  const [filterCounts, setFilterCounts] = useState<FilterCounts>({
    nonMutual: 0,
    noInteractionWithYou: 0,
    youNoInteraction: 0,
    nuclear: 0
  })
  const [filters, setFilters] = useState<Filters>({
    nonMutual: true,
    noInteractionWithYou: true,
    youNoInteraction: true,
    nuclear: false
  })
  const [showFilters, setShowFilters] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [unfollowProgress, setUnfollowProgress] = useState<{
    current: number
    total: number
    isActive: boolean
  }>({ current: 0, total: 0, isActive: false })

  // Suppress browser extension conflicts and add ready() to window for debugging
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

    // Add ready() function to window for manual debugging
    if (typeof window !== 'undefined') {
      (window as any).callReady = async () => {
        try {
          console.log('🔄 Manual ready() call...')
          await sdk.actions.ready()
          console.log('✅ Manual ready() successful')
        } catch (error) {
          console.error('Manual ready() failed:', error)
        }
      }
    }

    return () => {
      console.error = originalError
    }
  }, [])

  // CRITICAL: Call ready() immediately for Mini App
  useEffect(() => {
    const callReadyImmediately = async () => {
      try {
        console.log('🔄 Checking if in Mini App...')
        const isMiniAppCheck = await sdk.isInMiniApp()
        console.log('Is Mini App:', isMiniAppCheck)
        
        if (isMiniAppCheck) {
          console.log('🔄 Calling ready() immediately...')
          await sdk.actions.ready()
          console.log('✅ Ready called immediately')
        } else {
          console.log('Not in Mini App, skipping ready()')
        }
      } catch (error) {
        console.error('Failed to call ready() immediately:', error)
        // Try again after a short delay
        setTimeout(async () => {
          try {
            console.log('🔄 Retrying ready() call...')
            await sdk.actions.ready()
            console.log('✅ Ready called on retry')
          } catch (retryError) {
            console.error('Retry failed:', retryError)
          }
        }, 1000)
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
          console.log('User authenticated, ready to analyze...')
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

  // Analyze following list
  const analyzeFollowingList = async () => {
    if (!authenticatedUser?.fid) {
      toast.error("Please authenticate first")
      return
    }

    setIsAnalyzing(true)
    try {
      const response = await fetch("/api/neynar/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fid: authenticatedUser.fid,
          filters,
          limit: 100,
          threshold: 60
        }),
      })
      
      if (response.ok) {
        const data = await response.json()

        if (data.success) {
          setUsers(data.users)
          setFilterCounts(data.summary.filterCounts)
          toast.success(`Found ${data.users.length} accounts to review`)
        } else {
          toast.error(data.error || 'Analysis failed')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API failed:', response.status, errorData)
        toast.error(errorData.error || `API failed: ${response.status}`)
      }
    } catch (error) {
      console.error('Analysis failed:', error)
      toast.error("Analysis failed - please try again")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Filter toggle handlers
  const toggleFilter = (filterKey: keyof Filters) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }))
  }

  // Selection management
  const selectAll = () => {
    setSelectedUsers(new Set(users.map(u => u.fid)))
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

  // Unfollow operations
  const unfollowSelected = () => {
    if (selectedUsers.size === 0) return
    setShowConfirmUnfollow(true)
  }

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
        
        // Use Neynar API for batch unfollow
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
      
      toast.success(`Successfully unfollowed ${successCount} users`)
    } catch (error) {
      console.error('Unfollow failed:', error)
      toast.error("Failed to unfollow users")
    } finally {
      setIsUnfollowing(false)
      setUnfollowProgress({ current: 0, total: 0, isActive: false })
    }
  }

  // Single user unfollow
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

  // Share results
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

  // Enable notifications
  const enableNotifications = async () => {
    try {
      await sdk.actions.addMiniApp()
      setNotificationsEnabled(true)
      toast.success("Notifications enabled! You'll receive updates every 5 days.")
    } catch (error) {
      console.error('Failed to enable notifications:', error)
      toast.error("Failed to enable notifications")
    }
  }

  // Send notification reminder
  const sendNotificationReminder = async () => {
    if (!authenticatedUser?.fid) return

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: `cleanup-reminder-${new Date().toISOString().split('T')[0]}`,
          title: '🧹 Farcaster Cleanup Reminder',
          body: `You have ${users.length} accounts ready for review. Time to clean up your feed!`,
          targetUrl: '/farcaster-cleanup',
          fids: [authenticatedUser.fid]
        })
      })

      if (response.ok) {
        toast.success("Notification reminder sent!")
      } else {
        console.error('Failed to send notification')
      }
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  // Show loading screen during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🧹 Farcaster Cleanup</h1>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🧹 Farcaster Cleanup</h1>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🧹 Farcaster Cleanup</h1>
          <p className="text-gray-600 mb-6">
            {isMiniApp 
              ? 'Connect your Farcaster account to start cleaning up'
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
                Connecting...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Connect to Cleanup
              </>
            )}
          </Button>
          
          <p className="text-sm text-gray-500 mt-4">
            This will authenticate you and analyze your following list
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
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🧹 Farcaster Cleanup</h1>
          <p className="text-gray-600">Clean up your following list with smart filters</p>
        </div>

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

        {/* Main Action Button */}
        {users.length === 0 && (
          <div className="mb-6 space-y-3">
            <Button 
              onClick={analyzeFollowingList}
              disabled={isAnalyzing}
              className="bg-purple-600 hover:bg-purple-700 text-white w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Following List...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Analyze Following List
                </>
              )}
            </Button>
            
            {/* Notification Opt-in */}
            {!notificationsEnabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Get notified every 5 days
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={enableNotifications}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    Enable
                  </Button>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  We'll remind you to review your following list and keep your feed clean
                </p>
              </div>
            )}
          </div>
        )}

        {/* Filter Toggles */}
        {users.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-xs p-2 h-auto"
              >
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
            
            {showFilters && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.nonMutual}
                      onCheckedChange={() => toggleFilter('nonMutual')}
                    />
                    <span className="text-sm font-medium">Non-mutual follows</span>
                  </div>
                  <span className="text-sm text-gray-600">({filterCounts.nonMutual})</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.noInteractionWithYou}
                      onCheckedChange={() => toggleFilter('noInteractionWithYou')}
                    />
                    <span className="text-sm font-medium">Haven't interacted with you</span>
                  </div>
                  <span className="text-sm text-gray-600">({filterCounts.noInteractionWithYou})</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.youNoInteraction}
                      onCheckedChange={() => toggleFilter('youNoInteraction')}
                    />
                    <span className="text-sm font-medium">You haven't interacted</span>
                  </div>
                  <span className="text-sm text-gray-600">({filterCounts.youNoInteraction})</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.nuclear}
                      onCheckedChange={() => toggleFilter('nuclear')}
                    />
                    <span className="text-sm font-medium text-red-600">Nuclear option (all following)</span>
                  </div>
                  <span className="text-sm text-gray-600">({filterCounts.nuclear})</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selection Management */}
        {users.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Selection</h2>
              <span className="text-sm text-gray-600">
                {selectedUsers.size} selected
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="text-xs p-2 h-auto"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="text-xs p-2 h-auto"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {users.length > 0 && (
          <div className="mb-4">
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
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button
                onClick={sendNotificationReminder}
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                title="Send yourself a notification reminder"
              >
                <Bell className="w-4 h-4 mr-1" />
                Remind
              </Button>
            </div>
          </div>
        )}

        {/* User List */}
        {users.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Users to Unfollow</h2>
              <span className="text-sm text-gray-600">
                {users.length} users
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users.map((user) => (
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
                      <AvatarImage src={user.pfpUrl || "/placeholder.svg"} />
                      <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                    </Avatar>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 truncate">{user.displayName}</h3>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500">
                              {user.followerCount.toLocaleString()} followers
                            </span>
                            <span className="text-xs text-gray-500">
                              {user.followingCount.toLocaleString()} following
                            </span>
                          </div>
                          <div className="mt-2 space-y-1">
                            {user.reasons.map((reason, index) => (
                              <p key={index} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                {reason}
                              </p>
                            ))}
                          </div>
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

        {/* Re-analyze Button */}
        {users.length > 0 && (
          <Button 
            onClick={analyzeFollowingList} 
            disabled={isAnalyzing} 
            variant="outline" 
            className="w-full bg-transparent"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Re-analyzing...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Re-analyze Following List
              </>
            )}
          </Button>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmUnfollow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Bulk Unfollow</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to unfollow {selectedUsers.size} users? This action cannot be undone.
            </p>
            
            {/* Preview of selected users */}
            <div className="max-h-32 overflow-y-auto mb-6">
              {users.filter(u => selectedUsers.has(u.fid)).slice(0, 5).map(user => (
                <div key={user.fid} className="flex items-center space-x-2 mb-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={user.pfpUrl} />
                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-700">@{user.username}</span>
                  <span className="text-xs text-gray-500">({user.reasons[0]})</span>
                </div>
              ))}
              {selectedUsers.size > 5 && (
                <p className="text-sm text-gray-500">+ {selectedUsers.size - 5} more...</p>
              )}
            </div>
            
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