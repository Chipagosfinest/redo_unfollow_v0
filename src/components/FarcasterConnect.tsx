"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Loader2, Users, UserMinus, Activity, Shield, CheckCircle } from 'lucide-react'
import { NeynarAuth } from './NeynarAuth'

interface User {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  followerCount: number
  followingCount: number
  lastActive?: string
  isMutual?: boolean
  isInactive?: boolean
}

interface AnalysisResult {
  totalFollowing: number
  inactiveUsers: User[]
  nonMutualUsers: User[]
  spamUsers: User[]
  mutualUsers: User[]
}

interface NeynarUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  signerUuid?: string
  isAuthenticated: boolean
}

export function FarcasterConnect() {
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<NeynarUser | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set())
  const [isUnfollowing, setIsUnfollowing] = useState(false)

  const handleUserAuthenticated = (neynarUser: NeynarUser) => {
    setUser(neynarUser)
    // Start analysis when user is authenticated
    if (neynarUser.fid) {
      analyzeFollowing(neynarUser.fid)
    }
  }

  const handleUserDisconnected = () => {
    setUser(null)
    setAnalysis(null)
    setSelectedUsers(new Set())
  }

  const analyzeFollowing = async (fid: number) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fid }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze following')
      }

      const analysisData = await response.json()
      setAnalysis(analysisData)
      toast.success('Analysis complete!')
    } catch (error) {
      toast.error('Failed to analyze following')
      console.error('Analysis error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserSelection = (fid: number) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(fid)) {
      newSelected.delete(fid)
    } else {
      newSelected.add(fid)
    }
    setSelectedUsers(newSelected)
  }

  const unfollowSelected = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select users to unfollow')
      return
    }

    if (!user?.signerUuid) {
      toast.error('No signer available. Please reconnect.')
      return
    }

    setIsUnfollowing(true)
    try {
      const response = await fetch('/api/unfollow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signerUuid: user.signerUuid,
          targetFids: Array.from(selectedUsers)
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unfollow users')
      }

      const result = await response.json()
      toast.success(result.message)
      setSelectedUsers(new Set())
      
      // Refresh analysis
      if (user.fid) {
        await analyzeFollowing(user.fid)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unfollow users')
      console.error('Unfollow error:', error)
    } finally {
      setIsUnfollowing(false)
    }
  }

  const UserCard = ({ user, type }: { user: User; type: 'inactive' | 'nonMutual' | 'spam' | 'mutual' }) => {
    const isSelected = selectedUsers.has(user.fid)
    const canUnfollow = type !== 'mutual'
    
    return (
      <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-purple-500' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleUserSelection(user.fid)}
                disabled={!canUnfollow}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <h4 className="font-semibold text-sm">{user.displayName}</h4>
                <p className="text-xs text-gray-500">@{user.username}</p>
                <div className="flex space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {user.followerCount} followers
                  </Badge>
                  {type === 'inactive' && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                  {type === 'nonMutual' && <Badge variant="secondary" className="text-xs">Non-mutual</Badge>}
                  {type === 'spam' && <Badge variant="destructive" className="text-xs">Spam</Badge>}
                  {type === 'mutual' && <Badge variant="default" className="text-xs">Mutual</Badge>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Farcaster Account</h2>
          <p className="text-purple-200 mb-6">
            Create a signer to analyze and clean your following list
          </p>
        </div>
        
        <NeynarAuth 
          onUserAuthenticated={handleUserAuthenticated}
          onUserDisconnected={handleUserDisconnected}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
        <h3 className="text-xl font-semibold text-white mb-2">Analyzing Your Feed</h3>
        <p className="text-purple-200 mb-4">This may take a few moments...</p>
        <Progress value={45} className="w-full max-w-md mx-auto" />
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
        <h3 className="text-xl font-semibold text-white mb-2">Loading Analysis</h3>
        <p className="text-purple-200">Please wait...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* User Info */}
      <Card className="bg-white/10 border-white/20">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <img
              src={user.pfpUrl || '/default-avatar.png'}
              alt={user.displayName}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h3 className="font-semibold text-white">{user.displayName}</h3>
              <p className="text-sm text-purple-200">@{user.username}</p>
            </div>
            <div className="ml-auto flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">Connected</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
            <div className="text-2xl font-bold text-white">{analysis.totalFollowing}</div>
            <div className="text-xs text-purple-200">Total Following</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 mx-auto mb-2 text-red-400" />
            <div className="text-2xl font-bold text-white">{analysis.inactiveUsers.length}</div>
            <div className="text-xs text-purple-200">Inactive Users</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-4 text-center">
            <UserMinus className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
            <div className="text-2xl font-bold text-white">{analysis.nonMutualUsers.length}</div>
            <div className="text-xs text-purple-200">Non-Mutual</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-4 text-center">
            <Shield className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <div className="text-2xl font-bold text-white">{analysis.mutualUsers.length}</div>
            <div className="text-xs text-purple-200">Mutual Follows</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-purple-200">
          Selected: {selectedUsers.size} users
        </div>
        <Button
          onClick={unfollowSelected}
          disabled={selectedUsers.size === 0 || isUnfollowing}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {isUnfollowing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Unfollowing...
            </>
          ) : (
            `Unfollow Selected (${selectedUsers.size})`
          )}
        </Button>
      </div>

      {/* User Lists */}
      <div className="space-y-6">
        {analysis.inactiveUsers.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-red-400" />
              Inactive Users ({analysis.inactiveUsers.length})
            </h3>
            <div className="grid gap-3">
              {analysis.inactiveUsers.map(user => (
                <UserCard key={user.fid} user={user} type="inactive" />
              ))}
            </div>
          </div>
        )}

        {analysis.nonMutualUsers.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <UserMinus className="w-5 h-5 mr-2 text-yellow-400" />
              Non-Mutual Users ({analysis.nonMutualUsers.length})
            </h3>
            <div className="grid gap-3">
              {analysis.nonMutualUsers.map(user => (
                <UserCard key={user.fid} user={user} type="nonMutual" />
              ))}
            </div>
          </div>
        )}

        {analysis.spamUsers.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-red-400" />
              Potential Spam ({analysis.spamUsers.length})
            </h3>
            <div className="grid gap-3">
              {analysis.spamUsers.map(user => (
                <UserCard key={user.fid} user={user} type="spam" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 