import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShare, seedDemoShare } from "@/services/share.service";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Public Research Page — SSR for SEO
 *
 * Renders shared AI analysis at /research/public/[id]
 * No login required to view. Rich OG tags for social sharing.
 * Watermarked with Obsidian Markets branding.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  seedDemoShare();
  const share = getShare(id);

  if (!share) {
    return { title: "Research Not Found — Obsidian Markets" };
  }

  const ogUrl = `/api/og?ticker=${share.ticker || ""}&type=${share.type}&id=${id}`;

  return {
    title: `${share.title} — Obsidian Markets`,
    description: share.metaDescription,
    openGraph: {
      title: share.title,
      description: share.metaDescription,
      url: `https://obsidianmarkets.com/research/public/${id}`,
      siteName: "Obsidian Markets",
      type: "article",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: share.title,
      description: share.metaDescription,
      images: [ogUrl],
    },
  };
}

export default async function PublicResearchPage({ params }: Props) {
  const { id } = await params;
  seedDemoShare();
  const share = getShare(id);

  if (!share) notFound();

  const typeLabel = {
    ai_summary: "AI Summary",
    deep_dive: "Deep Dive",
    chart_analysis: "Chart Analysis",
    portfolio_insight: "Portfolio Insight",
  }[share.type];

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #0a0a0f 0%, #111118 100%)",
        color: "#e0e0e8",
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "linear-gradient(135deg, #7c5cfc, #5a3fd6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "700",
              color: "white",
            }}
          >
            O
          </div>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#fff", letterSpacing: "-0.3px" }}>
            Obsidian Markets
          </span>
        </div>
        <a
          href="/register"
          style={{
            fontSize: "11px",
            fontWeight: "600",
            color: "#7c5cfc",
            textDecoration: "none",
            padding: "6px 14px",
            borderRadius: "6px",
            border: "1px solid rgba(124,92,252,0.3)",
            transition: "all 0.2s",
          }}
        >
          Sign up free →
        </a>
      </header>

      {/* Content */}
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Type badge + ticker */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <span
            style={{
              fontSize: "9px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "#7c5cfc",
              background: "rgba(124,92,252,0.12)",
              border: "1px solid rgba(124,92,252,0.2)",
              padding: "3px 8px",
              borderRadius: "4px",
            }}
          >
            {typeLabel}
          </span>
          {share.ticker && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "#8b8b9e",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "3px 8px",
                borderRadius: "4px",
              }}
            >
              {share.ticker}
            </span>
          )}
          <span style={{ fontSize: "10px", color: "#5a5a6e", marginLeft: "auto" }}>
            {new Date(share.createdAt).toLocaleDateString()} · {share.viewCount} views
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "#fff",
            letterSpacing: "-0.5px",
            lineHeight: "1.3",
            marginBottom: "32px",
          }}
        >
          {share.title}
        </h1>

        {/* Markdown content (rendered as pre-formatted for SSR) */}
        <article
          className="prose-obsidian"
          style={{
            fontSize: "14px",
            lineHeight: "1.8",
            color: "#c0c0d0",
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(share.content) }}
        />

        {/* Watermark */}
        <div
          style={{
            marginTop: "48px",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "5px",
                background: "linear-gradient(135deg, #7c5cfc, #5a3fd6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: "700",
                color: "white",
              }}
            >
              O
            </div>
            <span style={{ fontSize: "11px", fontWeight: "600", color: "#8b8b9e" }}>
              Generated by Obsidian Markets AI
            </span>
          </div>
          <p style={{ fontSize: "11px", color: "#5a5a6e", margin: "0 0 12px" }}>
            AI-generated analysis for informational purposes only. Not investment advice.
          </p>
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: "32px",
            padding: "28px",
            borderRadius: "10px",
            border: "1px solid rgba(124,92,252,0.2)",
            background: "linear-gradient(135deg, rgba(124,92,252,0.08), rgba(90,63,214,0.04))",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "#fff",
              marginBottom: "8px",
            }}
          >
            Get your own AI-powered research
          </h3>
          <p
            style={{
              fontSize: "12px",
              color: "#8b8b9e",
              marginBottom: "16px",
              maxWidth: "400px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Real-time market data, AI analysis, options flow, and portfolio
            tracking. Start free, no credit card required.
          </p>
          <a
            href="/register"
            style={{
              display: "inline-block",
              fontSize: "12px",
              fontWeight: "600",
              color: "white",
              background: "linear-gradient(135deg, #7c5cfc, #5a3fd6)",
              padding: "10px 28px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            Start Free →
          </a>
        </div>
      </main>
    </div>
  );
}

/** Minimal SSR-safe markdown → HTML converter */
function renderMarkdown(md: string): string {
  return md
    // Tables
    .replace(/\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)*)/g, (_match, header: string, body: string) => {
      const headers = header.split("|").map((h: string) => h.trim()).filter(Boolean);
      const rows = body.trim().split("\n").map((r: string) =>
        r.split("|").map((c: string) => c.trim()).filter(Boolean)
      );
      return `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:12px"><thead><tr>${headers.map((h: string) => `<th style="text-align:left;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.1);color:#8b8b9e;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.3px">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r: string[]) => `<tr>${r.map((c: string) => `<td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);font-family:JetBrains Mono,monospace">${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    })
    // Headers
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;color:#fff;margin:24px 0 8px;letter-spacing:-0.2px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:700;color:#fff;margin:28px 0 12px;letter-spacing:-0.3px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:700;color:#fff;margin:0 0 20px;letter-spacing:-0.4px">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;font-weight:600">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em style="color:#8b8b9e">$1</em>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0" />')
    // List items
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
    // Paragraphs (wrap remaining lines)
    .replace(/\n\n/g, '</p><p style="margin:12px 0">')
    // Wrap in initial paragraph
    .replace(/^/, '<p style="margin:12px 0">')
    .replace(/$/, "</p>");
}
