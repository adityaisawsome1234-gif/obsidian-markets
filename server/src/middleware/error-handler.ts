import { Request, Response, NextFunction } from 'express';
import type { ApiError } from '../types/index.js';

export function errorHandler(
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  console.error(`[Error] ${err.message}`, {
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  // Determine status code
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const code = 'code' in err ? err.code : 'INTERNAL_ERROR';

  // Don't leak internal error details in production
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(statusCode).json({
    error: code,
    message: statusCode === 500 && !isDev
      ? 'An unexpected error occurred'
      : err.message,
    ...(isDev && { stack: err.stack }),
  });
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.method} ${req.path} not found`,
  });
}

/**
 * Helper to create typed API errors
 */
export function createApiError(message: string, statusCode: number, code?: string): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
