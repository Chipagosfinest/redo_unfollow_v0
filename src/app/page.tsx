"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Users, UserMinus, Share2, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface User {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  follower_count: number
  following_count: number
  reason: "inactive" | "not_following_back"
}

export default function FarcasterUnfollowApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set())
  const [isUnfollowing, setIsUnfollowing] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Auto-authenticate for simplicity
  useEffect(() => {
    setIsAuthenticated(true)
  }, [])

  const startScan = async () => {
    setIsScanning(true)
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: 1, page: 1, limit: 50 }), // Demo FID
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
        setIsDemoMode(true)

        toast.success(`Found ${allUsers.length} accounts to review (Demo Data)`)
      }
    } catch (error) {
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

    setIsUnfollowing(true)
    let successCount = 0

    for (const fid of selectedUsers) {
      try {
        const response = await fetch("/api/unfollow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fid }),
        })

        if (response.ok) {
          successCount++
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

    toast.success(`Successfully unfollowed ${successCount} users (Demo Mode)`)
  }

  const unfollowSingle = async (fid: number) => {
    try {
      const response = await fetch("/api/unfollow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid }),
      })

      if (response.ok) {
        setUsers(users.filter((u) => u.fid !== fid))
        toast.success("User unfollowed successfully (Demo Mode)")
      }
    } catch (error) {
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
          <Button onClick={() => setIsAuthenticated(true)} className="w-full">
            <CheckCircle className="w-4 h-4 mr-2" />
            Continue with Farcaster
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Farcaster Cleanup</h1>
          <p className="text-gray-600">Find and unfollow inactive accounts</p>

          {/* Demo Mode Indicator */}
          {isDemoMode && (
            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800 font-medium">Demo Mode - Using Sample Data</span>
            </div>
          )}
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
