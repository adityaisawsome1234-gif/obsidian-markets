import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

const createWatchlistSchema = z.object({
  name: z.string().min(1).max(100),
  tickers: z.array(z.string().min(1).max(10)).default([]),
});

const updatePreferencesSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  defaultTicker: z.string().max(10).optional(),
  timezone: z.string().optional(),
  notifications: z.boolean().optional(),
  emailAlerts: z.boolean().optional(),
  pushAlerts: z.boolean().optional(),
  defaultChartRange: z.enum(['1D', '5D', '1M', '3M', '6M', '1Y', '5Y']).optional(),
  defaultChartType: z.enum(['candle', 'line', 'area', 'bar']).optional(),
  compactMode: z.boolean().optional(),
  showPreMarket: z.boolean().optional(),
  showAfterHours: z.boolean().optional(),
  optionsDefaultExpiry: z.enum(['nearest', 'weekly', 'monthly']).optional(),
  newsCategories: z.array(z.string()).optional(),
});

const mockWatchlists = [
  {
    id: 'wl_1',
    name: 'Tech Leaders',
    tickers: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'],
    createdAt: '2024-12-01T10:00:00Z',
    updatedAt: '2025-02-14T16:30:00Z',
  },
  {
    id: 'wl_2',
    name: 'AI Plays',
    tickers: ['NVDA', 'AMD', 'SMCI', 'PLTR', 'MSTR', 'IONQ', 'SNOW'],
    createdAt: '2025-01-10T09:00:00Z',
    updatedAt: '2025-02-12T11:00:00Z',
  },
  {
    id: 'wl_3',
    name: 'Dividend Portfolio',
    tickers: ['JPM', 'JNJ', 'PG', 'KO', 'VZ', 'O', 'ABBV'],
    createdAt: '2025-01-20T14:00:00Z',
    updatedAt: '2025-02-10T08:45:00Z',
  },
  {
    id: 'wl_4',
    name: 'Options Watchlist',
    tickers: ['SPY', 'QQQ', 'IWM', 'TSLA', 'NVDA', 'AAPL'],
    createdAt: '2025-02-01T10:00:00Z',
    updatedAt: '2025-02-15T15:00:00Z',
  },
];

/**
 * GET /api/user/watchlists
 * Returns all watchlists for the authenticated user.
 */
router.get('/watchlists', (_req: Request, res: Response) => {
  res.json({
    watchlists: mockWatchlists,
    total: mockWatchlists.length,
    maxWatchlists: 20,
    maxTickersPerWatchlist: 50,
  });
});

/**
 * POST /api/user/watchlists
 * Create a new watchlist.
 */
router.post('/watchlists', validate(createWatchlistSchema), (req: Request, res: Response) => {
  const { name, tickers } = req.body as z.infer<typeof createWatchlistSchema>;

  const newWatchlist = {
    id: `wl_${Date.now().toString(36)}`,
    name,
    tickers: tickers.map((t: string) => t.toUpperCase()),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  res.status(201).json({
    watchlist: newWatchlist,
    message: 'Watchlist created successfully.',
  });
});

/**
 * PUT /api/user/watchlists/:id
 * Update a watchlist.
 */
router.put('/watchlists/:id', (req: Request, res: Response) => {
  const watchlist = mockWatchlists.find(w => w.id === req.params.id);

  if (!watchlist) {
    res.status(404).json({ error: 'NotFound', message: 'Watchlist not found.' });
    return;
  }

  const updates = req.body as { name?: string; tickers?: string[] };
  const updatedWatchlist = {
    ...watchlist,
    ...(updates.name && { name: updates.name }),
    ...(updates.tickers && { tickers: updates.tickers.map(t => t.toUpperCase()) }),
    updatedAt: new Date().toISOString(),
  };

  res.json({
    watchlist: updatedWatchlist,
    message: 'Watchlist updated successfully.',
  });
});

/**
 * DELETE /api/user/watchlists/:id
 * Delete a watchlist.
 */
router.delete('/watchlists/:id', (req: Request, res: Response) => {
  const watchlist = mockWatchlists.find(w => w.id === req.params.id);

  if (!watchlist) {
    res.status(404).json({ error: 'NotFound', message: 'Watchlist not found.' });
    return;
  }

  res.json({ message: 'Watchlist deleted successfully.', deletedId: req.params.id });
});

/**
 * GET /api/user/preferences
 * Returns user preferences.
 */
router.get('/preferences', (_req: Request, res: Response) => {
  res.json({
    preferences: {
      theme: 'dark',
      defaultTicker: 'SPY',
      timezone: 'America/New_York',
      notifications: true,
      emailAlerts: true,
      pushAlerts: false,
      defaultChartRange: '1M',
      defaultChartType: 'candle',
      compactMode: false,
      showPreMarket: true,
      showAfterHours: true,
      optionsDefaultExpiry: 'nearest',
      newsCategories: ['macro', 'earnings', 'technology', 'options'],
    },
  });
});

/**
 * PUT /api/user/preferences
 * Update user preferences.
 */
router.put('/preferences', validate(updatePreferencesSchema), (req: Request, res: Response) => {
  const updates = req.body as z.infer<typeof updatePreferencesSchema>;

  res.json({
    preferences: {
      theme: 'dark',
      defaultTicker: 'SPY',
      timezone: 'America/New_York',
      notifications: true,
      emailAlerts: true,
      pushAlerts: false,
      defaultChartRange: '1M',
      defaultChartType: 'candle',
      compactMode: false,
      showPreMarket: true,
      showAfterHours: true,
      optionsDefaultExpiry: 'nearest',
      newsCategories: ['macro', 'earnings', 'technology', 'options'],
      ...updates,
    },
    message: 'Preferences updated successfully.',
  });
});

export default router;
