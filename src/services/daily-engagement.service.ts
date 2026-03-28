import type { UserProgression } from "@/types/user";

export interface DailyNotification {
  id: string;
  type: "morning_edge" | "position_alert" | "streak_milestone";
  title: string;
  body: string;
  deepLink: string;
  priority: "high" | "normal" | "low";
}

/**
 * Generates morning notification content.
 * In production, this would be triggered by a server-side cron job.
 * For now, this runs client-side when the app opens.
 */
export function getMorningNotification(): DailyNotification {
  const now = new Date();
  const hour = now.getHours();
  const isPreMarket = hour >= 6 && hour < 9;
  const isMarketOpen = hour >= 9 && hour < 16;

  if (isPreMarket) {
    const minutesToOpen = (9 - hour) * 60 + (30 - now.getMinutes());
    return {
      id: `morning-${now.toISOString().slice(0, 10)}`,
      type: "morning_edge",
      title: "Your Daily Edge is ready",
      body:
        minutesToOpen > 0
          ? `Markets open in ${minutesToOpen} minutes.`
          : "Markets are about to open.",
      deepLink: "/",
      priority: "high",
    };
  }

  if (isMarketOpen) {
    return {
      id: `midday-${now.toISOString().slice(0, 10)}`,
      type: "morning_edge",
      title: "Markets are open",
      body: "Check your Daily Edge for the latest moves.",
      deepLink: "/",
      priority: "normal",
    };
  }

  return {
    id: `evening-${now.toISOString().slice(0, 10)}`,
    type: "morning_edge",
    title: "Markets closed",
    body: "Review today's moves and prepare for tomorrow.",
    deepLink: "/",
    priority: "low",
  };
}

/**
 * Checks if the user has earned a streak milestone and returns
 * a notification if so.
 */
export function getStreakNotification(
  progression: UserProgression
): DailyNotification | null {
  const { daily_opens_streak } = progression;

  if (daily_opens_streak === 7) {
    return {
      id: "streak-7",
      type: "streak_milestone",
      title: "7-day streak!",
      body: "You've checked in every day this week. Your AI is learning your preferences.",
      deepLink: "/",
      priority: "normal",
    };
  }

  if (daily_opens_streak === 30) {
    return {
      id: "streak-30",
      type: "streak_milestone",
      title: "30-day streak!",
      body: "A full month of daily research. You're building a serious edge.",
      deepLink: "/",
      priority: "normal",
    };
  }

  return null;
}

/**
 * Determines if we should show the "come back" prompt.
 * Used when the app opens and last session was > 24h ago.
 */
export function shouldShowReturnPrompt(
  progression: UserProgression
): boolean {
  if (!progression.last_session_at) return false;
  const last = new Date(progression.last_session_at).getTime();
  const now = Date.now();
  const hoursSinceLastSession = (now - last) / (1000 * 60 * 60);
  return hoursSinceLastSession > 24 && hoursSinceLastSession < 72;
}

/**
 * Generates a personalized return message based on what changed
 * since the user's last session.
 */
export function getReturnMessage(
  progression: UserProgression
): string {
  const hours = progression.last_session_at
    ? Math.round(
        (Date.now() - new Date(progression.last_session_at).getTime()) /
          (1000 * 60 * 60)
      )
    : 0;

  if (hours >= 48) {
    return "A lot has happened in the markets. Your Daily Edge has a full catch-up.";
  }
  return "Your Daily Edge has been updated since your last visit.";
}
