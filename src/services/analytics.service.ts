/**
 * Retention & Analytics Metrics Engine
 *
 * Computes the metrics that prove product-market fit to investors:
 * - Retention cohorts (D1, D7, D14, D30, D60, D90)
 * - WAR (Weekly Active Researchers)
 * - DAU/MAU ratio
 * - Feature adoption rates
 * - Conversion funnel
 * - Revenue metrics (MRR, ARR, ARPU, LTV, CAC, LTV:CAC)
 *
 * Uses demo data for development. Production connects to PostgreSQL.
 */

/* ── Types ── */

export interface RetentionCohort {
  signupDate: string;     // YYYY-MM-DD
  cohortSize: number;
  d1: number;             // % retained
  d7: number;
  d14: number;
  d30: number;
  d60: number;
  d90: number;
}

export interface RetentionSummary {
  d1: number;
  d7: number;
  d14: number;
  d30: number;
  d60: number;
  d90: number;
  trend: "improving" | "declining" | "stable";
}

export interface WeeklyActiveResearchers {
  week: string;           // YYYY-Www
  count: number;
  changePercent: number;  // vs prior week
}

export interface FeatureAdoption {
  feature: string;
  label: string;
  adoptionRate: number;   // % of users in first 7 days
  totalUsers: number;
}

export interface FunnelStep {
  step: string;
  label: string;
  count: number;
  percent: number;        // % of step 1
  dropoff: number;        // % dropped from previous step
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  ltv: number;
  cac: number;
  ltvCacRatio: number;
  churnRate: number;      // monthly %
  mrrGrowth: number;      // month-over-month %
}

export interface DailyMetric {
  date: string;
  metricName: string;
  metricValue: number;
  segment?: string;
}

export interface AnalyticsDashboard {
  retention: RetentionSummary;
  retentionCohorts: RetentionCohort[];
  war: WeeklyActiveResearchers[];
  dauMau: { date: string; ratio: number; dau: number; mau: number }[];
  featureAdoption: FeatureAdoption[];
  funnel: FunnelStep[];
  revenue: RevenueMetrics;
  mrrHistory: { date: string; mrr: number }[];
  topUsers: { userId: string; sessions: number; aiQueries: number; lastActive: string }[];
  aiCosts: { date: string; cost: number; queries: number; cacheHitRate: number }[];
}

/* ── Demo Data Generation ── */

function generateRetentionCohorts(): RetentionCohort[] {
  const cohorts: RetentionCohort[] = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 90);

  // 12 weekly cohorts over 3 months
  for (let w = 0; w < 12; w++) {
    const date = new Date(baseDate.getTime() + w * 7 * 86_400_000);
    const dateStr = date.toISOString().slice(0, 10);
    const size = 80 + Math.floor(Math.random() * 60); // 80-140 per cohort

    // Improving retention over time (product getting better)
    const improvement = w * 0.8; // 0.8% improvement per week
    const d1 = Math.min(95, 72 + improvement + rand(-3, 3));
    const d7 = Math.min(90, 55 + improvement + rand(-4, 4));
    const d14 = Math.min(85, 48 + improvement + rand(-4, 4));
    const d30 = w <= 7 ? Math.min(80, 42 + improvement + rand(-5, 5)) : 0; // Only for cohorts old enough
    const d60 = w <= 3 ? Math.min(75, 35 + improvement + rand(-5, 5)) : 0;
    const d90 = w === 0 ? Math.min(70, 30 + rand(-3, 3)) : 0;

    cohorts.push({
      signupDate: dateStr,
      cohortSize: size,
      d1: round(d1), d7: round(d7), d14: round(d14),
      d30: round(d30), d60: round(d60), d90: round(d90),
    });
  }
  return cohorts;
}

function generateWAR(): WeeklyActiveResearchers[] {
  const weeks: WeeklyActiveResearchers[] = [];
  let prev = 3200;
  for (let w = 11; w >= 0; w--) {
    const date = new Date();
    date.setDate(date.getDate() - w * 7);
    const year = date.getFullYear();
    const weekNum = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 86_400_000));
    const count = Math.round(prev * (1 + rand(0.01, 0.06))); // 1-6% growth per week
    const change = prev > 0 ? round(((count - prev) / prev) * 100) : 0;
    weeks.push({ week: `${year}-W${String(weekNum).padStart(2, "0")}`, count, changePercent: change });
    prev = count;
  }
  return weeks;
}

function generateDAUMAU(): { date: string; ratio: number; dau: number; mau: number }[] {
  const data: { date: string; ratio: number; dau: number; mau: number }[] = [];
  for (let d = 29; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const mau = 12000 + Math.floor(d * -50 + rand(-200, 200)); // Growing
    const ratio = 0.28 + rand(-0.03, 0.05) + (29 - d) * 0.002; // Improving
    const dau = Math.round(mau * ratio);
    data.push({
      date: date.toISOString().slice(0, 10),
      ratio: round(ratio * 100) / 100,
      dau,
      mau,
    });
  }
  return data;
}

function generateFeatureAdoption(): FeatureAdoption[] {
  return [
    { feature: "ai_chat", label: "AI Chat", adoptionRate: 78, totalUsers: 9360 },
    { feature: "daily_edge", label: "Daily Edge", adoptionRate: 65, totalUsers: 7800 },
    { feature: "options_flow", label: "Options Flow", adoptionRate: 42, totalUsers: 5040 },
    { feature: "portfolio", label: "Portfolio Tracker", adoptionRate: 38, totalUsers: 4560 },
    { feature: "alerts", label: "Price Alerts", adoptionRate: 31, totalUsers: 3720 },
    { feature: "deep_dive", label: "AI Deep Dive", adoptionRate: 27, totalUsers: 3240 },
    { feature: "screener", label: "Stock Screener", adoptionRate: 22, totalUsers: 2640 },
    { feature: "sim", label: "Portfolio Simulator", adoptionRate: 18, totalUsers: 2160 },
    { feature: "strategy_builder", label: "Strategy Builder", adoptionRate: 14, totalUsers: 1680 },
    { feature: "earnings_intel", label: "Earnings Intelligence", adoptionRate: 11, totalUsers: 1320 },
  ];
}

function generateFunnel(): FunnelStep[] {
  const steps = [
    { step: "signup", label: "Signed Up", count: 12000 },
    { step: "onboarding", label: "Onboarding Complete", count: 9840 },
    { step: "first_ai", label: "First AI Query", count: 7380 },
    { step: "first_deep_dive", label: "First Deep Dive", count: 3240 },
    { step: "upgrade", label: "Upgraded to Paid", count: 1440 },
    { step: "retained_90d", label: "90-Day Retained", count: 1008 },
  ];
  return steps.map((s, i) => ({
    ...s,
    percent: round((s.count / steps[0].count) * 100),
    dropoff: i === 0 ? 0 : round(((steps[i - 1].count - s.count) / steps[i - 1].count) * 100),
  }));
}

function generateMRRHistory(): { date: string; mrr: number }[] {
  const data: { date: string; mrr: number }[] = [];
  let mrr = 18000;
  for (let m = 11; m >= 0; m--) {
    const date = new Date();
    date.setMonth(date.getMonth() - m);
    mrr = Math.round(mrr * (1 + rand(0.06, 0.14))); // 6-14% monthly growth
    data.push({ date: date.toISOString().slice(0, 7), mrr });
  }
  return data;
}

function generateTopUsers(): { userId: string; sessions: number; aiQueries: number; lastActive: string }[] {
  const users: { userId: string; sessions: number; aiQueries: number; lastActive: string }[] = [];
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(rand(0, 3));
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    users.push({
      userId: `user_${1000 + i}`,
      sessions: Math.floor(rand(45, 180)),
      aiQueries: Math.floor(rand(80, 500)),
      lastActive: date.toISOString().slice(0, 10),
    });
  }
  return users.sort((a, b) => b.sessions - a.sessions);
}

function generateAiCosts(): { date: string; cost: number; queries: number; cacheHitRate: number }[] {
  const data: { date: string; cost: number; queries: number; cacheHitRate: number }[] = [];
  for (let d = 29; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const queries = Math.floor(1200 + rand(-200, 400));
    const cacheHitRate = round(0.55 + rand(-0.05, 0.1));
    const costPerQuery = 0.04 + rand(-0.01, 0.02); // Target: $0.04 avg
    const cost = round(queries * costPerQuery * (1 - cacheHitRate));
    data.push({
      date: date.toISOString().slice(0, 10),
      cost,
      queries,
      cacheHitRate,
    });
  }
  return data;
}

/* ── Public API ── */

/**
 * Get the full analytics dashboard data.
 * This is the payload for the admin analytics page.
 */
export function getAnalyticsDashboard(): AnalyticsDashboard {
  const cohorts = generateRetentionCohorts();
  const recentCohorts = cohorts.filter((c) => c.d30 > 0);

  // Compute retention summary from recent cohorts
  const avgD1 = avg(cohorts.map((c) => c.d1));
  const avgD7 = avg(cohorts.map((c) => c.d7));
  const avgD14 = avg(cohorts.map((c) => c.d14));
  const avgD30 = avg(recentCohorts.map((c) => c.d30));
  const avgD60 = avg(cohorts.filter((c) => c.d60 > 0).map((c) => c.d60));
  const avgD90 = avg(cohorts.filter((c) => c.d90 > 0).map((c) => c.d90));

  // Trend: compare first 4 weeks vs last 4 weeks D7
  const first4 = avg(cohorts.slice(0, 4).map((c) => c.d7));
  const last4 = avg(cohorts.slice(-4).map((c) => c.d7));
  const trend = last4 > first4 + 2 ? "improving" : last4 < first4 - 2 ? "declining" : "stable";

  const mrrHistory = generateMRRHistory();
  const latestMRR = mrrHistory[mrrHistory.length - 1].mrr;
  const prevMRR = mrrHistory[mrrHistory.length - 2].mrr;

  return {
    retention: {
      d1: round(avgD1), d7: round(avgD7), d14: round(avgD14),
      d30: round(avgD30), d60: round(avgD60), d90: round(avgD90),
      trend,
    },
    retentionCohorts: cohorts,
    war: generateWAR(),
    dauMau: generateDAUMAU(),
    featureAdoption: generateFeatureAdoption(),
    funnel: generateFunnel(),
    revenue: {
      mrr: latestMRR,
      arr: latestMRR * 12,
      arpu: round(latestMRR / 1440),    // MRR / paid users
      ltv: round((latestMRR / 1440) / 0.04 * 12), // ARPU / churn * 12
      cac: 28,
      ltvCacRatio: round(((latestMRR / 1440) / 0.04 * 12) / 28 * 10) / 10,
      churnRate: 4.0,
      mrrGrowth: round(((latestMRR - prevMRR) / prevMRR) * 100),
    },
    mrrHistory,
    topUsers: generateTopUsers(),
    aiCosts: generateAiCosts(),
  };
}

/**
 * Get a single metric for API consumption.
 */
export function getMetric(name: string): number | null {
  const dashboard = getAnalyticsDashboard();
  switch (name) {
    case "d30_retention": return dashboard.retention.d30;
    case "d7_retention": return dashboard.retention.d7;
    case "war": return dashboard.war[dashboard.war.length - 1]?.count ?? 0;
    case "dau_mau": return dashboard.dauMau[dashboard.dauMau.length - 1]?.ratio ?? 0;
    case "mrr": return dashboard.revenue.mrr;
    case "arr": return dashboard.revenue.arr;
    case "ltv_cac": return dashboard.revenue.ltvCacRatio;
    case "churn": return dashboard.revenue.churnRate;
    default: return null;
  }
}

/* ── Helpers ── */

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}
