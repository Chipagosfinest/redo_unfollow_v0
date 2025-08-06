"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  Users, 
  UserMinus, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Calendar,
  Target,
  RefreshCw,
  Download,
  Share2,
  Filter,
  PieChart,
  LineChart
} from "lucide-react"
import { toast } from "sonner"
import { getFarcasterUser, detectEnvironment } from '@/lib/environment'
import { authManager } from '@/lib/auth-context'

interface AnalyticsData {
  totalFollowing: number
  totalFollowers: number
  mutualFollowers: number
  nonMutualFollowers: number
  inactiveUsers: number
  activeUsers: number
  recentlyUnfollowed: number
  engagementRate: number
  averageFollowers: number
  averageFollowing: number
  topReasons: { reason: string; count: number }[]
  activityTrend: { date: string; unfollows: number }[]
  userCategories: { category: string; count: number; percentage: number }[]
}

interface AuthenticatedUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  isAuthenticated: boolean
  authMethod: 'miniapp' | 'web'
}

export default function AnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

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

  const fetchAnalytics = async () => {
    if (!authenticatedUser) {
      toast.error('Please authenticate first')
      return
    }

    try {
      setIsLoading(true)
      toast.info('Loading analytics...')

      const response = await fetch('/api/neynar/analytics/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFid: authenticatedUser.fid,
          timeRange
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalytics(data)
      toast.success('Analytics loaded successfully')
      
    } catch (error) {
      console.error('❌ Analytics failed:', error)
      toast.error('Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics()
    }
  }, [isAuthenticated, timeRange])

  const exportAnalytics = () => {
    if (!analytics) return
    
    const dataStr = JSON.stringify(analytics, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `farcaster-analytics-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    
    toast.success('Analytics exported successfully')
  }

  const shareAnalytics = () => {
    if (!analytics) return
    
    const text = `📊 My Farcaster Analytics:
👥 Following: ${analytics.totalFollowing}
👤 Followers: ${analytics.totalFollowers}
🤝 Mutual: ${analytics.mutualFollowers}
📉 Inactive: ${analytics.inactiveUsers}
📈 Engagement Rate: ${analytics.engagementRate.toFixed(1)}%`
    
    if (navigator.share) {
      navigator.share({
        title: 'My Farcaster Analytics',
        text: text,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Analytics copied to clipboard')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 Farcaster Analytics Dashboard
            </h1>
            <p className="text-gray-600">
              Please authenticate to view your analytics
            </p>
          </div>
          
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-gray-600 mb-4">
                Connect your Farcaster account to view detailed analytics
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

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 Farcaster Analytics Dashboard
            </h1>
            <p className="text-gray-600">
              Loading your analytics...
            </p>
          </div>
          
          <div className="flex justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 Farcaster Analytics Dashboard
            </h1>
            <p className="text-gray-600">
              Detailed insights about your Farcaster network
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportAnalytics}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={shareAnalytics}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button onClick={fetchAnalytics} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Time Range Selector */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Time Range:</span>
              <div className="flex gap-2">
                {(['7d', '30d', '90d'] as const).map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                  >
                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Following</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalFollowing}</div>
              <p className="text-xs text-muted-foreground">
                People you follow
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalFollowers}</div>
              <p className="text-xs text-muted-foreground">
                People following you
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mutual Followers</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.mutualFollowers}</div>
              <p className="text-xs text-muted-foreground">
                {((analytics.mutualFollowers / analytics.totalFollowing) * 100).toFixed(1)}% of following
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.engagementRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Active interactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                User Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.userCategories.map((category) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm font-medium">{category.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{category.count}</span>
                      <Badge variant="secondary">{category.percentage.toFixed(1)}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Reasons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Unfollow Reasons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topReasons.map((reason, index) => (
                  <div key={reason.reason} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <span className="text-sm">{reason.reason}</span>
                    </div>
                    <Badge variant="outline">{reason.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Trend */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Unfollow Activity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.activityTrend.map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{day.date}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((day.unfollows / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{day.unfollows}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.nonMutualFollowers > 50 && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg">
                  <UserMinus className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-800">High Non-Mutual Ratio</h4>
                    <p className="text-sm text-orange-700">
                      {analytics.nonMutualFollowers} users don't follow you back. Consider cleaning up your following list.
                    </p>
                  </div>
                </div>
              )}
              
              {analytics.inactiveUsers > 30 && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Inactive Users Detected</h4>
                    <p className="text-sm text-blue-700">
                      {analytics.inactiveUsers} users haven't been active recently. Consider unfollowing inactive accounts.
                    </p>
                  </div>
                </div>
              )}
              
              {analytics.engagementRate < 50 && (
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">Low Engagement Rate</h4>
                    <p className="text-sm text-green-700">
                      Your engagement rate is {analytics.engagementRate.toFixed(1)}%. Try interacting more with your network.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 