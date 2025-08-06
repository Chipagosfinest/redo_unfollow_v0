// Production-ready logging utility
interface LogContext {
  userId?: number
  action?: string
  duration?: number
  error?: Error
  metadata?: Record<string, any>
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production'

  info(message: string, context?: LogContext) {
    const logEntry = {
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...context
    }
    
    if (this.isProduction) {
      console.log(JSON.stringify(logEntry))
    } else {
      console.log(`ℹ️  ${message}`, context || '')
    }
  }

  warn(message: string, context?: LogContext) {
    const logEntry = {
      level: 'warn',
      timestamp: new Date().toISOString(),
      message,
      ...context
    }
    
    if (this.isProduction) {
      console.warn(JSON.stringify(logEntry))
    } else {
      console.warn(`⚠️  ${message}`, context || '')
    }
  }

  error(message: string, context?: LogContext) {
    const logEntry = {
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: context?.error?.message || context?.error,
      stack: context?.error?.stack,
      ...context
    }
    
    if (this.isProduction) {
      console.error(JSON.stringify(logEntry))
    } else {
      console.error(`❌ ${message}`, context || '')
    }
  }

  success(message: string, context?: LogContext) {
    const logEntry = {
      level: 'success',
      timestamp: new Date().toISOString(),
      message,
      ...context
    }
    
    if (this.isProduction) {
      console.log(JSON.stringify(logEntry))
    } else {
      console.log(`✅ ${message}`, context || '')
    }
  }

  // Performance tracking
  time(label: string) {
    if (this.isProduction) {
      console.time(label)
    } else {
      console.time(`⏱️  ${label}`)
    }
  }

  timeEnd(label: string) {
    if (this.isProduction) {
      console.timeEnd(label)
    } else {
      console.timeEnd(`⏱️  ${label}`)
    }
  }

  // API request logging
  apiRequest(method: string, url: string, userId?: number) {
    this.info(`API Request: ${method} ${url}`, { 
      action: 'api_request',
      userId,
      metadata: { method, url }
    })
  }

  apiResponse(status: number, url: string, duration: number, userId?: number) {
    const level = status >= 400 ? 'error' : 'info'
    const message = `API Response: ${status} ${url} (${duration}ms)`
    
    if (level === 'error') {
      this.error(message, { 
        action: 'api_response',
        userId,
        metadata: { status, url, duration }
      })
    } else {
      this.info(message, { 
        action: 'api_response',
        userId,
        metadata: { status, url, duration }
      })
    }
  }

  // User action logging
  userAction(action: string, userId: number, metadata?: Record<string, any>) {
    this.info(`User Action: ${action}`, {
      action,
      userId,
      metadata
    })
  }

  // Error tracking with context
  trackError(error: Error, context?: LogContext) {
    this.error(error.message, {
      ...context,
      error,
      action: 'error_tracked'
    })
  }
}

export const logger = new Logger() 