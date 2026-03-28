import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Obsidian Markets",
  description:
    "Terms of Service for Obsidian Markets. We are not a registered investment advisor. AI analysis is for informational purposes only.",
};

/**
 * Terms of Service — Public Page
 *
 * Plain-English ToS that clearly communicates:
 * - Not a registered investment advisor
 * - AI analysis may contain errors
 * - Not a substitute for professional financial advice
 * - User assumes all risk for investment decisions
 *
 * Rendered in Obsidian design language, SSR for SEO.
 */
export default function TermsPage() {
  const lastUpdated = "March 21, 2026";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0a0f 0%, #111118 100%)",
        color: "#c0c0d0",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Nav */}
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
        >
          <div
            style={{
              width: "24px", height: "24px", borderRadius: "6px",
              background: "linear-gradient(135deg, #7c5cfc, #5a3fd6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: "700", color: "white",
            }}
          >
            O
          </div>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#fff", letterSpacing: "-0.3px" }}>
            Obsidian Markets
          </span>
        </Link>
      </header>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "800",
            color: "#fff",
            letterSpacing: "-0.5px",
            marginBottom: "8px",
          }}
        >
          Terms of Service
        </h1>
        <p style={{ fontSize: "12px", color: "#5a5a6e", marginBottom: "40px" }}>
          Last updated: {lastUpdated}
        </p>

        {/* TL;DR Box */}
        <div
          style={{
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid rgba(124,92,252,0.2)",
            background: "rgba(124,92,252,0.04)",
            marginBottom: "36px",
          }}
        >
          <h2 style={{ fontSize: "14px", fontWeight: "700", color: "#7c5cfc", marginBottom: "10px" }}>
            TL;DR — The Important Stuff
          </h2>
          <ul style={{ fontSize: "13px", lineHeight: "1.8", paddingLeft: "20px", margin: 0 }}>
            <li>We are <strong style={{ color: "#fff" }}>not</strong> a registered investment advisor, broker-dealer, or financial planner.</li>
            <li>Our AI generates <strong style={{ color: "#fff" }}>analysis, not advice</strong>. It may contain errors.</li>
            <li>Nothing on Obsidian Markets is a recommendation to buy or sell any security.</li>
            <li><strong style={{ color: "#fff" }}>You are responsible</strong> for your own investment decisions.</li>
            <li>Always consult a qualified financial advisor before making investment decisions.</li>
          </ul>
        </div>

        <Section title="1. What We Are (And What We Aren&apos;t)">
          <p>
            Obsidian Markets is a <strong>financial data analysis platform</strong>. We aggregate
            market data, process it with AI models, and present the results in a research-terminal
            format. We provide tools for analysis — not investment advice.
          </p>
          <p>
            We are <strong>not</strong> registered as an investment advisor with the SEC, any state
            securities regulator, or FINRA. We are not a broker-dealer. We do not manage money,
            execute trades, or hold customer assets. We do not provide personalized investment
            recommendations.
          </p>
        </Section>

        <Section title="2. AI-Generated Content">
          <p>
            Obsidian Markets uses artificial intelligence (currently Anthropic&apos;s Claude) to generate
            financial analysis, summaries, and data interpretations. You should understand:
          </p>
          <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
            <li><strong>AI output may contain errors.</strong> Large language models can hallucinate, misinterpret data, or produce inaccurate analysis. Always verify critical data points independently.</li>
            <li><strong>AI analysis is not a recommendation.</strong> When our AI says a stock appears &quot;undervalued,&quot; that is a quantitative observation based on metrics — not a recommendation to buy.</li>
            <li><strong>Past patterns don&apos;t guarantee future results.</strong> When we say &quot;historically, this pattern preceded a 6% move,&quot; that is a statistical observation. Markets evolve and past patterns may not repeat.</li>
            <li><strong>Accuracy metrics are historical.</strong> Our published AI accuracy rate reflects past performance of our models. Future accuracy is not guaranteed.</li>
            <li><strong>Real-time data may be delayed.</strong> Market data, quotes, and financial metrics may be delayed or sourced from third parties. Do not rely solely on our platform for time-sensitive trading decisions.</li>
          </ul>
        </Section>

        <Section title="3. Your Responsibilities">
          <p>By using Obsidian Markets, you acknowledge and agree:</p>
          <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
            <li>You are solely responsible for your investment decisions.</li>
            <li>You will not treat AI-generated analysis as investment advice.</li>
            <li>You will consult a qualified financial advisor before making material investment decisions.</li>
            <li>You understand that all investments carry risk, including the risk of total loss.</li>
            <li>You will not rely exclusively on our platform for any trading or investment activity.</li>
          </ul>
        </Section>

        <Section title="4. Risk Labels">
          <p>
            Every AI output on our platform is classified with a risk label:
          </p>
          <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
            <li><strong style={{ color: "#22c55e" }}>Factual</strong> — Pure data retrieval (e.g., current price, P/E ratio). Sourced from market data providers.</li>
            <li><strong style={{ color: "#7c5cfc" }}>Analysis</strong> — Interpretation of data (e.g., valuation assessment, trend analysis). Based on quantitative methods but involves judgment.</li>
            <li><strong style={{ color: "#eab308" }}>Speculative</strong> — Forward-looking statements (e.g., earnings predictions, price targets, flow interpretation). Based on models and historical patterns. Higher uncertainty.</li>
          </ul>
          <p>
            These labels help you calibrate how much weight to give each piece of analysis.
            Speculative content carries the highest uncertainty.
          </p>
        </Section>

        <Section title="5. Data Sources & Accuracy">
          <p>
            We source data from third-party providers including Financial Modeling Prep, Polygon.io,
            SEC EDGAR, and others. While we strive for accuracy, we do not guarantee the completeness,
            accuracy, or timeliness of any data on our platform. Data providers may experience outages,
            delays, or errors that are beyond our control.
          </p>
        </Section>

        <Section title="6. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, Obsidian Markets shall not be liable for any
            investment losses, trading losses, or other damages arising from your use of our platform,
            including but not limited to reliance on AI-generated analysis, data inaccuracies, service
            interruptions, or delayed information.
          </p>
        </Section>

        <Section title="7. AI Prediction Tracking">
          <p>
            We publicly track and publish the accuracy of our AI predictions on our{" "}
            <Link href="/ai/accuracy" style={{ color: "#7c5cfc", textDecoration: "underline" }}>
              AI Accuracy page
            </Link>
            . This transparency is for informational purposes. Historical accuracy does not guarantee
            future performance. All accuracy statistics include confidence intervals and sample sizes
            to help you assess their reliability.
          </p>
        </Section>

        <Section title="8. Account & Acceptable Use">
          <p>
            You may not use Obsidian Markets to distribute financial advice to others, create
            competing products from our data or AI outputs, or engage in any activity that violates
            applicable securities laws. You are responsible for maintaining the confidentiality of
            your account credentials.
          </p>
        </Section>

        <Section title="9. Changes to Terms">
          <p>
            We may update these terms from time to time. Material changes will be communicated via
            email or in-app notification. Continued use of the platform after changes constitutes
            acceptance of the updated terms.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about these terms? Contact us at{" "}
            <strong style={{ color: "#fff" }}>legal@obsidianmarkets.com</strong>.
          </p>
        </Section>

        {/* Footer */}
        <div
          style={{
            marginTop: "48px",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: "11px",
            color: "#3a3a4e",
            textAlign: "center",
          }}
        >
          © {new Date().getFullYear()} Obsidian Markets, Inc. All rights reserved.
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <h2
        style={{
          fontSize: "16px",
          fontWeight: "700",
          color: "#fff",
          letterSpacing: "-0.2px",
          marginBottom: "12px",
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: "13px", lineHeight: "1.8" }}>{children}</div>
    </section>
  );
}
