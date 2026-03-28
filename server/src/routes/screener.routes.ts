import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

const stockScreenerSchema = z.object({
  marketCapMin: z.number().optional(),
  marketCapMax: z.number().optional(),
  peMin: z.number().optional(),
  peMax: z.number().optional(),
  dividendYieldMin: z.number().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  exchange: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  volumeMin: z.number().optional(),
  changePercentMin: z.number().optional(),
  changePercentMax: z.number().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

const optionsScreenerSchema = z.object({
  minPremium: z.number().optional(),
  maxPremium: z.number().optional(),
  type: z.enum(['call', 'put', 'all']).optional(),
  minVolume: z.number().optional(),
  minOpenInterest: z.number().optional(),
  minIV: z.number().optional(),
  maxIV: z.number().optional(),
  dteMin: z.number().optional(),
  dteMax: z.number().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const savePresetSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['stock', 'options']),
  filters: z.record(z.unknown()),
});

const mockScreenerResults = [
  { ticker: 'NVDA', name: 'NVIDIA Corp', price: 875.32, change: 12.45, changePercent: 1.44, volume: 89230000, marketCap: 2150000000000, pe: 65.4, sector: 'Technology', dividendYield: 0.02 },
  { ticker: 'META', name: 'Meta Platforms', price: 512.45, change: 8.23, changePercent: 1.63, volume: 23450000, marketCap: 1310000000000, pe: 28.5, sector: 'Technology', dividendYield: 0.35 },
  { ticker: 'MSFT', name: 'Microsoft Corp', price: 425.67, change: 3.45, changePercent: 0.82, volume: 21890000, marketCap: 3160000000000, pe: 35.2, sector: 'Technology', dividendYield: 0.72 },
  { ticker: 'AAPL', name: 'Apple Inc', price: 198.45, change: 1.23, changePercent: 0.62, volume: 67890000, marketCap: 3050000000000, pe: 31.2, sector: 'Technology', dividendYield: 0.52 },
  { ticker: 'AMZN', name: 'Amazon.com Inc', price: 192.34, change: 2.56, changePercent: 1.35, volume: 34560000, marketCap: 2010000000000, pe: 42.1, sector: 'Consumer Discretionary', dividendYield: 0 },
  { ticker: 'GOOGL', name: 'Alphabet Inc', price: 178.23, change: 1.89, changePercent: 1.07, volume: 28900000, marketCap: 2200000000000, pe: 23.8, sector: 'Technology', dividendYield: 0.45 },
  { ticker: 'JPM', name: 'JPMorgan Chase', price: 198.34, change: 2.12, changePercent: 1.08, volume: 12340000, marketCap: 570000000000, pe: 12.4, sector: 'Financials', dividendYield: 2.15 },
  { ticker: 'V', name: 'Visa Inc', price: 287.56, change: 1.45, changePercent: 0.51, volume: 8900000, marketCap: 580000000000, pe: 31.5, sector: 'Financials', dividendYield: 0.75 },
  { ticker: 'LLY', name: 'Eli Lilly', price: 845.23, change: -12.34, changePercent: -1.44, volume: 4560000, marketCap: 805000000000, pe: 78.9, sector: 'Healthcare', dividendYield: 0.62 },
  { ticker: 'AVGO', name: 'Broadcom Inc', price: 178.45, change: 4.56, changePercent: 2.62, volume: 15670000, marketCap: 825000000000, pe: 45.2, sector: 'Technology', dividendYield: 1.23 },
];

/**
 * POST /api/screener/stocks
 * Screen stocks by multiple criteria.
 */
router.post('/stocks', validate(stockScreenerSchema), (req: Request, res: Response) => {
  const filters = req.body as z.infer<typeof stockScreenerSchema>;
  let results = [...mockScreenerResults];

  if (filters.sector) {
    results = results.filter(r => r.sector === filters.sector);
  }
  if (filters.priceMin !== undefined) {
    results = results.filter(r => r.price >= filters.priceMin!);
  }
  if (filters.priceMax !== undefined) {
    results = results.filter(r => r.price <= filters.priceMax!);
  }
  if (filters.peMax !== undefined) {
    results = results.filter(r => r.pe <= filters.peMax!);
  }

  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 25, 100);
  const start = (page - 1) * limit;

  res.json({
    results: results.slice(start, start + limit),
    pagination: { page, limit, total: results.length, totalPages: Math.ceil(results.length / limit) },
    filtersApplied: filters,
  });
});

/**
 * POST /api/screener/options
 * Screen options contracts by criteria.
 */
router.post('/options', validate(optionsScreenerSchema), (_req: Request, res: Response) => {
  const optionsResults = [
    { ticker: 'NVDA', type: 'call', strike: 900, expiration: '2025-03-21', dte: 30, premium: 24.50, volume: 45000, openInterest: 125000, iv: 52.3, delta: 0.42 },
    { ticker: 'SPY', type: 'put', strike: 580, expiration: '2025-03-21', dte: 30, premium: 8.75, volume: 89000, openInterest: 234000, iv: 18.2, delta: -0.32 },
    { ticker: 'TSLA', type: 'call', strike: 260, expiration: '2025-04-17', dte: 57, premium: 18.30, volume: 34000, openInterest: 98000, iv: 62.1, delta: 0.48 },
    { ticker: 'AAPL', type: 'call', strike: 200, expiration: '2025-03-21', dte: 30, premium: 5.20, volume: 56000, openInterest: 178000, iv: 24.5, delta: 0.45 },
    { ticker: 'AMD', type: 'call', strike: 175, expiration: '2025-03-21', dte: 30, premium: 7.80, volume: 28000, openInterest: 85000, iv: 45.8, delta: 0.40 },
    { ticker: 'META', type: 'put', strike: 500, expiration: '2025-03-21', dte: 30, premium: 12.40, volume: 15000, openInterest: 42000, iv: 32.1, delta: -0.35 },
    { ticker: 'QQQ', type: 'call', strike: 510, expiration: '2025-04-17', dte: 57, premium: 15.60, volume: 67000, openInterest: 198000, iv: 20.3, delta: 0.52 },
    { ticker: 'MSFT', type: 'call', strike: 430, expiration: '2025-03-21', dte: 30, premium: 9.90, volume: 22000, openInterest: 65000, iv: 26.8, delta: 0.46 },
  ];

  res.json({
    results: optionsResults,
    totalResults: optionsResults.length,
  });
});

/**
 * GET /api/screener/presets
 * Returns saved screener presets.
 */
router.get('/presets', (_req: Request, res: Response) => {
  res.json({
    presets: [
      { id: 'preset_1', name: 'Large Cap Growth', type: 'stock', filters: { marketCapMin: 100000000000, peMin: 20, changePercentMin: 0 }, isDefault: true },
      { id: 'preset_2', name: 'High Dividend', type: 'stock', filters: { dividendYieldMin: 3, marketCapMin: 10000000000 }, isDefault: true },
      { id: 'preset_3', name: 'Unusual Volume', type: 'stock', filters: { volumeMin: 50000000, changePercentMin: 3 }, isDefault: true },
      { id: 'preset_4', name: 'High IV Options', type: 'options', filters: { minIV: 50, minVolume: 10000 }, isDefault: true },
      { id: 'preset_5', name: 'Weekly Sweeps', type: 'options', filters: { dteMax: 7, minPremium: 500000, type: 'all' }, isDefault: true },
    ],
  });
});

/**
 * POST /api/screener/save
 * Save a screener preset.
 */
router.post('/save', validate(savePresetSchema), (req: Request, res: Response) => {
  const { name, type, filters } = req.body as z.infer<typeof savePresetSchema>;

  res.status(201).json({
    preset: {
      id: `preset_${Date.now().toString(36)}`,
      name,
      type,
      filters,
      isDefault: false,
      createdAt: new Date().toISOString(),
    },
    message: 'Preset saved successfully.',
  });
});

export default router;
