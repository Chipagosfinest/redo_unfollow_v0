'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface Relationship {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  is_mutual_follow: boolean
  days_since_interaction: number
  should_unfollow: boolean
  reason: string
}

interface FilterState {
  nonMutual: boolean
  noInteractionWithYou: boolean
  youNoInteraction: boolean
  nuclear: boolean
}

export default function SimpleUnfollowPage() {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [selectedFids, setSelectedFids] = useState<Set<number>>(new Set())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUnfollowing, setIsUnfollowing] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    nonMutual: true,
    noInteractionWithYou: true,
    youNoInteraction: true,
    nuclear: false
  })

  const analyzeRelationships = async () => {
    setIsAnalyzing(true)
    toast.info('Analyzing your relationships...')

    try {
      const userFid = 4044 // Demo user
      
      const response = await fetch('/api/simple/analyze-relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userFid })
      })

      if (response.ok) {
        const data = await response.json()
        setRelationships(data.relationships || [])
        toast.success(`Found ${data.relationships?.length || 0} relationships to review`)
      } else {
        toast.error('Analysis failed')
      }
    } catch (error) {
      toast.error('Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleToggle = (fid: number) => {
    const newSelected = new Set(selectedFids)
    if (newSelected.has(fid)) {
      newSelected.delete(fid)
    } else {
      newSelected.add(fid)
    }
    setSelectedFids(newSelected)
  }

  const handleFilterToggle = (filter: keyof FilterState) => {
    setFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }))
  }

  const selectAll = () => {
    const filteredRelationships = getFilteredRelationships()
    setSelectedFids(new Set(filteredRelationships.map(r => r.fid)))
  }

  const clearSelection = () => {
    setSelectedFids(new Set())
  }

  const getFilteredRelationships = () => {
    return relationships.filter(rel => {
      if (filters.nuclear) return true
      if (filters.nonMutual && !rel.is_mutual_follow) return true
      if (filters.noInteractionWithYou && rel.days_since_interaction >= 60) return true
      if (filters.youNoInteraction && rel.days_since_interaction >= 60) return true
      return false
    })
  }

  const getFilterCounts = () => {
    const nonMutualCount = relationships.filter(r => !r.is_mutual_follow).length
    const noInteractionCount = relationships.filter(r => r.days_since_interaction >= 60).length
    const totalCount = relationships.length

    return {
      nonMutual: nonMutualCount,
      noInteractionWithYou: noInteractionCount,
      youNoInteraction: noInteractionCount,
      nuclear: totalCount
    }
  }

  const unfollowSelected = async () => {
    if (selectedFids.size === 0) {
      toast.error('No users selected')
      return
    }

    const confirmed = confirm(`Unfollow ${selectedFids.size} selected users?`)
    if (!confirmed) return

    setIsUnfollowing(true)
    toast.info(`Unfollowing ${selectedFids.size} users...`)

    try {
      const response = await fetch('/api/simple/unfollow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fids: Array.from(selectedFids)
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Unfollowed ${data.unfollowed_count} users`)
        setSelectedFids(new Set())
        await analyzeRelationships()
      } else {
        toast.error('Unfollow failed')
      }
    } catch (error) {
      toast.error('Unfollow failed')
    } finally {
      setIsUnfollowing(false)
    }
  }

  const getReason = (rel: Relationship) => {
    if (!rel.is_mutual_follow) return 'No mutual follow'
    if (rel.days_since_interaction >= 60) return '60+ days no interaction'
    return 'Low engagement'
  }

  const counts = getFilterCounts()
  const filteredRelationships = getFilteredRelationships()

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🧹 Farcaster Cleanup</h1>
        <p className="text-gray-600 mb-4">
          Clean up your Farcaster following list by identifying and bulk unfollowing inactive or non-engaging accounts.
        </p>
        
        <div className="flex gap-4 mb-6">
          <Button 
            onClick={analyzeRelationships} 
            disabled={isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Following List'}
          </Button>
          
          <Button 
            onClick={analyzeRelationships}
            variant="outline"
            disabled={isAnalyzing}
          >
            Refresh
          </Button>
        </div>
      </div>

      {relationships.length > 0 && (
        <>
          {/* Filter Toggles */}
          <Card className="mb-6">
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3">Filters:</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.nonMutual}
                    onCheckedChange={() => handleFilterToggle('nonMutual')}
                  />
                  <span>Non-mutual follows ({counts.nonMutual} users)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.noInteractionWithYou}
                    onCheckedChange={() => handleFilterToggle('noInteractionWithYou')}
                  />
                  <span>Haven't interacted with you ({counts.noInteractionWithYou} users)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.youNoInteraction}
                    onCheckedChange={() => handleFilterToggle('youNoInteraction')}
                  />
                  <span>You haven't interacted with ({counts.youNoInteraction} users)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.nuclear}
                    onCheckedChange={() => handleFilterToggle('nuclear')}
                  />
                  <span>Nuclear option ({counts.nuclear} users total)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selection Management */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              <Button onClick={selectAll} variant="outline" size="sm">
                Select All
              </Button>
              <Button onClick={clearSelection} variant="outline" size="sm">
                Clear
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              {selectedFids.size} selected
            </div>
          </div>

          {/* User List */}
          <div className="space-y-3 mb-6">
            {filteredRelationships.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <p>No users match the current filters.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredRelationships.map((relationship) => (
                <Card key={relationship.fid} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Checkbox
                          checked={selectedFids.has(relationship.fid)}
                          onCheckedChange={() => handleToggle(relationship.fid)}
                        />
                        
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={relationship.pfp_url} />
                          <AvatarFallback>{relationship.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold">@{relationship.username}</h3>
                            {relationship.display_name && (
                              <span className="text-gray-600">({relationship.display_name})</span>
                            )}
                            <Badge variant={relationship.is_mutual_follow ? "default" : "secondary"}>
                              {relationship.is_mutual_follow ? 'Mutual' : 'Non-Mutual'}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            <div>Days since interaction: {relationship.days_since_interaction}</div>
                            <div className="text-red-600 font-medium">
                              {getReason(relationship)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggle(relationship.fid)}
                      >
                        Unfollow
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Bulk Actions */}
          {selectedFids.size > 0 && (
            <div className="flex justify-center">
              <Button 
                onClick={unfollowSelected}
                disabled={isUnfollowing}
                variant="destructive"
                size="lg"
              >
                {isUnfollowing ? 'Unfollowing...' : `Unfollow Selected (${selectedFids.size})`}
              </Button>
            </div>
          )}
        </>
      )}

      {relationships.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <p>No relationships to review.</p>
              <p className="text-sm mt-2">Click "Analyze Following List" to start.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 