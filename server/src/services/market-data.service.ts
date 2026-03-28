import { env } from '../config/env.js';

// ============================================
// Type Definitions
// ============================================

export interface SourceMeta {
  source: string;
  timestamp: string;
  latencyMs: number;
  status: 'ok' | 'partial' | 'error';
  error?: string;
}

export interface TickerQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  previousClose?: number;
  open?: number;
  high?: number;
  low?: number;
  marketCap?: number;
  timestamp?: string;
}

export interface Mover {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface SectorPerformance {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
}

export interface CryptoQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

export interface PolygonSnapshot {
  meta: SourceMeta;
  indices: TickerQuote[];
  gainers: Mover[];
  losers: Mover[];
  sectors: SectorPerformance[];
  crypto: CryptoQuote[];
}

export interface EconomicEvent {
  date: string;
  event: string;
  country: string;
  actual?: string | number | null;
  previous?: string | number | null;
  estimate?: string | number | null;
  impact?: string;
}

export interface EarningsEvent {
  date: string;
  symbol: string;
  eps?: number | null;
  epsEstimated?: number | null;
  revenue?: number | null;
  revenueEstimated?: number | null;
  time?: string;
}

export interface AnalystAction {
  symbol: string;
  publishedDate: string;
  analystCompany: string;
  previousRating?: string;
  newRating: string;
  previousPrice?: number;
  newPrice?: number;
  action: string;
}

export interface CommodityPrice {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface TreasuryYield {
  maturity: string;
  yield: number;
  previousYield?: number;
  change?: number;
}

export interface FmpFundamentals {
  meta: SourceMeta;
  economicCalendar: EconomicEvent[];
  earningsCalendar: EarningsEvent[];
  analystActions: AnalystAction[];
  commodities: CommodityPrice[];
  treasuryYields: TreasuryYield[];
}

export interface CrossCheckQuote {
  ticker: string;
  price: number;
  volume?: number;
  timestamp?: string;
}

export interface ForexRate {
  pair: string;
  rate: number;
  timestamp?: string;
}

export interface AlphaVantageCrossCheck {
  meta: SourceMeta;
  quotes: CrossCheckQuote[];
  forex: ForexRate[];
}

export interface MarketNewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  category: string;
  related?: string;
}

export interface SocialSentiment {
  ticker: string;
  mention: number;
  positiveScore: number;
  negativeScore: number;
  score: number;
}

export interface FinnhubSentiment {
  meta: SourceMeta;
  news: MarketNewsItem[];
  socialSentiment: SocialSentiment[];
}

export interface FredObservation {
  seriesId: string;
  seriesName: string;
  value: number;
  date: string;
  units?: string;
}

export interface FredMacro {
  meta: SourceMeta;
  observations: FredObservation[];
}

export interface OptionContract {
  ticker: string;
  contractType: 'call' | 'put';
  strikePrice: number;
  expirationDate: string;
  volume: number;
  openInterest: number;
  volumeOiRatio: number;
  impliedVolatility?: number;
  lastPrice?: number;
  underlyingPrice?: number;
  unusual: boolean;
}

export interface OptionsFlow {
  meta: SourceMeta;
  spyOptions: OptionContract[];
  unusualActivity: OptionContract[];
}

export interface CrossValidationWarning {
  field: string;
  sourceA: { name: string; value: number };
  sourceB: { name: string; value: number };
  diffPercent: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface CrossValidationResult {
  reliabilityScore: number;
  healthySources: number;
  totalSources: number;
  yieldCurveSpread?: number;
  warnings: CrossValidationWarning[];
}

export interface MarketDataPackage {
  fetchedAt: string;
  polygon: PolygonSnapshot;
  fmp: FmpFundamentals;
  alphaVantage: AlphaVantageCrossCheck;
  finnhub: FinnhubSentiment;
  fred: FredMacro;
  optionsFlow: OptionsFlow;
  crossValidation: CrossValidationResult;
}

// ============================================
// Constants
// ============================================

const INDEX_TICKERS = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIXY'];

const SECTOR_ETFS: Record<string, string> = {
  XLK: 'Technology',
  XLF: 'Financials',
  XLE: 'Energy',
  XLV: 'Health Care',
  XLC: 'Communication Services',
  XLI: 'Industrials',
  XLP: 'Consumer Staples',
  XLU: 'Utilities',
  XLRE: 'Real Estate',
  XLB: 'Materials',
  XLY: 'Consumer Discretionary',
};

const HOT_TICKERS = [
  'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD', 'SPY', 'QQQ',
];

const OPTIONS_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'AMD', 'MSFT', 'META', 'AMZN', 'GOOGL'];

const FRED_SERIES: Record<string, { name: string; units: string }> = {
  FEDFUNDS: { name: 'Fed Funds Rate', units: 'percent' },
  DGS10: { name: '10-Year Treasury Yield', units: 'percent' },
  DGS2: { name: '2-Year Treasury Yield', units: 'percent' },
  CPIAUCSL: { name: 'Consumer Price Index', units: 'index' },
  UNRATE: { name: 'Unemployment Rate', units: 'percent' },
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 15_000;

// ============================================
// Logger
// ============================================

const log = {
  info(msg: string, data?: Record<string, unknown>) {
    console.log(`[MarketData] ${msg}`, data ? JSON.stringify(data) : '');
  },
  warn(msg: string, data?: Record<string, unknown>) {
    console.warn(`[MarketData] WARN: ${msg}`, data ? JSON.stringify(data) : '');
  },
  error(msg: string, data?: Record<string, unknown>) {
    console.error(`[MarketData] ERROR: ${msg}`, data ? JSON.stringify(data) : '');
  },
};

// ============================================
// Utility helpers
// ============================================

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        return response;
      }

      // Do not retry on 4xx errors except 429 (rate-limited)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
    }

    // Exponential back-off with jitter
    if (attempt < retries - 1) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200;
      log.warn(`Retry ${attempt + 1}/${retries} for ${url.split('?')[0]}`, {
        delayMs: Math.round(delay),
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('fetchWithRetry exhausted all retries');
}

function makeMeta(
  source: string,
  startMs: number,
  status: SourceMeta['status'],
  error?: string,
): SourceMeta {
  return {
    source,
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startMs,
    status,
    ...(error ? { error } : {}),
  };
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ============================================
// 1. Polygon.io Snapshot
// ============================================

export async function fetchPolygonSnapshot(): Promise<PolygonSnapshot> {
  const start = Date.now();
  const apiKey = env.POLYGON_API_KEY;

  if (!apiKey) {
    return {
      meta: makeMeta('polygon', start, 'error', 'POLYGON_API_KEY not configured'),
      indices: [],
      gainers: [],
      losers: [],
      sectors: [],
      crypto: [],
    };
  }

  const base = 'https://api.polygon.io/v2/snapshot/locale/us/markets/stocks';

  try {
    // Parallel requests: all tickers snapshot + gainers + losers
    const [allTickersRes, gainersRes, losersRes] = await Promise.all([
      fetchWithRetry(`${base}/tickers?apiKey=${apiKey}`),
      fetchWithRetry(`${base}/gainers?apiKey=${apiKey}`),
      fetchWithRetry(`${base}/losers?apiKey=${apiKey}`),
    ]);

    const [allData, gainersData, losersData] = await Promise.all([
      allTickersRes.json() as Promise<any>,
      gainersRes.json() as Promise<any>,
      losersRes.json() as Promise<any>,
    ]);

    // Build a lookup map
    const tickerMap = new Map<string, any>();
    if (Array.isArray(allData?.tickers)) {
      for (const t of allData.tickers) {
        tickerMap.set(t.ticker, t);
      }
    }

    // Index quotes
    const indices: TickerQuote[] = INDEX_TICKERS.map((ticker) => {
      const t = tickerMap.get(ticker);
      if (!t) return { ticker, price: 0, change: 0, changePercent: 0 };
      const day = t.day ?? {};
      const prevDay = t.prevDay ?? {};
      return {
        ticker,
        price: day.c ?? t.lastTrade?.p ?? 0,
        change: (day.c ?? 0) - (prevDay.c ?? 0),
        changePercent: t.todaysChangePerc ?? 0,
        volume: day.v ?? 0,
        previousClose: prevDay.c ?? 0,
        open: day.o ?? 0,
        high: day.h ?? 0,
        low: day.l ?? 0,
        timestamp: t.updated
          ? new Date(t.updated / 1e6).toISOString()
          : undefined,
      };
    });

    // Sector ETF performance
    const sectors: SectorPerformance[] = Object.entries(SECTOR_ETFS).map(
      ([ticker, name]) => {
        const t = tickerMap.get(ticker);
        if (!t) return { ticker, name, price: 0, changePercent: 0 };
        return {
          ticker,
          name,
          price: t.day?.c ?? t.lastTrade?.p ?? 0,
          changePercent: t.todaysChangePerc ?? 0,
        };
      },
    );

    // Parse movers helper
    const parseMovers = (data: any): Mover[] => {
      if (!Array.isArray(data?.tickers)) return [];
      return data.tickers.slice(0, 10).map((t: any) => ({
        ticker: t.ticker,
        price: t.day?.c ?? t.lastTrade?.p ?? 0,
        change: t.todaysChange ?? 0,
        changePercent: t.todaysChangePerc ?? 0,
        volume: t.day?.v ?? 0,
      }));
    };

    const gainers = parseMovers(gainersData);
    const losers = parseMovers(losersData);

    // Crypto via Polygon crypto endpoint
    let crypto: CryptoQuote[] = [];
    try {
      const cryptoRes = await fetchWithRetry(
        `https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers?tickers=X:BTCUSD,X:ETHUSD&apiKey=${apiKey}`,
      );
      const cryptoData = (await cryptoRes.json()) as any;
      if (Array.isArray(cryptoData?.tickers)) {
        crypto = cryptoData.tickers.map((t: any) => ({
          symbol: t.ticker === 'X:BTCUSD' ? 'BTC' : 'ETH',
          price: t.lastTrade?.p ?? t.day?.c ?? 0,
          change: t.todaysChange ?? 0,
          changePercent: t.todaysChangePerc ?? 0,
          volume: t.day?.v ?? 0,
        }));
      }
    } catch (err) {
      log.warn('Polygon crypto sub-request failed; continuing without crypto', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      meta: makeMeta('polygon', start, 'ok'),
      indices,
      gainers,
      losers,
      sectors,
      crypto,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('Polygon snapshot failed', { error: msg });
    return {
      meta: makeMeta('polygon', start, 'error', msg),
      indices: [],
      gainers: [],
      losers: [],
      sectors: [],
      crypto: [],
    };
  }
}

// ============================================
// 2. Financial Modeling Prep Fundamentals
// ============================================

export async function fetchFmpFundamentals(): Promise<FmpFundamentals> {
  const start = Date.now();
  const apiKey = env.FMP_API_KEY;

  const empty: FmpFundamentals = {
    meta: makeMeta('fmp', start, 'error', 'FMP_API_KEY not configured'),
    economicCalendar: [],
    earningsCalendar: [],
    analystActions: [],
    commodities: [],
    treasuryYields: [],
  };

  if (!apiKey) return empty;

  const base = 'https://financialmodelingprep.com/api/v3';
  const today = new Date();
  const todayStr = toDateStr(today);

  const fiveDaysOut = new Date(today);
  fiveDaysOut.setDate(today.getDate() + 5);

  // Week boundaries for earnings
  const dow = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const errors: string[] = [];

  const tasks = await Promise.allSettled([
    // 0: economic calendar
    fetchWithRetry(
      `${base}/economic_calendar?from=${todayStr}&to=${toDateStr(fiveDaysOut)}&apikey=${apiKey}`,
    ).then((r) => r.json()),

    // 1: earnings calendar
    fetchWithRetry(
      `${base}/earning_calendar?from=${toDateStr(weekStart)}&to=${toDateStr(weekEnd)}&apikey=${apiKey}`,
    ).then((r) => r.json()),

    // 2: analyst upgrades/downgrades
    fetchWithRetry(`${base}/upgrades-downgrades?apikey=${apiKey}`).then((r) =>
      r.json(),
    ),

    // 3: commodity prices (gold, silver, oil, nat gas)
    fetchWithRetry(
      `${base}/quote/GCUSD,SIUSD,CLUSD,NGUSD?apikey=${apiKey}`,
    ).then((r) => r.json()),

    // 4: treasury yields
    fetchWithRetry(
      `${base}/treasury?from=${todayStr}&to=${todayStr}&apikey=${apiKey}`,
    ).then((r) => r.json()),
  ]);

  // --- economic calendar ---
  let economicCalendar: EconomicEvent[] = [];
  if (tasks[0].status === 'fulfilled' && Array.isArray(tasks[0].value)) {
    economicCalendar = tasks[0].value.map((e: any) => ({
      date: e.date ?? '',
      event: e.event ?? '',
      country: e.country ?? 'US',
      actual: e.actual ?? null,
      previous: e.previous ?? null,
      estimate: e.estimate ?? null,
      impact: e.impact ?? undefined,
    }));
  } else {
    errors.push('economic_calendar');
  }

  // --- earnings calendar ---
  let earningsCalendar: EarningsEvent[] = [];
  if (tasks[1].status === 'fulfilled' && Array.isArray(tasks[1].value)) {
    earningsCalendar = tasks[1].value.map((e: any) => ({
      date: e.date ?? '',
      symbol: e.symbol ?? '',
      eps: e.eps ?? null,
      epsEstimated: e.epsEstimated ?? null,
      revenue: e.revenue ?? null,
      revenueEstimated: e.revenueEstimated ?? null,
      time: e.time ?? undefined,
    }));
  } else {
    errors.push('earnings_calendar');
  }

  // --- analyst actions (today only) ---
  let analystActions: AnalystAction[] = [];
  if (tasks[2].status === 'fulfilled' && Array.isArray(tasks[2].value)) {
    analystActions = tasks[2].value
      .filter((a: any) => a.publishedDate?.startsWith(todayStr))
      .map((a: any) => ({
        symbol: a.symbol ?? '',
        publishedDate: a.publishedDate ?? '',
        analystCompany: a.gradingCompany ?? a.analystCompany ?? '',
        previousRating: a.previousGrade ?? undefined,
        newRating: a.newGrade ?? '',
        previousPrice: a.previousPrice ?? undefined,
        newPrice: a.newPrice ?? undefined,
        action: a.action ?? '',
      }));
  } else {
    errors.push('analyst_actions');
  }

  // --- commodities ---
  const commodityNameMap: Record<string, { name: string; symbol: string }> = {
    GCUSD: { name: 'Gold', symbol: 'GC' },
    SIUSD: { name: 'Silver', symbol: 'SI' },
    CLUSD: { name: 'Crude Oil', symbol: 'CL' },
    NGUSD: { name: 'Natural Gas', symbol: 'NG' },
  };
  let commodities: CommodityPrice[] = [];
  if (tasks[3].status === 'fulfilled' && Array.isArray(tasks[3].value)) {
    commodities = tasks[3].value.map((c: any) => {
      const mapped = commodityNameMap[c.symbol] ?? {
        name: c.name ?? c.symbol,
        symbol: c.symbol,
      };
      return {
        name: mapped.name,
        symbol: mapped.symbol,
        price: c.price ?? 0,
        change: c.change ?? 0,
        changePercent: c.changesPercentage ?? 0,
      };
    });
  } else {
    errors.push('commodities');
  }

  // --- treasury yields ---
  let treasuryYields: TreasuryYield[] = [];
  if (tasks[4].status === 'fulfilled') {
    const raw = Array.isArray(tasks[4].value)
      ? tasks[4].value[0]
      : tasks[4].value;
    if (raw) {
      const maturities = [
        { key: 'month1', label: '1M' },
        { key: 'month3', label: '3M' },
        { key: 'month6', label: '6M' },
        { key: 'year1', label: '1Y' },
        { key: 'year2', label: '2Y' },
        { key: 'year5', label: '5Y' },
        { key: 'year10', label: '10Y' },
        { key: 'year20', label: '20Y' },
        { key: 'year30', label: '30Y' },
      ];
      treasuryYields = maturities
        .filter((m) => raw[m.key] != null)
        .map((m) => ({
          maturity: m.label,
          yield: Number(raw[m.key]),
        }));
    }
  } else {
    errors.push('treasury_yields');
  }

  const status: SourceMeta['status'] =
    errors.length === 0 ? 'ok' : errors.length < 5 ? 'partial' : 'error';

  return {
    meta: makeMeta(
      'fmp',
      start,
      status,
      errors.length > 0 ? `Failed sub-requests: ${errors.join(', ')}` : undefined,
    ),
    economicCalendar,
    earningsCalendar,
    analystActions,
    commodities,
    treasuryYields,
  };
}

// ============================================
// 3. Alpha Vantage Cross-Check
// ============================================

export async function fetchAlphaVantageCrossCheck(): Promise<AlphaVantageCrossCheck> {
  const start = Date.now();
  const apiKey = env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return {
      meta: makeMeta(
        'alpha_vantage',
        start,
        'error',
        'ALPHA_VANTAGE_API_KEY not configured',
      ),
      quotes: [],
      forex: [],
    };
  }

  const base = 'https://www.alphavantage.co/query';
  const errors: string[] = [];

  const tasks = await Promise.allSettled([
    fetchWithRetry(
      `${base}?function=GLOBAL_QUOTE&symbol=SPY&apikey=${apiKey}`,
    ).then((r) => r.json()),
    fetchWithRetry(
      `${base}?function=GLOBAL_QUOTE&symbol=QQQ&apikey=${apiKey}`,
    ).then((r) => r.json()),
    fetchWithRetry(
      `${base}?function=CURRENCY_EXCHANGE_RATE&from_currency=EUR&to_currency=USD&apikey=${apiKey}`,
    ).then((r) => r.json()),
  ]);

  // Parse equity quotes
  const quotes: CrossCheckQuote[] = [];
  const tickers = ['SPY', 'QQQ'];
  for (let i = 0; i < 2; i++) {
    if (tasks[i].status === 'fulfilled') {
      const gq = tasks[i].value?.['Global Quote'];
      if (gq?.['05. price']) {
        quotes.push({
          ticker: tickers[i],
          price: parseFloat(gq['05. price']),
          volume: gq['06. volume']
            ? parseInt(gq['06. volume'], 10)
            : undefined,
          timestamp: gq['07. latest trading day'] ?? undefined,
        });
      } else {
        errors.push(`quote_${tickers[i]}`);
      }
    } else {
      errors.push(`quote_${tickers[i]}`);
    }
  }

  // Parse forex
  const forex: ForexRate[] = [];
  if (tasks[2].status === 'fulfilled') {
    const rate = tasks[2].value?.['Realtime Currency Exchange Rate'];
    if (rate?.['5. Exchange Rate']) {
      forex.push({
        pair: 'EUR/USD',
        rate: parseFloat(rate['5. Exchange Rate']),
        timestamp: rate['6. Last Refreshed'] ?? undefined,
      });
    } else {
      errors.push('forex_EURUSD');
    }
  } else {
    errors.push('forex_EURUSD');
  }

  const status: SourceMeta['status'] =
    errors.length === 0 ? 'ok' : errors.length < 3 ? 'partial' : 'error';

  return {
    meta: makeMeta(
      'alpha_vantage',
      start,
      status,
      errors.length > 0 ? `Failed: ${errors.join(', ')}` : undefined,
    ),
    quotes,
    forex,
  };
}

// ============================================
// 4. Finnhub Sentiment & News
// ============================================

export async function fetchFinnhubSentiment(): Promise<FinnhubSentiment> {
  const start = Date.now();
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return {
      meta: makeMeta('finnhub', start, 'error', 'FINNHUB_API_KEY not configured'),
      news: [],
      socialSentiment: [],
    };
  }

  const base = 'https://finnhub.io/api/v1';
  const errors: string[] = [];

  // --- Market news (general, top 25) ---
  let news: MarketNewsItem[] = [];
  try {
    const res = await fetchWithRetry(
      `${base}/news?category=general&minId=0&token=${apiKey}`,
    );
    const data = (await res.json()) as any[];
    if (Array.isArray(data)) {
      news = data.slice(0, 25).map((n: any) => ({
        id: String(n.id ?? ''),
        headline: n.headline ?? '',
        summary: n.summary ?? '',
        source: n.source ?? '',
        url: n.url ?? '',
        datetime: n.datetime ?? 0,
        category: n.category ?? 'general',
        related: n.related ?? undefined,
      }));
    }
  } catch (err) {
    errors.push('market_news');
    log.warn('Finnhub market news failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // --- Social sentiment for hot tickers ---
  // Serialize requests to respect Finnhub's rate limits (30 req/s on free tier)
  const socialSentiment: SocialSentiment[] = [];
  const todayStr = toDateStr(new Date());

  for (const ticker of HOT_TICKERS) {
    try {
      const res = await fetchWithRetry(
        `${base}/stock/social-sentiment?symbol=${ticker}&from=${todayStr}&token=${apiKey}`,
      );
      const data = (await res.json()) as any;
      const allPosts = [
        ...(data.reddit ?? []),
        ...(data.twitter ?? []),
      ];

      if (allPosts.length > 0) {
        const total = allPosts.length;
        const avgPos =
          allPosts.reduce(
            (s: number, p: any) => s + (p.positiveMention ?? 0),
            0,
          ) / total;
        const avgNeg =
          allPosts.reduce(
            (s: number, p: any) => s + (p.negativeMention ?? 0),
            0,
          ) / total;

        socialSentiment.push({
          ticker,
          mention: total,
          positiveScore: Math.round(avgPos * 1000) / 1000,
          negativeScore: Math.round(avgNeg * 1000) / 1000,
          score: Math.round((avgPos - avgNeg) * 1000) / 1000,
        });
      } else {
        socialSentiment.push({
          ticker,
          mention: 0,
          positiveScore: 0,
          negativeScore: 0,
          score: 0,
        });
      }
    } catch {
      // Individual ticker failure is non-fatal
      socialSentiment.push({
        ticker,
        mention: 0,
        positiveScore: 0,
        negativeScore: 0,
        score: 0,
      });
    }
  }

  const status: SourceMeta['status'] = errors.length === 0 ? 'ok' : 'partial';

  return {
    meta: makeMeta(
      'finnhub',
      start,
      status,
      errors.length > 0 ? `Failed: ${errors.join(', ')}` : undefined,
    ),
    news,
    socialSentiment,
  };
}

// ============================================
// 5. FRED Macro Data
// ============================================

export async function fetchFredMacro(): Promise<FredMacro> {
  const start = Date.now();
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    return {
      meta: makeMeta('fred', start, 'error', 'FRED_API_KEY not configured'),
      observations: [],
    };
  }

  const base = 'https://api.stlouisfed.org/fred/series/observations';
  const errors: string[] = [];
  const observations: FredObservation[] = [];

  const tasks = await Promise.allSettled(
    Object.entries(FRED_SERIES).map(async ([seriesId, info]) => {
      const res = await fetchWithRetry(
        `${base}?series_id=${seriesId}&sort_order=desc&limit=1&file_type=json&api_key=${apiKey}`,
      );
      return { seriesId, info, data: (await res.json()) as any };
    }),
  );

  for (const task of tasks) {
    if (task.status === 'fulfilled') {
      const { seriesId, info, data } = task.value;
      const obs = data?.observations;
      if (Array.isArray(obs) && obs.length > 0) {
        const val = parseFloat(obs[0].value);
        if (!isNaN(val)) {
          observations.push({
            seriesId,
            seriesName: info.name,
            value: val,
            date: obs[0].date ?? '',
            units: info.units,
          });
        } else {
          errors.push(seriesId);
        }
      } else {
        errors.push(seriesId);
      }
    } else {
      errors.push('series_fetch');
    }
  }

  const status: SourceMeta['status'] =
    errors.length === 0
      ? 'ok'
      : observations.length > 0
        ? 'partial'
        : 'error';

  return {
    meta: makeMeta(
      'fred',
      start,
      status,
      errors.length > 0 ? `Failed: ${errors.join(', ')}` : undefined,
    ),
    observations,
  };
}

// ============================================
// 6. Options Flow (Polygon)
// ============================================

export async function fetchOptionsFlow(): Promise<OptionsFlow> {
  const start = Date.now();
  const apiKey = env.POLYGON_API_KEY;

  if (!apiKey) {
    return {
      meta: makeMeta(
        'polygon_options',
        start,
        'error',
        'POLYGON_API_KEY not configured',
      ),
      spyOptions: [],
      unusualActivity: [],
    };
  }

  const base = 'https://api.polygon.io/v3/snapshot/options';
  const errors: string[] = [];

  // Helper to normalize a single options result into an OptionContract
  const toContract = (ticker: string, o: any): OptionContract => {
    const details = o.details ?? {};
    const day = o.day ?? {};
    const vol = day.volume ?? 0;
    const oi = o.open_interest ?? 0;
    const ratio = oi > 0 ? vol / oi : 0;
    return {
      ticker,
      contractType: details.contract_type === 'call' ? 'call' : 'put',
      strikePrice: details.strike_price ?? 0,
      expirationDate: details.expiration_date ?? '',
      volume: vol,
      openInterest: oi,
      volumeOiRatio: Math.round(ratio * 100) / 100,
      impliedVolatility: o.implied_volatility ?? undefined,
      lastPrice: day.close ?? o.last_quote?.midpoint ?? undefined,
      underlyingPrice: o.underlying_asset?.price ?? undefined,
      unusual: oi > 0 && ratio > 3,
    };
  };

  // --- SPY options snapshot (top by volume) ---
  let spyOptions: OptionContract[] = [];
  try {
    const res = await fetchWithRetry(
      `${base}/SPY?order=desc&sort=volume&limit=50&apiKey=${apiKey}`,
    );
    const data = (await res.json()) as any;
    if (Array.isArray(data?.results)) {
      spyOptions = data.results.map((o: any) => toContract('SPY', o));
    }
  } catch (err) {
    errors.push('spy_options');
    log.warn('SPY options snapshot failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // --- Unusual activity on hot tickers ---
  const unusualActivity: OptionContract[] = [];

  const tickerTasks = await Promise.allSettled(
    OPTIONS_TICKERS.map(async (ticker) => {
      const res = await fetchWithRetry(
        `${base}/${ticker}?order=desc&sort=volume&limit=20&apiKey=${apiKey}`,
      );
      return { ticker, data: (await res.json()) as any };
    }),
  );

  for (let i = 0; i < tickerTasks.length; i++) {
    const task = tickerTasks[i];
    if (task.status === 'fulfilled') {
      const { ticker, data } = task.value;
      if (Array.isArray(data?.results)) {
        for (const o of data.results) {
          const contract = toContract(ticker, o);
          if (contract.unusual) {
            unusualActivity.push(contract);
          }
        }
      }
    } else {
      errors.push(`options_${OPTIONS_TICKERS[i]}`);
    }
  }

  // Sort unusual by volume/OI ratio descending
  unusualActivity.sort((a, b) => b.volumeOiRatio - a.volumeOiRatio);

  const status: SourceMeta['status'] =
    errors.length === 0
      ? 'ok'
      : spyOptions.length > 0
        ? 'partial'
        : 'error';

  return {
    meta: makeMeta(
      'polygon_options',
      start,
      status,
      errors.length > 0 ? `Failed: ${errors.join(', ')}` : undefined,
    ),
    spyOptions,
    unusualActivity,
  };
}

// ============================================
// 7. Cross-Validation Engine
// ============================================

export function crossValidate(
  polygon: PolygonSnapshot,
  fmp: FmpFundamentals,
  alpha: AlphaVantageCrossCheck,
  fred: FredMacro,
): CrossValidationResult {
  const warnings: CrossValidationWarning[] = [];
  const sources = [polygon, fmp, alpha, fred];
  const healthySources = sources.filter((s) => s.meta.status !== 'error').length;
  const totalSources = sources.length;

  // --- Price cross-check helper ---
  const checkPriceDiff = (
    ticker: string,
    polygonPrice: number | undefined,
    alphaPrice: number | undefined,
  ) => {
    if (!polygonPrice || !alphaPrice || polygonPrice === 0 || alphaPrice === 0) return;
    const diff = Math.abs(polygonPrice - alphaPrice);
    const pct = (diff / polygonPrice) * 100;
    if (pct > 1.5) {
      warnings.push({
        field: `${ticker} price`,
        sourceA: { name: 'Polygon', value: polygonPrice },
        sourceB: { name: 'Alpha Vantage', value: alphaPrice },
        diffPercent: Math.round(pct * 100) / 100,
        severity: pct > 3 ? 'high' : 'medium',
        message: `${ticker} price discrepancy of ${pct.toFixed(2)}% between Polygon ($${polygonPrice.toFixed(2)}) and Alpha Vantage ($${alphaPrice.toFixed(2)})`,
      });
    }
  };

  // SPY cross-check
  const polygonSpy = polygon.indices.find((i) => i.ticker === 'SPY');
  const alphaSpy = alpha.quotes.find((q) => q.ticker === 'SPY');
  checkPriceDiff('SPY', polygonSpy?.price, alphaSpy?.price);

  // QQQ cross-check
  const polygonQqq = polygon.indices.find((i) => i.ticker === 'QQQ');
  const alphaQqq = alpha.quotes.find((q) => q.ticker === 'QQQ');
  checkPriceDiff('QQQ', polygonQqq?.price, alphaQqq?.price);

  // --- Treasury yield cross-check (FMP vs FRED, flag if >5bps diff) ---
  const checkYield = (maturity: string, fmpYield: number | undefined, fredValue: number | undefined) => {
    if (fmpYield == null || fredValue == null) return;
    const diffBps = Math.abs(fmpYield - fredValue) * 100;
    if (diffBps > 5) {
      warnings.push({
        field: `${maturity} Treasury Yield`,
        sourceA: { name: 'FMP', value: fmpYield },
        sourceB: { name: 'FRED', value: fredValue },
        diffPercent: Math.round(diffBps) / 100,
        severity: diffBps > 15 ? 'high' : 'medium',
        message: `${maturity} yield discrepancy of ${diffBps.toFixed(0)}bps between FMP (${fmpYield.toFixed(3)}%) and FRED (${fredValue.toFixed(3)}%)`,
      });
    }
  };

  const fmp10Y = fmp.treasuryYields.find((y) => y.maturity === '10Y');
  const fred10Y = fred.observations.find((o) => o.seriesId === 'DGS10');
  checkYield('10Y', fmp10Y?.yield, fred10Y?.value);

  const fmp2Y = fmp.treasuryYields.find((y) => y.maturity === '2Y');
  const fred2Y = fred.observations.find((o) => o.seriesId === 'DGS2');
  checkYield('2Y', fmp2Y?.yield, fred2Y?.value);

  // --- Yield curve spread (10Y - 2Y) using best available data ---
  let yieldCurveSpread: number | undefined;
  const y10 = fred10Y?.value ?? fmp10Y?.yield;
  const y2 = fred2Y?.value ?? fmp2Y?.yield;
  if (y10 != null && y2 != null) {
    yieldCurveSpread = Math.round((y10 - y2) * 1000) / 1000;
  }

  // --- Reliability score ---
  let score = healthySources / totalSources;
  const highCount = warnings.filter((w) => w.severity === 'high').length;
  const medCount = warnings.filter((w) => w.severity === 'medium').length;
  score -= highCount * 0.15;
  score -= medCount * 0.05;
  const reliabilityScore =
    Math.round(Math.max(0, Math.min(1, score)) * 100) / 100;

  return {
    reliabilityScore,
    healthySources,
    totalSources,
    yieldCurveSpread,
    warnings,
  };
}

// ============================================
// 8. Master Orchestrator
// ============================================

export async function fetchAllMarketData(): Promise<MarketDataPackage> {
  log.info('Starting full market data fetch across all sources');
  const start = Date.now();

  const [
    polygonResult,
    fmpResult,
    alphaResult,
    finnhubResult,
    fredResult,
    optionsResult,
  ] = await Promise.allSettled([
    fetchPolygonSnapshot(),
    fetchFmpFundamentals(),
    fetchAlphaVantageCrossCheck(),
    fetchFinnhubSentiment(),
    fetchFredMacro(),
    fetchOptionsFlow(),
  ]);

  // Unwrap with safe fallbacks for unexpected rejections
  const polygon: PolygonSnapshot =
    polygonResult.status === 'fulfilled'
      ? polygonResult.value
      : {
          meta: makeMeta('polygon', start, 'error', String(polygonResult.reason)),
          indices: [],
          gainers: [],
          losers: [],
          sectors: [],
          crypto: [],
        };

  const fmp: FmpFundamentals =
    fmpResult.status === 'fulfilled'
      ? fmpResult.value
      : {
          meta: makeMeta('fmp', start, 'error', String(fmpResult.reason)),
          economicCalendar: [],
          earningsCalendar: [],
          analystActions: [],
          commodities: [],
          treasuryYields: [],
        };

  const alphaVantage: AlphaVantageCrossCheck =
    alphaResult.status === 'fulfilled'
      ? alphaResult.value
      : {
          meta: makeMeta('alpha_vantage', start, 'error', String(alphaResult.reason)),
          quotes: [],
          forex: [],
        };

  const finnhub: FinnhubSentiment =
    finnhubResult.status === 'fulfilled'
      ? finnhubResult.value
      : {
          meta: makeMeta('finnhub', start, 'error', String(finnhubResult.reason)),
          news: [],
          socialSentiment: [],
        };

  const fred: FredMacro =
    fredResult.status === 'fulfilled'
      ? fredResult.value
      : {
          meta: makeMeta('fred', start, 'error', String(fredResult.reason)),
          observations: [],
        };

  const optionsFlow: OptionsFlow =
    optionsResult.status === 'fulfilled'
      ? optionsResult.value
      : {
          meta: makeMeta('polygon_options', start, 'error', String(optionsResult.reason)),
          spyOptions: [],
          unusualActivity: [],
        };

  // Cross-validate results from multiple sources
  const crossValidation = crossValidate(polygon, fmp, alphaVantage, fred);

  const totalMs = Date.now() - start;
  log.info('Full market data fetch complete', {
    totalMs,
    reliability: crossValidation.reliabilityScore,
    healthySources: crossValidation.healthySources,
    totalSources: crossValidation.totalSources,
    warningCount: crossValidation.warnings.length,
    yieldCurveSpread: crossValidation.yieldCurveSpread,
  });

  return {
    fetchedAt: new Date().toISOString(),
    polygon,
    fmp,
    alphaVantage: alphaVantage,
    finnhub,
    fred,
    optionsFlow,
    crossValidation,
  };
}
