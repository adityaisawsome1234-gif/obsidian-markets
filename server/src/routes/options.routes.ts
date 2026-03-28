import { Router, Request, Response } from 'express';

const router = Router();

function generateOptionsChain(ticker: string, type: 'call' | 'put', basePrice: number, expiration: string) {
  const strikes = [];
  const startStrike = Math.floor(basePrice * 0.85 / 5) * 5;

  for (let i = 0; i < 15; i++) {
    const strike = startStrike + i * 5;
    const otm = type === 'call' ? strike > basePrice : strike < basePrice;
    const moneyness = Math.abs(strike - basePrice) / basePrice;
    const iv = 0.20 + moneyness * 0.8 + Math.random() * 0.05;
    const mid = type === 'call'
      ? Math.max(0.05, basePrice - strike + iv * basePrice * 0.05)
      : Math.max(0.05, strike - basePrice + iv * basePrice * 0.05);

    const delta = type === 'call'
      ? Math.max(0.01, Math.min(0.99, 0.5 + (basePrice - strike) / (basePrice * 0.3)))
      : -Math.max(0.01, Math.min(0.99, 0.5 + (strike - basePrice) / (basePrice * 0.3)));

    strikes.push({
      contractSymbol: `${ticker}${expiration.replace(/-/g, '')}${type === 'call' ? 'C' : 'P'}${String(strike * 1000).padStart(8, '0')}`,
      type,
      strike,
      expiration,
      bid: +Math.max(0.01, mid - 0.10).toFixed(2),
      ask: +(mid + 0.10).toFixed(2),
      last: +mid.toFixed(2),
      volume: otm ? Math.floor(Math.random() * 5000) + 100 : Math.floor(Math.random() * 15000) + 500,
      openInterest: Math.floor(Math.random() * 50000) + 1000,
      impliedVolatility: +iv.toFixed(4),
      delta: +delta.toFixed(4),
      gamma: +(0.01 + Math.random() * 0.04).toFixed(4),
      theta: +(-0.02 - Math.random() * 0.08).toFixed(4),
      vega: +(0.05 + Math.random() * 0.15).toFixed(4),
      inTheMoney: !otm,
    });
  }
  return strikes;
}

/**
 * GET /api/options/:ticker/chain
 */
router.get('/:ticker/chain', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();
  const expiration = (req.query.expiration as string) || '2025-03-21';

  const basePrices: Record<string, number> = {
    AAPL: 198.45, NVDA: 875.32, TSLA: 245.67, MSFT: 425.67, SPY: 589.23, QQQ: 502.34,
  };
  const basePrice = basePrices[ticker] || 150;

  const expirations = [
    '2025-02-21', '2025-02-28', '2025-03-07', '2025-03-14',
    '2025-03-21', '2025-04-17', '2025-05-16', '2025-06-20',
    '2025-09-19', '2025-12-19', '2026-01-16', '2026-06-18',
  ];

  res.json({
    ticker,
    underlyingPrice: basePrice,
    expiration,
    expirations,
    calls: generateOptionsChain(ticker, 'call', basePrice, expiration),
    puts: generateOptionsChain(ticker, 'put', basePrice, expiration),
  });
});

/**
 * GET /api/options/:ticker/flow
 * Unusual options activity for a specific ticker.
 */
router.get('/:ticker/flow', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();

  const flows = Array.from({ length: 20 }, (_, i) => {
    const type = Math.random() > 0.5 ? 'call' : 'put';
    const premium = Math.floor(Math.random() * 2000000) + 100000;

    return {
      id: `flow_${ticker}_${i}`,
      ticker,
      type,
      sentiment: type === 'call' ? (Math.random() > 0.3 ? 'bullish' : 'neutral') : (Math.random() > 0.3 ? 'bearish' : 'neutral'),
      strike: Math.floor(Math.random() * 50 + 150) * (ticker === 'NVDA' ? 5 : 1),
      expiration: ['2025-03-21', '2025-04-17', '2025-05-16', '2025-06-20'][Math.floor(Math.random() * 4)],
      premium,
      volume: Math.floor(Math.random() * 10000) + 500,
      openInterest: Math.floor(Math.random() * 50000) + 1000,
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
      size: premium > 1000000 ? 'sweep' : premium > 500000 ? 'block' : 'standard',
      exchange: ['CBOE', 'ISE', 'PHLX', 'AMEX', 'BATS'][Math.floor(Math.random() * 5)],
    };
  });

  res.json({
    ticker,
    totalPremium: flows.reduce((sum, f) => sum + f.premium, 0),
    callPutRatio: +(flows.filter(f => f.type === 'call').length / Math.max(1, flows.filter(f => f.type === 'put').length)).toFixed(2),
    flows: flows.sort((a, b) => b.premium - a.premium),
  });
});

/**
 * GET /api/options/:ticker/iv
 * Implied volatility surface and term structure.
 */
router.get('/:ticker/iv', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();

  res.json({
    ticker,
    currentIV: 28.5,
    ivRank: 34,
    ivPercentile: 42,
    historicalVolatility: 24.3,
    termStructure: [
      { expiration: '2025-02-21', daysToExpiry: 7, iv: 32.1 },
      { expiration: '2025-03-07', daysToExpiry: 21, iv: 29.8 },
      { expiration: '2025-03-21', daysToExpiry: 35, iv: 28.5 },
      { expiration: '2025-04-17', daysToExpiry: 62, iv: 27.2 },
      { expiration: '2025-06-20', daysToExpiry: 126, iv: 26.8 },
      { expiration: '2025-09-19', daysToExpiry: 217, iv: 26.4 },
      { expiration: '2025-12-19', daysToExpiry: 308, iv: 26.1 },
    ],
    skew: {
      put25Delta: 32.4,
      atm: 28.5,
      call25Delta: 25.8,
      skewIndex: 6.6,
    },
    ivHistory: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      iv: +(28 + Math.sin(i / 5) * 4 + (Math.random() - 0.5) * 2).toFixed(1),
    })),
  });
});

/**
 * GET /api/options/:ticker/gex
 * Gamma exposure by strike.
 */
router.get('/:ticker/gex', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();
  const basePrices: Record<string, number> = { AAPL: 198, NVDA: 875, TSLA: 245, SPY: 589 };
  const basePrice = basePrices[ticker] || 150;
  const startStrike = Math.floor(basePrice * 0.9 / 5) * 5;

  const strikes = Array.from({ length: 20 }, (_, i) => {
    const strike = startStrike + i * 5;
    const callGamma = Math.floor(Math.random() * 500000000) + 10000000;
    const putGamma = -Math.floor(Math.random() * 400000000) - 10000000;

    return {
      strike,
      callGamma,
      putGamma,
      netGamma: callGamma + putGamma,
    };
  });

  const totalNetGamma = strikes.reduce((sum, s) => sum + s.netGamma, 0);

  res.json({
    ticker,
    spotPrice: basePrice,
    totalNetGamma,
    gammaFlipPoint: basePrice - 2,
    gammaByStrike: strikes,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/options/flow/live
 * Live aggregate options flow across all tickers.
 */
router.get('/flow/live', (_req: Request, res: Response) => {
  const tickers = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'SPY', 'QQQ', 'AMD'];

  const flows = Array.from({ length: 50 }, (_, i) => {
    const ticker = tickers[Math.floor(Math.random() * tickers.length)];
    const type = Math.random() > 0.48 ? 'call' : 'put';
    const premium = Math.floor(Math.random() * 5000000) + 50000;

    return {
      id: `live_${i}`,
      ticker,
      type,
      sentiment: type === 'call' ? 'bullish' : 'bearish',
      strike: Math.floor(Math.random() * 200 + 100),
      expiration: ['2025-03-21', '2025-04-17', '2025-06-20'][Math.floor(Math.random() * 3)],
      premium,
      volume: Math.floor(Math.random() * 5000) + 100,
      openInterest: Math.floor(Math.random() * 30000) + 500,
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 1800000)).toISOString(),
      size: premium > 2000000 ? 'whale' : premium > 500000 ? 'sweep' : 'standard',
    };
  });

  res.json({
    totalFlows: flows.length,
    totalPremium: flows.reduce((sum, f) => sum + f.premium, 0),
    bullishPremium: flows.filter(f => f.sentiment === 'bullish').reduce((sum, f) => sum + f.premium, 0),
    bearishPremium: flows.filter(f => f.sentiment === 'bearish').reduce((sum, f) => sum + f.premium, 0),
    flows: flows.sort((a, b) => b.premium - a.premium),
  });
});

export default router;
