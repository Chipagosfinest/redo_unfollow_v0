import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface InactiveUser {
  id: number
  fid: number
  username: string
  display_name: string
  pfp_url: string
  last_cast_date: string
  days_since_last_cast: number
  inactive_score: number
  follows_back_percentage: number
  total_reports: number
  first_reported: string
  last_updated: string
  created_at: string
}

export interface UserReport {
  id: number
  reporter_fid: number
  reported_fid: number
  reason: 'inactive' | 'no_followback' | 'spam' | 'other'
  reported_at: string
}

export interface CleanupAction {
  id: number
  user_fid: number
  target_fid: number
  action: 'unfollowed' | 'kept' | 'ignored'
  reason: string
  performed_at: string
}

// Database functions
export const db = {
  // Get inactive users with high scores
  async getInactiveUsers(limit = 100): Promise<InactiveUser[]> {
    const { data, error } = await supabase
      .from('inactive_users')
      .select('*')
      .gte('inactive_score', 30) // Only users with significant inactivity
      .order('inactive_score', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching inactive users:', error)
      return []
    }
    
    return data || []
  },

  // Get inactive users that a specific user follows
  async getInactiveUsersForUser(userFid: number): Promise<InactiveUser[]> {
    // First get the user's following list from cache or API
    // Then cross-reference with inactive users
    const { data, error } = await supabase
      .from('user_following_cache')
      .select(`
        following_fid,
        inactive_users (*)
      `)
      .eq('user_fid', userFid)
      .eq('still_following', true)
      .gte('inactive_users.inactive_score', 30)
    
    if (error) {
      console.error('Error fetching inactive users for user:', error)
      return []
    }
    
    return data?.map(row => row.inactive_users).filter(Boolean) || []
  },

  // Report a user as inactive
  async reportUser(reporterFid: number, reportedFid: number, reason: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_reports')
      .upsert({
        reporter_fid: reporterFid,
        reported_fid: reportedFid,
        reason: reason as any
      })
    
    if (error) {
      console.error('Error reporting user:', error)
      return false
    }
    
    return true
  },

  // Add or update inactive user
  async upsertInactiveUser(userData: Partial<InactiveUser>): Promise<boolean> {
    const { error } = await supabase
      .from('inactive_users')
      .upsert(userData)
    
    if (error) {
      console.error('Error upserting inactive user:', error)
      return false
    }
    
    return true
  },

  // Record cleanup action
  async recordCleanupAction(userFid: number, targetFid: number, action: string, reason?: string): Promise<boolean> {
    const { error } = await supabase
      .from('cleanup_actions')
      .insert({
        user_fid: userFid,
        target_fid: targetFid,
        action: action as any,
        reason: reason || ''
      })
    
    if (error) {
      console.error('Error recording cleanup action:', error)
      return false
    }
    
    return true
  },

  // Cache user's following data
  async cacheUserFollowing(userFid: number, followingData: Array<{fid: number, followed_at?: string}>): Promise<boolean> {
    const cacheData = followingData.map(follow => ({
      user_fid: userFid,
      following_fid: follow.fid,
      followed_at: follow.followed_at || new Date().toISOString(),
      still_following: true,
      last_checked: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('user_following_cache')
      .upsert(cacheData)
    
    if (error) {
      console.error('Error caching user following:', error)
      return false
    }
    
    return true
  }
} 