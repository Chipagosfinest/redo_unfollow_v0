"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, ArrowLeft, Users, UserMinus, Share2, Download } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface AnalysisJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
  paymentAmount: number
  paymentCurrency: string
  results?: {
    totalFollowing: number
    totalFollowers: number
    usersToUnfollow: number
    filterCounts: {
      nonMutual: number
      noInteractionWithYou: number
      youNoInteraction: number
      nuclear: number
    }
    users: Array<{
      fid: number
      username: string
      displayName: string
      pfpUrl: string
      reasons: string[]
      shouldUnfollow: boolean
    }>
  }
  error?: string
}

export default function AnalysisResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [job, setJob] = useState<AnalysisJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set())
  const [isUnfollowing, setIsUnfollowing] = useState(false)

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await fetch(`/api/analysis/job/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setJob(data.job)
        } else {
          toast.error('Failed to load analysis results')
        }
      } catch (error) {
        console.error('Failed to fetch job:', error)
        toast.error('Failed to load analysis results')
      } finally {
        setLoading(false)
      }
    }

    fetchJob()
  }, [params.id])

  const toggleUser = (fid: number) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fid)) {
        newSet.delete(fid)
      } else {
        newSet.add(fid)
      }
      return newSet
    })
  }

  const selectAll = () => {
    if (job?.results?.users) {
      setSelectedUsers(new Set(job.results.users.map(user => user.fid)))
    }
  }

  const clearSelection = () => {
    setSelectedUsers(new Set())
  }

  const unfollowSelected = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select users to unfollow')
      return
    }

    setIsUnfollowing(true)
    
    try {
      const response = await fetch('/api/neynar/unfollow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetFids: Array.from(selectedUsers)
        })
      })

      if (response.ok) {
        toast.success(`Successfully unfollowed ${selectedUsers.size} users`)
        setSelectedUsers(new Set())
      } else {
        toast.error('Failed to unfollow users')
      }
    } catch (error) {
      console.error('Failed to unfollow users:', error)
      toast.error('Failed to unfollow users')
    } finally {
      setIsUnfollowing(false)
    }
  }

  const exportResults = () => {
    if (!job?.results) return

    const csvContent = [
      ['FID', 'Username', 'Display Name', 'Reasons', 'Should Unfollow'],
      ...job.results.users.map(user => [
        user.fid,
        user.username,
        user.displayName,
        user.reasons.join(', '),
        user.shouldUnfollow ? 'Yes' : 'No'
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analysis-results-${job.id}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-lg">Loading analysis results...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Analysis Not Found
              </h1>
              <p className="text-gray-600 mb-6">
                The analysis you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => router.push('/paid-analysis')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Analysis
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (job.status === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-red-900 mb-4">
                Analysis Failed
              </h1>
              <p className="text-gray-600 mb-6">
                {job.error || 'The analysis failed to complete. Please try again.'}
              </p>
              <Button onClick={() => router.push('/paid-analysis')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Analysis
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (job.status !== 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Analysis in Progress
              </h1>
              <p className="text-gray-600 mb-6">
                Your analysis is still being processed. Please check back later.
              </p>
              <Button onClick={() => router.push('/paid-analysis')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Analysis
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Analysis Results
              </h1>
              <p className="text-gray-600">
                Completed on {new Date(job.completedAt!).toLocaleDateString()}
              </p>
            </div>
            <Button onClick={() => router.push('/paid-analysis')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {job.results?.totalFollowing || 0}
              </div>
              <div className="text-sm text-gray-600">Total Following</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {job.results?.totalFollowers || 0}
              </div>
              <div className="text-sm text-gray-600">Total Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {job.results?.usersToUnfollow || 0}
              </div>
              <div className="text-sm text-gray-600">To Review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${job.paymentAmount}
              </div>
              <div className="text-sm text-gray-600">Paid</div>
            </div>
          </div>
        </div>

        {/* Filter Counts */}
        {job.results && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">
                  {job.results.filterCounts.nonMutual}
                </div>
                <div className="text-sm text-gray-600">Non-mutual</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">
                  {job.results.filterCounts.noInteractionWithYou}
                </div>
                <div className="text-sm text-gray-600">No interactions</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-600">
                  {job.results.filterCounts.youNoInteraction}
                </div>
                <div className="text-sm text-gray-600">You no interaction</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-600">
                  {job.results.filterCounts.nuclear}
                </div>
                <div className="text-sm text-gray-600">Nuclear option</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
            <div className="flex space-x-2">
              <Button onClick={selectAll} variant="outline" size="sm">
                Select All
              </Button>
              <Button onClick={clearSelection} variant="outline" size="sm">
                Clear
              </Button>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={unfollowSelected}
              disabled={selectedUsers.size === 0 || isUnfollowing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isUnfollowing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserMinus className="w-4 h-4 mr-2" />
              )}
              Unfollow Selected ({selectedUsers.size})
            </Button>
            
            <Button onClick={exportResults} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exports CSV
            </Button>
          </div>
        </div>

        {/* User List */}
        {job.results && job.results.users.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Users to Review ({job.results.users.length})
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {job.results.users.map((user) => (
                <div key={user.fid} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedUsers.has(user.fid)}
                      onCheckedChange={() => toggleUser(user.fid)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.pfpUrl} />
                          <AvatarFallback>
                            {user.displayName?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {user.displayName}
                          </h3>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        {user.reasons.map((reason, index) => (
                          <span
                            key={index}
                            className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded mr-2 mb-1"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 