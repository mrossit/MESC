// Sistema de logging centralizado para o MESC
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Lista de chaves sensíveis que devem ser ocultadas
const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'tempPassword',
  'temporaryPassword',
  'token',
  'jwt',
  'secret',
  'apiKey',
  'privateKey',
  'authorization'
];

class Logger {
  private logLevel: LogLevel;

  constructor() {
    // Em produção, apenas logs de erro e aviso
    // Em desenvolvimento, todos os logs
    this.logLevel = process.env.NODE_ENV === 'production'
      ? LogLevel.WARN
      : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  /**
   * Sanitiza dados sensíveis antes de logar
   */
  private sanitize(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    const dataObj = data as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(dataObj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some(sk => lowerKey.includes(sk.toLowerCase()));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof dataObj[key] === 'object' && dataObj[key] !== null) {
        sanitized[key] = this.sanitize(dataObj[key]);
      } else {
        sanitized[key] = dataObj[key];
      }
    }

    return sanitized;
  }

  private formatMessage(level: string, message: string, context?: unknown): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level}] ${message}`;

    if (context && typeof context === 'object') {
      const sanitizedContext = this.sanitize(context);
      return `${baseMessage} :: ${JSON.stringify(sanitizedContext)}`;
    }

    return baseMessage;
  }

  error(message: string, error?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, error));
    }
  }

  warn(message: string, context?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  info(message: string, context?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message, context));
    }
  }

  debug(message: string, context?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, context));
    }
  }

  // Método específico para desenvolvimento
  dev(message: string, context?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('DEV', message, context));
    }
  }
}

export const logger = new Logger();