import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { validate } from '../middleware/validate.js';
import { authenticate, generateToken, generateRefreshToken } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rate-limit.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// Mock user store
const mockUsers = new Map<string, { id: string; email: string; name: string; passwordHash: string }>();

// Seed a demo user
const demoHash = bcrypt.hashSync('demo1234', 10);
mockUsers.set('demo@obsidianmarkets.com', {
  id: 'usr_demo_001',
  email: 'demo@obsidianmarkets.com',
  name: 'Demo Trader',
  passwordHash: demoHash,
});

/**
 * POST /api/auth/register
 */
router.post('/register', authRateLimit, validate(registerSchema), async (req: Request, res: Response) => {
  const { email, password, name } = req.body as z.infer<typeof registerSchema>;

  if (mockUsers.has(email)) {
    res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = `usr_${Date.now().toString(36)}`;

  mockUsers.set(email, { id, email, name, passwordHash });

  const accessToken = generateToken({ id, email, name });
  const refreshToken = generateRefreshToken({ id });

  res.status(201).json({
    user: { id, email, name },
    accessToken,
    refreshToken,
    expiresIn: 604800, // 7 days in seconds
  });
});

/**
 * POST /api/auth/login
 */
router.post('/login', authRateLimit, validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = mockUsers.get(email);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    return;
  }

  const accessToken = generateToken({ id: user.id, email: user.email, name: user.name });
  const refreshToken = generateRefreshToken({ id: user.id });

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
    expiresIn: 604800,
  });
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', validate(refreshSchema), (_req: Request, res: Response) => {
  // In a real app, verify the refresh token against a store
  const mockUser = { id: 'usr_demo_001', email: 'demo@obsidianmarkets.com', name: 'Demo Trader' };
  const accessToken = generateToken(mockUser);
  const refreshToken = generateRefreshToken({ id: mockUser.id });

  res.json({
    accessToken,
    refreshToken,
    expiresIn: 604800,
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, (_req: Request, res: Response) => {
  // In a real app, invalidate the refresh token
  res.json({ message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: {
      ...req.user,
      plan: 'pro',
      createdAt: '2024-01-15T08:00:00Z',
      preferences: {
        theme: 'dark',
        defaultTicker: 'SPY',
        timezone: 'America/New_York',
        notifications: true,
      },
    },
  });
});

export default router;
