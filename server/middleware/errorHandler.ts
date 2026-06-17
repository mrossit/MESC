import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError, type ZodIssue } from 'zod';
import { logger } from '../utils/logger';
import { AuthRequest } from '../auth';
import { captureError } from '../services/errorMonitoring';

// Database error interface (PostgreSQL/Drizzle)
interface DatabaseError {
  code?: string;
  constraint?: string;
  column?: string;
  message?: string;
}

/**
 * Custom API Error class with status codes and error codes
 */
export class ApiError extends Error {
  statusCode: number;
  errorCode?: string;
  details?: Record<string, unknown>;
  isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming errors

    Error.captureStackTrace(this, this.constructor);
  }

  // Factory methods for common errors
  static badRequest(message: string, errorCode?: string, details?: Record<string, unknown>) {
    return new ApiError(message, 400, errorCode || 'BAD_REQUEST', details);
  }

  static unauthorized(message: string = 'Não autorizado', errorCode?: string) {
    return new ApiError(message, 401, errorCode || 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Acesso negado', errorCode?: string) {
    return new ApiError(message, 403, errorCode || 'FORBIDDEN');
  }

  static notFound(message: string = 'Recurso não encontrado', errorCode?: string) {
    return new ApiError(message, 404, errorCode || 'NOT_FOUND');
  }

  static conflict(message: string, errorCode?: string, details?: Record<string, unknown>) {
    return new ApiError(message, 409, errorCode || 'CONFLICT', details);
  }

  static unprocessable(message: string, errorCode?: string, details?: Record<string, unknown>) {
    return new ApiError(message, 422, errorCode || 'UNPROCESSABLE_ENTITY', details);
  }

  static internal(message: string = 'Erro interno do servidor', errorCode?: string) {
    return new ApiError(message, 500, errorCode || 'INTERNAL_ERROR');
  }

  static serviceUnavailable(message: string = 'Serviço indisponível', errorCode?: string) {
    return new ApiError(message, 503, errorCode || 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Interface for standardized error response
 */
interface ErrorResponse {
  success: false;
  message: string;
  errorCode?: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * Central error handling middleware
 * Must be registered AFTER all routes
 */
export function errorHandler(
  err: Error | ApiError,
  req: AuthRequest,
  res: Response,
  _next: NextFunction
): void {
  // Determine if this is an operational error or a programming error
  const isApiError = err instanceof ApiError;
  const isOperational = isApiError && err.isOperational;

  // Get status code
  const statusCode = isApiError ? err.statusCode : 500;

  // Log error with appropriate level
  if (statusCode >= 500) {
    logger.error(`[ERROR] ${req.method} ${req.path}:`, {
      message: err.message,
      stack: err.stack,
      statusCode,
      userId: req.user?.id,
      body: req.body,
    });
    captureError(err, {
      tags: {
        method: req.method,
        path: req.path,
        statusCode: String(statusCode),
      },
      extra: {
        errorCode: isApiError ? err.errorCode : undefined,
      },
    });
  } else {
    logger.warn(`[WARN] ${req.method} ${req.path}: ${err.message}`, {
      statusCode,
      userId: req.user?.id,
    });
  }

  // Build error response
  const response: ErrorResponse = {
    success: false,
    message: isOperational ? err.message : 'Erro interno do servidor',
  };

  // Add error code if available
  if (isApiError && err.errorCode) {
    response.errorCode = err.errorCode;
  }

  // Add details if available and operational error
  if (isApiError && err.details && isOperational) {
    response.details = err.details;
  }

  // Include stack trace only in development for debugging
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Send response if headers haven't been sent
  if (!res.headersSent) {
    res.status(statusCode).json(response);
  }
}

/**
 * Wrapper for async route handlers that automatically catches errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
}

/**
 * Middleware to handle 404 for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Rota não encontrada: ${req.method} ${req.path}`));
}

// Type guard for ZodError-like objects (for testing and duck-typing)
interface ZodErrorLike {
  name: string;
  errors: Array<{ path: (string | number)[]; message: string }>;
}

function isZodErrorLike(error: unknown): error is ZodErrorLike {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name: unknown }).name === 'ZodError' &&
    'errors' in error &&
    Array.isArray((error as { errors: unknown }).errors)
  );
}

/**
 * Validation error handler for Zod errors
 */
export function handleZodError(error: unknown): ApiError {
  if (error instanceof ZodError || isZodErrorLike(error)) {
    const zodError = error as ZodErrorLike;
    const details = zodError.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return ApiError.badRequest('Dados inválidos', 'VALIDATION_ERROR', { fields: details });
  }
  throw error;
}

/**
 * Database error handler for common Drizzle/PostgreSQL errors
 */
export function handleDatabaseError(error: unknown): ApiError {
  const dbError = error as DatabaseError;

  // Unique constraint violation
  if (dbError.code === '23505') {
    return ApiError.conflict('Registro já existe', 'DUPLICATE_ENTRY', {
      constraint: dbError.constraint,
    });
  }

  // Foreign key violation
  if (dbError.code === '23503') {
    return ApiError.badRequest('Referência inválida', 'FOREIGN_KEY_VIOLATION', {
      constraint: dbError.constraint,
    });
  }

  // Not null violation
  if (dbError.code === '23502') {
    return ApiError.badRequest('Campo obrigatório não informado', 'NOT_NULL_VIOLATION', {
      column: dbError.column,
    });
  }

  // Check constraint violation
  if (dbError.code === '23514') {
    return ApiError.badRequest('Valor inválido', 'CHECK_VIOLATION', {
      constraint: dbError.constraint,
    });
  }

  // If not a known database error, re-throw
  throw error;
}
