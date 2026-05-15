/**
 * Structured logging utility for API routes and server-side operations
 * Replaces ad-hoc console.error() calls with consistent logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  endpoint?: string
  userId?: string
  error?: Error | unknown
  [key: string]: any
}

class Logger {
  private isDev = process.env.NODE_ENV !== 'production'

  /**
   * Log with context for better debugging
   */
  private formatLog(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...(context && { context })
    }

    // In development, include more details
    if (this.isDev) {
      console.log(`[${level.toUpperCase()}] ${message}`, context || '')
    } else {
      // In production, log as structured JSON
      console.log(JSON.stringify(logEntry))
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDev) {
      this.formatLog('debug', message, context)
    }
  }

  info(message: string, context?: LogContext): void {
    this.formatLog('info', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.formatLog('warn', message, context)
  }

  error(message: string, context?: LogContext): void {
    const errorContext = {
      ...(context ?? {}),
      ...(context?.error
        ? {
            errorMessage:
              context.error instanceof Error ? context.error.message : String(context.error),
            errorStack: context.error instanceof Error ? context.error.stack : undefined
          }
        : {})
    }
    this.formatLog('error', message, errorContext)
  }

  /**
   * Log API request start
   */
  logApiStart(method: string, path: string, userId?: string): void {
    this.info(`${method} ${path}`, { endpoint: path, userId })
  }

  /**
   * Log API request completion
   */
  logApiSuccess(method: string, path: string, statusCode: number, duration?: number): void {
    this.info(`${method} ${path} - ${statusCode}`, {
      endpoint: path,
      statusCode,
      ...(duration && { durationMs: duration })
    })
  }

  /**
   * Log API request error
   */
  logApiError(
    method: string,
    path: string,
    error: Error | string,
    statusCode: number = 500
  ): void {
    this.error(`${method} ${path} - ${statusCode}`, {
      endpoint: path,
      statusCode,
      error
    })
  }

  /**
   * Log database operation
   */
  logDb(operation: string, table: string, success: boolean, error?: Error | string): void {
    if (success) {
      this.debug(`DB ${operation} on ${table}`, { table, operation })
    } else {
      this.error(`DB ${operation} on ${table} failed`, {
        table,
        operation,
        error
      })
    }
  }

  /**
   * Log external API call (Gemini, etc)
   */
  logExternalApi(service: string, method: string, success: boolean, error?: Error | string): void {
    if (success) {
      this.debug(`${service} ${method} succeeded`, { service })
    } else {
      this.error(`${service} ${method} failed`, {
        service,
        error
      })
    }
  }
}

export const logger = new Logger()
