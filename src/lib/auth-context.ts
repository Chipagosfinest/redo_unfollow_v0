import { sdk } from '@farcaster/miniapp-sdk'

export interface AuthContext {
  fid: number | null
  username: string | null
  displayName: string | null
  pfpUrl: string | null
  isAuthenticated: boolean
  authMethod: 'miniapp' | 'web' | null
  isMiniApp: boolean
}

export class AuthManager {
  private static instance: AuthManager
  private context: AuthContext = {
    fid: null,
    username: null,
    displayName: null,
    pfpUrl: null,
    isAuthenticated: false,
    authMethod: null,
    isMiniApp: false
  }

  private constructor() {}

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }

  async initialize(): Promise<AuthContext> {
    try {
      // Check if we're in a Mini App environment
      const isMiniApp = await sdk.isInMiniApp()
      
      if (isMiniApp) {
        console.log('Detected Mini App environment')
        return await this.initializeMiniApp()
      } else {
        console.log('Detected regular web environment')
        return await this.initializeWebApp()
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      return this.context
    }
  }

  private async initializeMiniApp(): Promise<AuthContext> {
    try {
      // Get user context from Mini App SDK
      const context = await sdk.context
      
      if (context.user?.fid) {
        this.context = {
          fid: context.user.fid,
          username: context.user.username || `user_${context.user.fid}`,
          displayName: context.user.displayName || `User ${context.user.fid}`,
          pfpUrl: context.user.pfpUrl || '',
          isAuthenticated: true,
          authMethod: 'miniapp',
          isMiniApp: true
        }
        
        console.log('Mini App user authenticated:', this.context)
        return this.context
      } else {
        console.log('No user context available in Mini App')
        this.context.isMiniApp = true
        this.context.authMethod = 'miniapp'
        return this.context
      }
    } catch (error) {
      console.error('Mini App initialization failed:', error)
      this.context.isMiniApp = true
      this.context.authMethod = 'miniapp'
      return this.context
    }
  }

  private async initializeWebApp(): Promise<AuthContext> {
    // For regular web app, we'll need to implement web-based auth
    // This could be Privy, WalletConnect, or other web auth methods
    console.log('Web app auth not implemented yet')
    
    this.context = {
      fid: null,
      username: null,
      displayName: null,
      pfpUrl: null,
      isAuthenticated: false,
      authMethod: 'web',
      isMiniApp: false
    }
    
    return this.context
  }

  getContext(): AuthContext {
    return this.context
  }

  async refreshContext(): Promise<AuthContext> {
    return await this.initialize()
  }

  isAuthenticated(): boolean {
    return this.context.isAuthenticated
  }

  getFid(): number | null {
    return this.context.fid
  }

  getAuthMethod(): 'miniapp' | 'web' | null {
    return this.context.authMethod
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance() 