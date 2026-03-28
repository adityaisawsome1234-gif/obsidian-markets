import type { UserProgression, ProgressionPrompt } from "@/types/user";

/**
 * Defines the progression prompts that surface when users hit milestones.
 * NOT gamification — progressive disclosure to prevent information overload.
 */
export const PROGRESSION_PROMPTS: ProgressionPrompt[] = [
  {
    id: "unlock_options",
    title: "Ready for options?",
    description:
      "You've been researching stocks for 2 weeks. Want to see how options flow can give you an edge?",
    module: "options",
    condition: (p) =>
      p.viewed_stock_research && p.days_active >= 14 && !p.viewed_options_chain,
  },
  {
    id: "unlock_deep_dive",
    title: "Go deeper with AI",
    description:
      "You're using Obsidian AI regularly. Did you know you can generate full deep-dive reports?",
    module: "deep_dive",
    condition: (p) => p.used_ai_chat_count >= 5 && !p.used_deep_dive,
  },
  {
    id: "unlock_screener",
    title: "Find your next trade",
    description:
      "You've explored several stocks. The screener can help you discover opportunities that match your criteria.",
    module: "screener",
    condition: (p) =>
      p.viewed_stock_research && p.days_active >= 7 && !p.used_screener,
  },
  {
    id: "unlock_macro",
    title: "See the bigger picture",
    description:
      "Understanding macro trends helps you anticipate market moves before they happen.",
    module: "macro",
    condition: (p) =>
      p.days_active >= 10 &&
      p.total_sessions >= 10 &&
      !p.viewed_macro_dashboard,
  },
  {
    id: "streak_week",
    title: "7-day streak!",
    description:
      "You've checked in every day this week. Your AI is learning your preferences.",
    module: "engagement",
    condition: (p) => p.daily_opens_streak >= 7,
  },
];

/**
 * Returns prompts that should be shown to the user right now.
 * Filters out dismissed prompts and checks conditions.
 */
export function getActivePrompts(
  progression: UserProgression
): ProgressionPrompt[] {
  return PROGRESSION_PROMPTS.filter(
    (prompt) =>
      !progression.dismissed_prompts.includes(prompt.id) &&
      prompt.condition(progression)
  );
}

/**
 * Determines which sidebar modules should be visible based on
 * user level, interests, and progression.
 */
export function getVisibleModules(
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL",
  interests: string[],
  unlockedModules: string[]
): Set<string> {
  // Power users see everything
  if (level === "ADVANCED" || level === "PROFESSIONAL") {
    return new Set([
      "dashboard",
      "research",
      "screener",
      "charts",
      "options",
      "macro",
      "portfolio",
      "news",
      "alerts",
    ]);
  }

  // Base modules everyone sees
  const visible = new Set(["dashboard", "research", "news", "portfolio"]);

  // Intermediate gets more
  if (level === "INTERMEDIATE") {
    visible.add("charts");
    visible.add("screener");
    visible.add("alerts");
  }

  // Add modules based on stated interests
  if (interests.includes("options")) {
    visible.add("options");
  }
  if (interests.includes("macro")) {
    visible.add("macro");
  }
  if (interests.includes("stock_research")) {
    visible.add("screener");
    visible.add("charts");
  }

  // Add progressively unlocked modules
  for (const mod of unlockedModules) {
    visible.add(mod);
  }

  return visible;
}

/**
 * Returns the number of ticker strip items appropriate for the user level.
 */
export function getTickerStripCount(
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL"
): number {
  switch (level) {
    case "BEGINNER":
      return 3;
    case "INTERMEDIATE":
      return 6;
    default:
      return 8;
  }
}

/**
 * Returns the AI system prompt modifier for beginner users.
 */
export function getAiPromptModifier(
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL"
): string | null {
  if (level === "BEGINNER") {
    return "Write for someone new to investing. Define any jargon in parentheses the first time you use it. Keep sentences short. Use simple analogies to explain complex concepts. Avoid abbreviations unless you define them first.";
  }
  if (level === "INTERMEDIATE") {
    return "The user has moderate investing experience. You can use common financial terms but briefly explain advanced concepts like Greeks, IV rank, or credit spreads the first time they come up.";
  }
  return null;
}
