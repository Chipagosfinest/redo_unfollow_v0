"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Shield, 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Save,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  Settings,
  Lock,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { getFarcasterUser, detectEnvironment } from '@/lib/environment'
import { authManager } from '@/lib/auth-context'

interface WhitelistUser {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  reason: string
  added_at: string
}

interface AuthenticatedUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  isAuthenticated: boolean
  authMethod: 'miniapp' | 'web'
}

export default function WhitelistManager() {
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)
  const [whitelistUsers, setWhitelistUsers] = useState<WhitelistUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUserFid, setNewUserFid] = useState("")
  const [newUserReason, setNewUserReason] = useState("")
  const [isAddingUser, setIsAddingUser] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      const env = detectEnvironment()
      
      if (env.isMiniApp) {
        const farcasterUser = getFarcasterUser()
        if (farcasterUser) {
          setAuthenticatedUser({
            fid: farcasterUser.fid,
            username: farcasterUser.username,
            displayName: farcasterUser.displayName,
            pfpUrl: farcasterUser.pfpUrl,
            isAuthenticated: true,
            authMethod: 'miniapp'
          })
          setIsAuthenticated(true)
          return
        }
      }
      
      const context = authManager.getContext()
      if (context.isAuthenticated && context.fid) {
        setAuthenticatedUser({
          fid: context.fid,
          username: context.username || '',
          displayName: context.displayName || '',
          pfpUrl: context.pfpUrl || '',
          isAuthenticated: true,
          authMethod: 'web'
        })
        setIsAuthenticated(true)
      }
    }

    initializeAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadWhitelist()
    }
  }, [isAuthenticated])

  const loadWhitelist = async () => {
    if (!authenticatedUser) return

    try {
      setIsLoading(true)
      
      const response = await fetch('/api/neynar/whitelist/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFid: authenticatedUser.fid
        })
      })

      if (response.ok) {
        const data = await response.json()
        setWhitelistUsers(data.users || [])
      } else {
        // If no whitelist exists, start with empty array
        setWhitelistUsers([])
      }
      
    } catch (error) {
      console.error('❌ Failed to load whitelist:', error)
      toast.error('Failed to load whitelist')
    } finally {
      setIsLoading(false)
    }
  }

  const addUserToWhitelist = async () => {
    if (!authenticatedUser || !newUserFid.trim()) {
      toast.error('Please enter a valid FID')
      return
    }

    try {
      setIsAddingUser(true)
      
      const response = await fetch('/api/neynar/whitelist/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFid: authenticatedUser.fid,
          targetFid: parseInt(newUserFid),
          reason: newUserReason || 'Protected by user'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setWhitelistUsers(prev => [...prev, data.user])
        setNewUserFid("")
        setNewUserReason("")
        setShowAddForm(false)
        toast.success('User added to whitelist')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add user to whitelist')
      }
      
    } catch (error) {
      console.error('❌ Failed to add user to whitelist:', error)
      toast.error('Failed to add user to whitelist')
    } finally {
      setIsAddingUser(false)
    }
  }

  const removeUserFromWhitelist = async (targetFid: number) => {
    if (!authenticatedUser) return

    try {
      const response = await fetch('/api/neynar/whitelist/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFid: authenticatedUser.fid,
          targetFid
        })
      })

      if (response.ok) {
        setWhitelistUsers(prev => prev.filter(u => u.fid !== targetFid))
        toast.success('User removed from whitelist')
      } else {
        toast.error('Failed to remove user from whitelist')
      }
      
    } catch (error) {
      console.error('❌ Failed to remove user from whitelist:', error)
      toast.error('Failed to remove user from whitelist')
    }
  }

  const filteredUsers = whitelistUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fid.toString().includes(searchQuery)
  )

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🛡️ Whitelist Manager
            </h1>
            <p className="text-gray-600">
              Please authenticate to manage your whitelist
            </p>
          </div>
          
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-gray-600 mb-4">
                Connect your Farcaster account to manage protected users
              </p>
              <Button onClick={() => window.location.href = '/'}>
                Go to Authentication
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🛡️ Whitelist Manager
          </h1>
          <p className="text-gray-600">
            Protect users from being unfollowed during cleanup operations
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Protected Users</p>
                  <p className="text-2xl font-bold">{whitelistUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Following</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Protection Rate</p>
                  <p className="text-2xl font-bold">
                    {whitelistUsers.length > 0 ? 'Active' : 'None'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add User Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add User to Whitelist
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showAddForm ? (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Protected User
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">User FID</label>
                    <Input
                      placeholder="Enter Farcaster FID (e.g., 12345)"
                      value={newUserFid}
                      onChange={(e) => setNewUserFid(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Reason (Optional)</label>
                    <Input
                      placeholder="Why protect this user?"
                      value={newUserReason}
                      onChange={(e) => setNewUserReason(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addUserToWhitelist} disabled={isAddingUser}>
                    {isAddingUser ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Add to Whitelist
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Search className="h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search whitelist users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Whitelist Users */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Protected Users ({filteredUsers.length})
            </h3>
            {whitelistUsers.length > 0 && (
              <Button variant="outline" size="sm" onClick={loadWhitelist}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading whitelist...</p>
              </CardContent>
            </Card>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? 'No users found' : 'No protected users'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : 'Add users to protect them from unfollow operations'
                  }
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First User
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredUsers.map((user) => (
                <Card key={user.fid}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.pfp_url} />
                          <AvatarFallback>
                            {user.display_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{user.display_name}</h4>
                          <p className="text-sm text-gray-600">@{user.username}</p>
                          <p className="text-xs text-gray-500">FID: {user.fid}</p>
                          {user.reason && (
                            <Badge variant="secondary" className="mt-1">
                              {user.reason}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Protected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeUserFromWhitelist(user.fid)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              How Whitelist Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>Protected Users:</strong> Users in your whitelist will never be suggested for unfollowing, 
                even if they match other criteria like being non-mutual or inactive.
              </p>
              <p>
                <strong>Automatic Protection:</strong> When you run cleanup operations, whitelisted users are 
                automatically filtered out from the results.
              </p>
              <p>
                <strong>Manual Management:</strong> You can add or remove users from your whitelist at any time. 
                Changes are saved immediately.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 