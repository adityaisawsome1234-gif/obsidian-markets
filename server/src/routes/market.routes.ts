import { Router, Request, Response } from 'express';
import { fetchMarketOverview } from '../services/market-data.service.js';

const router = Router();

/**
 * GET /api/market/overview
 * Returns current market snapshot with major indices and key metrics.
 * Uses live data from FMP/FRED/CoinGecko when API keys are available,
 * falling back to mock data when they are not.
 */
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const overview = await fetchMarketOverview();
    return res.json(overview);
  } catch (error) {
    console.error('[market/overview] Error fetching live data, returning mock:', error);
    // Fallback to hardcoded mock if fetchMarketOverview itself throws
    return res.json({
      indices: [
        { symbol: 'SPX', name: 'S&P 500', value: 5892.34, change: 23.45, changePercent: 0.40, status: 'open' },
        { symbol: 'DJI', name: 'Dow Jones', value: 43521.87, change: 156.32, changePercent: 0.36, status: 'open' },
        { symbol: 'COMP', name: 'Nasdaq', value: 19234.56, change: 89.12, changePercent: 0.47, status: 'open' },
        { symbol: 'RUT', name: 'Russell 2000', value: 2087.45, change: -12.34, changePercent: -0.59, status: 'open' },
        { symbol: 'VIX', name: 'CBOE Volatility', value: 14.23, change: -0.87, changePercent: -5.76, status: 'open' },
      ],
      futures: [
        { symbol: 'ES', name: 'E-mini S&P 500', value: 5895.25, change: 8.50, changePercent: 0.14 },
        { symbol: 'NQ', name: 'E-mini Nasdaq', value: 19285.00, change: 42.75, changePercent: 0.22 },
        { symbol: 'YM', name: 'E-mini Dow', value: 43580.00, change: 65.00, changePercent: 0.15 },
        { symbol: 'CL', name: 'Crude Oil', value: 78.34, change: -0.56, changePercent: -0.71 },
        { symbol: 'GC', name: 'Gold', value: 2945.60, change: 12.30, changePercent: 0.42 },
      ],
      treasuries: [
        { symbol: 'US2Y', name: '2-Year Treasury', yield: 4.28, change: -0.02 },
        { symbol: 'US10Y', name: '10-Year Treasury', yield: 4.52, change: 0.03 },
        { symbol: 'US30Y', name: '30-Year Treasury', yield: 4.71, change: 0.01 },
      ],
      crypto: [
        { symbol: 'BTC', name: 'Bitcoin', price: 97432.50, change: 1245.30, changePercent: 1.29 },
        { symbol: 'ETH', name: 'Ethereum', price: 3856.20, change: -42.10, changePercent: -1.08 },
      ],
      marketStatus: 'open',
      breadth: {
        advancers: 287,
        decliners: 213,
        unchanged: 3,
        newHighs: 45,
        newLows: 12,
        advanceDeclineRatio: 1.35,
      },
      dataSource: 'mock',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/market/movers
 * Returns top gainers, losers, and most active.
 */
router.get('/movers', (_req: Request, res: Response) => {
  res.json({
    gainers: [
      { ticker: 'SMCI', name: 'Super Micro Computer', price: 892.45, change: 78.23, changePercent: 9.61, volume: 32450000 },
      { ticker: 'MSTR', name: 'MicroStrategy', price: 1845.30, change: 142.50, changePercent: 8.37, volume: 18920000 },
      { ticker: 'PLTR', name: 'Palantir Technologies', price: 42.87, change: 3.12, changePercent: 7.85, volume: 67340000 },
      { ticker: 'IONQ', name: 'IonQ Inc', price: 18.92, change: 1.24, changePercent: 7.01, volume: 12560000 },
      { ticker: 'RDDT', name: 'Reddit Inc', price: 156.78, change: 9.45, changePercent: 6.42, volume: 8920000 },
    ],
    losers: [
      { ticker: 'MRNA', name: 'Moderna Inc', price: 34.56, change: -4.23, changePercent: -10.90, volume: 28450000 },
      { ticker: 'SNAP', name: 'Snap Inc', price: 11.23, change: -0.98, changePercent: -8.02, volume: 45230000 },
      { ticker: 'RIVN', name: 'Rivian Automotive', price: 12.45, change: -0.87, changePercent: -6.53, volume: 22340000 },
      { ticker: 'LCID', name: 'Lucid Group', price: 3.12, change: -0.19, changePercent: -5.74, volume: 34560000 },
      { ticker: 'NKLA', name: 'Nikola Corp', price: 0.87, change: -0.05, changePercent: -5.43, volume: 15670000 },
    ],
    mostActive: [
      { ticker: 'NVDA', name: 'NVIDIA Corp', price: 875.32, change: 12.45, changePercent: 1.44, volume: 89230000 },
      { ticker: 'TSLA', name: 'Tesla Inc', price: 245.67, change: -3.21, changePercent: -1.29, volume: 78450000 },
      { ticker: 'AAPL', name: 'Apple Inc', price: 198.45, change: 1.23, changePercent: 0.62, volume: 67890000 },
      { ticker: 'AMD', name: 'AMD Inc', price: 168.90, change: 4.56, changePercent: 2.77, volume: 56780000 },
      { ticker: 'PLTR', name: 'Palantir Technologies', price: 42.87, change: 3.12, changePercent: 7.85, volume: 67340000 },
    ],
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/market/sectors
 * Returns sector performance breakdown.
 */
router.get('/sectors', (_req: Request, res: Response) => {
  res.json({
    sectors: [
      { sector: 'Technology', changePercent: 1.24, weekChange: 3.45, monthChange: 8.12, ytdChange: 12.34 },
      { sector: 'Healthcare', changePercent: -0.32, weekChange: -1.23, monthChange: 2.45, ytdChange: 4.56 },
      { sector: 'Financials', changePercent: 0.87, weekChange: 2.34, monthChange: 5.67, ytdChange: 9.87 },
      { sector: 'Consumer Discretionary', changePercent: 0.45, weekChange: 1.23, monthChange: 3.45, ytdChange: 7.89 },
      { sector: 'Communication Services', changePercent: 0.92, weekChange: 2.56, monthChange: 6.78, ytdChange: 11.23 },
      { sector: 'Industrials', changePercent: 0.34, weekChange: 0.87, monthChange: 2.34, ytdChange: 5.67 },
      { sector: 'Consumer Staples', changePercent: -0.12, weekChange: -0.45, monthChange: 0.87, ytdChange: 2.34 },
      { sector: 'Energy', changePercent: -0.78, weekChange: -2.34, monthChange: -4.56, ytdChange: -3.21 },
      { sector: 'Utilities', changePercent: 0.23, weekChange: 0.56, monthChange: 1.23, ytdChange: 3.45 },
      { sector: 'Real Estate', changePercent: -0.45, weekChange: -1.34, monthChange: -2.67, ytdChange: -1.23 },
      { sector: 'Materials', changePercent: 0.12, weekChange: 0.34, monthChange: 1.56, ytdChange: 4.23 },
    ],
    timestamp: new Date().toISOString(),
  });
});

export default router;
