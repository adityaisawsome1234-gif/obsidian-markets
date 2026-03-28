import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/og?ticker=AAPL&type=research
 *
 * Dynamic Open Graph image generation.
 * Returns an SVG-based social card matching our dark design language.
 *
 * Note: For production, install @vercel/og for true PNG generation.
 * This SVG approach works universally and is zero-dependency.
 */

const STOCK_DATA: Record<string, { name: string; price: number; change: number }> = {
  AAPL: { name: "Apple Inc.", price: 189.84, change: 1.25 },
  NVDA: { name: "NVIDIA Corp", price: 878.37, change: 3.84 },
  MSFT: { name: "Microsoft Corp", price: 417.23, change: -0.31 },
  GOOGL: { name: "Alphabet Inc.", price: 164.82, change: 2.14 },
  AMZN: { name: "Amazon.com", price: 186.49, change: 1.53 },
  META: { name: "Meta Platforms", price: 505.12, change: 2.87 },
  TSLA: { name: "Tesla Inc.", price: 248.42, change: -1.12 },
  JPM: { name: "JPMorgan Chase", price: 198.42, change: 0.57 },
  V: { name: "Visa Inc.", price: 283.45, change: 0.92 },
  UNH: { name: "UnitedHealth", price: 527.84, change: -0.45 },
};

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.toUpperCase() || "";
  const type = req.nextUrl.searchParams.get("type") || "stock";

  const data = STOCK_DATA[ticker] || { name: ticker || "Stock Analysis", price: 0, change: 0 };
  const isUp = data.change >= 0;
  const changeColor = isUp ? "#22c55e" : "#ef4444";
  const changeText = `${isUp ? "+" : ""}${data.change.toFixed(2)}%`;

  // Generate sparkline path data
  const points = Array.from({ length: 20 }, (_, i) => {
    const seed = (ticker.charCodeAt(i % ticker.length) || 65) + i * 7;
    return 40 + Math.sin(seed * 0.3) * 20 + (isUp ? i * 0.8 : -i * 0.5);
  });
  const minP = Math.min(...points);
  const maxP = Math.max(...points);
  const range = maxP - minP || 1;
  const sparklinePath = points.map((p, i) => {
    const x = 620 + (i / (points.length - 1)) * 500;
    const y = 200 + (1 - (p - minP) / range) * 180;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(0)} ${y.toFixed(0)}`;
  }).join(" ");

  const typeLabel = {
    research: "AI Research",
    stock: "Stock Analysis",
    deep_dive: "Deep Dive",
    earnings: "Earnings Intelligence",
  }[type] || "Analysis";

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a12"/>
      <stop offset="100%" stop-color="#0f0f1a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c5cfc"/>
      <stop offset="100%" stop-color="#5a3fd6"/>
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${changeColor}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${changeColor}" stop-opacity="0.8"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Grid lines -->
  <line x1="0" y1="157" x2="1200" y2="157" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <line x1="0" y1="315" x2="1200" y2="315" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <line x1="0" y1="473" x2="1200" y2="473" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>

  <!-- Sparkline -->
  <path d="${sparklinePath}" fill="none" stroke="url(#sparkGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>

  <!-- Content area -->
  <!-- Logo -->
  <rect x="60" y="50" width="36" height="36" rx="8" fill="url(#accent)"/>
  <text x="78" y="75" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="700" fill="white" text-anchor="middle">O</text>
  <text x="108" y="75" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="600" fill="rgba(255,255,255,0.7)">Obsidian Markets</text>

  <!-- Type badge -->
  <rect x="60" y="120" width="${typeLabel.length * 8 + 24}" height="24" rx="4" fill="rgba(124,92,252,0.15)" stroke="rgba(124,92,252,0.3)" stroke-width="1"/>
  <text x="72" y="136" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="700" fill="#7c5cfc" letter-spacing="0.5">${typeLabel.toUpperCase()}</text>

  <!-- Ticker -->
  <text x="60" y="210" font-family="Inter, system-ui, sans-serif" font-size="64" font-weight="800" fill="white" letter-spacing="-2">${ticker || "STOCK"}</text>

  <!-- Company name -->
  <text x="60" y="245" font-family="Inter, system-ui, sans-serif" font-size="18" fill="rgba(255,255,255,0.5)">${escapeXml(data.name)}</text>

  <!-- Price -->
  ${data.price > 0 ? `
  <text x="60" y="340" font-family="'JetBrains Mono', monospace" font-size="48" font-weight="700" fill="white" letter-spacing="-1">$${data.price.toFixed(2)}</text>
  <text x="60" y="380" font-family="'JetBrains Mono', monospace" font-size="22" font-weight="600" fill="${changeColor}">${changeText}</text>
  ` : ""}

  <!-- Summary teaser -->
  <text x="60" y="440" font-family="Inter, system-ui, sans-serif" font-size="14" fill="rgba(255,255,255,0.4)">AI-powered analysis • Real-time data • Options flow</text>

  <!-- Bottom bar -->
  <rect x="0" y="570" width="1200" height="60" fill="rgba(124,92,252,0.06)"/>
  <line x1="0" y1="570" x2="1200" y2="570" stroke="rgba(124,92,252,0.15)" stroke-width="1"/>
  <text x="60" y="605" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="600" fill="rgba(255,255,255,0.5)">obsidianmarkets.com</text>
  <text x="1140" y="605" font-family="Inter, system-ui, sans-serif" font-size="11" fill="rgba(255,255,255,0.3)" text-anchor="end">See Through the Noise</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
