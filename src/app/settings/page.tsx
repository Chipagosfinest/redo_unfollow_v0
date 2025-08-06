"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Settings, 
  Bell, 
  Shield, 
  Trash2, 
  BarChart3,
  User,
  Key,
  Globe,
  Moon,
  Sun,
  Palette,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { toast } from "sonner"
import { getFarcasterUser, detectEnvironment } from '@/lib/environment'
import { authManager } from '@/lib/auth-context'

interface Settings {
  notifications: {
    enabled: boolean
    cleanupReminders: boolean
    weeklyReports: boolean
    thresholdAlerts: boolean
  }
  cleanup: {
    autoWhitelistMutuals: boolean
    minInteractionDays: number
    maxUnfollowsPerSession: number
    confirmBeforeUnfollow: boolean
  }
  appearance: {
    theme: 'light' | 'dark' | 'auto'
    compactMode: boolean
    showAdvancedOptions: boolean
  }
  privacy: {
    shareAnalytics: boolean
    allowDataCollection: boolean
    exportDataOnDelete: boolean
  }
}

interface AuthenticatedUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  isAuthenticated: boolean
  authMethod: 'miniapp' | 'web'
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      enabled: true,
      cleanupReminders: true,
      weeklyReports: false,
      thresholdAlerts: true
    },
    cleanup: {
      autoWhitelistMutuals: false,
      minInteractionDays: 60,
      maxUnfollowsPerSession: 50,
      confirmBeforeUnfollow: true
    },
    appearance: {
      theme: 'auto',
      compactMode: false,
      showAdvancedOptions: false
    },
    privacy: {
      shareAnalytics: true,
      allowDataCollection: true,
      exportDataOnDelete: true
    }
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      const env = detectEnvironment()
      
      if (env.isMiniApp) {
        const farcasterUser = getFarcasterUser()
        if (farcasterUser) {
          setAuthenticatedUser({
            fid: farcasterUser.fid,
            username: farcasterUser.username,
            displayName: farcasterUser.displayName,
            pfpUrl: farcasterUser.pfpUrl,
            isAuthenticated: true,
            authMethod: 'miniapp'
          })
          setIsAuthenticated(true)
          return
        }
      }
      
      const context = authManager.getContext()
      if (context.isAuthenticated && context.fid) {
        setAuthenticatedUser({
          fid: context.fid,
          username: context.username || '',
          displayName: context.displayName || '',
          pfpUrl: context.pfpUrl || '',
          isAuthenticated: true,
          authMethod: 'web'
        })
        setIsAuthenticated(true)
      }
    }

    initializeAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings()
    }
  }, [isAuthenticated])

  const loadSettings = async () => {
    if (!authenticatedUser) return

    try {
      setIsLoading(true)
      
      // In a real implementation, you would load settings from a database
      // For now, we'll use the default settings
      console.log('📋 Loading settings...')
      
    } catch (error) {
      console.error('❌ Failed to load settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!authenticatedUser) return

    try {
      setIsSaving(true)
      
      const response = await fetch('/api/neynar/settings/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFid: authenticatedUser.fid,
          settings
        })
      })

      if (response.ok) {
        toast.success('Settings saved successfully')
      } else {
        toast.error('Failed to save settings')
      }
      
    } catch (error) {
      console.error('❌ Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `farcaster-settings-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    
    toast.success('Settings exported successfully')
  }

  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings({
        notifications: {
          enabled: true,
          cleanupReminders: true,
          weeklyReports: false,
          thresholdAlerts: true
        },
        cleanup: {
          autoWhitelistMutuals: false,
          minInteractionDays: 60,
          maxUnfollowsPerSession: 50,
          confirmBeforeUnfollow: true
        },
        appearance: {
          theme: 'auto',
          compactMode: false,
          showAdvancedOptions: false
        },
        privacy: {
          shareAnalytics: true,
          allowDataCollection: true,
          exportDataOnDelete: true
        }
      })
      toast.success('Settings reset to default')
    }
  }

  const updateSetting = (category: keyof Settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ⚙️ Settings & Configuration
            </h1>
            <p className="text-gray-600">
              Please authenticate to access your settings
            </p>
          </div>
          
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-gray-600 mb-4">
                Connect your Farcaster account to manage settings
              </p>
              <Button onClick={() => window.location.href = '/'}>
                Go to Authentication
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ⚙️ Settings & Configuration
            </h1>
            <p className="text-gray-600">
              Customize your Farcaster cleanup experience
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportSettings}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={resetSettings}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={saveSettings} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>

        {/* User Info */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={authenticatedUser?.pfpUrl} />
                <AvatarFallback>
                  {authenticatedUser?.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{authenticatedUser?.displayName}</h3>
                <p className="text-gray-600">@{authenticatedUser?.username}</p>
                <Badge variant="outline" className="mt-1">
                  {authenticatedUser?.authMethod === 'miniapp' ? '📱 Mini App' : '🌐 Web App'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-gray-600">Receive alerts and reminders</p>
                </div>
                <Switch
                  checked={settings.notifications.enabled}
                  onCheckedChange={(checked) => updateSetting('notifications', 'enabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cleanup Reminders</Label>
                  <p className="text-sm text-gray-600">Weekly reminders to clean up</p>
                </div>
                <Switch
                  checked={settings.notifications.cleanupReminders}
                  onCheckedChange={(checked) => updateSetting('notifications', 'cleanupReminders', checked)}
                  disabled={!settings.notifications.enabled}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-gray-600">Analytics summaries</p>
                </div>
                <Switch
                  checked={settings.notifications.weeklyReports}
                  onCheckedChange={(checked) => updateSetting('notifications', 'weeklyReports', checked)}
                  disabled={!settings.notifications.enabled}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Threshold Alerts</Label>
                  <p className="text-sm text-gray-600">When inactive users exceed limit</p>
                </div>
                <Switch
                  checked={settings.notifications.thresholdAlerts}
                  onCheckedChange={(checked) => updateSetting('notifications', 'thresholdAlerts', checked)}
                  disabled={!settings.notifications.enabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cleanup Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Cleanup Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-whitelist Mutuals</Label>
                  <p className="text-sm text-gray-600">Protect mutual followers automatically</p>
                </div>
                <Switch
                  checked={settings.cleanup.autoWhitelistMutuals}
                  onCheckedChange={(checked) => updateSetting('cleanup', 'autoWhitelistMutuals', checked)}
                />
              </div>
              
              <div>
                <Label>Minimum Interaction Days</Label>
                <p className="text-sm text-gray-600 mb-2">Consider users inactive after this many days</p>
                <Input
                  type="number"
                  value={settings.cleanup.minInteractionDays}
                  onChange={(e) => updateSetting('cleanup', 'minInteractionDays', parseInt(e.target.value))}
                  min="1"
                  max="365"
                />
              </div>
              
              <div>
                <Label>Max Unfollows Per Session</Label>
                <p className="text-sm text-gray-600 mb-2">Limit bulk unfollow operations</p>
                <Input
                  type="number"
                  value={settings.cleanup.maxUnfollowsPerSession}
                  onChange={(e) => updateSetting('cleanup', 'maxUnfollowsPerSession', parseInt(e.target.value))}
                  min="1"
                  max="100"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Confirm Before Unfollow</Label>
                  <p className="text-sm text-gray-600">Show confirmation dialog</p>
                </div>
                <Switch
                  checked={settings.cleanup.confirmBeforeUnfollow}
                  onCheckedChange={(checked) => updateSetting('cleanup', 'confirmBeforeUnfollow', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Theme</Label>
                <div className="flex gap-2 mt-2">
                  {(['light', 'dark', 'auto'] as const).map((theme) => (
                    <Button
                      key={theme}
                      variant={settings.appearance.theme === theme ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSetting('appearance', 'theme', theme)}
                    >
                      {theme === 'light' ? <Sun className="h-4 w-4 mr-1" /> : 
                       theme === 'dark' ? <Moon className="h-4 w-4 mr-1" /> : 
                       <Globe className="h-4 w-4 mr-1" />}
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-gray-600">Reduce spacing and padding</p>
                </div>
                <Switch
                  checked={settings.appearance.compactMode}
                  onCheckedChange={(checked) => updateSetting('appearance', 'compactMode', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Advanced Options</Label>
                  <p className="text-sm text-gray-600">Show technical settings</p>
                </div>
                <Switch
                  checked={settings.appearance.showAdvancedOptions}
                  onCheckedChange={(checked) => updateSetting('appearance', 'showAdvancedOptions', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Share Analytics</Label>
                  <p className="text-sm text-gray-600">Help improve the service</p>
                </div>
                <Switch
                  checked={settings.privacy.shareAnalytics}
                  onCheckedChange={(checked) => updateSetting('privacy', 'shareAnalytics', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Data Collection</Label>
                  <p className="text-sm text-gray-600">Store usage patterns</p>
                </div>
                <Switch
                  checked={settings.privacy.allowDataCollection}
                  onCheckedChange={(checked) => updateSetting('privacy', 'allowDataCollection', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Export on Delete</Label>
                  <p className="text-sm text-gray-600">Download data when deleting account</p>
                </div>
                <Switch
                  checked={settings.privacy.exportDataOnDelete}
                  onCheckedChange={(checked) => updateSetting('privacy', 'exportDataOnDelete', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone */}
        <Card className="mt-8 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-red-800">Delete Account Data</h4>
                  <p className="text-sm text-red-600">Permanently remove all your data and settings</p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Data
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-orange-800">Clear All History</h4>
                  <p className="text-sm text-orange-600">Remove cleanup history and analytics</p>
                </div>
                <Button variant="outline" size="sm" className="text-orange-600 border-orange-200">
                  Clear History
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 