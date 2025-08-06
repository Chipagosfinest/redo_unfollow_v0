'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
}

export default function AggressiveInactivePage() {
  const [count, setCount] = useState(100)
  const [minFollowers, setMinFollowers] = useState(10)
  const [maxFollowers, setMaxFollowers] = useState(50)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<InactiveUser[]>([])
  const [stats, setStats] = useState<any>(null)
  const [progress, setProgress] = useState(0)

  const handleAggressiveSearch = async () => {
    setIsProcessing(true)
    setProgress(0)
    setResults([])

    try {
      console.log(`🚀 Starting AGGRESSIVE search for ${count} FIDs...`)
      
      const response = await fetch('/api/neynar/aggressive-inactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count,
          minFollowers,
          maxFollowers
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setResults(data.results)
        setStats({
          total_processed: data.total_fids_processed,
          inactive_found: data.inactive_users_found,
          success_rate: data.success_rate,
          rate_limit_info: data.rate_limit_info
        })
        
        console.log(`🎯 AGGRESSIVE SEARCH COMPLETE: Found ${data.inactive_users_found} inactive users`)
      }

    } catch (error) {
      console.error('Error in aggressive search:', error)
      alert(`Error: ${error}`)
    } finally {
      setIsProcessing(false)
      setProgress(100)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🚀 Aggressive Inactive Users Finder</h1>
        <p className="text-muted-foreground">
          Maximum throughput - pushing rate limits to the edge
        </p>
      </div>

      {/* Rate Limit Info */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800">⚡ Rate Limit Configuration</CardTitle>
          <CardDescription>
            Optimized for maximum throughput without hitting limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">8 RPS</div>
              <div className="text-sm text-muted-foreground">Requests per second</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">8 FIDs</div>
              <div className="text-sm text-muted-foreground">Per batch</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">125ms</div>
              <div className="text-sm text-muted-foreground">Delay between batches</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Aggressive Search Configuration</CardTitle>
          <CardDescription>
            Configure parameters for maximum throughput processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="count">Number of Random FIDs</Label>
              <Input
                id="count"
                type="number"
                min="50"
                max="500"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How many random FIDs to generate (50-500)
              </p>
            </div>
            <div>
              <Label htmlFor="minFollowers">Min Followers</Label>
              <Input
                id="minFollowers"
                type="number"
                min="1"
                max="100"
                value={minFollowers}
                onChange={(e) => setMinFollowers(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum follower count (1-100)
              </p>
            </div>
            <div>
              <Label htmlFor="maxFollowers">Max Followers</Label>
              <Input
                id="maxFollowers"
                type="number"
                min="10"
                max="1000"
                value={maxFollowers}
                onChange={(e) => setMaxFollowers(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum follower count (10-1000)
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleAggressiveSearch}
            disabled={isProcessing}
            className="w-full bg-orange-600 hover:bg-orange-700"
            size="lg"
          >
            {isProcessing ? '🔥 Processing Aggressively...' : '🚀 AGGRESSIVE SEARCH'}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>🔥 Processing at maximum speed...</span>
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
            <CardTitle>Aggressive Search Results</CardTitle>
            <CardDescription>
              Performance metrics from the aggressive search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total_processed}</div>
                <div className="text-sm text-muted-foreground">FIDs Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.inactive_found}</div>
                <div className="text-sm text-muted-foreground">Inactive Users Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.success_rate}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.rate_limit_info?.requests_per_second || 8}</div>
                <div className="text-sm text-muted-foreground">RPS Achieved</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Found Inactive Users</CardTitle>
            <CardDescription>
              {results.length} inactive users found with aggressive processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
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
                    <div className="text-xs text-muted-foreground">
                      {user.followers_count} followers • {user.following_count} following
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Aggressive Actions</CardTitle>
          <CardDescription>
            Pre-configured aggressive searches for different scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button 
              onClick={() => {
                setCount(100)
                setMinFollowers(10)
                setMaxFollowers(50)
                handleAggressiveSearch()
              }}
              variant="outline"
              size="sm"
              className="border-orange-200"
            >
              🔥 Quick Aggressive (100 FIDs)
            </Button>
            <Button 
              onClick={() => {
                setCount(250)
                setMinFollowers(15)
                setMaxFollowers(75)
                handleAggressiveSearch()
              }}
              variant="outline"
              size="sm"
              className="border-orange-200"
            >
              ⚡ Medium Aggressive (250 FIDs)
            </Button>
            <Button 
              onClick={() => {
                setCount(500)
                setMinFollowers(20)
                setMaxFollowers(100)
                handleAggressiveSearch()
              }}
              variant="outline"
              size="sm"
              className="border-orange-200"
            >
              🚀 Maximum Aggressive (500 FIDs)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 