"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast, Toaster } from 'sonner'
import { 
  Loader2, 
  Users, 
  UserMinus, 
  Activity, 
  Shield, 
  CheckCircle, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { NeynarAuth } from './NeynarAuth'
import { detectEnvironment } from '@/lib/environment'

interface User {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  followerCount: number
  followingCount: number
  isMutual?: boolean
  isInactive?: boolean
  isSpam?: boolean
  shouldUnfollow?: boolean
}

interface AnalysisResult {
  totalFollowing: number
  totalPages: number
  currentPage: number
  users: User[]
  summary: {
    inactiveCount: number
    nonMutualCount: number
    spamCount: number
    mutualCount: number
    unfollowableCount: number
  }
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
  const [currentPage, setCurrentPage] = useState(1)
  const [environment] = useState(detectEnvironment())

  const handleUserAuthenticated = useCallback((neynarUser: NeynarUser) => {
    setUser(neynarUser)
    if (neynarUser.fid) {
      analyzeFollowing(neynarUser.fid, 1)
    }
  }, [])

  const handleUserDisconnected = useCallback(() => {
    setUser(null)
    setAnalysis(null)
    setSelectedUsers(new Set())
    setCurrentPage(1)
  }, [])

  const analyzeFollowing = useCallback(async (fid: number, page: number = 1) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fid, page, limit: 50 }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to analyze following')
      }

      const analysisData = await response.json()
      setAnalysis(analysisData)
      setCurrentPage(page)
      toast.success('Analysis complete!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze following'
      toast.error(message)
      console.error('Analysis error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const toggleUserSelection = useCallback((fid: number) => {
    setSelectedUsers(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(fid)) {
        newSelected.delete(fid)
      } else {
        newSelected.add(fid)
      }
      return newSelected
    })
  }, [])

  const selectAllUnfollowable = useCallback(() => {
    if (!analysis) return
    
    const unfollowableFids = analysis.users
      .filter(user => user.shouldUnfollow)
      .map(user => user.fid)
    
    setSelectedUsers(new Set(unfollowableFids))
    toast.success(`Selected ${unfollowableFids.length} unfollowable users`)
  }, [analysis])

  const clearSelection = useCallback(() => {
    setSelectedUsers(new Set())
    toast.info('Selection cleared')
  }, [])

  const unfollowSelected = useCallback(async (mode: 'selected' | 'all_unfollowable' | 'clean_slate' = 'selected') => {
    if (!user?.signerUuid) {
      toast.error('No signer available. Please reconnect.')
      return
    }

    let targetFids: number[] = []
    
    switch (mode) {
      case 'selected':
        if (selectedUsers.size === 0) {
          toast.error('Please select users to unfollow')
          return
        }
        targetFids = Array.from(selectedUsers)
        break
      case 'all_unfollowable':
        if (!analysis) {
          toast.error('No analysis data available')
          return
        }
        targetFids = analysis.users.filter(u => u.shouldUnfollow).map(u => u.fid)
        break
      case 'clean_slate':
        if (!analysis) {
          toast.error('No analysis data available')
          return
        }
        targetFids = analysis.users.map(u => u.fid) // Unfollow everyone
        break
    }

    if (targetFids.length === 0) {
      toast.error('No users to unfollow')
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
          targetFids,
          mode
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unfollow users')
      }

      const result = await response.json()
      toast.success(result.message)
      
      // Clear selection and refresh analysis
      setSelectedUsers(new Set())
      if (user.fid) {
        await analyzeFollowing(user.fid, currentPage)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unfollow users'
      toast.error(message)
      console.error('Unfollow error:', error)
    } finally {
      setIsUnfollowing(false)
    }
  }, [selectedUsers, user, analysis, currentPage, analyzeFollowing])

  const handlePageChange = useCallback((newPage: number) => {
    if (!user?.fid) return
    analyzeFollowing(user.fid, newPage)
  }, [user, analyzeFollowing])

  const UserCard = useMemo(() => {
    const UserCardComponent = ({ user }: { user: User }) => {
      const isSelected = selectedUsers.has(user.fid)
      
      return (
        <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-purple-500' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleUserSelection(user.fid)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <h4 className="font-semibold text-sm">{user.displayName}</h4>
                  <p className="text-xs text-gray-500">@{user.username}</p>
                  <div className="flex space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {user.followerCount.toLocaleString()} followers
                    </Badge>
                    {user.isInactive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                    {!user.isMutual && <Badge variant="secondary" className="text-xs">Non-mutual</Badge>}
                    {user.isSpam && <Badge variant="destructive" className="text-xs">Spam</Badge>}
                    {user.isMutual && <Badge variant="default" className="text-xs">Mutual</Badge>}
                    {user.shouldUnfollow && <Badge variant="outline" className="text-xs text-red-400">Unfollow</Badge>}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }
    
    UserCardComponent.displayName = 'UserCard'
    return UserCardComponent
  }, [selectedUsers, toggleUserSelection])

  if (!user) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Connect Your Farcaster Account
          </h2>
          <p className="text-purple-200 mb-6">
            {environment.isMiniApp 
              ? 'You\'re in a Farcaster app. Connect to analyze your feed.'
              : 'Create a signer to analyze and clean your following list'
            }
          </p>
        </div>
        
        <NeynarAuth 
          onUserAuthenticated={handleUserAuthenticated}
          onUserDisconnected={handleUserDisconnected}
        />

        {environment.isMiniApp && (
          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm text-purple-200 mb-2">
              💡 Tip: This app works best in Warpcast or other Farcaster clients
            </p>
            <Button
              onClick={() => window.open('https://warpcast.com', '_blank')}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Warpcast
            </Button>
          </div>
        )}
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
    <>
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
                <span className="text-xs text-green-400">
                  {environment.isMiniApp ? 'Mini App' : 'Connected'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <div className="text-2xl font-bold text-white">{analysis.totalFollowing.toLocaleString()}</div>
              <div className="text-xs text-purple-200">Total Following</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <Activity className="w-6 h-6 mx-auto mb-2 text-red-400" />
              <div className="text-2xl font-bold text-white">{analysis.summary.inactiveCount.toLocaleString()}</div>
              <div className="text-xs text-purple-200">Inactive</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <UserMinus className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
              <div className="text-2xl font-bold text-white">{analysis.summary.nonMutualCount.toLocaleString()}</div>
              <div className="text-xs text-purple-200">Non-Mutual</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <Shield className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <div className="text-2xl font-bold text-white">{analysis.summary.mutualCount.toLocaleString()}</div>
              <div className="text-xs text-purple-200">Mutual</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-400" />
              <div className="text-2xl font-bold text-white">{analysis.summary.unfollowableCount.toLocaleString()}</div>
              <div className="text-xs text-purple-200">Unfollowable</div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-purple-200">
              Selected: {selectedUsers.size} users
            </span>
            {selectedUsers.size > 0 && (
              <Button
                onClick={clearSelection}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Clear
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={selectAllUnfollowable}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Select All Unfollowable
            </Button>
            
            <Button
              onClick={() => unfollowSelected('selected')}
              disabled={selectedUsers.size === 0 || isUnfollowing || !user.signerUuid}
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
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
        </div>

        {/* Nuclear Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => unfollowSelected('all_unfollowable')}
            disabled={isUnfollowing || !user.signerUuid}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <UserMinus className="w-4 h-4 mr-2" />
            Unfollow All Unfollowable ({analysis.summary.unfollowableCount})
          </Button>
          
          <Button
            onClick={() => unfollowSelected('clean_slate')}
            disabled={isUnfollowing || !user.signerUuid}
            className="bg-red-700 hover:bg-red-800 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clean Slate - Unfollow Everyone ({analysis.totalFollowing})
          </Button>
        </div>

        {/* User List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">
              Users (Page {currentPage} of {analysis.totalPages})
            </h3>
            <div className="flex space-x-2">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= analysis.totalPages}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid gap-3">
            {analysis.users.map(user => (
              <UserCard key={user.fid} user={user} />
            ))}
          </div>
        </div>
      </div>
      <Toaster />
    </>
  )
} 