import { NextRequest, NextResponse } from "next/server";
import { validateTicker } from "@/lib/validation";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/stock/:ticker/filing-insights
 *
 * Returns the latest AI-extracted SEC filing insights for a given ticker.
 * Data source: sec_filing_extracts + sec_filing_changes tables populated
 * by the Python SEC analyzer pipeline.
 *
 * Includes:
 *  - Latest filings (8-K, 10-Q, 10-K, Form 4) with structured extractions
 *  - Material events with sentiment and magnitude
 *  - Financial metric changes (guidance revisions)
 *  - Insider transactions
 *  - New risk factors
 *  - Cross-filing change detections (guidance changes, tone shifts)
 *  - Key management quotes
 *
 * Falls back to in-memory demo data when database is unavailable.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.stockData);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { ticker: rawTicker } = await params;
  const ticker = validateTicker(rawTicker);
  if (!ticker) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
  }

  try {
    // Attempt to fetch from database (PostgreSQL via Prisma)
    const dbData = await fetchFromDatabase(ticker);
    if (dbData) {
      return NextResponse.json(dbData, {
        headers: {
          "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600",
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-Data-Source": "proprietary-sec-pipeline",
        },
      });
    }

    // Fallback: return demo data shaped like real pipeline output
    // This lets the frontend render immediately while the pipeline builds the dataset
    return NextResponse.json(buildDemoInsights(ticker), {
      headers: {
        "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-Data-Source": "demo",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch filing insights" },
      { status: 500 }
    );
  }
}

/**
 * Fetch filing insights from the SEC pipeline's internal API.
 *
 * The Python SEC analyzer pipeline exposes data via the sec_filing_extracts
 * and sec_filing_changes PostgreSQL tables. When the Express backend server
 * is running, it proxies DB queries. In development, we use the internal
 * backend API at localhost:4000.
 *
 * Returns null if the backend is unavailable or no data exists.
 */
async function fetchFromDatabase(ticker: string): Promise<FilingInsightsResponse | null> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

  try {
    const resp = await fetch(
      `${backendUrl}/api/sec/filing-insights/${encodeURIComponent(ticker)}`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!resp.ok) return null;

    const data = await resp.json();
    if (!data || !data.filings || data.filings.length === 0) return null;

    return data as FilingInsightsResponse;
  } catch {
    // Backend unavailable — fall through to demo data
    return null;
  }
}

/**
 * Build demo insights that match the real data shape.
 * Provides meaningful placeholder data for each ticker.
 */
function buildDemoInsights(ticker: string): FilingInsightsResponse {
  const company = DEMO_COMPANIES[ticker] || `${ticker} Inc.`;
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  return {
    ticker,
    dataSource: "demo",
    lastUpdated: new Date().toISOString(),
    filings: [
      {
        accessionNumber: `0001-24-${Date.now().toString(36)}`,
        filingType: "8-K",
        company,
        filedDate: today,
        materialEvents: [
          {
            event_type: "buyback_authorization",
            summary: `${company} board authorized $10B additional share buyback program`,
            sentiment: "positive",
            magnitude: "high",
          },
        ],
        financialMetrics: [],
        insiderTransactions: [],
        riskFactorsNew: [],
        keyQuotes: [
          "We continue to see strong demand across all segments and are raising our full-year outlook.",
        ],
      },
      {
        accessionNumber: `0002-24-${Date.now().toString(36)}`,
        filingType: "10-Q",
        company,
        filedDate: thirtyDaysAgo,
        materialEvents: [
          {
            event_type: "guidance_change",
            summary: `${company} raised FY2026 revenue guidance from $95-98B to $98-101B`,
            sentiment: "positive",
            magnitude: "high",
          },
        ],
        financialMetrics: [
          {
            metric: "revenue_guidance",
            old_value: "$95-98B",
            new_value: "$98-101B",
          },
          {
            metric: "gross_margin",
            old_value: "45.2%",
            new_value: "46.8%",
          },
        ],
        insiderTransactions: [],
        riskFactorsNew: [
          "Increased regulatory scrutiny in key international markets may impact operations",
        ],
        keyQuotes: [],
      },
    ],
    aggregated: {
      totalFilings: 2,
      materialEvents: [
        {
          event_type: "buyback_authorization",
          summary: `${company} board authorized $10B additional share buyback program`,
          sentiment: "positive",
          magnitude: "high",
        },
        {
          event_type: "guidance_change",
          summary: `${company} raised FY2026 revenue guidance from $95-98B to $98-101B`,
          sentiment: "positive",
          magnitude: "high",
        },
      ],
      guidanceChanges: [
        {
          metric: "revenue_guidance",
          old_value: "$95-98B",
          new_value: "$98-101B",
        },
      ],
      insiderTransactions: [
        {
          name: "Jane Smith",
          title: "CFO",
          action: "sell",
          shares: 15000,
          price: 185.42,
          total_value: 2781300,
        },
      ],
      newRiskFactors: [
        "Increased regulatory scrutiny in key international markets may impact operations",
      ],
      keyQuotes: [
        "We continue to see strong demand across all segments and are raising our full-year outlook.",
      ],
    },
    changes: [
      {
        changeType: "guidance_change",
        description: `${company} raised FY2026 revenue guidance from $95-98B to $98-101B`,
        severity: "high",
        currentFilingDate: thirtyDaysAgo,
        priorFilingDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
          .toISOString().slice(0, 10),
      },
    ],
  };
}

// ─── Types ──────────────────────────────────────────────

interface MaterialEventDTO {
  event_type: string;
  summary: string;
  sentiment: string;
  magnitude: string;
}

interface MetricChangeDTO {
  metric: string;
  old_value: string;
  new_value: string;
}

interface InsiderTxDTO {
  name: string;
  title: string;
  action: string;
  shares: number;
  price: number;
  total_value: number;
}

interface FilingDTO {
  accessionNumber: string;
  filingType: string;
  company: string;
  filedDate: string;
  materialEvents: MaterialEventDTO[];
  financialMetrics: MetricChangeDTO[];
  insiderTransactions: InsiderTxDTO[];
  riskFactorsNew: string[];
  keyQuotes: string[];
}

interface FilingChangeDTO {
  changeType: string;
  description: string;
  severity: string;
  currentFilingDate: string;
  priorFilingDate: string;
}

interface FilingInsightsResponse {
  ticker: string;
  dataSource: string;
  lastUpdated: string;
  filings: FilingDTO[];
  aggregated: {
    totalFilings: number;
    materialEvents: MaterialEventDTO[];
    guidanceChanges: MetricChangeDTO[];
    insiderTransactions: InsiderTxDTO[];
    newRiskFactors: string[];
    keyQuotes: string[];
  };
  changes: FilingChangeDTO[];
}

const DEMO_COMPANIES: Record<string, string> = {
  AAPL: "Apple Inc.",
  NVDA: "NVIDIA Corporation",
  MSFT: "Microsoft Corporation",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com Inc.",
  META: "Meta Platforms Inc.",
  TSLA: "Tesla Inc.",
  JPM: "JPMorgan Chase & Co.",
  V: "Visa Inc.",
  UNH: "UnitedHealth Group Inc.",
};
