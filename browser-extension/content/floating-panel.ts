/**
 * Content Script — Floating Analysis Panel
 *
 * Listens for ticker clicks from the detector, shows a floating panel
 * with live quote + AI quick analysis. No React — pure DOM for speed.
 */

import { fetchQuote, fetchQuickAnalysis, type StockQuote } from "../lib/api";
import { addRecentAnalysis, getBaseUrl } from "../lib/storage";

let panel: HTMLDivElement | null = null;
let currentTicker = "";

function getOrCreatePanel(): HTMLDivElement {
  if (panel) return panel;
  panel = document.createElement("div");
  panel.id = "obsidian-floating-panel";
  document.body.appendChild(panel);

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (panel && !panel.contains(e.target as Node)) {
      hidePanel();
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hidePanel();
  });

  return panel;
}

function hidePanel() {
  if (panel) panel.classList.remove("obsidian-visible");
  currentTicker = "";
}

function buildSparklineSVG(data: number[]): string {
  if (data.length < 2) return "";
  const w = 312;
  const h = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });

  const isUp = data[data.length - 1] >= data[0];
  const color = isUp ? "#22c55e" : "#ef4444";
  const fillColor = isUp ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)";

  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="obs-sg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${fillColor}"/>
      <stop offset="100%" stop-color="transparent"/>
    </linearGradient></defs>
    <polygon points="0,${h} ${points.join(" ")} ${w},${h}" fill="url(#obs-sg)"/>
    <polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`;
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

async function showPanel(ticker: string, x: number, y: number) {
  const el = getOrCreatePanel();
  currentTicker = ticker;

  // Position panel near the click
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  let left = x + 12;
  let top = y + 12;
  if (left + 350 > vpW) left = x - 352;
  if (top + 400 > vpH) top = Math.max(8, vpH - 420);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;

  // Show loading state
  el.innerHTML = `
    <div class="obsidian-fp-header">
      <div>
        <div class="obsidian-fp-ticker">${ticker}</div>
        <div class="obsidian-fp-name">Loading...</div>
      </div>
      <div class="obsidian-fp-price" style="color:#55555d">—</div>
    </div>
    <div class="obsidian-fp-ai">
      <div class="obsidian-fp-ai-label">
        <span style="color:#a78bfa">✦</span> AI Analysis
      </div>
      <div class="obsidian-fp-ai-loading">Analyzing ${ticker}...</div>
    </div>
    <div class="obsidian-fp-brand">
      <div class="obsidian-fp-logo"></div>
      Obsidian Markets
    </div>
  `;
  el.classList.add("obsidian-visible");

  // Fetch quote and AI analysis in parallel
  const [quote, analysis] = await Promise.all([
    fetchQuote(ticker),
    fetchQuickAnalysis(ticker),
  ]);

  // Check if user navigated away
  if (currentTicker !== ticker) return;

  const baseUrl = await getBaseUrl();

  if (quote) {
    const isUp = quote.change >= 0;
    const colorClass = isUp ? "obsidian-fp-green" : "obsidian-fp-red";
    const sign = isUp ? "+" : "";

    el.innerHTML = `
      <div class="obsidian-fp-header">
        <div>
          <div class="obsidian-fp-ticker">${quote.ticker}</div>
          <div class="obsidian-fp-name">${quote.name || ticker}</div>
        </div>
        <div>
          <div class="obsidian-fp-price">$${quote.price.toFixed(2)}</div>
          <div class="obsidian-fp-change ${colorClass}">${sign}${quote.change.toFixed(2)} (${sign}${quote.changePercent.toFixed(2)}%)</div>
        </div>
      </div>
      ${quote.sparkline?.length > 3 ? `<div class="obsidian-fp-sparkline">${buildSparklineSVG(quote.sparkline)}</div>` : ""}
      <div class="obsidian-fp-ai">
        <div class="obsidian-fp-ai-label">
          <span style="color:#a78bfa">✦</span> AI Quick Take
        </div>
        <div class="obsidian-fp-ai-text">${analysis}</div>
      </div>
      <div class="obsidian-fp-actions">
        <a href="${baseUrl}/research/${ticker}" target="_blank" class="obsidian-fp-btn obsidian-fp-btn-primary">Full Research</a>
        <button class="obsidian-fp-btn obsidian-fp-btn-ghost" id="obsidian-deep-btn">Side Panel</button>
      </div>
      <div class="obsidian-fp-brand">
        <div class="obsidian-fp-logo"></div>
        Obsidian Markets · Vol ${formatNum(quote.volume)} · MCap ${formatNum(quote.marketCap)}
      </div>
    `;

    // Side Panel button
    el.querySelector("#obsidian-deep-btn")?.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "open-sidepanel", ticker });
      hidePanel();
    });

    // Save to recent
    addRecentAnalysis(ticker, analysis.slice(0, 100));
  } else {
    el.innerHTML = `
      <div class="obsidian-fp-header">
        <div>
          <div class="obsidian-fp-ticker">${ticker}</div>
          <div class="obsidian-fp-name" style="color:#ef4444">Data unavailable</div>
        </div>
      </div>
      <div class="obsidian-fp-ai">
        <div class="obsidian-fp-ai-text">${analysis}</div>
      </div>
      <div class="obsidian-fp-brand">
        <div class="obsidian-fp-logo"></div>
        Obsidian Markets
      </div>
    `;
  }
}

// Listen for ticker clicks from the detector
window.addEventListener("obsidian-ticker-click", ((e: CustomEvent) => {
  const { ticker, x, y } = e.detail;
  showPanel(ticker, x, y);
}) as EventListener);
