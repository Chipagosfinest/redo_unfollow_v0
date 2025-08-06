export interface EnvironmentInfo {
  isMiniApp: boolean
  isStandalone: boolean
  hasFarcasterContext: boolean
  hasWalletConnect: boolean
  clientType: 'farcaster' | 'standalone' | 'unknown'
  isWarpcast: boolean
  isFarcasterClient: boolean
}

export function detectEnvironment(): EnvironmentInfo {
  if (typeof window === 'undefined') {
    return {
      isMiniApp: false,
      isStandalone: true,
      hasFarcasterContext: false,
      hasWalletConnect: false,
      clientType: 'unknown',
      isWarpcast: false,
      isFarcasterClient: false
    }
  }

  // Check if we're in a Farcaster mini app environment
  const isInIframe = window.self !== window.top
  const hasFarcasterObject = !!(window as any).farcaster
  const hasFarcasterUser = hasFarcasterObject && !!(window as any).farcaster?.user
  
  // Check if we're in Farcaster client
  const userAgent = window.navigator.userAgent.toLowerCase()
  const isFarcaster = userAgent.includes('farcaster')
  const isWarpcast = userAgent.includes('warpcast') || userAgent.includes('farcaster')
  
  // Check for WalletConnect
  const hasWalletConnect = !!(window as any).WalletConnect

  // More precise detection - only consider it a Mini App if we have actual Farcaster context
  const hasRealFarcasterContext = hasFarcasterUser || (isFarcaster && hasFarcasterObject)
  const isMiniApp = hasRealFarcasterContext && (isInIframe || isFarcaster)
  const isStandalone = !hasRealFarcasterContext && !isInIframe && !isFarcaster

  // Determine client type
  let clientType: 'farcaster' | 'standalone' | 'unknown' = 'unknown'
  if (hasRealFarcasterContext && (isFarcaster || hasFarcasterObject)) {
    clientType = 'farcaster'
  } else if (isStandalone) {
    clientType = 'standalone'
  }

  return {
    isMiniApp,
    isStandalone,
    hasFarcasterContext: hasFarcasterUser,
    hasWalletConnect,
    clientType,
    isWarpcast,
    isFarcasterClient: isFarcaster || hasFarcasterObject
  }
}

export function getFarcasterUser() {
  if (typeof window === 'undefined') return null
  
  const env = detectEnvironment()
  
  if (env.hasFarcasterContext) {
    const farcasterUser = (window as any).farcaster?.user
    return farcasterUser
  }
  
  // Try to get user from different Farcaster client contexts
  if (env.clientType === 'farcaster') {
    // Some clients might expose user data differently
    const possibleUser = (window as any).farcaster?.user || 
                        (window as any).fc?.user
    if (possibleUser) {
      return possibleUser
    }
  }
  
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

export function isWarpcast(): boolean {
  return detectEnvironment().isWarpcast
} 