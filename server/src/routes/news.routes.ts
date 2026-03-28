import { Router, Request, Response } from 'express';

const router = Router();

const mockArticles = [
  { id: 'news_1', title: 'Federal Reserve Holds Rates Steady, Signals Patience on Cuts', summary: 'The Federal Reserve kept interest rates unchanged at its latest meeting, signaling it needs more confidence that inflation is moving toward its 2% target before reducing rates.', source: 'Bloomberg', publishedAt: '2025-02-15T18:30:00Z', tickers: ['SPY', 'TLT', 'GLD'], sentiment: -0.15, category: 'macro', imageUrl: null },
  { id: 'news_2', title: 'NVIDIA Reports Record Revenue Fueled by AI Chip Demand', summary: 'NVIDIA posted another quarter of record revenue as demand for its AI accelerators continues to outpace supply across data center customers.', source: 'Reuters', publishedAt: '2025-02-15T16:00:00Z', tickers: ['NVDA', 'AMD', 'SMCI'], sentiment: 0.88, category: 'earnings', imageUrl: null },
  { id: 'news_3', title: 'Apple Announces Major AI Integration Across Product Line', summary: 'Apple unveiled its most comprehensive AI strategy to date, integrating advanced language models across iOS, macOS, and its professional software suite.', source: 'CNBC', publishedAt: '2025-02-15T14:15:00Z', tickers: ['AAPL', 'MSFT', 'GOOGL'], sentiment: 0.72, category: 'technology', imageUrl: null },
  { id: 'news_4', title: 'Oil Prices Slide on Weakening Global Demand Outlook', summary: 'Crude oil fell below $78 a barrel as weaker economic data from China and Europe raised concerns about global demand growth.', source: 'WSJ', publishedAt: '2025-02-15T11:45:00Z', tickers: ['XLE', 'USO', 'CVX'], sentiment: -0.55, category: 'commodities', imageUrl: null },
  { id: 'news_5', title: 'Tesla Deliveries Miss Estimates Amid Growing Competition', summary: 'Tesla reported quarterly deliveries that fell short of Wall Street estimates as competition from Chinese EV makers intensifies.', source: 'MarketWatch', publishedAt: '2025-02-15T09:30:00Z', tickers: ['TSLA', 'RIVN', 'NIO'], sentiment: -0.62, category: 'earnings', imageUrl: null },
  { id: 'news_6', title: 'Bitcoin Surges Past $97,000 on Institutional Inflows', summary: 'Bitcoin reached new highs as institutional investors continue to pour capital into spot Bitcoin ETFs and corporate treasuries add BTC.', source: 'CoinDesk', publishedAt: '2025-02-14T22:00:00Z', tickers: ['MSTR', 'COIN', 'IBIT'], sentiment: 0.81, category: 'crypto', imageUrl: null },
  { id: 'news_7', title: 'Semiconductor Stocks Rally on New Export Restrictions Clarity', summary: 'Chip stocks advanced after the Commerce Department provided clearer guidelines on AI chip exports, easing uncertainty.', source: 'Bloomberg', publishedAt: '2025-02-14T16:30:00Z', tickers: ['NVDA', 'AMD', 'INTC', 'AVGO'], sentiment: 0.55, category: 'technology', imageUrl: null },
  { id: 'news_8', title: 'Healthcare Sector Under Pressure as Drug Pricing Bill Advances', summary: 'Major pharmaceutical companies traded lower after a drug pricing reform bill gained bipartisan support in the Senate.', source: 'Reuters', publishedAt: '2025-02-14T14:00:00Z', tickers: ['JNJ', 'PFE', 'MRK', 'LLY'], sentiment: -0.48, category: 'healthcare', imageUrl: null },
  { id: 'news_9', title: 'Palantir Secures $500M Defense Contract Extension', summary: 'Palantir Technologies announced a multi-year contract extension with the Department of Defense for its AI-powered analytics platform.', source: 'CNBC', publishedAt: '2025-02-14T10:00:00Z', tickers: ['PLTR'], sentiment: 0.78, category: 'defense', imageUrl: null },
  { id: 'news_10', title: 'Consumer Spending Shows Resilience Despite Inflation Concerns', summary: 'January retail sales data exceeded expectations, suggesting consumers continue to spend even as prices remain elevated.', source: 'WSJ', publishedAt: '2025-02-13T08:30:00Z', tickers: ['XRT', 'AMZN', 'WMT'], sentiment: 0.35, category: 'macro', imageUrl: null },
];

/**
 * GET /api/news/feed
 * Returns paginated news feed with optional category filter.
 */
router.get('/feed', (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

  let filtered = mockArticles;
  if (category) {
    filtered = mockArticles.filter(a => a.category === category);
  }

  const start = (page - 1) * limit;
  const articles = filtered.slice(start, start + limit);

  res.json({
    articles,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
    categories: ['macro', 'earnings', 'technology', 'commodities', 'crypto', 'healthcare', 'defense'],
  });
});

/**
 * GET /api/news/sentiment/:ticker
 * Returns sentiment analysis for a specific ticker.
 */
router.get('/sentiment/:ticker', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();

  const sentimentHistory = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
    score: +(Math.random() * 2 - 1).toFixed(2),
    articleCount: Math.floor(Math.random() * 20) + 3,
    positiveCount: Math.floor(Math.random() * 12) + 1,
    negativeCount: Math.floor(Math.random() * 8) + 1,
    neutralCount: Math.floor(Math.random() * 5) + 1,
  }));

  const avgSentiment = sentimentHistory.reduce((sum, d) => sum + d.score, 0) / sentimentHistory.length;

  res.json({
    ticker,
    currentSentiment: +avgSentiment.toFixed(2),
    sentimentLabel: avgSentiment > 0.2 ? 'Bullish' : avgSentiment < -0.2 ? 'Bearish' : 'Neutral',
    totalArticles: sentimentHistory.reduce((sum, d) => sum + d.articleCount, 0),
    history: sentimentHistory,
    topSources: [
      { source: 'Bloomberg', articleCount: 45, avgSentiment: 0.12 },
      { source: 'Reuters', articleCount: 38, avgSentiment: 0.05 },
      { source: 'CNBC', articleCount: 32, avgSentiment: 0.22 },
      { source: 'WSJ', articleCount: 28, avgSentiment: -0.08 },
      { source: 'MarketWatch', articleCount: 22, avgSentiment: 0.15 },
    ],
  });
});

/**
 * GET /api/news/trending
 * Returns trending tickers and topics.
 */
router.get('/trending', (_req: Request, res: Response) => {
  res.json({
    trendingTickers: [
      { ticker: 'NVDA', mentions: 342, sentiment: 0.72, trend: 'up' },
      { ticker: 'TSLA', mentions: 289, sentiment: -0.31, trend: 'down' },
      { ticker: 'AAPL', mentions: 234, sentiment: 0.45, trend: 'up' },
      { ticker: 'PLTR', mentions: 198, sentiment: 0.68, trend: 'up' },
      { ticker: 'AMD', mentions: 156, sentiment: 0.52, trend: 'up' },
      { ticker: 'SMCI', mentions: 145, sentiment: 0.38, trend: 'neutral' },
      { ticker: 'META', mentions: 132, sentiment: 0.55, trend: 'up' },
      { ticker: 'MSTR', mentions: 128, sentiment: 0.62, trend: 'up' },
    ],
    trendingTopics: [
      { topic: 'AI Infrastructure', mentions: 567, sentiment: 0.65 },
      { topic: 'Fed Policy', mentions: 445, sentiment: -0.12 },
      { topic: 'Earnings Season', mentions: 389, sentiment: 0.34 },
      { topic: 'Crypto Rally', mentions: 312, sentiment: 0.71 },
      { topic: 'EV Competition', mentions: 234, sentiment: -0.28 },
    ],
    timestamp: new Date().toISOString(),
  });
});

export default router;
