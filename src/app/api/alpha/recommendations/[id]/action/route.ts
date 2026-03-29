import { NextRequest, NextResponse } from "next/server";
import { updateRecommendationStatus } from "@/services/alpha-engine";
import type { RecommendationStatus } from "@/types/alpha-engine";

const DEMO_USER_ID = "demo_user";

const VALID_ACTIONS: RecommendationStatus[] = ["viewed", "clicked", "accepted", "rejected", "expired"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.action || !VALID_ACTIONS.includes(body.action as RecommendationStatus)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }

  const item = updateRecommendationStatus(DEMO_USER_ID, id, body.action as RecommendationStatus);
  if (!item) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}
