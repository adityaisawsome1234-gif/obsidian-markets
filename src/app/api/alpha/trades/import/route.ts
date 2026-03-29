import { NextRequest, NextResponse } from "next/server";
import { importTradesFromCsv } from "@/services/alpha-engine";

const DEMO_USER_ID = "demo_user";

export async function POST(req: NextRequest) {
  let body: { rows?: Record<string, string>[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
  }

  if (body.rows.length > 1000) {
    return NextResponse.json({ error: "Maximum 1000 rows per import" }, { status: 400 });
  }

  const result = importTradesFromCsv(DEMO_USER_ID, body.rows);
  return NextResponse.json(result);
}
