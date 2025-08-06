'use client'

import { useState } from 'react'
import { batchProcessInactiveUsers, getCachedInactiveUsers, getInactiveUserStats } from '@/lib/inactive-users'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'

interface InactiveUser {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  last_cast_date: string
  days_since_last_cast: number
  inactive_score: number
  followers_count: number
  following_count: number
  last_updated: string
}

export default function DebugInactivePage() {
  const [fids, setFids] = useState('')
  const [batchSize, setBatchSize] = useState(5)
  const [delayBetweenBatches, setDelayBetweenBatches] = useState(2000)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<InactiveUser[]>([])
  const [stats, setStats] = useState<any>(null)
  const [cachedUsers, setCachedUsers] = useState<InactiveUser[]>([])
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<string[]>([])

  const handleProcessInactiveUsers = async () => {
    if (!fids.trim()) {
      alert('Please enter FIDs')
      return
    }

    const fidsArray = fids.split(',').map(fid => parseInt(fid.trim())).filter(fid => !isNaN(fid))
    
    if (fidsArray.length === 0) {
      alert('Please enter valid FIDs')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResults([])
    setErrors([])

    try {
      console.log(`Starting to process ${fidsArray.length} FIDs...`)
      
      const result = await batchProcessInactiveUsers(
        fidsArray, 
        batchSize, 
        delayBetweenBatches
      )

      setResults(result.results)
      setErrors(result.errors)
      
      console.log(`Processing complete: ${result.inactive_found} inactive users found`)
      
      // Refresh stats and cached users
      await refreshData()
      
    } catch (error) {
      console.error('Error processing inactive users:', error)
      setErrors([`Processing failed: ${error}`])
    } finally {
      setIsProcessing(false)
      setProgress(100)
    }
  }

  const refreshData = async () => {
    try {
      const [statsData, cachedData] = await Promise.all([
        getInactiveUserStats(),
        getCachedInactiveUsers(50, 30)
      ])
      
      setStats(statsData)
      setCachedUsers(cachedData)
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
  }

  const handleRefreshData = () => {
    refreshData()
  }

  const handleLoadSampleFids = async () => {
    try {
      const response = await fetch('/api/test/sample-fids')
      const data = await response.json()
      
      if (data.success) {
        setFids(data.fids.slice(0, 10).join(', ')) // Load first 10 for testing
      }
    } catch (error) {
      console.error('Error loading sample FIDs:', error)
    }
  }

  // Auto-refresh data on component mount
  useState(() => {
    refreshData()
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Inactive Users Debug</h1>
        <p className="text-muted-foreground">
          Test the inactive users detection system with batch processing and rate limiting
        </p>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Configure batch processing parameters to avoid rate limiting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fids">FIDs to Process</Label>
              <Textarea
                id="fids"
                placeholder="Enter FIDs separated by commas (e.g., 194, 3, 4044)"
                value={fids}
                onChange={(e) => setFids(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={handleLoadSampleFids}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Load Sample FIDs
              </Button>
            </div>
            <div>
              <Label htmlFor="batchSize">Batch Size</Label>
              <Input
                id="batchSize"
                type="number"
                min="1"
                max="10"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of FIDs to process per batch (1-10)
              </p>
            </div>
            <div>
              <Label htmlFor="delay">Delay Between Batches (ms)</Label>
              <Input
                id="delay"
                type="number"
                min="1000"
                max="10000"
                step="500"
                value={delayBetweenBatches}
                onChange={(e) => setDelayBetweenBatches(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Delay to avoid rate limiting (1000-10000ms)
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleProcessInactiveUsers}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? 'Processing...' : 'Process Inactive Users'}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Database Statistics</CardTitle>
            <CardDescription>
              Current state of inactive users in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total_inactive}</div>
                <div className="text-sm text-muted-foreground">Total Inactive Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.avg_inactive_score}</div>
                <div className="text-sm text-muted-foreground">Avg Inactive Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.avg_days_inactive}</div>
                <div className="text-sm text-muted-foreground">Avg Days Inactive</div>
              </div>
            </div>
            <Button 
              onClick={handleRefreshData}
              variant="outline"
              className="mt-4"
            >
              Refresh Stats
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
            <CardDescription>
              {results.length} inactive users found in this batch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((user, index) => (
                <div key={user.fid} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <img 
                    src={user.pfp_url || '/default-avatar.png'} 
                    alt={user.username}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">{user.display_name}</div>
                    <div className="text-sm text-muted-foreground">@{user.username}</div>
                    <div className="text-xs text-muted-foreground">
                      Last cast: {new Date(user.last_cast_date).toLocaleDateString()} 
                      ({user.days_since_last_cast} days ago)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">
                      {user.inactive_score.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Inactive Score</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cached Users */}
      {cachedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cached Inactive Users</CardTitle>
            <CardDescription>
              Top {cachedUsers.length} inactive users from database cache
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {cachedUsers.slice(0, 10).map((user) => (
                <div key={user.fid} className="flex items-center space-x-4 p-3 border rounded">
                  <img 
                    src={user.pfp_url || '/default-avatar.png'} 
                    alt={user.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{user.display_name}</div>
                    <div className="text-sm text-muted-foreground">@{user.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.days_since_last_cast} days inactive
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">
                      {user.inactive_score.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 