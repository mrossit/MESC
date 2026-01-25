/**
 * Error Handler Middleware Tests
 *
 * Tests for the central error handling middleware and utilities.
 * Covers ApiError class, error handling, async handlers, and database errors.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  ApiError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleZodError,
  handleDatabaseError,
} from '../../../server/middleware/errorHandler';

// Mock logger
vi.mock('../../../server/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Helper to create mock request
function createMockRequest(options: Partial<Request> = {}): Partial<Request> {
  return {
    method: 'GET',
    path: '/test',
    body: {},
    user: { id: 'user-123' },
    ...options,
  };
}

// Helper to create mock response
function createMockResponse(): Partial<Response> & { json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const res = {
    headersSent: false,
    json: vi.fn(),
    status: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('ApiError', () => {
  describe('Constructor', () => {
    it('should create error with default values', () => {
      const error = new ApiError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.errorCode).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('should create error with all parameters', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ApiError('Validation failed', 400, 'VALIDATION_ERROR', details);

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
      expect(error.isOperational).toBe(true);
    });

    it('should have proper stack trace', () => {
      const error = new ApiError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Test error');
    });
  });

  describe('Factory Methods', () => {
    it('should create badRequest error', () => {
      const error = ApiError.badRequest('Invalid input', 'INVALID_INPUT', { field: 'email' });

      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('INVALID_INPUT');
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create badRequest with default error code', () => {
      const error = ApiError.badRequest('Invalid input');

      expect(error.errorCode).toBe('BAD_REQUEST');
    });

    it('should create unauthorized error', () => {
      const error = ApiError.unauthorized();

      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Não autorizado');
    });

    it('should create unauthorized with custom message', () => {
      const error = ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED');

      expect(error.message).toBe('Token expired');
      expect(error.errorCode).toBe('TOKEN_EXPIRED');
    });

    it('should create forbidden error', () => {
      const error = ApiError.forbidden();

      expect(error.statusCode).toBe(403);
      expect(error.errorCode).toBe('FORBIDDEN');
      expect(error.message).toBe('Acesso negado');
    });

    it('should create notFound error', () => {
      const error = ApiError.notFound('User not found');

      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND');
      expect(error.message).toBe('User not found');
    });

    it('should create conflict error', () => {
      const error = ApiError.conflict('Email already exists', 'DUPLICATE_EMAIL', { email: 'test@test.com' });

      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('DUPLICATE_EMAIL');
      expect(error.details).toEqual({ email: 'test@test.com' });
    });

    it('should create unprocessable error', () => {
      const error = ApiError.unprocessable('Cannot process request');

      expect(error.statusCode).toBe(422);
      expect(error.errorCode).toBe('UNPROCESSABLE_ENTITY');
    });

    it('should create internal error', () => {
      const error = ApiError.internal();

      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('Erro interno do servidor');
    });

    it('should create serviceUnavailable error', () => {
      const error = ApiError.serviceUnavailable();

      expect(error.statusCode).toBe(503);
      expect(error.errorCode).toBe('SERVICE_UNAVAILABLE');
      expect(error.message).toBe('Serviço indisponível');
    });
  });
});

describe('errorHandler', () => {
  let req: Partial<Request>;
  let res: ReturnType<typeof createMockResponse>;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('ApiError Handling', () => {
    it('should handle ApiError with correct status code', () => {
      const error = ApiError.badRequest('Bad input');

      errorHandler(error, req as Request, res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Bad input',
        errorCode: 'BAD_REQUEST',
      }));
    });

    it('should include error details for operational errors', () => {
      const error = ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', { field: 'email' });

      errorHandler(error, req as Request, res as unknown as Response, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: { field: 'email' },
      }));
    });

    it('should handle 500 errors differently', () => {
      const error = ApiError.internal('Database error');

      errorHandler(error, req as Request, res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle generic Error as 500', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, req as Request, res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Erro interno do servidor', // Generic message for non-operational errors
      }));
    });

    it('should not expose internal error message', () => {
      const error = new Error('Sensitive database connection string');

      errorHandler(error, req as Request, res as unknown as Response, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Erro interno do servidor',
      }));
    });
  });

  describe('Development Mode', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = ApiError.badRequest('Test error');

      errorHandler(error, req as Request, res as unknown as Response, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        stack: expect.any(String),
      }));
    });

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = ApiError.badRequest('Test error');

      errorHandler(error, req as Request, res as unknown as Response, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();
    });
  });

  describe('Headers Already Sent', () => {
    it('should not send response if headers already sent', () => {
      res.headersSent = true;
      const error = ApiError.badRequest('Test error');

      errorHandler(error, req as Request, res as unknown as Response, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});

describe('asyncHandler', () => {
  let req: Partial<Request>;
  let res: ReturnType<typeof createMockResponse>;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = vi.fn();
  });

  it('should call async handler and resolve', async () => {
    const handler = asyncHandler(async (req, res) => {
      res.json({ success: true });
    });

    await handler(req as Request, res as unknown as Response, next);

    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch errors and pass to next', async () => {
    const error = new Error('Async error');
    const handler = asyncHandler(async () => {
      throw error;
    });

    await handler(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should catch ApiError and pass to next', async () => {
    const error = ApiError.badRequest('Bad input');
    const handler = asyncHandler(async () => {
      throw error;
    });

    await handler(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('notFoundHandler', () => {
  let req: Partial<Request>;
  let res: ReturnType<typeof createMockResponse>;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest({ method: 'POST', path: '/unknown/route' });
    res = createMockResponse();
    next = vi.fn();
  });

  it('should call next with 404 ApiError', () => {
    notFoundHandler(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));

    const error = (next as any).mock.calls[0][0];
    expect(error.statusCode).toBe(404);
    expect(error.message).toContain('POST /unknown/route');
  });
});

describe('handleZodError', () => {
  it('should convert ZodError to ApiError', () => {
    const zodError = {
      name: 'ZodError',
      errors: [
        { path: ['email'], message: 'Invalid email' },
        { path: ['password'], message: 'Too short' },
      ],
    };

    const apiError = handleZodError(zodError);

    expect(apiError).toBeInstanceOf(ApiError);
    expect(apiError.statusCode).toBe(400);
    expect(apiError.errorCode).toBe('VALIDATION_ERROR');
    expect(apiError.details).toEqual({
      fields: [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ],
    });
  });

  it('should handle nested paths', () => {
    const zodError = {
      name: 'ZodError',
      errors: [
        { path: ['user', 'profile', 'email'], message: 'Invalid email' },
      ],
    };

    const apiError = handleZodError(zodError);

    expect(apiError.details?.fields).toEqual([
      { field: 'user.profile.email', message: 'Invalid email' },
    ]);
  });

  it('should re-throw non-ZodErrors', () => {
    const otherError = new Error('Not a Zod error');

    expect(() => handleZodError(otherError)).toThrow('Not a Zod error');
  });
});

describe('handleDatabaseError', () => {
  it('should handle unique constraint violation (23505)', () => {
    const dbError = {
      code: '23505',
      constraint: 'users_email_unique',
    };

    const apiError = handleDatabaseError(dbError);

    expect(apiError.statusCode).toBe(409);
    expect(apiError.errorCode).toBe('DUPLICATE_ENTRY');
    expect(apiError.details).toEqual({ constraint: 'users_email_unique' });
  });

  it('should handle foreign key violation (23503)', () => {
    const dbError = {
      code: '23503',
      constraint: 'schedules_minister_id_fkey',
    };

    const apiError = handleDatabaseError(dbError);

    expect(apiError.statusCode).toBe(400);
    expect(apiError.errorCode).toBe('FOREIGN_KEY_VIOLATION');
    expect(apiError.details).toEqual({ constraint: 'schedules_minister_id_fkey' });
  });

  it('should handle not null violation (23502)', () => {
    const dbError = {
      code: '23502',
      column: 'email',
    };

    const apiError = handleDatabaseError(dbError);

    expect(apiError.statusCode).toBe(400);
    expect(apiError.errorCode).toBe('NOT_NULL_VIOLATION');
    expect(apiError.details).toEqual({ column: 'email' });
  });

  it('should handle check constraint violation (23514)', () => {
    const dbError = {
      code: '23514',
      constraint: 'users_role_check',
    };

    const apiError = handleDatabaseError(dbError);

    expect(apiError.statusCode).toBe(400);
    expect(apiError.errorCode).toBe('CHECK_VIOLATION');
    expect(apiError.details).toEqual({ constraint: 'users_role_check' });
  });

  it('should re-throw unknown database errors', () => {
    const unknownError = {
      code: '99999',
      message: 'Unknown error',
    };

    expect(() => handleDatabaseError(unknownError)).toThrow();
  });

  it('should re-throw non-database errors', () => {
    const otherError = new Error('Not a database error');

    expect(() => handleDatabaseError(otherError)).toThrow('Not a database error');
  });
});

describe('Error Chain Integration', () => {
  let req: Partial<Request>;
  let res: ReturnType<typeof createMockResponse>;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = vi.fn();
  });

  it('should handle complete error flow from async handler through error handler', async () => {
    const handler = asyncHandler(async () => {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR');
    });

    // Simulate async handler catching error
    await handler(req as Request, res as unknown as Response, next);

    // Get the error that was passed to next
    const error = (next as any).mock.calls[0][0];

    // Now pass it through error handler
    errorHandler(error, req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
    }));
  });
});
