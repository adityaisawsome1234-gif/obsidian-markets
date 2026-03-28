import { Router, Request, Response } from 'express';

const router = Router();

// Helper to generate mock price data based on ticker
function mockPrice(ticker: string): number {
  const prices: Record<string, number> = {
    AAPL: 198.45, MSFT: 425.67, GOOGL: 178.23, AMZN: 192.34, NVDA: 875.32,
    META: 512.45, TSLA: 245.67, JPM: 198.34, V: 287.56, JNJ: 156.78,
    SPY: 589.23, QQQ: 502.34, IWM: 208.45, DIA: 435.21,
  };
  return prices[ticker.toUpperCase()] || 150.00 + Math.random() * 100;
}

/**
 * GET /api/stocks/:ticker/quote
 */
router.get('/:ticker/quote', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();
  const price = mockPrice(ticker);
  const change = (Math.random() - 0.45) * 8;
  const changePercent = (change / price) * 100;

  res.json({
    ticker,
    price: +price.toFixed(2),
    change: +change.toFixed(2),
    changePercent: +changePercent.toFixed(2),
    volume: Math.floor(Math.random() * 80000000) + 5000000,
    avgVolume: Math.floor(Math.random() * 60000000) + 10000000,
    high: +(price + Math.random() * 5).toFixed(2),
    low: +(price - Math.random() * 5).toFixed(2),
    open: +(price + (Math.random() - 0.5) * 3).toFixed(2),
    prevClose: +(price - change).toFixed(2),
    marketCap: Math.floor(price * (Math.random() * 5000000000 + 100000000)),
    pe: +(Math.random() * 40 + 10).toFixed(2),
    eps: +(Math.random() * 15 + 1).toFixed(2),
    week52High: +(price * 1.3).toFixed(2),
    week52Low: +(price * 0.7).toFixed(2),
    afterHours: +(price + (Math.random() - 0.5) * 2).toFixed(2),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/stocks/:ticker/profile
 */
router.get('/:ticker/profile', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();
  const profiles: Record<string, object> = {
    AAPL: {
      ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics',
      description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
      ceo: 'Tim Cook', employees: 164000, headquarters: 'Cupertino, CA',
      website: 'https://www.apple.com', exchange: 'NASDAQ', founded: '1976',
      marketCap: 3050000000000, peRatio: 31.2, dividendYield: 0.52,
      beta: 1.28, week52High: 237.49, week52Low: 164.08,
    },
    NVDA: {
      ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors',
      description: 'NVIDIA Corporation provides graphics and compute solutions across gaming, professional visualization, datacenter, and automotive markets.',
      ceo: 'Jensen Huang', employees: 29600, headquarters: 'Santa Clara, CA',
      website: 'https://www.nvidia.com', exchange: 'NASDAQ', founded: '1993',
      marketCap: 2150000000000, peRatio: 65.4, dividendYield: 0.02,
      beta: 1.72, week52High: 974.00, week52Low: 475.00,
    },
    TSLA: {
      ticker: 'TSLA', name: 'Tesla, Inc.', sector: 'Consumer Discretionary', industry: 'Auto Manufacturers',
      description: 'Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems.',
      ceo: 'Elon Musk', employees: 140473, headquarters: 'Austin, TX',
      website: 'https://www.tesla.com', exchange: 'NASDAQ', founded: '2003',
      marketCap: 782000000000, peRatio: 42.8, dividendYield: 0,
      beta: 2.08, week52High: 299.29, week52Low: 138.80,
    },
  };

  const profile = profiles[ticker] || {
    ticker, name: `${ticker} Corporation`, sector: 'Technology', industry: 'Software',
    description: `${ticker} is a publicly traded company listed on major US exchanges.`,
    ceo: 'Jane Smith', employees: 5000, headquarters: 'San Francisco, CA',
    website: `https://www.${ticker.toLowerCase()}.com`, exchange: 'NASDAQ', founded: '2010',
    marketCap: 50000000000, peRatio: 25.0, dividendYield: 0.5,
    beta: 1.15, week52High: 200, week52Low: 100,
  };

  res.json(profile);
});

/**
 * GET /api/stocks/:ticker/financials
 */
router.get('/:ticker/financials', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();
  const period = (req.query.period as string) || 'annual';

  const generateQuarter = (q: string, revenue: number) => ({
    period: q,
    revenue,
    costOfRevenue: Math.floor(revenue * 0.58),
    grossProfit: Math.floor(revenue * 0.42),
    grossMargin: 42.3,
    operatingExpenses: Math.floor(revenue * 0.18),
    operatingIncome: Math.floor(revenue * 0.24),
    operatingMargin: 24.1,
    netIncome: Math.floor(revenue * 0.21),
    netMargin: 21.3,
    eps: +(revenue * 0.21 / 15500000000 * 10).toFixed(2),
    ebitda: Math.floor(revenue * 0.32),
  });

  const baseRevenue = ticker === 'AAPL' ? 94930000000 : 25000000000;

  res.json({
    ticker,
    period,
    statements: period === 'quarterly' ? [
      generateQuarter('Q4 2024', baseRevenue),
      generateQuarter('Q3 2024', Math.floor(baseRevenue * 0.92)),
      generateQuarter('Q2 2024', Math.floor(baseRevenue * 0.88)),
      generateQuarter('Q1 2024', Math.floor(baseRevenue * 0.85)),
    ] : [
      generateQuarter('FY 2024', baseRevenue * 4),
      generateQuarter('FY 2023', Math.floor(baseRevenue * 3.8)),
      generateQuarter('FY 2022', Math.floor(baseRevenue * 3.5)),
      generateQuarter('FY 2021', Math.floor(baseRevenue * 3.2)),
    ],
  });
});

/**
 * GET /api/stocks/:ticker/ratios
 */
router.get('/:ticker/ratios', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();

  res.json({
    ticker,
    valuation: {
      peRatio: 31.24, forwardPE: 28.56, pegRatio: 1.87,
      priceToSales: 8.12, priceToBook: 48.92, evToEbitda: 24.56,
      evToRevenue: 7.89, priceToFCF: 28.34,
    },
    profitability: {
      grossMargin: 45.96, operatingMargin: 31.51, netMargin: 26.31,
      returnOnEquity: 157.41, returnOnAssets: 28.59, returnOnCapital: 55.23,
    },
    growth: {
      revenueGrowthYoY: 8.12, epsGrowthYoY: 12.45,
      revenueGrowth3Y: 9.87, epsGrowth3Y: 14.23,
      revenueGrowth5Y: 11.34, epsGrowth5Y: 16.78,
    },
    financial: {
      currentRatio: 1.07, quickRatio: 1.03, debtToEquity: 1.87,
      interestCoverage: 29.34, debtToEbitda: 1.23,
    },
    dividends: {
      dividendYield: 0.52, payoutRatio: 15.34, dividendGrowth5Y: 5.67,
      consecutiveYears: 12,
    },
  });
});

/**
 * GET /api/stocks/:ticker/earnings
 */
router.get('/:ticker/earnings', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();

  res.json({
    ticker,
    nextEarningsDate: '2025-04-24',
    history: [
      { quarter: 'Q4 2024', date: '2025-01-30', epsEstimate: 2.35, epsActual: 2.40, surprise: 0.05, surprisePercent: 2.13, revenueEstimate: 124500000000, revenueActual: 124300000000 },
      { quarter: 'Q3 2024', date: '2024-10-31', epsEstimate: 1.60, epsActual: 1.64, surprise: 0.04, surprisePercent: 2.50, revenueEstimate: 94500000000, revenueActual: 94930000000 },
      { quarter: 'Q2 2024', date: '2024-08-01', epsEstimate: 1.34, epsActual: 1.40, surprise: 0.06, surprisePercent: 4.48, revenueEstimate: 84400000000, revenueActual: 85780000000 },
      { quarter: 'Q1 2024', date: '2024-05-02', epsEstimate: 1.50, epsActual: 1.53, surprise: 0.03, surprisePercent: 2.00, revenueEstimate: 90100000000, revenueActual: 90750000000 },
      { quarter: 'Q4 2023', date: '2024-02-01', epsEstimate: 2.10, epsActual: 2.18, surprise: 0.08, surprisePercent: 3.81, revenueEstimate: 117900000000, revenueActual: 119580000000 },
    ],
    estimates: {
      currentQuarter: { epsEstimate: 1.62, revenueEstimate: 95200000000, numAnalysts: 32 },
      nextQuarter: { epsEstimate: 2.45, revenueEstimate: 128000000000, numAnalysts: 30 },
      currentYear: { epsEstimate: 7.42, revenueEstimate: 412000000000, numAnalysts: 38 },
      nextYear: { epsEstimate: 8.15, revenueEstimate: 445000000000, numAnalysts: 35 },
    },
  });
});

/**
 * GET /api/stocks/:ticker/ownership
 */
router.get('/:ticker/ownership', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();

  res.json({
    ticker,
    institutionalOwnership: 60.23,
    insiderOwnership: 0.07,
    topInstitutional: [
      { holder: 'Vanguard Group Inc', shares: 1305237845, percentHeld: 8.50, value: 259000000000, changeShares: 12345678, changePercent: 0.95 },
      { holder: 'Blackrock Inc', shares: 1021456789, percentHeld: 6.65, value: 202800000000, changeShares: -5678901, changePercent: -0.55 },
      { holder: 'Berkshire Hathaway Inc', shares: 905234567, percentHeld: 5.89, value: 179700000000, changeShares: 0, changePercent: 0 },
      { holder: 'State Street Corp', shares: 578901234, percentHeld: 3.77, value: 114900000000, changeShares: 3456789, changePercent: 0.60 },
      { holder: 'FMR LLC', shares: 356789012, percentHeld: 2.32, value: 70800000000, changeShares: -2345678, changePercent: -0.65 },
    ],
    insiderTransactions: [
      { name: 'Tim Cook', title: 'CEO', date: '2024-12-15', type: 'Sell', shares: 511000, price: 195.23, value: 99762530 },
      { name: 'Luca Maestri', title: 'CFO', date: '2024-11-20', type: 'Sell', shares: 234000, price: 192.45, value: 45033300 },
      { name: 'Jeff Williams', title: 'COO', date: '2024-10-10', type: 'Sell', shares: 125000, price: 188.90, value: 23612500 },
    ],
  });
});

/**
 * GET /api/stocks/:ticker/analysts
 */
router.get('/:ticker/analysts', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();
  const price = mockPrice(ticker);

  res.json({
    ticker,
    consensusRating: 'Buy',
    targetPrice: +(price * 1.15).toFixed(2),
    targetHigh: +(price * 1.35).toFixed(2),
    targetLow: +(price * 0.85).toFixed(2),
    numberOfAnalysts: 42,
    ratings: { strongBuy: 18, buy: 14, hold: 8, sell: 1, strongSell: 1 },
    recentRatings: [
      { analyst: 'Morgan Stanley', firm: 'Morgan Stanley', rating: 'Overweight', targetPrice: +(price * 1.20).toFixed(2), date: '2025-02-12', priorRating: 'Equal Weight' },
      { analyst: 'Goldman Sachs', firm: 'Goldman Sachs', rating: 'Buy', targetPrice: +(price * 1.18).toFixed(2), date: '2025-02-08', priorRating: 'Buy' },
      { analyst: 'JP Morgan', firm: 'JP Morgan', rating: 'Overweight', targetPrice: +(price * 1.25).toFixed(2), date: '2025-01-28', priorRating: 'Overweight' },
      { analyst: 'Bank of America', firm: 'BofA Securities', rating: 'Buy', targetPrice: +(price * 1.22).toFixed(2), date: '2025-01-15', priorRating: 'Neutral' },
      { analyst: 'Barclays', firm: 'Barclays', rating: 'Equal Weight', targetPrice: +(price * 1.05).toFixed(2), date: '2025-01-10', priorRating: 'Equal Weight' },
    ],
  });
});

/**
 * GET /api/stocks/:ticker/filings
 */
router.get('/:ticker/filings', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();

  res.json({
    ticker,
    filings: [
      { type: '10-K', title: 'Annual Report', date: '2024-11-01', url: '#', period: 'FY 2024' },
      { type: '10-Q', title: 'Quarterly Report', date: '2024-08-02', url: '#', period: 'Q3 2024' },
      { type: '10-Q', title: 'Quarterly Report', date: '2024-05-03', url: '#', period: 'Q2 2024' },
      { type: '8-K', title: 'Current Report', date: '2024-10-31', url: '#', period: 'N/A' },
      { type: '10-Q', title: 'Quarterly Report', date: '2024-02-02', url: '#', period: 'Q1 2024' },
      { type: 'DEF 14A', title: 'Proxy Statement', date: '2024-01-10', url: '#', period: 'FY 2024' },
      { type: '4', title: 'Insider Transaction', date: '2024-12-16', url: '#', period: 'N/A' },
    ],
  });
});

/**
 * GET /api/stocks/:ticker/news
 */
router.get('/:ticker/news', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();

  res.json({
    ticker,
    articles: [
      { id: 'n1', title: `${ticker} Exceeds Quarterly Expectations on Strong Demand`, summary: `${ticker} reported Q4 earnings that beat analyst estimates, driven by strong product demand and services growth.`, source: 'Bloomberg', publishedAt: '2025-02-15T14:30:00Z', sentiment: 0.82, url: '#' },
      { id: 'n2', title: `Analysts Raise Price Targets for ${ticker} After Earnings Beat`, summary: 'Multiple Wall Street firms upgraded their price targets following the strong quarterly results.', source: 'Reuters', publishedAt: '2025-02-15T12:00:00Z', sentiment: 0.75, url: '#' },
      { id: 'n3', title: `${ticker} Announces Strategic Partnership in AI Space`, summary: `${ticker} revealed a new AI partnership expected to drive growth in enterprise markets.`, source: 'CNBC', publishedAt: '2025-02-14T09:15:00Z', sentiment: 0.65, url: '#' },
      { id: 'n4', title: `Insider Selling at ${ticker} Raises Eyebrows`, summary: 'SEC filings show significant insider sales over the past month.', source: 'MarketWatch', publishedAt: '2025-02-13T16:45:00Z', sentiment: -0.23, url: '#' },
      { id: 'n5', title: `${ticker} Supply Chain Faces Headwinds in Asia`, summary: 'New tariff concerns could impact production costs and margins.', source: 'WSJ', publishedAt: '2025-02-12T11:20:00Z', sentiment: -0.42, url: '#' },
    ],
  });
});

/**
 * GET /api/stocks/:ticker/chart
 */
router.get('/:ticker/chart', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();
  const range = (req.query.range as string) || '1M';
  const interval = (req.query.interval as string) || '1d';
  const basePrice = mockPrice(ticker);

  const dataPoints: Array<{ timestamp: string; open: number; high: number; low: number; close: number; volume: number }> = [];

  let numPoints: number;
  switch (range) {
    case '1D': numPoints = 78; break;   // 5-min bars
    case '5D': numPoints = 5 * 78; break;
    case '1M': numPoints = 22; break;
    case '3M': numPoints = 66; break;
    case '6M': numPoints = 132; break;
    case '1Y': numPoints = 252; break;
    case '5Y': numPoints = 1260; break;
    default: numPoints = 22;
  }

  let currentPrice = basePrice * 0.85;
  const now = Date.now();
  const msPerPoint = range === '1D' ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000;

  for (let i = numPoints; i >= 0; i--) {
    const drift = (basePrice - currentPrice) * 0.01;
    const volatility = currentPrice * 0.015;
    const randomChange = drift + volatility * (Math.random() - 0.48);
    currentPrice += randomChange;
    currentPrice = Math.max(currentPrice, basePrice * 0.5);

    const high = currentPrice + Math.random() * currentPrice * 0.01;
    const low = currentPrice - Math.random() * currentPrice * 0.01;
    const open = currentPrice + (Math.random() - 0.5) * currentPrice * 0.005;

    dataPoints.push({
      timestamp: new Date(now - i * msPerPoint).toISOString(),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +currentPrice.toFixed(2),
      volume: Math.floor(Math.random() * 50000000) + 5000000,
    });
  }

  res.json({
    ticker,
    range,
    interval,
    data: dataPoints,
  });
});

export default router;
