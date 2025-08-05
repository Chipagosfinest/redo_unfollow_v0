export interface EnvironmentInfo {
  isMiniApp: boolean
  isStandalone: boolean
  hasFarcasterContext: boolean
  hasWalletConnect: boolean
  clientType: 'farcaster' | 'standalone' | 'unknown'
}

export function detectEnvironment(): EnvironmentInfo {
  if (typeof window === 'undefined') {
    return {
      isMiniApp: false,
      isStandalone: true,
      hasFarcasterContext: false,
      hasWalletConnect: false,
      clientType: 'unknown'
    }
  }

  // Check if we're in a Farcaster mini app environment
  const isInIframe = window.self !== window.top
  const hasFarcasterObject = !!(window as any).farcaster
  const hasFarcasterUser = hasFarcasterObject && !!(window as any).farcaster?.user
  
  // Check if we're in Farcaster client
  const userAgent = window.navigator.userAgent.toLowerCase()
  const isFarcaster = userAgent.includes('farcaster')
  
  // Check for WalletConnect
  const hasWalletConnect = !!(window as any).WalletConnect

  // Determine client type
  let clientType: 'farcaster' | 'standalone' | 'unknown' = 'unknown'
  if (isFarcaster || hasFarcasterObject) {
    clientType = 'farcaster'
  } else if (!isInIframe && !hasFarcasterObject) {
    clientType = 'standalone'
  }

  // More precise detection for standalone web
  const isStandalone = !isInIframe && !hasFarcasterObject && !isFarcaster && !hasFarcasterUser
  const isMiniApp = isInIframe || (hasFarcasterObject && hasFarcasterUser) || isFarcaster

  // Debug logging
  console.log('Environment Detection:', {
    isInIframe,
    hasFarcasterObject,
    hasFarcasterUser,
    isFarcaster,
    hasWalletConnect,
    isStandalone,
    isMiniApp,
    clientType,
    userAgent: userAgent.substring(0, 100) // First 100 chars for privacy
  })

  return {
    isMiniApp,
    isStandalone,
    hasFarcasterContext: hasFarcasterUser,
    hasWalletConnect,
    clientType
  }
}

export function getFarcasterUser() {
  if (typeof window === 'undefined') return null
  
  const env = detectEnvironment()
  
  if (env.hasFarcasterContext) {
    const farcasterUser = (window as any).farcaster?.user
    console.log('Farcaster user found:', farcasterUser)
    return farcasterUser
  }
  
  // Try to get user from different Farcaster client contexts
  if (env.clientType === 'farcaster') {
    // Some clients might expose user data differently
    const possibleUser = (window as any).farcaster?.user || 
                        (window as any).fc?.user
    if (possibleUser) {
      console.log('Found user in client context:', possibleUser)
      return possibleUser
    }
  }
  
  console.log('No Farcaster user found')
  return null
}

export function isInFarcasterApp(): boolean {
  return detectEnvironment().isMiniApp
}

export function isStandaloneWeb(): boolean {
  return detectEnvironment().isStandalone
}

export function getClientType(): 'farcaster' | 'standalone' | 'unknown' {
  return detectEnvironment().clientType
} 