import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/macro/calendar
 * Economic calendar events.
 */
router.get('/calendar', (req: Request, res: Response) => {
  const startDate = (req.query.start as string) || new Date().toISOString().split('T')[0];

  res.json({
    startDate,
    events: [
      { id: 'ec1', date: '2025-02-19', time: '08:30', event: 'CPI (MoM)', country: 'US', impact: 'high', forecast: '0.3%', previous: '0.4%', actual: '0.3%', category: 'inflation' },
      { id: 'ec2', date: '2025-02-19', time: '08:30', event: 'CPI (YoY)', country: 'US', impact: 'high', forecast: '2.9%', previous: '2.9%', actual: '3.0%', category: 'inflation' },
      { id: 'ec3', date: '2025-02-19', time: '08:30', event: 'Core CPI (MoM)', country: 'US', impact: 'high', forecast: '0.3%', previous: '0.2%', actual: '0.4%', category: 'inflation' },
      { id: 'ec4', date: '2025-02-20', time: '08:30', event: 'Initial Jobless Claims', country: 'US', impact: 'medium', forecast: '215K', previous: '213K', category: 'employment' },
      { id: 'ec5', date: '2025-02-20', time: '08:30', event: 'Philadelphia Fed Manufacturing', country: 'US', impact: 'medium', forecast: '-5.0', previous: '44.3', category: 'manufacturing' },
      { id: 'ec6', date: '2025-02-21', time: '09:45', event: 'S&P Global Manufacturing PMI', country: 'US', impact: 'medium', forecast: '51.5', previous: '51.2', category: 'manufacturing' },
      { id: 'ec7', date: '2025-02-21', time: '10:00', event: 'Existing Home Sales', country: 'US', impact: 'medium', forecast: '4.15M', previous: '4.24M', category: 'housing' },
      { id: 'ec8', date: '2025-02-25', time: '10:00', event: 'Consumer Confidence', country: 'US', impact: 'high', forecast: '103.0', previous: '104.1', category: 'sentiment' },
      { id: 'ec9', date: '2025-02-26', time: '10:00', event: 'New Home Sales', country: 'US', impact: 'medium', forecast: '680K', previous: '698K', category: 'housing' },
      { id: 'ec10', date: '2025-02-28', time: '08:30', event: 'PCE Price Index (MoM)', country: 'US', impact: 'high', forecast: '0.3%', previous: '0.3%', category: 'inflation' },
    ],
  });
});

/**
 * GET /api/macro/fed
 * Federal Reserve data: rate decisions, dot plot, speakers.
 */
router.get('/fed', (_req: Request, res: Response) => {
  res.json({
    currentRate: { lower: 4.25, upper: 4.50 },
    nextMeeting: '2025-03-19',
    rateHistory: [
      { date: '2025-01-29', rate: 4.50, decision: 'Hold' },
      { date: '2024-12-18', rate: 4.50, decision: 'Cut', change: -0.25 },
      { date: '2024-11-07', rate: 4.75, decision: 'Cut', change: -0.25 },
      { date: '2024-09-18', rate: 5.00, decision: 'Cut', change: -0.50 },
      { date: '2024-07-31', rate: 5.50, decision: 'Hold' },
    ],
    fedFuturesProbabilities: {
      nextMeeting: { hold: 92, cut25: 8, cut50: 0, hike25: 0 },
      meeting2: { hold: 65, cut25: 32, cut50: 3, hike25: 0 },
      meeting3: { hold: 40, cut25: 45, cut50: 14, hike25: 1 },
      yearEnd: { totalCutsExpected: 2.1, impliedRate: 3.97 },
    },
    speakers: [
      { name: 'Jerome Powell', title: 'Fed Chair', date: '2025-02-25', event: 'Semi-annual testimony', impact: 'high' },
      { name: 'Christopher Waller', title: 'Governor', date: '2025-02-20', event: 'Policy speech', impact: 'medium' },
      { name: 'Raphael Bostic', title: 'Atlanta Fed President', date: '2025-02-19', event: 'Economic outlook', impact: 'low' },
    ],
  });
});

/**
 * GET /api/macro/yields
 * Treasury yield curve data.
 */
router.get('/yields', (_req: Request, res: Response) => {
  res.json({
    curve: [
      { maturity: '1M', yield: 4.32, change: -0.01 },
      { maturity: '3M', yield: 4.31, change: 0.00 },
      { maturity: '6M', yield: 4.28, change: -0.02 },
      { maturity: '1Y', yield: 4.22, change: -0.03 },
      { maturity: '2Y', yield: 4.28, change: -0.02 },
      { maturity: '3Y', yield: 4.30, change: 0.01 },
      { maturity: '5Y', yield: 4.38, change: 0.02 },
      { maturity: '7Y', yield: 4.45, change: 0.02 },
      { maturity: '10Y', yield: 4.52, change: 0.03 },
      { maturity: '20Y', yield: 4.68, change: 0.01 },
      { maturity: '30Y', yield: 4.71, change: 0.01 },
    ],
    spreads: {
      '2s10s': 0.24,
      '3m10y': 0.21,
      '2s30s': 0.43,
    },
    inverted: false,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/macro/indicators/:id
 * Specific economic indicator data.
 */
router.get('/indicators/:id', (req: Request, res: Response) => {
  const id = req.params.id.toLowerCase();

  const indicators: Record<string, object> = {
    gdp: {
      id: 'gdp',
      name: 'Gross Domestic Product',
      frequency: 'quarterly',
      unit: 'percent',
      latest: { value: 2.3, date: 'Q4 2024', prior: 3.1 },
      history: [
        { period: 'Q4 2024', value: 2.3 }, { period: 'Q3 2024', value: 3.1 },
        { period: 'Q2 2024', value: 3.0 }, { period: 'Q1 2024', value: 1.4 },
        { period: 'Q4 2023', value: 3.4 }, { period: 'Q3 2023', value: 4.9 },
      ],
    },
    unemployment: {
      id: 'unemployment',
      name: 'Unemployment Rate',
      frequency: 'monthly',
      unit: 'percent',
      latest: { value: 4.0, date: 'Jan 2025', prior: 4.1 },
      history: [
        { period: 'Jan 2025', value: 4.0 }, { period: 'Dec 2024', value: 4.1 },
        { period: 'Nov 2024', value: 4.2 }, { period: 'Oct 2024', value: 4.1 },
        { period: 'Sep 2024', value: 4.1 }, { period: 'Aug 2024', value: 4.2 },
      ],
    },
    cpi: {
      id: 'cpi',
      name: 'Consumer Price Index (YoY)',
      frequency: 'monthly',
      unit: 'percent',
      latest: { value: 3.0, date: 'Jan 2025', prior: 2.9 },
      history: [
        { period: 'Jan 2025', value: 3.0 }, { period: 'Dec 2024', value: 2.9 },
        { period: 'Nov 2024', value: 2.7 }, { period: 'Oct 2024', value: 2.6 },
        { period: 'Sep 2024', value: 2.4 }, { period: 'Aug 2024', value: 2.5 },
      ],
    },
    pce: {
      id: 'pce',
      name: 'PCE Price Index (YoY)',
      frequency: 'monthly',
      unit: 'percent',
      latest: { value: 2.6, date: 'Dec 2024', prior: 2.4 },
      history: [
        { period: 'Dec 2024', value: 2.6 }, { period: 'Nov 2024', value: 2.4 },
        { period: 'Oct 2024', value: 2.3 }, { period: 'Sep 2024', value: 2.1 },
      ],
    },
    nfp: {
      id: 'nfp',
      name: 'Non-Farm Payrolls',
      frequency: 'monthly',
      unit: 'thousands',
      latest: { value: 143, date: 'Jan 2025', prior: 307 },
      history: [
        { period: 'Jan 2025', value: 143 }, { period: 'Dec 2024', value: 307 },
        { period: 'Nov 2024', value: 212 }, { period: 'Oct 2024', value: 12 },
      ],
    },
  };

  const indicator = indicators[id];
  if (!indicator) {
    res.status(404).json({ error: 'NotFound', message: `Indicator '${id}' not found.` });
    return;
  }

  res.json(indicator);
});

export default router;
