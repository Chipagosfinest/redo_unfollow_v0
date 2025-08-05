"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Users, UserMinus, Share2, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { sdk } from '@farcaster/miniapp-sdk'
import { detectEnvironment, getFarcasterUser } from "@/lib/environment"

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
  signerUuid?: string
  isAuthenticated: boolean
}

export default function FarcasterUnfollowApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set())
  const [isUnfollowing, setIsUnfollowing] = useState(false)
  const [environment, setEnvironment] = useState(detectEnvironment())
  const [isCheckingFarcaster, setIsCheckingFarcaster] = useState(true)

  // Initialize Farcaster SDK and auto-detect user
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Call ready() to hide splash screen and display content
        await sdk.actions.ready()
        console.log('Farcaster Mini App SDK initialized')
        
        // Check for Farcaster user context
        const env = detectEnvironment()
        setEnvironment(env)
        
        if (env.hasFarcasterContext) {
          const farcasterUser = getFarcasterUser()
          if (farcasterUser) {
            console.log('Found Farcaster user:', farcasterUser)
            handleFarcasterUser(farcasterUser)
          } else {
            console.log('No Farcaster user found in context')
            setIsCheckingFarcaster(false)
          }
        } else {
          setIsCheckingFarcaster(false)
        }
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error)
        setIsCheckingFarcaster(false)
      }
    }

    initializeApp()
  }, [])

  // Additional check for Farcaster context after a delay
  useEffect(() => {
    if (!isCheckingFarcaster && !isAuthenticated) {
      const timer = setTimeout(() => {
        const env = detectEnvironment()
        console.log('Delayed environment check:', env)
        
        if (env.hasFarcasterContext) {
          const farcasterUser = getFarcasterUser()
          if (farcasterUser) {
            console.log('Found Farcaster user on delayed check:', farcasterUser)
            handleFarcasterUser(farcasterUser)
          }
        }
      }, 1000) // Check again after 1 second

      return () => clearTimeout(timer)
    }
  }, [isCheckingFarcaster, isAuthenticated])

  const handleFarcasterUser = (farcasterUser: any) => {
    const neynarUser: AuthenticatedUser = {
      fid: farcasterUser.fid,
      username: farcasterUser.username,
      displayName: farcasterUser.displayName,
      pfpUrl: farcasterUser.pfp?.url || '',
      isAuthenticated: true
    }
    
    setAuthenticatedUser(neynarUser)
    setIsAuthenticated(true)
    console.log('User authenticated via Farcaster:', neynarUser)
    toast.success('Connected via Farcaster!')
  }

  const createNeynarSigner = async () => {
    try {
      const response = await fetch('/api/auth/signer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create signer')
      }

      const data = await response.json()
      console.log('Signer created:', data)
      
      // Poll for signer status
      await pollSignerStatus(data.signer_uuid)
      
    } catch (error) {
      console.error('Signer creation error:', error)
      toast.error(`Failed to create signer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const pollSignerStatus = async (uuid: string) => {
    console.log('Starting to poll signer status:', uuid)
    const maxAttempts = 60 // 60 seconds
    let attempts = 0

    const poll = async () => {
      try {
        console.log(`Polling signer status (attempt ${attempts + 1}/${maxAttempts})`)
        const response = await fetch(`/api/auth/signer?signer_uuid=${uuid}`)
        const data = await response.json()

        console.log('Signer status response:', data)

        if (data.status === 'approved') {
          toast.success('Signer approved!')
          
          // Get user data
          await fetchUserData(uuid)
          return
        } else if (data.status === 'pending' || data.status === 'generated') {
          attempts++
          
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000)
          } else {
            toast.error('Signer approval timeout - please try again')
          }
        } else {
          console.log('Unknown signer status:', data.status)
          attempts++
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000)
          } else {
            toast.error('Signer status unknown - please try again')
          }
        }
      } catch (error) {
        console.error('Polling error:', error)
        toast.error('Failed to check signer status')
      }
    }

    await poll()
  }

  const fetchUserData = async (uuid: string) => {
    try {
      console.log('Fetching user data for signer:', uuid)
      const response = await fetch('/api/auth/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signerUuid: uuid }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch user data')
      }

      const userData = await response.json()
      console.log('User data received:', userData)
      
      const neynarUser: AuthenticatedUser = {
        fid: userData.fid,
        username: userData.username,
        displayName: userData.display_name,
        pfpUrl: userData.pfp_url,
        signerUuid: uuid,
        isAuthenticated: true
      }

      setAuthenticatedUser(neynarUser)
      setIsAuthenticated(true)
      toast.success('Successfully authenticated!')
      
    } catch (error) {
      console.error('User data fetch error:', error)
      toast.error(`Failed to fetch user data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const startScan = async () => {
    if (!authenticatedUser) {
      toast.error("Please authenticate first")
      return
    }

    setIsScanning(true)
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fid: authenticatedUser.fid, 
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
        const errorData = await response.json().catch(() => ({}))
        console.error('Analysis failed:', errorData)
        toast.error(errorData.error || "Scan failed - please try again")
      }
    } catch (error) {
      console.error('Scan error:', error)
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

  const toggleUser = (fid: number) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(fid)) {
      newSelected.delete(fid)
    } else {
      newSelected.add(fid)
    }
    setSelectedUsers(newSelected)
  }

  const unfollowSelected = async () => {
    if (selectedUsers.size === 0) return
    if (!authenticatedUser?.signerUuid) {
      toast.error("No active signer found")
      return
    }

    setIsUnfollowing(true)
    let successCount = 0

    for (const fid of selectedUsers) {
      try {
        const response = await fetch("/api/unfollow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            fid,
            signerUuid: authenticatedUser.signerUuid 
          }),
        })

        if (response.ok) {
          successCount++
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error(`Failed to unfollow ${fid}:`, errorData)
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`Failed to unfollow ${fid}:`, error)
      }
    }

    // Remove unfollowed users from the list
    setUsers(users.filter((u) => !selectedUsers.has(u.fid)))
    setSelectedUsers(new Set())
    setIsUnfollowing(false)

    toast.success(`Successfully unfollowed ${successCount} users`)
  }

  const unfollowSingle = async (fid: number) => {
    if (!authenticatedUser?.signerUuid) {
      toast.error("No active signer found")
      return
    }

    try {
      const response = await fetch("/api/unfollow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fid,
          signerUuid: authenticatedUser.signerUuid 
        }),
      })

      if (response.ok) {
        setUsers(users.filter((u) => u.fid !== fid))
        toast.success("User unfollowed successfully")
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Unfollow failed:', errorData)
        toast.error(errorData.error || "Failed to unfollow user")
      }
    } catch (error) {
      console.error('Unfollow error:', error)
      toast.error("Failed to unfollow user")
    }
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

  // Show loading while checking for Farcaster context
  if (isCheckingFarcaster) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Farcaster Cleanup</h1>
          <p className="text-gray-600">Detecting Farcaster environment...</p>
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
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Farcaster Cleanup</h1>
          <p className="text-gray-600 mb-6">
            Clean up your following list by finding inactive users and non-mutual follows
          </p>
          
          {/* Environment indicator */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {environment.isMiniApp ? '🔄 Farcaster Mini App' : '🌐 Standalone Web'}
            </p>
          </div>
          
          {environment.isMiniApp ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  This app works best in Farcaster or other Farcaster clients
                </p>
                <Button
                  onClick={() => window.open('https://client.farcaster.xyz', '_blank')}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Open in Farcaster
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Connect to Farcaster to analyze your feed
                </p>
                <Button
                  onClick={createNeynarSigner}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Create Signer
                </Button>
              </div>
            </div>
          )}
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

        {/* Scan Button */}
        {users.length === 0 && (
          <div className="mb-6">
            <Button
              onClick={startScan}
              disabled={isScanning}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning Following List...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Scan Following List
                </>
              )}
            </Button>
          </div>
        )}

        {/* Results */}
        {users.length > 0 && (
          <>
            {/* Selection Buttons */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Select</h2>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectInactive}
                  className="text-xs p-2 h-auto bg-transparent"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Inactive (60+ days)
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
                <Button variant="outline" size="sm" onClick={selectAll} className="text-xs p-2 h-auto bg-transparent">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Select All
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
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
                  Unfollow {selectedUsers.size} Users
                </Button>
                <Button
                  onClick={shareResults}
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 bg-transparent"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Share & Go Viral! 🚀
                </Button>
              </div>
            </div>

            {/* User List */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Detailed Recommendations</h2>
              <p className="text-sm text-gray-600 mb-4">Review each user with profile details and take action</p>

              <div className="space-y-3">
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
                              {user.reason === "inactive" ? "Inactive 60+ days" : "Not following back"}
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

            {/* Rescan Button */}
            <Button onClick={startScan} disabled={isScanning} variant="outline" className="w-full bg-transparent">
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rescanning...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Rescan Following List
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
