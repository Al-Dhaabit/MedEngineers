// Production-ready logging with structured logs and error sanitization

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  requestId?: string;
  userId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isProduction: boolean;
  private requestId: string;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.requestId = this.generateRequestId();
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private sanitizeError(error: any): { name: string; message: string; stack?: string } {
    if (!error) {
      return { name: 'Unknown', message: 'Unknown error occurred' };
    }

    // Handle Error objects
    if (error instanceof Error) {
      return {
        name: error.name || 'Error',
        message: this.isProduction ? this.sanitizeMessage(error.message) : error.message,
        stack: this.isProduction ? undefined : error.stack
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        name: 'StringError',
        message: this.isProduction ? this.sanitizeMessage(error) : error
      };
    }

    // Handle object errors
    if (typeof error === 'object') {
      return {
        name: error.constructor?.name || 'ObjectError',
        message: this.isProduction ? this.sanitizeMessage(JSON.stringify(error)) : JSON.stringify(error)
      };
    }

    return {
      name: 'Unknown',
      message: this.isProduction ? 'An error occurred' : String(error)
    };
  }

  private sanitizeMessage(message: string): string {
    if (!message) return 'Unknown error';
    
    // Remove potential sensitive information
    return message
      .replace(/password[=:][\s\S]+/gi, 'password=[REDACTED]')
      .replace(/token[=:][\s\S]+/gi, 'token=[REDACTED]')
      .replace(/key[=:][\s\S]+/gi, 'key=[REDACTED]')
      .replace(/secret[=:][\s\S]+/gi, 'secret=[REDACTED]')
      .replace(/authorization[=:][\s\S]+/gi, 'authorization=[REDACTED]')
      .replace(/bearer\s+\S+/gi, 'bearer=[REDACTED]')
      // Remove file paths and stack traces in production
      .replace(/\/[^\s]+/g, '[PATH]')
      .replace(/at\s+.*\(.*\)/g, '[CALL_SITE]')
      .replace(/\n\s+/g, ' ');
  }

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>, error?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.isProduction ? this.sanitizeMessage(message) : message,
      requestId: this.requestId,
      context
    };

    if (error) {
      entry.error = this.sanitizeError(error);
    }

    return entry;
  }

  private log(entry: LogEntry): void {
    if (this.isProduction) {
      // In production, use structured logging
      console.log(JSON.stringify(entry));
    } else {
      // In development, use readable format
      const logLine = `[${entry.timestamp}] ${entry.level} [${entry.requestId}] ${entry.message}`;
      console.log(logLine);
      
      if (entry.context) {
        console.log('Context:', entry.context);
      }
      
      if (entry.error) {
        console.error('Error:', entry.error);
      }
    }
  }

  error(message: string, context?: Record<string, any>, error?: any): void {
    const entry = this.createLogEntry('ERROR', message, context, error);
    this.log(entry);
  }

  warn(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('WARN', message, context);
    this.log(entry);
  }

  info(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('INFO', message, context);
    this.log(entry);
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.isProduction) {
      const entry = this.createLogEntry('DEBUG', message, context);
      this.log(entry);
    }
  }

  // Get request ID for correlation
  getRequestId(): string {
    return this.requestId;
  }
}

// Singleton instance
export const logger = new Logger();

// Helper functions for common logging patterns
export const logSubmission = (email: string, type: string, success: boolean, error?: any) => {
  if (success) {
    logger.info('Form submission successful', { 
      email: logger['isProduction'] ? '[REDACTED]' : email,
      type,
      timestamp: Date.now()
    });
  } else {
    logger.error('Form submission failed', { 
      email: logger['isProduction'] ? '[REDACTED]' : email,
      type 
    }, error);
  }
};

export const logValidationError = (errors: string[], email?: string) => {
  logger.warn('Form validation failed', {
    errorCount: errors.length,
    errors: errors.slice(0, 5), // Limit to first 5 errors
    email: logger['isProduction'] ? '[REDACTED]' : email
  });
};

export const logRateLimit = (clientId: string, reason: string) => {
  logger.warn('Rate limit exceeded', {
    clientId: logger['isProduction'] ? '[REDACTED]' : clientId,
    reason
  });
};
