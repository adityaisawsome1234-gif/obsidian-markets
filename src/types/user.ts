export type InvestorType = "DAY_TRADER" | "SWING_TRADER" | "OPTIONS_TRADER" | "LONG_TERM" | "CASUAL";
export type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL";
export type Plan = "FREE" | "STARTER" | "PRO" | "ELITE";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  investorType: InvestorType;
  experience: ExperienceLevel;
  plan: Plan;
  timezone: string;
  createdAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  tickers: string[];
  isDefault: boolean;
  sortOrder: number;
}

export interface UserPreferences {
  defaultChartType: string;
  defaultTimeframe: string;
  dashboardLayout: Record<string, unknown> | null;
  favoriteIndicators: string[];
  newsCategories: string[];
  notifyEmail: boolean;
  notifyPush: boolean;
  notifySms: boolean;
}

/* ── Onboarding & Progressive Disclosure ── */

export type OnboardingInterest =
  | "portfolio"
  | "stock_research"
  | "options"
  | "macro"
  | "ai_research";

export interface OnboardingData {
  completed: boolean;
  experience: ExperienceLevel;
  interests: OnboardingInterest[];
  initialTickers: string[];
  completedAt: string | null;
}

export interface UserProgression {
  viewed_stock_research: boolean;
  viewed_options_chain: boolean;
  viewed_macro_dashboard: boolean;
  used_screener: boolean;
  used_ai_chat_count: number;
  used_deep_dive: boolean;
  days_active: number;
  total_sessions: number;
  first_session_at: string | null;
  last_session_at: string | null;
  daily_opens_streak: number;
  last_daily_open: string | null;
  unlocked_modules: string[];
  dismissed_prompts: string[];
}

export interface ProgressionPrompt {
  id: string;
  title: string;
  description: string;
  module: string;
  condition: (p: UserProgression) => boolean;
}

export interface Alert {
  id: string;
  ticker: string | null;
  alertType: string;
  condition: Record<string, unknown>;
  isActive: boolean;
  lastTriggered: string | null;
  channels: string[];
  createdAt: string;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  tokens?: number;
  createdAt: string;
}

export interface AiChatSession {
  id: string;
  title: string | null;
  messages: AiChatMessage[];
  createdAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  tickers: string[];
  sentiment: "positive" | "negative" | "neutral";
  publishedAt: string;
  imageUrl?: string;
}

export interface MacroEvent {
  id: string;
  title: string;
  category: "earnings" | "macro" | "fed" | "ipo" | "dividend";
  date: string;
  time?: string;
  impact: "high" | "medium" | "low";
  actual?: string;
  estimate?: string;
  previous?: string;
  ticker?: string;
}
