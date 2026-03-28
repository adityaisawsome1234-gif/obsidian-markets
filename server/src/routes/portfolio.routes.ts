import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

const addHoldingSchema = z.object({
  ticker: z.string().min(1).max(10),
  shares: z.number().positive(),
  avgCost: z.number().positive(),
  purchaseDate: z.string().optional(),
});

const connectBrokerSchema = z.object({
  broker: z.enum(['robinhood', 'tdameritrade', 'schwab', 'fidelity', 'interactive_brokers', 'webull']),
  apiKey: z.string().optional(),
  redirectUrl: z.string().optional(),
});

const mockHoldings = [
  { ticker: 'AAPL', name: 'Apple Inc.', shares: 150, avgCost: 172.50, currentPrice: 198.45, marketValue: 29767.50, totalReturn: 3892.50, totalReturnPercent: 15.04, dayChange: 184.50, dayChangePercent: 0.62, weight: 18.2 },
  { ticker: 'NVDA', name: 'NVIDIA Corp', shares: 25, avgCost: 620.00, currentPrice: 875.32, marketValue: 21883.00, totalReturn: 6383.00, totalReturnPercent: 41.15, dayChange: 311.25, dayChangePercent: 1.44, weight: 13.4 },
  { ticker: 'MSFT', name: 'Microsoft Corp', shares: 45, avgCost: 380.00, currentPrice: 425.67, marketValue: 19155.15, totalReturn: 2055.15, totalReturnPercent: 12.02, dayChange: 155.25, dayChangePercent: 0.82, weight: 11.7 },
  { ticker: 'GOOGL', name: 'Alphabet Inc', shares: 80, avgCost: 145.00, currentPrice: 178.23, marketValue: 14258.40, totalReturn: 2658.40, totalReturnPercent: 22.91, dayChange: 151.20, dayChangePercent: 1.07, weight: 8.7 },
  { ticker: 'AMZN', name: 'Amazon.com Inc', shares: 60, avgCost: 155.00, currentPrice: 192.34, marketValue: 11540.40, totalReturn: 2240.40, totalReturnPercent: 24.09, dayChange: 153.60, dayChangePercent: 1.35, weight: 7.1 },
  { ticker: 'META', name: 'Meta Platforms', shares: 20, avgCost: 425.00, currentPrice: 512.45, marketValue: 10249.00, totalReturn: 1749.00, totalReturnPercent: 20.58, dayChange: 164.60, dayChangePercent: 1.63, weight: 6.3 },
  { ticker: 'JPM', name: 'JPMorgan Chase', shares: 40, avgCost: 175.00, currentPrice: 198.34, marketValue: 7933.60, totalReturn: 933.60, totalReturnPercent: 13.34, dayChange: 84.80, dayChangePercent: 1.08, weight: 4.9 },
  { ticker: 'TSLA', name: 'Tesla Inc', shares: 30, avgCost: 210.00, currentPrice: 245.67, marketValue: 7370.10, totalReturn: 1070.10, totalReturnPercent: 16.98, dayChange: -96.30, dayChangePercent: -1.29, weight: 4.5 },
];

/**
 * GET /api/portfolio
 * Returns portfolio overview with all holdings.
 */
router.get('/', (_req: Request, res: Response) => {
  const totalValue = mockHoldings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalCost = mockHoldings.reduce((sum, h) => sum + h.avgCost * h.shares, 0);
  const dayChange = mockHoldings.reduce((sum, h) => sum + h.dayChange, 0);

  res.json({
    summary: {
      totalValue: +totalValue.toFixed(2),
      totalCost: +totalCost.toFixed(2),
      totalReturn: +(totalValue - totalCost).toFixed(2),
      totalReturnPercent: +(((totalValue - totalCost) / totalCost) * 100).toFixed(2),
      dayChange: +dayChange.toFixed(2),
      dayChangePercent: +((dayChange / totalValue) * 100).toFixed(2),
      cash: 15432.50,
      buyingPower: 30865.00,
    },
    holdings: mockHoldings,
    lastUpdated: new Date().toISOString(),
  });
});

/**
 * GET /api/portfolio/analytics
 * Returns portfolio analytics and performance metrics.
 */
router.get('/analytics', (_req: Request, res: Response) => {
  res.json({
    allocation: {
      bySector: [
        { sector: 'Technology', weight: 65.8, value: 107513.45 },
        { sector: 'Consumer Discretionary', weight: 11.6, value: 18910.50 },
        { sector: 'Financials', weight: 9.8, value: 15982.60 },
        { sector: 'Communication Services', weight: 8.7, value: 14258.40 },
        { sector: 'Cash', weight: 4.1, value: 15432.50 },
      ],
      byAssetClass: [
        { class: 'US Equities', weight: 91.8, value: 149832.15 },
        { class: 'Cash', weight: 8.2, value: 15432.50 },
      ],
    },
    performance: {
      daily: 0.72,
      weekly: 2.34,
      monthly: 5.67,
      quarterly: 12.45,
      ytd: 8.92,
      oneYear: 24.56,
      threeYear: 45.23,
      sharpeRatio: 1.85,
      sortino: 2.12,
      maxDrawdown: -8.45,
      beta: 1.18,
      alpha: 3.24,
      treynor: 15.67,
      informationRatio: 0.89,
    },
    performanceHistory: Array.from({ length: 90 }, (_, i) => ({
      date: new Date(Date.now() - (89 - i) * 86400000).toISOString().split('T')[0],
      portfolioValue: +(148000 + Math.sin(i / 10) * 5000 + i * 50 + (Math.random() - 0.5) * 2000).toFixed(2),
      benchmarkValue: +(145000 + Math.sin(i / 12) * 4000 + i * 40 + (Math.random() - 0.5) * 1500).toFixed(2),
    })),
    riskMetrics: {
      volatility: 18.5,
      var95: -2.34,
      var99: -3.89,
      correlationToSPY: 0.92,
      concentrationRisk: 'moderate',
      topHoldingWeight: 18.2,
    },
  });
});

/**
 * POST /api/portfolio/holdings
 * Add a new holding to the portfolio.
 */
router.post('/holdings', validate(addHoldingSchema), (req: Request, res: Response) => {
  const { ticker, shares, avgCost } = req.body as z.infer<typeof addHoldingSchema>;

  const currentPrice = avgCost * (1 + (Math.random() - 0.3) * 0.3);
  const marketValue = shares * currentPrice;
  const totalReturn = marketValue - shares * avgCost;

  res.status(201).json({
    holding: {
      ticker: ticker.toUpperCase(),
      name: `${ticker.toUpperCase()} Corporation`,
      shares,
      avgCost,
      currentPrice: +currentPrice.toFixed(2),
      marketValue: +marketValue.toFixed(2),
      totalReturn: +totalReturn.toFixed(2),
      totalReturnPercent: +((totalReturn / (shares * avgCost)) * 100).toFixed(2),
      dayChange: +(currentPrice * 0.01).toFixed(2),
      dayChangePercent: 1.0,
      weight: 0,
    },
    message: 'Holding added successfully.',
  });
});

/**
 * POST /api/portfolio/connect
 * Initiate brokerage connection flow.
 */
router.post('/connect', validate(connectBrokerSchema), (req: Request, res: Response) => {
  const { broker } = req.body as z.infer<typeof connectBrokerSchema>;

  res.json({
    status: 'pending',
    broker,
    authUrl: `https://auth.${broker}.com/oauth/authorize?client_id=obsidian&redirect_uri=http://localhost:3000/callback`,
    message: `Brokerage connection initiated with ${broker}. Redirect user to authUrl to complete.`,
    expiresIn: 600,
  });
});

export default router;
