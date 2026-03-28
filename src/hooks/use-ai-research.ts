"use client";

import { useQuery } from "@tanstack/react-query";
import type { AIResearchReport } from "@/types/research";

function getMockResearchReport(ticker: string): AIResearchReport {
  const reports: Record<string, Partial<AIResearchReport>> = {
    NVDA: {
      companyName: "NVIDIA Corporation",
      convictionScore: 78,
      verdict: "Buy",
      sections: {
        fundamental: {
          title: "Fundamental Analysis",
          score: 72,
          confidence: 85,
          summary: "NVIDIA demonstrates exceptional revenue growth driven by data center AI demand. Revenue grew 122% YoY to $60.9B, with data center segment contributing 83% of total revenue. Margins remain industry-leading despite competitive pressures.",
          keyFindings: [
            "Revenue growing 122% YoY — fastest among mega-cap semiconductors",
            "Data center revenue hit $18.4B last quarter, up 409% YoY",
            "Gross margin at 73.8%, well above industry average of 52%",
            "Forward P/E of 38.4x appears elevated but reasonable given 120%+ growth",
            "Free cash flow generation supports aggressive R&D investment and buybacks",
          ],
          dataPoints: [
            { label: "Revenue Growth", value: "+122% YoY", trend: "up" },
            { label: "Gross Margin", value: "73.8%", trend: "up" },
            { label: "Fwd P/E", value: "38.4x", trend: "flat" },
            { label: "FCF Yield", value: "2.1%", trend: "up" },
          ],
        },
        technical: {
          title: "Technical Analysis",
          score: 65,
          confidence: 72,
          summary: "NVDA is trading above both the 50-day and 200-day moving averages, confirming the broader uptrend. RSI at 62 suggests bullish momentum without being overbought. The stock is consolidating near the $880 level with strong support at $820.",
          keyFindings: [
            "Trading above 50-DMA ($845) and 200-DMA ($720) — confirmed uptrend",
            "RSI at 62 — bullish momentum without overbought signals",
            "MACD histogram positive and expanding — strengthening momentum",
            "Key resistance at $900; break above could target $950-$1000",
            "Volume profile shows strong accumulation at $820-$850 range",
          ],
          dataPoints: [
            { label: "RSI (14)", value: "62.3", trend: "up" },
            { label: "50-DMA", value: "$845", trend: "up" },
            { label: "Support", value: "$820", trend: "flat" },
            { label: "Resistance", value: "$900", trend: "flat" },
          ],
        },
        sentiment: {
          title: "Sentiment Analysis",
          score: 81,
          confidence: 78,
          summary: "Market sentiment is overwhelmingly bullish. Analyst consensus is Strong Buy with 92% buy ratings. Social media sentiment is elevated but not at extreme euphoria levels. Recent earnings beat expectations and forward guidance exceeded estimates.",
          keyFindings: [
            "92% of analysts rate Buy or Strong Buy (37 of 40 covering)",
            "Average price target $1,050 — 19.5% upside from current price",
            "Social media sentiment score at +78 (scale: -100 to +100)",
            "Institutional ownership increased 3.2% last quarter",
            "Short interest at only 1.1% of float — minimal bearish positioning",
          ],
          dataPoints: [
            { label: "Analyst Rating", value: "Strong Buy", trend: "up" },
            { label: "Price Target", value: "$1,050", trend: "up" },
            { label: "Short Interest", value: "1.1%", trend: "down" },
            { label: "Social Score", value: "+78", trend: "up" },
          ],
        },
        optionsFlow: {
          title: "Options Flow Analysis",
          score: 70,
          confidence: 68,
          summary: "Options flow shows moderate bullish bias with call-heavy activity. Put/call ratio at 0.62 indicates bullish positioning. Several large block trades detected in the $900-$950 strike range for June expiry, suggesting institutional conviction in further upside.",
          keyFindings: [
            "Put/call ratio at 0.62 — bullish bias in options positioning",
            "$2.3M block call purchase at $950 strike, June expiry — institutional bet",
            "Max pain at $860 — current price above max pain (bullish)",
            "Implied volatility rank at 45th percentile — moderately priced options",
            "Gamma exposure positive above $870 — dealer hedging supports upside",
          ],
          dataPoints: [
            { label: "Put/Call", value: "0.62", trend: "down" },
            { label: "Max Pain", value: "$860", trend: "flat" },
            { label: "IV Rank", value: "45th %ile", trend: "flat" },
            { label: "GEX Flip", value: "$870", trend: "flat" },
          ],
        },
        macro: {
          title: "Macro Context",
          score: 62,
          confidence: 65,
          summary: "The macro environment is moderately supportive. AI capex cycle remains the dominant theme with hyperscalers guiding higher infrastructure spending. However, elevated interest rates create multiple compression risk, and geopolitical tensions around chip export controls add uncertainty.",
          keyFindings: [
            "AI infrastructure spending expected to exceed $200B in 2025 — secular tailwind",
            "Fed holding rates at 5.25-5.50% — limits multiple expansion",
            "China export restrictions could impact ~10% of revenue long-term",
            "Dollar strength creates mild FX headwind for international revenue",
            "Energy costs for data centers rising — could affect customer ROI calculations",
          ],
          dataPoints: [
            { label: "Fed Rate", value: "5.25-5.50%", trend: "flat" },
            { label: "AI Capex", value: "$200B+", trend: "up" },
            { label: "DXY", value: "104.2", trend: "up" },
            { label: "China Risk", value: "~10% rev", trend: "down" },
          ],
        },
        risk: {
          title: "Risk Assessment",
          score: 45,
          confidence: 80,
          summary: "Key risks include valuation compression if growth decelerates, competitive threats from AMD and custom silicon (Google TPU, Amazon Trainium), customer concentration in hyperscalers, and geopolitical export control risks. However, NVIDIA's ecosystem moat (CUDA) provides meaningful protection.",
          keyFindings: [
            "Valuation risk: 38x forward earnings assumes perfect execution for 3+ years",
            "Competition: AMD MI300X gaining traction; custom silicon from Google, Amazon, Microsoft",
            "Customer concentration: Top 4 hyperscalers represent ~50% of data center revenue",
            "Cyclical risk: Semiconductor capex cycles can reverse — inventory correction possible",
            "Geopolitical: Further China restrictions or retaliatory measures could impact supply chain",
          ],
          dataPoints: [
            { label: "Beta", value: "1.65", trend: "up" },
            { label: "Max Drawdown (1Y)", value: "-22%", trend: "flat" },
            { label: "Volatility (30D)", value: "42%", trend: "up" },
            { label: "Concentration Risk", value: "High", trend: "flat" },
          ],
        },
      },
      signals: {
        fundamental: 72,
        technical: 65,
        sentiment: 81,
        optionsFlow: 70,
        macro: 62,
        convergenceStrength: "moderate",
      },
    },
  };

  const base = reports[ticker] || {
    companyName: ticker,
    convictionScore: 55,
    verdict: "Hold" as const,
    sections: {
      fundamental: { title: "Fundamental Analysis", score: 55, confidence: 60, summary: `Analyzing ${ticker} fundamentals...`, keyFindings: ["Revenue growth is moderate", "Margins are stable", "Valuation is in line with peers"], dataPoints: [{ label: "P/E", value: "22x", trend: "flat" as const }] },
      technical: { title: "Technical Analysis", score: 50, confidence: 55, summary: `${ticker} technical outlook is neutral.`, keyFindings: ["Trading near 50-DMA", "RSI at neutral 50 level", "No clear breakout pattern"], dataPoints: [{ label: "RSI", value: "50", trend: "flat" as const }] },
      sentiment: { title: "Sentiment Analysis", score: 52, confidence: 58, summary: `Market sentiment for ${ticker} is mixed.`, keyFindings: ["Analyst consensus is Hold", "Social sentiment neutral"], dataPoints: [{ label: "Rating", value: "Hold", trend: "flat" as const }] },
      optionsFlow: { title: "Options Flow Analysis", score: 50, confidence: 50, summary: `Options activity for ${ticker} is normal.`, keyFindings: ["Put/call ratio near 1.0", "No unusual activity detected"], dataPoints: [{ label: "P/C Ratio", value: "0.98", trend: "flat" as const }] },
      macro: { title: "Macro Context", score: 48, confidence: 55, summary: "Macro environment is neutral for this sector.", keyFindings: ["Interest rates elevated", "GDP growth moderate"], dataPoints: [{ label: "GDP", value: "3.3%", trend: "flat" as const }] },
      risk: { title: "Risk Assessment", score: 50, confidence: 60, summary: `Standard risk profile for ${ticker}.`, keyFindings: ["Normal market risk", "No unusual concerns"], dataPoints: [{ label: "Beta", value: "1.0", trend: "flat" as const }] },
    },
    signals: { fundamental: 55, technical: 50, sentiment: 52, optionsFlow: 50, macro: 48, convergenceStrength: "weak" as const },
  };

  return {
    ticker,
    companyName: base.companyName!,
    generatedAt: new Date().toISOString(),
    convictionScore: base.convictionScore!,
    verdict: base.verdict!,
    sections: base.sections!,
    signals: base.signals!,
  } as AIResearchReport;
}

export function useAIResearch(ticker: string) {
  return useQuery({
    queryKey: ["ai-research", ticker],
    queryFn: () => new Promise<AIResearchReport>((resolve) => {
      // Simulate API delay
      setTimeout(() => resolve(getMockResearchReport(ticker)), 800);
    }),
    staleTime: 5 * 60 * 1000,
    enabled: !!ticker,
  });
}
