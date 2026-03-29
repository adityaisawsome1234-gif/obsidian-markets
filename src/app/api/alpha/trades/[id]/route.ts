import { NextRequest, NextResponse } from "next/server";
import { getTrade, updateTrade, closeTrade } from "@/services/alpha-engine";

const DEMO_USER_ID = "demo_user";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const trade = getTrade(DEMO_USER_ID, id);
  if (!trade) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }
  return NextResponse.json(trade);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trade = updateTrade(DEMO_USER_ID, id, body);
  if (!trade) {
    return NextResponse.json({ error: "Trade not found or not owned by user" }, { status: 404 });
  }
  return NextResponse.json(trade);
}
