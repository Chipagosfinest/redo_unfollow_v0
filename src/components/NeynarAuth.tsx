"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, User, Shield, CheckCircle, ExternalLink, Copy, Smartphone, Monitor } from 'lucide-react'
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
  const [approvalUrl, setApprovalUrl] = useState<string>('')
  const [signerUuid, setSignerUuid] = useState<string>('')
  const [isCheckingFarcaster, setIsCheckingFarcaster] = useState(true)

  useEffect(() => {
    // Check environment on mount
    const env = detectEnvironment()
    setEnvironment(env)
    console.log('NeynarAuth mounted with environment:', env)
    
    // Try to get existing Farcaster user if in mini app
    if (env.hasFarcasterContext) {
      const farcasterUser = getFarcasterUser()
      if (farcasterUser) {
        console.log('Found Farcaster user:', farcasterUser)
        handleFarcasterUser(farcasterUser)
      } else {
        console.log('No Farcaster user found in context')
        setIsCheckingFarcaster(false)
      }
    } else {
      setIsCheckingFarcaster(false)
    }
  }, [])

  // Additional check for Farcaster context after a delay
  useEffect(() => {
    if (!isCheckingFarcaster && !user) {
      const timer = setTimeout(() => {
        const env = detectEnvironment()
        console.log('Delayed environment check:', env)
        
        if (env.hasFarcasterContext) {
          const farcasterUser = getFarcasterUser()
          if (farcasterUser) {
            console.log('Found Farcaster user on delayed check:', farcasterUser)
            handleFarcasterUser(farcasterUser)
          }
        }
      }, 1000) // Check again after 1 second

      return () => clearTimeout(timer)
    }
  }, [isCheckingFarcaster, user])

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
    console.log('Creating signer...')
    setIsLoading(true)
    setSignerStatus('creating')
    
    try {
      const response = await fetch('/api/auth/signer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('Signer creation response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Signer creation failed:', errorData)
        throw new Error(errorData.error || 'Failed to create signer')
      }

      const data = await response.json()
      console.log('Signer created:', data)
      
      setSignerUuid(data.signer_uuid)
      setApprovalUrl(data.signer_approval_url)
      setSignerStatus('pending')
      
      // Poll for signer status
      await pollSignerStatus(data.signer_uuid)
      
    } catch (error) {
      console.error('Signer creation error:', error)
      toast.error(`Failed to create signer: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setSignerStatus('none')
    } finally {
      setIsLoading(false)
    }
  }

  const pollSignerStatus = async (uuid: string) => {
    console.log('Starting to poll signer status:', uuid)
    const maxAttempts = 60 // 60 seconds for more time
    let attempts = 0

    const poll = async () => {
      try {
        console.log(`Polling signer status (attempt ${attempts + 1}/${maxAttempts})`)
        const response = await fetch(`/api/auth/signer?signer_uuid=${uuid}`)
        const data = await response.json()

        console.log('Signer status response:', data)

        if (data.status === 'approved') {
          setSignerStatus('approved')
          toast.success('Signer approved!')
          
          // Get user data
          await fetchUserData(uuid)
          return
        } else if (data.status === 'pending' || data.status === 'generated') {
          setSignerStatus('pending')
          attempts++
          
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000)
          } else {
            toast.error('Signer approval timeout - please try again')
            setSignerStatus('none')
          }
        } else {
          console.log('Unknown signer status:', data.status)
          attempts++
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000)
          } else {
            toast.error('Signer status unknown - please try again')
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

  const fetchUserData = async (uuid: string) => {
    try {
      console.log('Fetching user data for signer:', uuid)
      const response = await fetch('/api/auth/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signerUuid: uuid }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('User data fetch failed:', errorData)
        throw new Error(errorData.error || 'Failed to fetch user data')
      }

      const userData = await response.json()
      console.log('User data received:', userData)
      
      const neynarUser: NeynarUser = {
        fid: userData.fid,
        username: userData.username,
        displayName: userData.display_name,
        pfpUrl: userData.pfp_url,
        signerUuid: uuid,
        isAuthenticated: true
      }

      setUser(neynarUser)
      onUserAuthenticated(neynarUser)
      toast.success('Successfully authenticated!')
      
    } catch (error) {
      console.error('User data fetch error:', error)
      toast.error(`Failed to fetch user data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const disconnect = () => {
    setUser(null)
    setSignerStatus('none')
    setApprovalUrl('')
    setSignerUuid('')
    onUserDisconnected()
    toast.info('Disconnected')
  }

  const openInFarcaster = () => {
    // Open in Warpcast or other Farcaster client
    const url = window.location.href
    window.open(`https://warpcast.com/~/compose?text=Check%20out%20this%20Feed%20Cleaner%20app:%20${encodeURIComponent(url)}`, '_blank')
  }

  const copyApprovalUrl = async () => {
    try {
      await navigator.clipboard.writeText(approvalUrl)
      toast.success('Approval URL copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy URL:', error)
      toast.error('Failed to copy URL')
    }
  }

  const openApprovalUrl = () => {
    window.open(approvalUrl, '_blank')
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

  // Show loading while checking for Farcaster context
  if (isCheckingFarcaster) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Smartphone className="w-5 h-5 mr-2" />
            Checking Farcaster App
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
            <p className="text-sm text-purple-200">Detecting Farcaster environment...</p>
          </div>
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
              <Smartphone className="w-12 h-12 mx-auto mb-4 text-purple-400" />
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
              <div className="space-y-4">
                <div className="text-center">
                  <Monitor className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                  <p className="text-sm text-purple-200 mb-4">
                    Connect to Farcaster to analyze your feed
                  </p>
                </div>
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
              </div>
            )}

            {signerStatus === 'creating' && (
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-white" />
                <p className="text-sm text-purple-200">Creating signer...</p>
              </div>
            )}

            {signerStatus === 'pending' && approvalUrl && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-2">
                    <div className="animate-pulse bg-yellow-400 rounded-full w-8 h-8"></div>
                  </div>
                  <p className="text-sm text-yellow-400 mb-2">Waiting for approval...</p>
                  <p className="text-xs text-purple-200 mb-4">
                    Please approve the signer using the link below
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Button
                    onClick={openApprovalUrl}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Approval Link
                  </Button>
                  
                  <Button
                    onClick={copyApprovalUrl}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Approval URL
                  </Button>
                </div>
                
                <div className="text-xs text-purple-200 bg-white/5 p-2 rounded">
                  <p className="font-semibold mb-1">Signer UUID:</p>
                  <code className="text-xs break-all">{signerUuid}</code>
                </div>
                
                <Button
                  onClick={() => setSignerStatus('none')}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 