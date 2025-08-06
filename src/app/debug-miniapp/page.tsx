'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

export default function DebugMiniappPage() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedResults, setSeedResults] = useState<any>(null)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [seedParams, setSeedParams] = useState({
    limit: '20',
    minDays: '75',
    batchSize: '3',
    delayMs: '2000'
  })

  const handleSeedDatabase = async () => {
    setIsSeeding(true)
    setSeedError(null)
    setSeedResults(null)

    try {
      const params = new URLSearchParams({
        limit: seedParams.limit,
        minDays: seedParams.minDays,
        batchSize: seedParams.batchSize,
        delayMs: seedParams.delayMs
      })

      const response = await fetch(`/api/supabase/seed?${params}`)
      const data = await response.json()

      if (data.success) {
        setSeedResults(data)
        console.log('Seeding results:', data)
      } else {
        setSeedError(data.error || 'Unknown error occurred')
      }
    } catch (error) {
      setSeedError(error instanceof Error ? error.message : 'Failed to seed database')
    } finally {
      setIsSeeding(false)
    }
  }

  const handleTestDatabase = async () => {
    try {
      const response = await fetch('/api/supabase/analyze')
      const data = await response.json()
      console.log('Database test results:', data)
      alert(`Database has ${data.total_inactive || 0} inactive users`)
    } catch (error) {
      console.error('Database test failed:', error)
      alert('Database test failed')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Debug Miniapp</h1>
        <p className="text-gray-600">Test and debug the unfollow miniapp functionality</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Seeding */}
        <Card>
          <CardHeader>
            <CardTitle>Database Seeding</CardTitle>
            <CardDescription>
              Populate the database with inactive users to avoid rate limiting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="limit">Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  value={seedParams.limit}
                  onChange={(e) => setSeedParams(prev => ({ ...prev, limit: e.target.value }))}
                  placeholder="20"
                />
              </div>
              <div>
                <Label htmlFor="minDays">Min Days Inactive</Label>
                <Input
                  id="minDays"
                  type="number"
                  value={seedParams.minDays}
                  onChange={(e) => setSeedParams(prev => ({ ...prev, minDays: e.target.value }))}
                  placeholder="75"
                />
              </div>
              <div>
                <Label htmlFor="batchSize">Batch Size</Label>
                <Input
                  id="batchSize"
                  type="number"
                  value={seedParams.batchSize}
                  onChange={(e) => setSeedParams(prev => ({ ...prev, batchSize: e.target.value }))}
                  placeholder="3"
                />
              </div>
              <div>
                <Label htmlFor="delayMs">Delay (ms)</Label>
                <Input
                  id="delayMs"
                  type="number"
                  value={seedParams.delayMs}
                  onChange={(e) => setSeedParams(prev => ({ ...prev, delayMs: e.target.value }))}
                  placeholder="2000"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSeedDatabase} 
                disabled={isSeeding}
                className="flex-1"
              >
                {isSeeding ? 'Seeding...' : 'Seed Database'}
              </Button>
              <Button 
                onClick={handleTestDatabase} 
                variant="outline"
              >
                Test DB
              </Button>
            </div>

            {isSeeding && (
              <div className="space-y-2">
                <Progress value={50} className="w-full" />
                <p className="text-sm text-gray-600">Processing users...</p>
              </div>
            )}

            {seedError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{seedError}</p>
              </div>
            )}

            {seedResults && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-semibold text-green-800 mb-2">Seeding Results:</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <p>Analyzed: {seedResults.stats.totalAnalyzed}</p>
                  <p>Inactive Found: {seedResults.stats.totalInactive}</p>
                  <p>Seeded: {seedResults.stats.totalSeeded}</p>
                  <p>Database Total: {seedResults.stats.databaseTotal}</p>
                  <p>Avg Score: {seedResults.stats.averageInactiveScore}</p>
                  <p>High Scores (80+): {seedResults.stats.usersWithHighScores}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Test various API endpoints and functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => window.open('/api/debug-env', '_blank')}
              variant="outline"
              className="w-full"
            >
              Test Environment
            </Button>
            
            <Button 
              onClick={() => window.open('/api/neynar/user?fid=2', '_blank')}
              variant="outline"
              className="w-full"
            >
              Test Neynar API
            </Button>
            
            <Button 
              onClick={() => window.open('/api/supabase/analyze', '_blank')}
              variant="outline"
              className="w-full"
            >
              View Database Stats
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results Display */}
      {seedResults?.results && seedResults.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Seeded Users</CardTitle>
            <CardDescription>
              Users that were found and added to the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {seedResults.results.slice(0, 5).map((user: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{user.display_name || user.username}</p>
                    <p className="text-sm text-gray-600">@{user.username} (FID: {user.fid})</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{user.inactive_score}%</p>
                    <p className="text-xs text-gray-500">inactive</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 