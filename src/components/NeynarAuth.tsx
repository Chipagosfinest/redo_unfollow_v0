"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, User, Shield, CheckCircle, ExternalLink } from 'lucide-react'
import { detectEnvironment, getFarcasterUser } from '@/lib/environment'

interface NeynarUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  signerUuid?: string
  isAuthenticated: boolean
}

interface NeynarAuthProps {
  onUserAuthenticated: (user: NeynarUser) => void
  onUserDisconnected: () => void
}

export function NeynarAuth({ onUserAuthenticated, onUserDisconnected }: NeynarAuthProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<NeynarUser | null>(null)
  const [signerStatus, setSignerStatus] = useState<'none' | 'creating' | 'pending' | 'approved'>('none')
  const [environment, setEnvironment] = useState(detectEnvironment())

  useEffect(() => {
    // Check environment on mount
    setEnvironment(detectEnvironment())
    
    // Try to get existing Farcaster user if in mini app
    if (environment.hasFarcasterContext) {
      const farcasterUser = getFarcasterUser()
      if (farcasterUser) {
        handleFarcasterUser(farcasterUser)
      }
    }
  }, [])

  const handleFarcasterUser = (farcasterUser: any) => {
    const neynarUser: NeynarUser = {
      fid: farcasterUser.fid,
      username: farcasterUser.username,
      displayName: farcasterUser.displayName,
      pfpUrl: farcasterUser.pfp?.url || '',
      isAuthenticated: true
    }
    
    setUser(neynarUser)
    onUserAuthenticated(neynarUser)
    toast.success('Connected via Farcaster!')
  }

  const createSigner = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/signer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to create signer')
      }

      const data = await response.json()
      setSignerStatus('creating')
      
      // Poll for signer status
      await pollSignerStatus(data.signer_uuid)
      
    } catch (error) {
      console.error('Signer creation error:', error)
      toast.error('Failed to create signer')
    } finally {
      setIsLoading(false)
    }
  }

  const pollSignerStatus = async (signerUuid: string) => {
    const maxAttempts = 30 // 30 seconds
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/auth/signer?signer_uuid=${signerUuid}`)
        const data = await response.json()

        if (data.status === 'approved') {
          setSignerStatus('approved')
          toast.success('Signer approved!')
          
          // Get user data
          await fetchUserData(signerUuid)
          return
        } else if (data.status === 'pending') {
          setSignerStatus('pending')
          attempts++
          
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000)
          } else {
            toast.error('Signer approval timeout')
            setSignerStatus('none')
          }
        }
      } catch (error) {
        console.error('Polling error:', error)
        toast.error('Failed to check signer status')
        setSignerStatus('none')
      }
    }

    await poll()
  }

  const fetchUserData = async (signerUuid: string) => {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signerUuid }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }

      const userData = await response.json()
      const neynarUser: NeynarUser = {
        fid: userData.fid,
        username: userData.username,
        displayName: userData.display_name,
        pfpUrl: userData.pfp_url,
        signerUuid,
        isAuthenticated: true
      }

      setUser(neynarUser)
      onUserAuthenticated(neynarUser)
      toast.success('Successfully authenticated!')
      
    } catch (error) {
      console.error('User data fetch error:', error)
      toast.error('Failed to fetch user data')
    }
  }

  const disconnect = () => {
    setUser(null)
    setSignerStatus('none')
    onUserDisconnected()
    toast.info('Disconnected')
  }

  const openInFarcaster = () => {
    // Open in Warpcast or other Farcaster client
    const url = window.location.href
    window.open(`https://warpcast.com/~/compose?text=Check%20out%20this%20Feed%20Cleaner%20app:%20${encodeURIComponent(url)}`, '_blank')
  }

  if (user) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <User className="w-5 h-5 mr-2" />
            Connected User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3 mb-4">
            <img
              src={user.pfpUrl || '/default-avatar.png'}
              alt={user.displayName}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold text-white">{user.displayName}</h3>
              <p className="text-sm text-purple-200">@{user.username}</p>
              <Badge variant="default" className="mt-1">
                FID: {user.fid}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">
              {user.signerUuid ? 'Signer Approved' : 'Connected via Farcaster'}
            </span>
          </div>
          
          <Button
            onClick={disconnect}
            variant="outline"
            className="w-full"
          >
            Disconnect
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          {environment.isMiniApp ? 'Farcaster Mini App' : 'Connect with Neynar'}
        </CardTitle>
        <CardDescription className="text-purple-200">
          {environment.isMiniApp 
            ? 'You\'re in a Farcaster app. Connect your wallet to continue.'
            : 'Create a signer to interact with Farcaster'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {environment.isMiniApp ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-purple-200 mb-4">
                This app works best in Warpcast or other Farcaster clients
              </p>
              <Button
                onClick={openInFarcaster}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Farcaster App
              </Button>
            </div>
          </div>
        ) : (
          <>
            {signerStatus === 'none' && (
              <Button
                onClick={createSigner}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Signer...
                  </>
                ) : (
                  'Create Signer'
                )}
              </Button>
            )}

            {signerStatus === 'creating' && (
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-white" />
                <p className="text-sm text-purple-200">Creating signer...</p>
              </div>
            )}

            {signerStatus === 'pending' && (
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-2">
                  <div className="animate-pulse bg-yellow-400 rounded-full w-8 h-8"></div>
                </div>
                <p className="text-sm text-yellow-400 mb-2">Waiting for approval...</p>
                <p className="text-xs text-purple-200">
                  Please approve the signer in your Farcaster client
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 