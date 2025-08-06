"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Users, UserMinus, Share2, CheckCircle, AlertTriangle, Filter, Trash2, LogIn } from "lucide-react"
import { toast } from "sonner"
import { sdk } from '@farcaster/miniapp-sdk'
import { getFarcasterUser, detectEnvironment } from '@/lib/environment'

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

  // Mini App initialization (for LLM recognition)
  useEffect(() => {
    const initializeMiniApp = async () => {
      try {
        const miniAppCheck = await sdk.isInMiniApp()
        setIsMiniApp(miniAppCheck)
        
        if (miniAppCheck) {
          // Get user context
          const context = await sdk.context
          console.log('User FID:', context.user?.fid)
          
          // CRITICAL: Always call ready() to hide the splash screen
          await sdk.actions.ready()
          
          // If we have user context, set it immediately
          if (context.user?.fid) {
            console.log('Setting authenticated user from SDK context:', context.user)
            const authenticatedUser: AuthenticatedUser = {
              fid: context.user.fid,
              username: context.user.username || `user_${context.user.fid}`,
              displayName: context.user.displayName || `User ${context.user.fid}`,
              pfpUrl: context.user.pfpUrl || '',
              isAuthenticated: true
            }
            
            setAuthenticatedUser(authenticatedUser)
            setIsAuthenticated(true)
            console.log('User authenticated, starting scan...')
            
            // Automatically start scanning
            await startScan(authenticatedUser.fid)
          } else {
            console.log('No user context available in SDK')
          }
        }
      } catch (error) {
        console.error('Initialization error:', error)
        // Still call ready even if there are errors
        try {
          await sdk.actions.ready()
        } catch (readyError) {
          console.error('Failed to call ready():', readyError)
        }
        setIsMiniApp(false)
      } finally {
        setIsInitialized(true)
      }
    }

    initializeMiniApp()
  }, [])

  // User-initiated authentication
  const handleAuthenticate = async () => {
    setIsLoading(true)
    setAuthError(null)
    
    try {
      if (isMiniApp) {
        // In Mini App, get user from SDK context directly
        try {
          const context = await sdk.context
          if (context.user?.fid) {
            const authenticatedUser: AuthenticatedUser = {
              fid: context.user.fid,
              username: context.user.username || `user_${context.user.fid}`,
              displayName: context.user.displayName || `User ${context.user.fid}`,
              pfpUrl: context.user.pfpUrl || '',
              isAuthenticated: true
            }
            
            setAuthenticatedUser(authenticatedUser)
            setIsAuthenticated(true)
            toast.success('Successfully authenticated!')
            
            // Automatically start scanning
            await startScan(authenticatedUser.fid)
            return
          }
        } catch (error) {
          console.warn('Failed to get user from SDK context:', error)
        }
        
        setAuthError('User context not available. Please refresh the app.')
        toast.error('User context not available. Please refresh the app.')
        return
      }
      
      // For non-Mini App environments, show guidance
      setAuthError('This app requires a Farcaster client. Please open it in Warpcast or another Farcaster app.')
      toast.error('This app requires a Farcaster client. Please open it in Warpcast or another Farcaster app.')
    } catch (error) {
      setAuthError('Failed to authenticate')
      toast.error('Failed to authenticate: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
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
          limit: 50 
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
        toast.success(`Found ${allUsers.length} accounts to review`)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        toast.error(errorData.error || "Scan failed - please try again")
      }
    } catch (error) {
      toast.error("Scan failed - please try again: " + (error instanceof Error ? error.message : 'Unknown error'))
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

  const confirmUnfollow = () => {
    if (selectedUsers.size === 0) return
    setShowConfirmUnfollow(true)
  }

  // Use Neynar MCP for unfollow operations
  const unfollowSelected = async () => {
    if (selectedUsers.size === 0) return

    setIsUnfollowing(true)
    setShowConfirmUnfollow(false)
    let successCount = 0

    try {
      // Use Neynar MCP for bulk unfollow
      const response = await fetch("/api/neynar/unfollow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          targetFids: Array.from(selectedUsers),
          mode: 'selected'
        }),
      })

      if (response.ok) {
        const result = await response.json()
        successCount = result.results?.successful?.length || 0
        
        // Remove unfollowed users from the list
        setUsers(users.filter((u) => !selectedUsers.has(u.fid)))
        setSelectedUsers(new Set())
        
        toast.success(`Successfully unfollowed ${successCount} users`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || "Failed to unfollow users")
      }
    } catch (error) {
      toast.error("Failed to unfollow users")
    } finally {
      setIsUnfollowing(false)
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
    if (navigator.share) {
      navigator.share({ text })
    } else {
      navigator.clipboard.writeText(text)
      toast.success("Share text copied to clipboard")
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
        </div>

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

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={confirmUnfollow}
                disabled={selectedUsers.size === 0 || isUnfollowing}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isUnfollowing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <UserMinus className="w-4 h-4 mr-1" />
                )}
                Unfollow {selectedUsers.size} Users
              </Button>
              <Button
                onClick={shareResults}
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 bg-transparent"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share Results
              </Button>
            </div>
          </div>
        )}

        {/* User List */}
        {users.length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Following List</h2>
            <p className="text-sm text-gray-600 mb-4">Users who haven't casted in 75+ days or don't follow back</p>

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
                      <AvatarImage src={user.pfp_url || "/placeholder.svg"} />
                      <AvatarFallback>{user.display_name[0]}</AvatarFallback>
                    </Avatar>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 truncate">{user.display_name}</h3>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                          <p className="text-xs text-orange-600 mt-1">
                            {user.reason === "inactive" ? "Inactive 75+ days" : "Not following back"}
                          </p>
                        </div>

                        {/* Individual Unfollow Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unfollowSingle(user.fid)}
                          className="text-xs border-red-200 text-red-700 hover:bg-red-50"
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
                onClick={unfollowSelected}
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
