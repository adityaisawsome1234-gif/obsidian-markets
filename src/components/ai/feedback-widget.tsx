"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, MessageSquare, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type FeedbackType =
  | "helpful"
  | "inaccurate"
  | "outdated"
  | "too_vague"
  | "too_complex"
  | "other";

interface FeedbackWidgetProps {
  messageId: string;
  context?: {
    query?: string;
    ticker?: string;
    endpoint?: string;
    model?: string;
    responsePreview?: string;
  };
  compact?: boolean;
  className?: string;
}

const NEGATIVE_REASONS: { value: FeedbackType; label: string }[] = [
  { value: "inaccurate", label: "Inaccurate" },
  { value: "outdated", label: "Outdated" },
  { value: "too_vague", label: "Too vague" },
  { value: "too_complex", label: "Too complex" },
  { value: "other", label: "Other" },
];

export function FeedbackWidget({
  messageId,
  context,
  compact = false,
  className,
}: FeedbackWidgetProps) {
  const [state, setState] = useState<"idle" | "negative_reason" | "comment" | "submitted">("idle");
  const [selectedRating, setSelectedRating] = useState<1 | 5 | null>(null);
  const [selectedReason, setSelectedReason] = useState<FeedbackType | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (rating: 1 | 5, type: FeedbackType, commentText?: string) => {
      setSubmitting(true);
      try {
        await fetch("/api/ai/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId,
            rating,
            feedbackType: type,
            comment: commentText || null,
            context: context || {},
          }),
        });
      } catch {
        // Silently fail — feedback is non-critical
      }
      setSubmitting(false);
      setState("submitted");
    },
    [messageId, context]
  );

  const handleThumbsUp = useCallback(() => {
    setSelectedRating(5);
    submit(5, "helpful");
  }, [submit]);

  const handleThumbsDown = useCallback(() => {
    setSelectedRating(1);
    setState("negative_reason");
  }, []);

  const handleReasonSelect = useCallback(
    (reason: FeedbackType) => {
      setSelectedReason(reason);
      setState("comment");
    },
    []
  );

  const handleCommentSubmit = useCallback(() => {
    if (selectedReason) {
      submit(1, selectedReason, comment.trim() || undefined);
    }
  }, [selectedReason, comment, submit]);

  const handleSkipComment = useCallback(() => {
    if (selectedReason) {
      submit(1, selectedReason);
    }
  }, [selectedReason, submit]);

  const handleReset = useCallback(() => {
    setState("idle");
    setSelectedRating(null);
    setSelectedReason(null);
    setComment("");
  }, []);

  // Submitted state
  if (state === "submitted") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("flex items-center gap-1.5", className)}
      >
        <Check size={10} className="text-g" />
        <span className="text-[9px] text-w5">Thanks for your feedback</span>
      </motion.div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        {/* Idle: thumbs up/down */}
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1"
          >
            {!compact && (
              <Badge variant="ai" className="mr-1">AI</Badge>
            )}
            <button
              onClick={handleThumbsUp}
              disabled={submitting}
              className="p-1 rounded hover:bg-s2 text-w5 hover:text-g transition-colors cursor-pointer"
              title="Helpful"
            >
              <ThumbsUp size={compact ? 10 : 12} />
            </button>
            <button
              onClick={handleThumbsDown}
              disabled={submitting}
              className="p-1 rounded hover:bg-s2 text-w5 hover:text-r transition-colors cursor-pointer"
              title="Not helpful"
            >
              <ThumbsDown size={compact ? 10 : 12} />
            </button>
          </motion.div>
        )}

        {/* Negative reason selection */}
        {state === "negative_reason" && (
          <motion.div
            key="reasons"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1 flex-wrap"
          >
            <span className="text-[9px] text-w5 mr-0.5">What went wrong?</span>
            {NEGATIVE_REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => handleReasonSelect(r.value)}
                className="text-[9px] text-w4 bg-s2 border border-[var(--brd)] rounded-full px-2 py-0.5 hover:text-w2 hover:border-[var(--brd2)] transition-colors cursor-pointer"
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={handleReset}
              className="p-0.5 rounded hover:bg-s2 text-w5 transition-colors cursor-pointer"
              title="Cancel"
            >
              <X size={10} />
            </button>
          </motion.div>
        )}

        {/* Comment input */}
        {state === "comment" && (
          <motion.div
            key="comment"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1.5"
          >
            <MessageSquare size={10} className="text-w5 shrink-0" />
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()}
              placeholder="Tell us more (optional)..."
              className="bg-s2 border border-[var(--brd)] rounded px-2 py-1 text-[10px] text-w3 placeholder-w5 outline-none focus:border-a/40 w-48"
              autoFocus
            />
            <button
              onClick={handleCommentSubmit}
              disabled={submitting}
              className="text-[9px] text-a hover:text-a2 transition-colors cursor-pointer font-medium"
            >
              Send
            </button>
            <button
              onClick={handleSkipComment}
              className="text-[9px] text-w5 hover:text-w3 transition-colors cursor-pointer"
            >
              Skip
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
