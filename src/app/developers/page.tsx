import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Documentation — Obsidian Markets",
  description: "Obsidian Markets REST API for RIAs, hedge funds, and fintech companies. AI-powered financial research at $99-499/month.",
};

const ENDPOINTS = [
  { method: "GET", path: "/api/v1/quote/:ticker", description: "Real-time stock quote with price, volume, market cap", permission: "read_market", tier: "Developer" },
  { method: "GET", path: "/api/v1/financials/:ticker", description: "Full financial statements (income, balance sheet, cash flow)", permission: "read_research", tier: "Developer" },
  { method: "GET", path: "/api/v1/earnings/:ticker", description: "Earnings history, estimates, and surprise data", permission: "read_research", tier: "Developer" },
  { method: "GET", path: "/api/v1/options/chain/:ticker", description: "Full options chain with Greeks and IV", permission: "options_flow", tier: "Business" },
  { method: "GET", path: "/api/v1/options/flow", description: "Today's unusual options activity, ranked by smart money score", permission: "options_flow", tier: "Business" },
  { method: "GET", path: "/api/v1/options/flow/:ticker", description: "Historical flow analysis for a specific ticker", permission: "options_flow", tier: "Business" },
  { method: "GET", path: "/api/v1/macro/calendar", description: "Upcoming economic events with forecasts and impact ratings", permission: "read_market", tier: "Developer" },
  { method: "GET", path: "/api/v1/macro/yields", description: "Treasury yield curve with spread analysis", permission: "read_market", tier: "Developer" },
  { method: "POST", path: "/api/v1/ai/analyze", description: "AI analysis of any ticker (Claude Sonnet)", permission: "ai_query", tier: "Developer" },
  { method: "POST", path: "/api/v1/ai/compare", description: "AI-powered comparison of two tickers", permission: "ai_query", tier: "Developer" },
  { method: "POST", path: "/api/v1/ai/portfolio-review", description: "AI portfolio review with risk analysis", permission: "portfolio_analytics", tier: "Business" },
  { method: "GET", path: "/api/v1/filings/:ticker", description: "AI-analyzed SEC filing insights (8-K, 10-Q, 10-K)", permission: "filings", tier: "Developer" },
  { method: "GET", path: "/api/v1/earnings-intel/:ticker", description: "Earnings transcript intelligence with tone tracking", permission: "earnings_intel", tier: "Developer" },
];

const PRICING = [
  { tier: "Developer", price: "$99", period: "/month", requests: "10K/day", ai: "Sonnet only", features: ["Market data", "Financials", "AI analysis", "SEC filings", "Earnings intel"], cta: "Start Building" },
  { tier: "Business", price: "$499", period: "/month", requests: "100K/day", ai: "Full AI access", features: ["Everything in Developer", "Options flow + chain", "Portfolio analytics", "Priority support"], cta: "Go Business", highlight: true },
  { tier: "Enterprise", price: "Custom", period: "", requests: "Unlimited", ai: "Opus + Dedicated", features: ["Everything in Business", "Webhooks", "Custom SLA", "Dedicated support", "White-label option"], cta: "Contact Sales" },
];

export default function DevelopersPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0a0f 0%, #111118 100%)", color: "#c0c0d0", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Nav */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, #7c5cfc, #5a3fd6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: "white" }}>O</div>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>Obsidian Markets</span>
        </Link>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link href="/terms" style={{ fontSize: "11px", color: "#5a5a6e", textDecoration: "none" }}>Terms</Link>
          <Link href="/register" style={{ fontSize: "11px", fontWeight: "600", color: "#7c5cfc", textDecoration: "none", padding: "6px 14px", borderRadius: "6px", border: "1px solid rgba(124,92,252,0.3)" }}>Get API Key →</Link>
        </div>
      </header>

      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <span style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "#7c5cfc", background: "rgba(124,92,252,0.12)", border: "1px solid rgba(124,92,252,0.2)", padding: "4px 10px", borderRadius: "4px" }}>REST API</span>
          <h1 style={{ fontSize: "36px", fontWeight: "800", color: "#fff", letterSpacing: "-1px", marginTop: "16px", marginBottom: "12px" }}>
            Financial Intelligence API
          </h1>
          <p style={{ fontSize: "15px", color: "#8b8b9e", maxWidth: "560px", margin: "0 auto", lineHeight: "1.7" }}>
            Real-time market data, AI-powered research, options flow intelligence, and earnings analysis. Built for RIAs, hedge funds, and fintech companies.
          </p>
        </div>

        {/* Quick Start */}
        <div style={{ marginBottom: "48px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "16px" }}>Quick Start</h2>
          <CodeBlock language="bash" code={`# Get a real-time quote
curl -H "X-Obsidian-Key: obs_live_YOUR_KEY" \\
  https://api.obsidianmarkets.com/api/v1/quote/NVDA`} />
          <div style={{ height: "12px" }} />
          <CodeBlock language="python" code={`import requests

headers = {"X-Obsidian-Key": "obs_live_YOUR_KEY"}

# AI-powered analysis
response = requests.post(
    "https://api.obsidianmarkets.com/api/v1/ai/analyze",
    headers=headers,
    json={"ticker": "NVDA", "question": "What's the bull case?"}
)
print(response.json()["analysis"])`} />
          <div style={{ height: "12px" }} />
          <CodeBlock language="javascript" code={`// JavaScript / Node.js
const response = await fetch(
  "https://api.obsidianmarkets.com/api/v1/quote/AAPL",
  { headers: { "X-Obsidian-Key": "obs_live_YOUR_KEY" } }
);
const { price, changesPercentage } = await response.json();
console.log(\`AAPL: $\${price} (\${changesPercentage}%)\`);`} />
        </div>

        {/* Endpoints */}
        <div style={{ marginBottom: "48px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "16px" }}>Endpoints</h2>
          <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", overflow: "hidden" }}>
            {ENDPOINTS.map((ep, i) => (
              <div key={ep.path} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: i < ENDPOINTS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", flexWrap: "wrap" }}>
                <span style={{ fontSize: "9px", fontWeight: "700", fontFamily: "'JetBrains Mono', monospace", color: ep.method === "POST" ? "#eab308" : "#22c55e", background: ep.method === "POST" ? "rgba(234,179,8,0.1)" : "rgba(34,197,94,0.1)", padding: "3px 8px", borderRadius: "4px", width: "40px", textAlign: "center" }}>{ep.method}</span>
                <code style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "#fff", flex: "0 0 280px" }}>{ep.path}</code>
                <span style={{ fontSize: "11px", color: "#8b8b9e", flex: 1 }}>{ep.description}</span>
                <span style={{ fontSize: "9px", fontWeight: "600", color: "#5a5a6e", background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: "3px" }}>{ep.tier}+</span>
              </div>
            ))}
          </div>
        </div>

        {/* Authentication */}
        <div style={{ marginBottom: "48px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "12px" }}>Authentication</h2>
          <p style={{ fontSize: "13px", lineHeight: "1.7", marginBottom: "12px" }}>
            Pass your API key in the <code style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "#7c5cfc", background: "rgba(124,92,252,0.1)", padding: "2px 6px", borderRadius: "3px" }}>X-Obsidian-Key</code> header with every request. Keys start with <code style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "#7c5cfc", background: "rgba(124,92,252,0.1)", padding: "2px 6px", borderRadius: "3px" }}>obs_live_</code>.
          </p>
          <p style={{ fontSize: "13px", lineHeight: "1.7" }}>
            Rate limits are per-key and per-minute. Check <code style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "#7c5cfc", background: "rgba(124,92,252,0.1)", padding: "2px 6px", borderRadius: "3px" }}>X-RateLimit-Remaining</code> in response headers.
          </p>
        </div>

        {/* Pricing */}
        <div style={{ marginBottom: "48px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "20px", textAlign: "center" }}>Pricing</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {PRICING.map((plan) => (
              <div key={plan.tier} style={{ padding: "24px", borderRadius: "10px", border: plan.highlight ? "1px solid rgba(124,92,252,0.4)" : "1px solid rgba(255,255,255,0.06)", background: plan.highlight ? "rgba(124,92,252,0.04)" : "rgba(255,255,255,0.02)" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.4px", color: plan.highlight ? "#7c5cfc" : "#8b8b9e", marginBottom: "8px" }}>{plan.tier}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "28px", fontWeight: "800", color: "#fff" }}>{plan.price}</span>
                  <span style={{ fontSize: "12px", color: "#5a5a6e" }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: "11px", color: "#5a5a6e", marginBottom: "16px" }}>{plan.requests} requests · {plan.ai}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px" }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ fontSize: "12px", color: "#8b8b9e", padding: "4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#22c55e", fontSize: "10px" }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" style={{ display: "block", textAlign: "center", fontSize: "12px", fontWeight: "600", color: plan.highlight ? "white" : "#7c5cfc", background: plan.highlight ? "linear-gradient(135deg, #7c5cfc, #5a3fd6)" : "transparent", border: plan.highlight ? "none" : "1px solid rgba(124,92,252,0.3)", padding: "10px", borderRadius: "8px", textDecoration: "none" }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Webhooks */}
        <div style={{ marginBottom: "48px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "12px" }}>Webhooks <span style={{ fontSize: "9px", fontWeight: "600", color: "#5a5a6e", background: "rgba(255,255,255,0.04)", padding: "3px 8px", borderRadius: "4px", marginLeft: "8px" }}>Enterprise</span></h2>
          <p style={{ fontSize: "13px", lineHeight: "1.7", marginBottom: "12px" }}>
            Receive push notifications for price alerts, options flow anomalies, earnings events, and AI-generated briefings. All webhooks include HMAC-SHA256 signatures for verification.
          </p>
          <CodeBlock language="json" code={`// Webhook payload
{
  "event": "flow_alert",
  "timestamp": "2026-03-21T15:30:00Z",
  "data": {
    "ticker": "NVDA",
    "type": "sweep",
    "premium": 2400000,
    "strike": 950,
    "expiry": "2026-04-17",
    "smartMoneyScore": 87,
    "narrative": "Unusual call sweep..."
  }
}`} />
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "11px", color: "#3a3a4e" }}>
          © {new Date().getFullYear()} Obsidian Markets · <Link href="/terms" style={{ color: "#5a5a6e", textDecoration: "none" }}>Terms</Link> · <Link href="/ai/accuracy" style={{ color: "#5a5a6e", textDecoration: "none" }}>AI Accuracy</Link>
        </div>
      </main>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const langColors: Record<string, string> = { bash: "#22c55e", python: "#3b82f6", javascript: "#eab308", json: "#7c5cfc" };
  return (
    <div style={{ borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{ padding: "6px 12px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: langColors[language] || "#5a5a6e" }} />
        <span style={{ fontSize: "10px", fontWeight: "600", color: "#5a5a6e", textTransform: "uppercase" }}>{language}</span>
      </div>
      <pre style={{ padding: "16px", margin: 0, fontSize: "12px", lineHeight: "1.7", fontFamily: "'JetBrains Mono', monospace", color: "#c0c0d0", overflowX: "auto", background: "rgba(0,0,0,0.2)" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
