export const APP_NAME = "Obsidian Markets";
export const APP_TAGLINE = "See Through the Noise.";

export const MARKET_INDICES = [
  { symbol: "SPX", name: "S&P 500" },
  { symbol: "NDX", name: "Nasdaq 100" },
  { symbol: "DJI", name: "Dow Jones" },
  { symbol: "RUT", name: "Russell 2000" },
  { symbol: "VIX", name: "VIX" },
  { symbol: "TNX", name: "10Y Treasury" },
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "GC", name: "Gold" },
] as const;

export const TIMEFRAMES = [
  { label: "1D", value: "1D" },
  { label: "5D", value: "5D" },
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "YTD", value: "YTD" },
  { label: "1Y", value: "1Y" },
  { label: "5Y", value: "5Y" },
  { label: "Max", value: "Max" },
] as const;

export const CHART_TYPES = [
  { label: "Candle", value: "candle" },
  { label: "Line", value: "line" },
  { label: "Area", value: "area" },
] as const;

export const NAV_GROUPS = [
  // Home
  [{ id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", href: "/" }],
  // Research & Discovery
  [
    { id: "research", label: "Research", icon: "Search", href: "/research" },
    { id: "screener", label: "Screener", icon: "Filter", href: "/screener" },
  ],
  // Markets & Trading
  [
    { id: "charts", label: "Charts", icon: "CandlestickChart", href: "/charts" },
    { id: "options", label: "Options", icon: "Layers", href: "/options" },
    { id: "macro", label: "Macro", icon: "Globe", href: "/macro" },
  ],
  // Portfolio & Alpha
  [
    { id: "portfolio", label: "Portfolio", icon: "PieChart", href: "/portfolio" },
    { id: "alpha", label: "Alpha", icon: "Zap", href: "/alpha" },
  ],
  // Intel & Alerts
  [
    { id: "news", label: "News", icon: "Newspaper", href: "/news" },
    { id: "alerts", label: "Alerts", icon: "Bell", href: "/alerts" },
  ],
] as const;

export const NAV_ITEMS = NAV_GROUPS.flat();

export const PLANS = {
  FREE: { name: "Free", price: 0, aiChatsPerDay: 10, deepDivesPerMonth: 0, watchlistTickers: 10, alerts: 3 },
  STARTER: { name: "Starter", price: 15, aiChatsPerDay: 50, deepDivesPerMonth: 5, watchlistTickers: 50, alerts: 15 },
  PRO: { name: "Pro", price: 39, aiChatsPerDay: 200, deepDivesPerMonth: 20, watchlistTickers: -1, alerts: 50 },
  ELITE: { name: "Elite", price: 79, aiChatsPerDay: -1, deepDivesPerMonth: -1, watchlistTickers: -1, alerts: -1 },
} as const;
