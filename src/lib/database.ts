// Database models for paid analysis system
// This can be easily replaced with your existing database setup

export interface AnalysisJob {
  id: string
  userId: number // FID
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  paymentId: string
  paymentAmount: number
  paymentCurrency: string
  analysisConfig: {
    filters: {
      nonMutual: boolean
      noInteractionWithYou: boolean
      youNoInteraction: boolean
      nuclear: boolean
    }
    limit: number
    threshold: number
  }
  results?: {
    totalFollowing: number
    totalFollowers: number
    usersToUnfollow: number
    filterCounts: {
      nonMutual: number
      noInteractionWithYou: number
      youNoInteraction: number
      nuclear: number
    }
    users: Array<{
      fid: number
      username: string
      displayName: string
      pfpUrl: string
      reasons: string[]
      shouldUnfollow: boolean
    }>
  }
  error?: string
}

export interface Payment {
  id: string
  userId: number // FID
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  paymentMethod: 'farcaster' | 'stripe' | 'crypto'
  createdAt: Date
  completedAt?: Date
  analysisJobId: string
}

export interface UserNotification {
  id: string
  userId: number // FID
  type: 'analysis_complete' | 'analysis_failed' | 'payment_success' | 'payment_failed'
  title: string
  body: string
  targetUrl?: string
  read: boolean
  createdAt: Date
}

// In-memory storage (replace with your database)
class Database {
  private analysisJobs: Map<string, AnalysisJob> = new Map()
  private payments: Map<string, Payment> = new Map()
  private notifications: Map<string, UserNotification> = new Map()

  // Analysis Jobs
  async createAnalysisJob(job: Omit<AnalysisJob, 'id' | 'createdAt'>): Promise<AnalysisJob> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const analysisJob: AnalysisJob = {
      ...job,
      id,
      createdAt: new Date()
    }
    this.analysisJobs.set(id, analysisJob)
    return analysisJob
  }

  async getAnalysisJob(id: string): Promise<AnalysisJob | null> {
    return this.analysisJobs.get(id) || null
  }

  async updateAnalysisJob(id: string, updates: Partial<AnalysisJob>): Promise<AnalysisJob | null> {
    const job = this.analysisJobs.get(id)
    if (!job) return null

    const updatedJob = { ...job, ...updates }
    this.analysisJobs.set(id, updatedJob)
    return updatedJob
  }

  async getAnalysisJobsByUser(userId: number): Promise<AnalysisJob[]> {
    return Array.from(this.analysisJobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Payments
  async createPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    const id = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newPayment: Payment = {
      ...payment,
      id,
      createdAt: new Date()
    }
    this.payments.set(id, newPayment)
    return newPayment
  }

  async getPayment(id: string): Promise<Payment | null> {
    return this.payments.get(id) || null
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | null> {
    const payment = this.payments.get(id)
    if (!payment) return null

    const updatedPayment = { ...payment, ...updates }
    this.payments.set(id, updatedPayment)
    return updatedPayment
  }

  // Notifications
  async createNotification(notification: Omit<UserNotification, 'id' | 'createdAt'>): Promise<UserNotification> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newNotification: UserNotification = {
      ...notification,
      id,
      createdAt: new Date()
    }
    this.notifications.set(id, newNotification)
    return newNotification
  }

  async getNotificationsByUser(userId: number): Promise<UserNotification[]> {
    return Array.from(this.notifications.values())
      .filter(notif => notif.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async markNotificationAsRead(id: string): Promise<UserNotification | null> {
    const notification = this.notifications.get(id)
    if (!notification) return null

    const updatedNotification = { ...notification, read: true }
    this.notifications.set(id, updatedNotification)
    return updatedNotification
  }

  // Cleanup old data (optional)
  async cleanupOldData(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
    
    // Clean up old analysis jobs
    for (const [id, job] of this.analysisJobs.entries()) {
      if (job.createdAt < cutoffDate) {
        this.analysisJobs.delete(id)
      }
    }

    // Clean up old notifications
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.createdAt < cutoffDate) {
        this.notifications.delete(id)
      }
    }
  }
}

export const db = new Database() 