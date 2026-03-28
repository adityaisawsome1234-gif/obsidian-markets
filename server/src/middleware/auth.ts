import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthenticatedRequest } from '../types/index.js';

interface JwtPayload {
  id: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header. Expected: Bearer <token>',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'TokenExpired',
        message: 'Your session has expired. Please log in again.',
      });
      return;
    }

    res.status(401).json({
      error: 'InvalidToken',
      message: 'The provided token is invalid.',
    });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
      };
    } catch {
      // Token invalid or expired - continue without user
    }
  }

  next();
}

export function generateToken(payload: { id: string; email: string; name: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function generateRefreshToken(payload: { id: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '30d' });
}
