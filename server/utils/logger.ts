// Sistema de logging centralizado para o MESC
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

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

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (context && typeof context === 'object') {
      return `${baseMessage} :: ${JSON.stringify(context)}`;
    }
    
    return baseMessage;
  }

  error(message: string, error?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, error));
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  info(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message, context));
    }
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, context));
    }
  }

  // Método específico para desenvolvimento
  dev(message: string, context?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('DEV', message, context));
    }
  }
}

export const logger = new Logger();