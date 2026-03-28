import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { aiRateLimit } from '../middleware/rate-limit.js';
import { AiService } from '../services/ai.service.js';
import { DailyEdgeService } from '../services/daily-edge.service.js';
import { fetchAllMarketData } from '../services/market-data.service.js';

const router = Router();

// ── Schemas ────────────────────────────────────────────────────────────────

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.object({
    ticker: z.string().optional(),
    page: z.string().optional(),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional(),
  }).optional(),
});

const deepDiveSchema = z.object({
  aspects: z.array(z.enum(['fundamental', 'technical', 'sentiment', 'options', 'macro'])).optional(),
});

// ── Rate limit cooldown for refresh (1 per 5 min, in-memory) ───────────────

let lastRefreshAt = 0;
const REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

// ── Existing endpoints ─────────────────────────────────────────────────────

/**
 * POST /api/ai/chat
 * Streams AI response back to client using SSE.
 */
router.post('/chat', aiRateLimit, validate(chatSchema), async (req: Request, res: Response) => {
  const { message, context } = req.body as z.infer<typeof chatSchema>;

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const aiService = new AiService();

  try {
    const stream = aiService.chat(message, context);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ type: 'content', text: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'AI service unavailable';
    res.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/ai/deep-dive/:ticker
 * Generates a comprehensive AI analysis for a stock.
 */
router.post('/deep-dive/:ticker', aiRateLimit, validate(deepDiveSchema), async (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();
  const { aspects } = req.body as z.infer<typeof deepDiveSchema>;

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const aiService = new AiService();

  try {
    const stream = aiService.deepDive(ticker, aspects);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ type: 'content', text: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'AI service unavailable';
    res.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`);
    res.end();
  }
});

// ── Daily Edge endpoints ───────────────────────────────────────────────────

/**
 * GET /api/ai/daily-briefing
 * Returns the latest Daily Edge briefing.
 * First checks in-memory cache, then generates fresh if needed.
 */
router.get('/daily-briefing', async (_req: Request, res: Response) => {
  try {
    // Try cache first
    const cached = DailyEdgeService.getCached();
    if (cached) {
      return res.json({ source: 'cache', ...cached });
    }

    // Cache miss — generate fresh
    const result = await DailyEdgeService.generate();
    return res.json({ source: 'fresh', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate daily briefing';
    console.error('[daily-briefing] Error:', message);
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/ai/daily-briefing/raw
 * Returns raw validated market data for dashboard widgets.
 */
router.get('/daily-briefing/raw', async (_req: Request, res: Response) => {
  try {
    const data = await fetchAllMarketData();
    return res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch market data';
    console.error('[daily-briefing/raw] Error:', message);
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/ai/daily-briefing/refresh
 * Force-refresh the Daily Edge briefing.
 * Rate limited to 1 request per 5 minutes (in-memory cooldown).
 * Accepts optional ?watchlist=AAPL,NVDA,TSLA query param.
 */
router.post('/daily-briefing/refresh', async (req: Request, res: Response) => {
  // Enforce cooldown
  const now = Date.now();
  if (now - lastRefreshAt < REFRESH_COOLDOWN_MS) {
    const retryAfterSec = Math.ceil((REFRESH_COOLDOWN_MS - (now - lastRefreshAt)) / 1000);
    return res.status(429).json({
      error: 'Refresh rate limit exceeded',
      retryAfterSeconds: retryAfterSec,
      message: `Please wait ${retryAfterSec}s before refreshing again.`,
    });
  }

  try {
    lastRefreshAt = now;

    // Parse optional watchlist from query param
    const watchlistParam = req.query.watchlist;
    let watchlist: string[] | undefined;
    if (typeof watchlistParam === 'string' && watchlistParam.length > 0) {
      watchlist = watchlistParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    }

    const result = await DailyEdgeService.generate(watchlist);
    return res.json({ source: 'refresh', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh daily briefing';
    console.error('[daily-briefing/refresh] Error:', message);
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/ai/daily-briefing/status
 * Health check — returns last generation time, reliability score,
 * source status, and warnings count.
 */
router.get('/daily-briefing/status', (_req: Request, res: Response) => {
  const status = DailyEdgeService.getStatus();
  return res.json(status);
});

export default router;
