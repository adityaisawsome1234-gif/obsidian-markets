import { NextRequest, NextResponse } from "next/server";
import { createTrade, listTrades } from "@/services/alpha-engine";
import type { TradeCreateInput } from "@/types/alpha-engine";

const DEMO_USER_ID = "demo_user";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const status = url.searchParams.get("status") as "open" | "closed" | undefined;
  const symbol = url.searchParams.get("symbol") ?? undefined;
  const strategyTag = url.searchParams.get("strategy") ?? undefined;
  const sector = url.searchParams.get("sector") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "50");
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const { trades, total } = listTrades(DEMO_USER_ID, {
    status: status || undefined,
    symbol,
    strategyTag,
    sector,
    limit: Math.min(limit, 100),
    offset: Math.max(offset, 0),
  });

  return NextResponse.json({ trades, total, limit, offset });
}

export async function POST(req: NextRequest) {
  let body: TradeCreateInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  if (!body.symbol || typeof body.symbol !== "string") {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }
  if (!body.side || !["long", "short"].includes(body.side)) {
    return NextResponse.json({ error: "side must be 'long' or 'short'" }, { status: 400 });
  }
  if (typeof body.quantity !== "number" || body.quantity <= 0) {
    return NextResponse.json({ error: "quantity must be a positive number" }, { status: 400 });
  }
  if (typeof body.entryPrice !== "number" || body.entryPrice <= 0) {
    return NextResponse.json({ error: "entryPrice must be a positive number" }, { status: 400 });
  }
  if (!body.openedAt || isNaN(new Date(body.openedAt).getTime())) {
    return NextResponse.json({ error: "openedAt must be a valid date" }, { status: 400 });
  }
  if (!body.strategyTag) {
    return NextResponse.json({ error: "strategyTag is required" }, { status: 400 });
  }

  const ticker = body.symbol.trim().toUpperCase();
  if (!/^[A-Z0-9.\-^=]{1,12}$/.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker symbol" }, { status: 400 });
  }

  const trade = createTrade(DEMO_USER_ID, { ...body, symbol: ticker });
  return NextResponse.json(trade, { status: 201 });
}
