import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  User,
  Watchlist,
  UserPreferences,
  OnboardingData,
  UserProgression,
  ExperienceLevel,
  OnboardingInterest,
} from "@/types/user";

interface UserState {
  user: User | null;
  watchlists: Watchlist[];
  preferences: UserPreferences;
  onboarding: OnboardingData;
  progression: UserProgression;

  setUser: (user: User | null) => void;
  setWatchlists: (watchlists: Watchlist[]) => void;
  addToWatchlist: (watchlistId: string, ticker: string) => void;
  removeFromWatchlist: (watchlistId: string, ticker: string) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;

  completeOnboarding: (
    experience: ExperienceLevel,
    interests: OnboardingInterest[],
    tickers: string[]
  ) => void;
  trackAction: (action: keyof Pick<
    UserProgression,
    | "viewed_stock_research"
    | "viewed_options_chain"
    | "viewed_macro_dashboard"
    | "used_screener"
    | "used_deep_dive"
  >) => void;
  incrementAiChat: () => void;
  recordSession: () => void;
  recordDailyOpen: () => void;
  unlockModule: (moduleId: string) => void;
  dismissPrompt: (promptId: string) => void;
  getEffectiveLevel: () => ExperienceLevel;
}

const defaultPreferences: UserPreferences = {
  defaultChartType: "candle",
  defaultTimeframe: "1D",
  dashboardLayout: null,
  favoriteIndicators: ["SMA", "EMA", "RSI", "MACD"],
  newsCategories: [],
  notifyEmail: true,
  notifyPush: true,
  notifySms: false,
};

const defaultOnboarding: OnboardingData = {
  completed: false,
  experience: "BEGINNER",
  interests: [],
  initialTickers: [],
  completedAt: null,
};

const defaultProgression: UserProgression = {
  viewed_stock_research: false,
  viewed_options_chain: false,
  viewed_macro_dashboard: false,
  used_screener: false,
  used_ai_chat_count: 0,
  used_deep_dive: false,
  days_active: 0,
  total_sessions: 0,
  first_session_at: null,
  last_session_at: null,
  daily_opens_streak: 0,
  last_daily_open: null,
  unlocked_modules: [],
  dismissed_prompts: [],
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      watchlists: [],
      preferences: defaultPreferences,
      onboarding: defaultOnboarding,
      progression: defaultProgression,

      setUser: (user) => set({ user }),

      setWatchlists: (watchlists) => set({ watchlists }),

      addToWatchlist: (watchlistId, ticker) =>
        set((state) => ({
          watchlists: state.watchlists.map((wl) =>
            wl.id === watchlistId && !wl.tickers.includes(ticker)
              ? { ...wl, tickers: [...wl.tickers, ticker] }
              : wl
          ),
        })),

      removeFromWatchlist: (watchlistId, ticker) =>
        set((state) => ({
          watchlists: state.watchlists.map((wl) =>
            wl.id === watchlistId
              ? { ...wl, tickers: wl.tickers.filter((t) => t !== ticker) }
              : wl
          ),
        })),

      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),

      completeOnboarding: (experience, interests, tickers) =>
        set({
          onboarding: {
            completed: true,
            experience,
            interests,
            initialTickers: tickers,
            completedAt: new Date().toISOString(),
          },
          watchlists:
            tickers.length > 0
              ? [
                  {
                    id: "default",
                    name: "My Watchlist",
                    tickers,
                    isDefault: true,
                    sortOrder: 0,
                  },
                ]
              : [],
        }),

      trackAction: (action) =>
        set((state) => ({
          progression: { ...state.progression, [action]: true },
        })),

      incrementAiChat: () =>
        set((state) => ({
          progression: {
            ...state.progression,
            used_ai_chat_count: state.progression.used_ai_chat_count + 1,
          },
        })),

      recordSession: () =>
        set((state) => {
          const now = new Date().toISOString();
          const first = state.progression.first_session_at || now;
          return {
            progression: {
              ...state.progression,
              total_sessions: state.progression.total_sessions + 1,
              first_session_at: first,
              last_session_at: now,
            },
          };
        }),

      recordDailyOpen: () =>
        set((state) => {
          const today = todayStr();
          if (state.progression.last_daily_open === today) return state;

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().slice(0, 10);

          const isConsecutive =
            state.progression.last_daily_open === yesterdayStr;
          const streak = isConsecutive
            ? state.progression.daily_opens_streak + 1
            : 1;

          return {
            progression: {
              ...state.progression,
              daily_opens_streak: streak,
              last_daily_open: today,
              days_active: state.progression.days_active + 1,
            },
          };
        }),

      unlockModule: (moduleId) =>
        set((state) => {
          if (state.progression.unlocked_modules.includes(moduleId))
            return state;
          return {
            progression: {
              ...state.progression,
              unlocked_modules: [
                ...state.progression.unlocked_modules,
                moduleId,
              ],
            },
          };
        }),

      dismissPrompt: (promptId) =>
        set((state) => {
          if (state.progression.dismissed_prompts.includes(promptId))
            return state;
          return {
            progression: {
              ...state.progression,
              dismissed_prompts: [
                ...state.progression.dismissed_prompts,
                promptId,
              ],
            },
          };
        }),

      getEffectiveLevel: () => {
        const { onboarding, progression } = get();
        if (!onboarding.completed) return "BEGINNER";

        const base = onboarding.experience;
        if (base === "ADVANCED" || base === "PROFESSIONAL") return base;

        if (
          base === "BEGINNER" &&
          progression.days_active >= 14 &&
          progression.used_ai_chat_count >= 5
        ) {
          return "INTERMEDIATE";
        }

        return base;
      },
    }),
    { name: "obsidian-user" }
  )
);
