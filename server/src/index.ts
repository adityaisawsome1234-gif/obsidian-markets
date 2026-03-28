import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';

import { env } from './config/env.js';
import { rateLimit } from './middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { setupWebSocket } from './websocket/server.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import marketRoutes from './routes/market.routes.js';
import stocksRoutes from './routes/stocks.routes.js';
import optionsRoutes from './routes/options.routes.js';
import macroRoutes from './routes/macro.routes.js';
import newsRoutes from './routes/news.routes.js';
import screenerRoutes from './routes/screener.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import aiRoutes from './routes/ai.routes.js';
import alertsRoutes from './routes/alerts.routes.js';
import userRoutes from './routes/user.routes.js';

// ============================================
// Initialize Express app
// ============================================
const app = express();
const httpServer = createServer(app);

// ============================================
// Global middleware
// ============================================
app.use(helmet({
  contentSecurityPolicy: false, // Disable for dev; enable in production
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

app.use(compression());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter
app.use(rateLimit({ windowMs: 60000, maxRequests: 100 }));

// ============================================
// Health check
// ============================================
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'obsidian-markets-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/options', optionsRoutes);
app.use('/api/macro', macroRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/screener', screenerRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/user', userRoutes);

// ============================================
// API route listing (dev only)
// ============================================
if (env.NODE_ENV === 'development') {
  app.get('/api', (_req, res) => {
    res.json({
      message: 'Obsidian Markets API',
      version: '1.0.0',
      endpoints: {
        auth: { base: '/api/auth', routes: ['POST /register', 'POST /login', 'POST /refresh', 'POST /logout', 'GET /me'] },
        market: { base: '/api/market', routes: ['GET /overview', 'GET /movers', 'GET /sectors'] },
        stocks: { base: '/api/stocks', routes: ['GET /:ticker/quote', 'GET /:ticker/profile', 'GET /:ticker/financials', 'GET /:ticker/ratios', 'GET /:ticker/earnings', 'GET /:ticker/ownership', 'GET /:ticker/analysts', 'GET /:ticker/filings', 'GET /:ticker/news', 'GET /:ticker/chart'] },
        options: { base: '/api/options', routes: ['GET /:ticker/chain', 'GET /:ticker/flow', 'GET /:ticker/iv', 'GET /:ticker/gex', 'GET /flow/live'] },
        macro: { base: '/api/macro', routes: ['GET /calendar', 'GET /fed', 'GET /yields', 'GET /indicators/:id'] },
        news: { base: '/api/news', routes: ['GET /feed', 'GET /sentiment/:ticker', 'GET /trending'] },
        screener: { base: '/api/screener', routes: ['POST /stocks', 'POST /options', 'GET /presets', 'POST /save'] },
        portfolio: { base: '/api/portfolio', routes: ['GET /', 'GET /analytics', 'POST /holdings', 'POST /connect'] },
        ai: { base: '/api/ai', routes: ['POST /chat', 'POST /deep-dive/:ticker', 'GET /daily-briefing'] },
        alerts: { base: '/api/alerts', routes: ['GET /', 'GET /:id', 'POST /', 'PUT /:id', 'DELETE /:id', 'GET /history/recent'] },
        user: { base: '/api/user', routes: ['GET /watchlists', 'POST /watchlists', 'PUT /watchlists/:id', 'DELETE /watchlists/:id', 'GET /preferences', 'PUT /preferences'] },
      },
      websocket: {
        namespaces: {
          '/market': 'Real-time quote streaming. Events: subscribe, unsubscribe, quote',
          '/options': 'Options flow streaming. Events: subscribe, subscribe:all, unsubscribe, flow',
        },
      },
    });
  });
}

// ============================================
// Error handling
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// WebSocket setup
// ============================================
const io = setupWebSocket(httpServer);

// ============================================
// Start server
// ============================================
httpServer.listen(env.PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║       Obsidian Markets API Server            ║
  ╠══════════════════════════════════════════════╣
  ║  Status:      Running                        ║
  ║  Port:        ${String(env.PORT).padEnd(33)}║
  ║  Environment: ${env.NODE_ENV.padEnd(33)}║
  ║  API Base:    http://localhost:${env.PORT}/api${' '.repeat(Math.max(0, 14 - String(env.PORT).length))}║
  ║  WebSocket:   ws://localhost:${env.PORT}${' '.repeat(Math.max(0, 16 - String(env.PORT).length))}║
  ║  Health:      http://localhost:${env.PORT}/health${' '.repeat(Math.max(0, 11 - String(env.PORT).length))}║
  ╚══════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received. Shutting down gracefully...');
  io.close();
  httpServer.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received. Shutting down gracefully...');
  io.close();
  httpServer.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
});

export { app, httpServer, io };
