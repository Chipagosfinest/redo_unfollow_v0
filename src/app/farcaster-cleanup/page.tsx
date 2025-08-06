"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Users, UserMinus, Share2, CheckCircle, AlertTriangle, Filter, Trash2, LogIn, BarChart3, X, ChevronDown, ChevronUp, Bell, BellOff, RefreshCw, User, CreditCard } from "lucide-react"
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
  // TODO: Notifications state - Uncomment when Farcaster manifest integration is complete
  // const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [unfollowProgress, setUnfollowProgress] = useState<{
    current: number
    total: number
    isActive: boolean
  }>({ current: 0, total: 0, isActive: false })
  const [analysisProgress, setAnalysisProgress] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [usersPerPage] = useState(15)

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
          await sdk.actions.ready()
          console.log('✅ Mini App ready')
        }
      } catch (error) {
        console.error('Failed to call ready() immediately:', error)
        // Try again after a short delay
        setTimeout(async () => {
          try {
            await sdk.actions.ready()
            console.log('✅ Ready called on retry')
          } catch (retryError) {
            console.error('Retry failed:', retryError)
          }
        }, 1000)
      }
    }
    
    callReadyImmediately()
    
    // Cleanup function
    return () => {
      sdk.removeAllListeners()
    }
  }, [])

  // Initialize auth context
  useEffect(() => {
    
    const initializeAuth = async () => {
      try {
        // Handle wallet conflicts before auth
        if (typeof window !== 'undefined') {
          // Check for multiple wallet providers
          const ethereum = (window as any).ethereum
          if (ethereum && ethereum.providers?.length > 1) {
            console.log('⚠️ Multiple wallet providers detected:', ethereum.providers.length)
            // Try to use the first provider to avoid conflicts
            (window as any).ethereum = ethereum.providers[0]
          }
          
          // Prevent ethereum property conflicts
          if (ethereum) {
            Object.defineProperty(window, 'ethereum', {
              value: ethereum,
              writable: false,
              configurable: false
            })
          }
        }
        
        // Initialize auth manager
        const authContext = await authManager.initialize()
        
        setIsMiniApp(authContext.isMiniApp)
        
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
          console.log('✅ User authenticated')
        }
        
        // Always call ready() for Mini App - CRITICAL for splash screen
        if (authContext.isMiniApp) {
          try {
            await sdk.actions.ready()
            console.log('✅ Splash screen hidden')
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
    
    // Cleanup function
    return () => {
      sdk.removeAllListeners()
    }
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
        setAuthError('This app requires a Farcaster client. Please open it in a Farcaster app.')
        toast.error('This app requires a Farcaster client. Please open it in a Farcaster app.')
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
      toast.error('Please authenticate first')
      return
    }

    setIsAnalyzing(true)
    setAnalysisProgress('Starting analysis...')
    const progressInterval: NodeJS.Timeout | null = null

    try {
      // Add retry mechanism for blocked requests
      const makeRequestWithRetry = async (retryCount = 0): Promise<Response> => {
        try {
          const response = await fetch("/api/neynar/cleanup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          })
          
          // If blocked by client, retry with delay
          if (response.status === 0 && retryCount < 3) {
            console.log(`🔄 Request blocked, retrying... (attempt ${retryCount + 1})`)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)))
            return makeRequestWithRetry(retryCount + 1)
          }
          
          return response
        } catch (error) {
          if (retryCount < 3) {
            console.log(`🔄 Network error, retrying... (attempt ${retryCount + 1})`)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)))
            return makeRequestWithRetry(retryCount + 1)
          }
          throw error
        }
      }

      const requestBody = { 
        fid: authenticatedUser.fid,
        filters,
        limit: 1000, // TURBO MODE - much higher limit
        threshold: 30 // TURBO MODE - much more aggressive
      }
      
      const response = await makeRequestWithRetry()
      
      if (response.ok) {
        const data = await response.json()

        if (data.success) {
          setUsers(data.users)
          setFilterCounts(data.summary.filterCounts)
          console.log('✅ Analysis completed')
          toast.success(`Found ${data.users.length} accounts to manage`)
        } else {
          toast.error(data.error || 'Analysis failed')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        // Handle specific error types
        if (response.status === 429) {
          toast.error('Rate limit exceeded - please wait a moment and try again')
        } else if (response.status === 403) {
          toast.error('Access denied - please check your authentication')
        } else if (response.status === 0) {
          toast.error('Network error - request may have been blocked by browser extension')
        } else {
          toast.error(errorData.error || `API failed: ${response.status}`)
        }
      }
    } catch (error) {
      console.error('❌ Analysis failed:', error)
      toast.error("Analysis failed - please try again")
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      setIsAnalyzing(false)
      setAnalysisProgress('')
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
    if (selectedUsers.size === 0) {
      return
    }
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
          const text = `Just managed my Farcaster following! 🧹 Found ${users.length} accounts to review. Don't be inactive about who you follow!`
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

  // TODO: Enable notifications - Requires Farcaster manifest integration
  /*
  const enableNotifications = async () => {
    console.log('🔔 Enable notifications button clicked!')
    try {
      console.log('📱 Calling sdk.actions.addMiniApp()...')
      await sdk.actions.addMiniApp()
      console.log('✅ Mini App added successfully')
      setNotificationsEnabled(true)
      toast.success("Notifications enabled! You'll receive updates every 5 days.")
    } catch (error) {
      console.error('❌ Failed to enable notifications:', error)
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
  */

  // Show loading screen during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🧹 Manage Your Following</h1>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🧹 Manage Your Following</h1>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🧹 Manage Your Following</h1>
          <p className="text-gray-600 mb-6">
            {isMiniApp 
              ? 'Connect your Farcaster account to start managing your active following'
              : 'This app works in Farcaster clients'
            }
          </p>
          
          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">{authError}</p>
              {!isMiniApp && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-blue-700 text-sm">
                    💡 <strong>Tip:</strong> This app works best in Farcaster clients. 
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
            This will authenticate you and help you manage your active following
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* User Profile Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              {authenticatedUser?.pfpUrl ? (
                <img 
                  src={authenticatedUser.pfpUrl} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full border-4 border-purple-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-purple-100 border-4 border-purple-200 flex items-center justify-center">
                  <User className="w-8 h-8 text-purple-600" />
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {authenticatedUser?.displayName || authenticatedUser?.username}
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              @{authenticatedUser?.username}
            </p>
            
            {/* Main Action */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Who You Follow
              </h3>
              <Button 
                onClick={() => {
                  console.log('🚨 ANALYZE BUTTON CLICKED!')
                  analyzeFollowingList()
                }}
                disabled={isAnalyzing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Analyzing Your Following...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5 mr-3" />
                    Analyze Following List
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

                {/* Analysis Progress */}
        {isAnalyzing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Analyzing Your Following List
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                {analysisProgress || "Starting analysis..."}
              </p>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-xs text-blue-600 mt-3">
                Turbo mode enabled! Processing at high speed...
              </p>
            </div>
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

        {/* TODO: Notifications - Requires Farcaster manifest integration
        {isAuthenticated && !notificationsEnabled && users.length === 0 && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Stay active about who you follow
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    console.log('🚨 ENABLE NOTIFICATIONS BUTTON CLICKED!')
                    enableNotifications()
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  Enable
                </Button>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                We'll remind you to review your following and stay active about who you follow
              </p>
            </div>
          </div>
        )}
        */}

        {/* Results Section */}
        {!isAnalyzing && (users.length > 0 || (authenticatedUser && !isAnalyzing)) && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {users.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
                  <span className="text-sm text-gray-500">
                    {users.length} accounts to review
                  </span>
                </div>
                
                {/* Filters */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={filters.nonMutual}
                          onCheckedChange={() => toggleFilter('nonMutual')}
                        />
                        <span className="text-sm font-medium">☑️ Non-mutual ({filterCounts.nonMutual})</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={filters.noInteractionWithYou}
                          onCheckedChange={() => toggleFilter('noInteractionWithYou')}
                        />
                        <span className="text-sm font-medium">☑️ No interaction with you ({filterCounts.noInteractionWithYou})</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={filters.youNoInteraction}
                          onCheckedChange={() => toggleFilter('youNoInteraction')}
                        />
                        <span className="text-sm font-medium">☑️ You no interaction ({filterCounts.youNoInteraction})</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={filters.nuclear}
                          onCheckedChange={() => toggleFilter('nuclear')}
                        />
                        <span className="text-sm font-medium">☑️ Nuclear option ({filterCounts.nuclear})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Your Following List Looks Great!
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  No accounts found that match your cleanup criteria. Your following list is well-curated!
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">What we checked:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Non-mutual follows: {filterCounts.nonMutual}</li>
                    <li>• No recent interactions: {filterCounts.noInteractionWithYou}</li>
                    <li>• You no interaction: {filterCounts.youNoInteraction}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        {users.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Filters:</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.nonMutual}
                    onCheckedChange={() => toggleFilter('nonMutual')}
                  />
                  <span className="text-sm font-medium">☑️ Non-mutual ({filterCounts.nonMutual})</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.noInteractionWithYou}
                    onCheckedChange={() => toggleFilter('noInteractionWithYou')}
                  />
                  <span className="text-sm font-medium">☑️ No interaction with you ({filterCounts.noInteractionWithYou})</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.youNoInteraction}
                    onCheckedChange={() => toggleFilter('youNoInteraction')}
                  />
                  <span className="text-sm font-medium">☑️ You no interaction ({filterCounts.youNoInteraction})</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.nuclear}
                    onCheckedChange={() => toggleFilter('nuclear')}
                  />
                  <span className="text-sm font-medium text-red-600">☐ Nuclear option ({filterCounts.nuclear})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selection Management */}
        {users.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs p-2 h-auto"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="text-xs p-2 h-auto"
                >
                  Clear
                </Button>
              </div>
              <span className="text-sm text-gray-600">
                ({selectedUsers.size} selected)
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {users.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <Button
              onClick={unfollowSelected}
              disabled={selectedUsers.size === 0 || isUnfollowing}
              className="bg-red-600 hover:bg-red-700 text-white w-full"
            >
              {isUnfollowing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <UserMinus className="w-4 h-4 mr-1" />
              )}
              Unfollow Selected ({selectedUsers.size})
            </Button>
            
            <Button
              onClick={() => {
                // Select all users and then unfollow
                const allUserFids = users.map(user => user.fid)
                setSelectedUsers(new Set(allUserFids))
                setTimeout(() => unfollowSelected(), 100)
              }}
              disabled={isUnfollowing}
              className="bg-orange-600 hover:bg-orange-700 text-white w-full"
            >
              {isUnfollowing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Users className="w-4 h-4 mr-1" />
              )}
              Unfollow All ({users.length})
            </Button>
          </div>
        )}

        {/* User List */}
        {users.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">User List (infinite scroll):</h2>
              <span className="text-sm text-gray-600">
                {users.length} users
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users
                .slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)
                .map((user) => (
                <div key={user.fid} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start space-x-3">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedUsers.has(user.fid)}
                      onCheckedChange={() => toggleUser(user.fid)}
                      className="mt-1"
                    />

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 truncate">☑️ [👤] {user.displayName}</h3>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                          <div className="mt-1">
                            {user.reasons.map((reason, index) => (
                              <p key={index} className="text-xs text-gray-600">
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
                          Unfollow
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Pagination Controls */}
              {users.length > usersPerPage && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="text-xs"
                  >
                    Previous
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {Math.ceil(users.length / usersPerPage)}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(users.length / usersPerPage), prev + 1))}
                    disabled={currentPage === Math.ceil(users.length / usersPerPage)}
                    className="text-xs"
                  >
                    Next
                  </Button>
                </div>
              )}
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
                  Reviewing...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Review Again
                </>
              )}
          </Button>
        )}

        {/* Always show analyze button when authenticated */}
        {isAuthenticated && (
          <div className="mb-6">
            <Button 
              onClick={() => {
                console.log('🚨 REVIEW YOUR FOLLOWING BUTTON CLICKED!')
                analyzeFollowingList()
              }}
              disabled={isAnalyzing}
              className="bg-purple-600 hover:bg-purple-700 text-white w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reviewing Your Following...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  {users.length > 0 ? 'Review Your Following' : 'Review Your Following'}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Paid Analysis Link */}
        {isAuthenticated && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4 mb-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                🚀 Premium Analysis
              </h3>
              <p className="text-sm text-purple-700 mb-4">
                Get comprehensive analysis of your entire following list with notifications
              </p>
              <Button 
                onClick={() => window.location.href = '/paid-analysis'}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Try Premium ($5.00)
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmUnfollow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Bulk Unfollow</h3>
            <p className="text-gray-600 mb-6">
              Unfollow {selectedUsers.size} selected users?
            </p>
            
            {/* Preview of selected users */}
            <div className="max-h-32 overflow-y-auto mb-6">
              {users.filter(u => selectedUsers.has(u.fid)).slice(0, 3).map(user => (
                <div key={user.fid} className="flex items-center space-x-2 mb-2">
                  <span className="text-sm text-gray-700">• {user.displayName}</span>
                  <span className="text-xs text-gray-500">
                    ({user.reasons[0]})
                  </span>
                </div>
              ))}
              {selectedUsers.size > 3 && (
                <p className="text-sm text-gray-500">+ {selectedUsers.size - 3} more...</p>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowConfirmUnfollow(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={performUnfollow}
                className="bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                Confirm Unfollow
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 