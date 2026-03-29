import { NextRequest, NextResponse } from "next/server";
import { generateRecommendations, type CandidateSymbol } from "@/services/alpha-engine";
import type { MarketSignal, Sector, MarketCapBucket, StrategyTag, ActionType, SignalType } from "@/types/alpha-engine";

const DEMO_USER_ID = "demo_user";

export async function POST(req: NextRequest) {
  let body: { candidates?: CandidateInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // If no candidates provided, use demo signals
  const candidates: CandidateSymbol[] = body.candidates?.length
    ? body.candidates.map(normalizeCandidateInput)
    : getDemoCandidates();

  if (candidates.length === 0) {
    return NextResponse.json({ error: "At least one candidate is required" }, { status: 400 });
  }

  if (candidates.length > 50) {
    return NextResponse.json({ error: "Maximum 50 candidates per run" }, { status: 400 });
  }

  const { run, items } = generateRecommendations(DEMO_USER_ID, candidates);

  return NextResponse.json({
    run,
    items,
    message: `Generated ${items.length} recommendations from ${candidates.length} candidates`,
  });
}

interface CandidateInput {
  symbol: string;
  signals?: Partial<MarketSignal>[];
  sector?: Sector;
  marketCapBucket?: MarketCapBucket;
  suggestedStrategy?: StrategyTag;
  suggestedAction?: ActionType;
}

function normalizeCandidateInput(input: CandidateInput): CandidateSymbol {
  const now = new Date().toISOString();
  return {
    symbol: input.symbol.toUpperCase(),
    signals: (input.signals ?? []).map((s, i) => ({
      id: `sig_${Date.now()}_${i}`,
      symbol: input.symbol.toUpperCase(),
      signalType: (s.signalType ?? "price_momentum") as SignalType,
      signalTimestamp: s.signalTimestamp ?? now,
      signalStrength: s.signalStrength ?? 50,
      rawPayload: s.rawPayload ?? {},
      derivedTags: s.derivedTags ?? [],
      sector: (input.sector ?? null) as Sector | null,
      marketContext: s.marketContext ?? null,
      confidenceBase: s.confidenceBase ?? 0.5,
      createdAt: now,
    })),
    sector: (input.sector ?? null) as Sector | null,
    marketCapBucket: (input.marketCapBucket ?? null) as MarketCapBucket | null,
    suggestedStrategy: (input.suggestedStrategy ?? "momentum") as StrategyTag,
    suggestedAction: (input.suggestedAction ?? "buy") as ActionType,
  };
}

/** Demo candidates for testing without external signal data */
function getDemoCandidates(): CandidateSymbol[] {
  const now = new Date().toISOString();
  return [
    {
      symbol: "NVDA",
      signals: [
        { id: "sig_1", symbol: "NVDA", signalType: "options_flow", signalTimestamp: now, signalStrength: 82, rawPayload: {}, derivedTags: ["bullish_sweep"], sector: "Technology", marketContext: "AI spending acceleration", confidenceBase: 0.78, createdAt: now },
        { id: "sig_2", symbol: "NVDA", signalType: "earnings_sentiment", signalTimestamp: now, signalStrength: 75, rawPayload: {}, derivedTags: ["beat_estimates"], sector: "Technology", marketContext: null, confidenceBase: 0.72, createdAt: now },
        { id: "sig_3", symbol: "NVDA", signalType: "price_momentum", signalTimestamp: now, signalStrength: 68, rawPayload: {}, derivedTags: [], sector: "Technology", marketContext: null, confidenceBase: 0.65, createdAt: now },
      ],
      sector: "Technology",
      marketCapBucket: "mega",
      suggestedStrategy: "momentum",
      suggestedAction: "buy",
    },
    {
      symbol: "AAPL",
      signals: [
        { id: "sig_4", symbol: "AAPL", signalType: "price_momentum", signalTimestamp: now, signalStrength: 55, rawPayload: {}, derivedTags: [], sector: "Technology", marketContext: null, confidenceBase: 0.6, createdAt: now },
        { id: "sig_5", symbol: "AAPL", signalType: "sec_filing", signalTimestamp: now, signalStrength: 40, rawPayload: {}, derivedTags: [], sector: "Technology", marketContext: null, confidenceBase: 0.5, createdAt: now },
      ],
      sector: "Technology",
      marketCapBucket: "mega",
      suggestedStrategy: "value",
      suggestedAction: "buy",
    },
    {
      symbol: "JPM",
      signals: [
        { id: "sig_6", symbol: "JPM", signalType: "earnings_sentiment", signalTimestamp: now, signalStrength: 72, rawPayload: {}, derivedTags: ["guidance_raise"], sector: "Financials", marketContext: "Rate environment favorable", confidenceBase: 0.7, createdAt: now },
      ],
      sector: "Financials",
      marketCapBucket: "mega",
      suggestedStrategy: "earnings_play",
      suggestedAction: "buy",
    },
    {
      symbol: "TSLA",
      signals: [
        { id: "sig_7", symbol: "TSLA", signalType: "options_flow", signalTimestamp: now, signalStrength: 65, rawPayload: {}, derivedTags: ["put_wall_break"], sector: "Consumer Discretionary", marketContext: null, confidenceBase: 0.45, createdAt: now },
        { id: "sig_8", symbol: "TSLA", signalType: "volume_breakout", signalTimestamp: now, signalStrength: 58, rawPayload: {}, derivedTags: [], sector: "Consumer Discretionary", marketContext: null, confidenceBase: 0.52, createdAt: now },
      ],
      sector: "Consumer Discretionary",
      marketCapBucket: "mega",
      suggestedStrategy: "breakout",
      suggestedAction: "buy",
    },
    {
      symbol: "XOM",
      signals: [
        { id: "sig_9", symbol: "XOM", signalType: "sector_strength", signalTimestamp: now, signalStrength: 60, rawPayload: {}, derivedTags: [], sector: "Energy", marketContext: "Oil supply concerns", confidenceBase: 0.55, createdAt: now },
      ],
      sector: "Energy",
      marketCapBucket: "large",
      suggestedStrategy: "sector_rotation",
      suggestedAction: "buy",
    },
  ];
}
