import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { submitFeedback } from "@/services/ai-feedback.service";
import type { FeedbackRating, FeedbackType } from "@/services/ai-feedback.service";

/**
 * POST /api/ai/feedback
 *
 * Submit feedback for an AI response.
 * Body: { messageId, rating, feedbackType, comment?, context? }
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.stockData);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const { messageId, rating, feedbackType, comment, context } = body;

    if (!messageId || typeof messageId !== "string") {
      return NextResponse.json({ error: "messageId required" }, { status: 400 });
    }

    const validRatings: FeedbackRating[] = [1, 2, 3, 4, 5];
    if (!validRatings.includes(rating)) {
      return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
    }

    const validTypes: FeedbackType[] = [
      "helpful", "inaccurate", "outdated", "too_vague", "too_complex", "other",
    ];
    if (!validTypes.includes(feedbackType)) {
      return NextResponse.json({ error: "Invalid feedbackType" }, { status: 400 });
    }

    const feedback = submitFeedback({
      userId: ip, // Use IP as userId for anonymous users
      messageId,
      rating: rating as FeedbackRating,
      feedbackType: feedbackType as FeedbackType,
      comment: typeof comment === "string" ? comment.slice(0, 500) : undefined,
      context: {
        query: context?.query?.slice(0, 200) ?? "",
        ticker: context?.ticker ?? null,
        endpoint: context?.endpoint ?? "",
        model: context?.model ?? "",
        responsePreview: context?.responsePreview?.slice(0, 200) ?? "",
      },
    });

    return NextResponse.json({ id: feedback.id, status: "recorded" });
  } catch {
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
