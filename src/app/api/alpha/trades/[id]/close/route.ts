import { NextRequest, NextResponse } from "next/server";
import { closeTrade } from "@/services/alpha-engine";

const DEMO_USER_ID = "demo_user";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { exitPrice?: number; closedAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.exitPrice !== "number" || body.exitPrice <= 0) {
    return NextResponse.json({ error: "exitPrice must be a positive number" }, { status: 400 });
  }

  const trade = closeTrade(DEMO_USER_ID, id, {
    exitPrice: body.exitPrice,
    closedAt: body.closedAt,
  });

  if (!trade) {
    return NextResponse.json(
      { error: "Trade not found, not owned by user, or already closed" },
      { status: 404 },
    );
  }

  return NextResponse.json(trade);
}
