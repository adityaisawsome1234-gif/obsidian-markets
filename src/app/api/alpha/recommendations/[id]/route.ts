import { NextRequest, NextResponse } from "next/server";
import { getRecommendation } from "@/services/alpha-engine";

const DEMO_USER_ID = "demo_user";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = getRecommendation(DEMO_USER_ID, id);
  if (!item) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}
