"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, CreditCard, CheckCircle, AlertCircle, Clock, Users, DollarSign, Bell, LogIn } from "lucide-react"
import { toast } from "sonner"
import { sdk } from '@farcaster/miniapp-sdk'
import { getFarcasterUser, detectEnvironment } from '@/lib/environment'
import { authManager, AuthContext } from '@/lib/auth-context'

interface AuthenticatedUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  isAuthenticated: boolean
  authMethod: 'miniapp' | 'web'
}

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

interface Notification {
  id: string
  type: 'analysis_complete' | 'payment_success' | 'payment_failed'
  title: string
  body: string
  targetUrl?: string
  read: boolean
  createdAt: string
}

export default function PaidAnalysisPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)
  const [analysisJobs, setAnalysisJobs] = useState<AnalysisJob[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedFilters, setSelectedFilters] = useState({
    nonMutual: true,
    noInteractionWithYou: true,
    youNoInteraction: true,
    nuclear: false
  })
  const [isCreatingJob, setIsCreatingJob] = useState(false)

  // Initialize auth context
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const authContext = await authManager.initialize()
        console.log('Auth context initialized:', authContext)
        
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
          
          // Load user's analysis jobs and notifications
          await loadUserData(authContext.fid)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      }
    }

    initializeAuth()
  }, [])

  const loadUserData = async (fid: number) => {
    try {
      // Load analysis jobs (you'll need to create this endpoint)
      const jobsResponse = await fetch(`/api/analysis/user/${fid}`)
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        setAnalysisJobs(jobsData.jobs || [])
      }

      // Load notifications
      const notificationsResponse = await fetch(`/api/notifications/user/${fid}`)
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json()
        setNotifications(notificationsData.notifications || [])
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  const createPaidAnalysis = async () => {
    if (!authenticatedUser) {
      toast.error('Please authenticate first')
      return
    }

    setIsCreatingJob(true)
    
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: authenticatedUser.fid,
          analysisConfig: {
            filters: selectedFilters,
            limit: 1000,
            threshold: 60
          },
          paymentMethod: 'farcaster',
          amount: 5.00,
          currency: 'USD'
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Analysis job created! You will be notified when it\'s ready.')
        
        // Reload user data to show the new job
        await loadUserData(authenticatedUser.fid)
      } else {
        toast.error(data.error || 'Failed to create analysis job')
      }
    } catch (error) {
      console.error('Failed to create analysis job:', error)
      toast.error('Failed to create analysis job')
    } finally {
      setIsCreatingJob(false)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    if (!authenticatedUser) return

    try {
      await fetch(`/api/notifications/user/${authenticatedUser.fid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId })
      })

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getJobStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'processing':
        return 'Processing'
      case 'failed':
        return 'Failed'
      default:
        return 'Pending'
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 mt-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              🔒 Authentication Required
            </h1>
            <p className="text-gray-600 mb-6">
              Please authenticate to access paid analysis features.
            </p>
            <Button 
              onClick={() => authManager.refreshContext()}
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Authenticate
            </Button>
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
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={authenticatedUser?.pfpUrl} />
              <AvatarFallback>
                {authenticatedUser?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {authenticatedUser?.displayName}
              </h1>
              <p className="text-gray-600">@{authenticatedUser?.username}</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications ({notifications.filter(n => !n.read).length} unread)
            </h2>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.read 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.body}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create New Analysis */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Create Paid Analysis
          </h2>
          
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Analysis Filters:</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedFilters.nonMutual}
                  onCheckedChange={(checked) => 
                    setSelectedFilters(prev => ({ ...prev, nonMutual: !!checked }))
                  }
                />
                <span className="text-sm">Non-mutual follows</span>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedFilters.noInteractionWithYou}
                  onCheckedChange={(checked) => 
                    setSelectedFilters(prev => ({ ...prev, noInteractionWithYou: !!checked }))
                  }
                />
                <span className="text-sm">No recent interactions</span>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedFilters.youNoInteraction}
                  onCheckedChange={(checked) => 
                    setSelectedFilters(prev => ({ ...prev, youNoInteraction: !!checked }))
                  }
                />
                <span className="text-sm">You haven't interacted</span>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedFilters.nuclear}
                  onCheckedChange={(checked) => 
                    setSelectedFilters(prev => ({ ...prev, nuclear: !!checked }))
                  }
                />
                <span className="text-sm text-red-600">Nuclear option (unfollow all)</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">Premium Analysis</h3>
                <p className="text-sm text-blue-700">
                  Get a comprehensive analysis of your entire following list
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-900">$5.00</div>
                <div className="text-sm text-blue-700">One-time payment</div>
              </div>
            </div>
          </div>

          <Button
            onClick={createPaidAnalysis}
            disabled={isCreatingJob}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isCreatingJob ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <DollarSign className="w-4 h-4 mr-2" />
            )}
            {isCreatingJob ? 'Creating Analysis...' : 'Start Paid Analysis ($5.00)'}
          </Button>
        </div>

        {/* Analysis Jobs History */}
        {analysisJobs.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Analysis History
            </h2>
            <div className="space-y-4">
              {analysisJobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getJobStatusIcon(job.status)}
                      <span className="font-medium">
                        {getJobStatusText(job.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    <div>Payment: ${job.paymentAmount} {job.paymentCurrency}</div>
                    {job.results && (
                      <div>
                        Found {job.results.usersToUnfollow} accounts to review
                      </div>
                    )}
                  </div>

                  {job.status === 'completed' && job.results && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Navigate to results page
                        window.location.href = `/analysis-results/${job.id}`
                      }}
                    >
                      View Results
                    </Button>
                  )}

                  {job.status === 'failed' && job.error && (
                    <div className="text-sm text-red-600">
                      Error: {job.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 