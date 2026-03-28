/**
 * Obsidian Markets API client for the Chrome extension.
 * Calls our Next.js backend — never calls Claude directly.
 */

import { getBaseUrl, getApiKey } from "./storage";

async function headers(): Promise<Record<string, string>> {
  const key = await getApiKey();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (key) h["X-Obsidian-Key"] = key;
  return h;
}

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  sparkline: number[];
}

/** Fetch a live stock quote */
export async function fetchQuote(ticker: string): Promise<StockQuote | null> {
  try {
    const base = await getBaseUrl();
    const res = await fetch(`${base}/api/stock/${ticker}`, {
      headers: await headers(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Get a quick 2-sentence AI analysis for a ticker */
export async function fetchQuickAnalysis(ticker: string): Promise<string> {
  try {
    const base = await getBaseUrl();
    const res = await fetch(`${base}/api/ai/chat`, {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: `Give me a 2-sentence analysis of ${ticker} right now. Be specific with numbers. What's the key thing a trader should know today?`,
        }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return "Analysis unavailable.";

    // Read the streaming response
    const reader = res.body?.getReader();
    if (!reader) return "Analysis unavailable.";

    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    return text.trim() || "Analysis unavailable.";
  } catch {
    return "Analysis unavailable — check your connection.";
  }
}

/** Analyze a page's visible content */
export async function analyzePageContent(content: string, url: string): Promise<string> {
  try {
    const base = await getBaseUrl();
    const truncated = content.slice(0, 5000); // Cap at 5K chars
    const res = await fetch(`${base}/api/ai/chat`, {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: `I'm reading this financial page (${url}). Summarize the key takeaways for a trader in 3-4 bullet points. Be specific with numbers and tickers.\n\nPage content:\n${truncated}`,
        }],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return "Page analysis unavailable.";

    const reader = res.body?.getReader();
    if (!reader) return "Page analysis unavailable.";

    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    return text.trim() || "Page analysis unavailable.";
  } catch {
    return "Page analysis failed — check your connection.";
  }
}

/** Stream an AI chat response (for side panel) */
export async function streamChat(
  messages: { role: "user" | "assistant"; content: string }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/ai/chat`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({ messages }),
    signal: signal || AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    onChunk("Error: AI service unavailable.");
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

/** Fetch multiple quotes for watchlist */
export async function fetchWatchlist(tickers: string[]): Promise<StockQuote[]> {
  const results = await Promise.all(tickers.map(fetchQuote));
  return results.filter((r): r is StockQuote => r !== null);
}
