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

export default function RandomInactivePage() {
  const [count, setCount] = useState(20)
  const [batchSize, setBatchSize] = useState(5)
  const [delay, setDelay] = useState(2000)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<InactiveUser[]>([])
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState<any>(null)

  const handleRandomSearch = async () => {
    setIsProcessing(true)
    setProgress(0)
    setResults([])

    try {
      console.log(`Starting random search for ${count} FIDs...`)
      
      const response = await fetch('/api/neynar/random-inactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count,
          batchSize,
          delay
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
          success_rate: ((data.inactive_users_found / data.total_fids_processed) * 100).toFixed(1)
        })
        
        console.log(`Found ${data.inactive_users_found} inactive users from ${data.total_fids_processed} random FIDs`)
      }

    } catch (error) {
      console.error('Error in random search:', error)
      alert(`Error: ${error}`)
    } finally {
      setIsProcessing(false)
      setProgress(100)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Random Inactive Users Finder</h1>
        <p className="text-muted-foreground">
          Generate random FIDs and find inactive users automatically
        </p>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Random Search Configuration</CardTitle>
          <CardDescription>
            Configure parameters for random FID generation and processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="count">Number of Random FIDs</Label>
              <Input
                id="count"
                type="number"
                min="5"
                max="100"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How many random FIDs to generate (5-100)
              </p>
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
                Process this many FIDs at once (1-10)
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
                value={delay}
                onChange={(e) => setDelay(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Delay to avoid rate limiting (1000-10000ms)
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleRandomSearch}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? 'Searching Random FIDs...' : '🔍 Find Random Inactive Users'}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generating and processing random FIDs...</span>
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
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              Summary of the random search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {results.length} inactive users found from random FIDs
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
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Pre-configured searches for different scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button 
              onClick={() => {
                setCount(10)
                setBatchSize(3)
                setDelay(1000)
                handleRandomSearch()
              }}
              variant="outline"
              size="sm"
            >
              Quick Test (10 FIDs)
            </Button>
            <Button 
              onClick={() => {
                setCount(50)
                setBatchSize(5)
                setDelay(2000)
                handleRandomSearch()
              }}
              variant="outline"
              size="sm"
            >
              Medium Search (50 FIDs)
            </Button>
            <Button 
              onClick={() => {
                setCount(100)
                setBatchSize(5)
                setDelay(3000)
                handleRandomSearch()
              }}
              variant="outline"
              size="sm"
            >
              Large Search (100 FIDs)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 