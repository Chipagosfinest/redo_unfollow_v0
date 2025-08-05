export interface EnvironmentInfo {
  isMiniApp: boolean
  isStandalone: boolean
  hasFarcasterContext: boolean
  hasWalletConnect: boolean
}

export function detectEnvironment(): EnvironmentInfo {
  if (typeof window === 'undefined') {
    return {
      isMiniApp: false,
      isStandalone: true,
      hasFarcasterContext: false,
      hasWalletConnect: false
    }
  }

  // Check if we're in a Farcaster mini app environment
  const isInIframe = window.self !== window.top
  const hasFarcasterObject = !!(window as any).farcaster
  const hasFarcasterUser = hasFarcasterObject && !!(window as any).farcaster?.user
  
  // Check if we're in Warpcast or other Farcaster client
  const userAgent = window.navigator.userAgent.toLowerCase()
  const isWarpcast = userAgent.includes('warpcast') || userAgent.includes('farcaster')
  
  // Check for WalletConnect
  const hasWalletConnect = !!(window as any).WalletConnect

  // More precise detection for standalone web
  const isStandalone = !isInIframe && !hasFarcasterObject && !isWarpcast && !hasFarcasterUser
  const isMiniApp = isInIframe || (hasFarcasterObject && hasFarcasterUser) || isWarpcast

  // Debug logging
  console.log('Environment Detection:', {
    isInIframe,
    hasFarcasterObject,
    hasFarcasterUser,
    isWarpcast,
    hasWalletConnect,
    isStandalone,
    isMiniApp,
    userAgent: userAgent.substring(0, 100) // First 100 chars for privacy
  })

  return {
    isMiniApp,
    isStandalone,
    hasFarcasterContext: hasFarcasterUser,
    hasWalletConnect
  }
}

export function getFarcasterUser() {
  if (typeof window === 'undefined') return null
  
  const env = detectEnvironment()
  
  if (env.hasFarcasterContext) {
    return (window as any).farcaster?.user
  }
  
  return null
}

export function isInFarcasterApp(): boolean {
  return detectEnvironment().isMiniApp
}

export function isStandaloneWeb(): boolean {
  return detectEnvironment().isStandalone
} 