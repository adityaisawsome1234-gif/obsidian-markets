/**
 * Popup — Quick dashboard with search, watchlist, and page analysis.
 */

import { fetchQuote, fetchQuickAnalysis, analyzePageContent, type StockQuote } from "../lib/api";
import { getConfig, getBaseUrl, addRecentAnalysis } from "../lib/storage";

const $ = (s: string) => document.querySelector(s) as HTMLElement;
const searchInput = $("#search") as HTMLInputElement;
const watchlistEl = $("#watchlist");
const recentEl = $("#recent");
const recentLabel = $("#recent-label");
const resultView = $("#result");
const mainView = $("#main-view");
const resultText = $("#result-text");

// Load watchlist quotes
async function loadWatchlist() {
  const config = await getConfig();
  watchlistEl.innerHTML = '<div class="loading">Loading quotes...</div>';

  const quotes: (StockQuote | null)[] = await Promise.all(
    config.watchlist.map((t) => fetchQuote(t))
  );

  watchlistEl.innerHTML = "";
  for (const q of quotes) {
    if (!q) continue;
    const isUp = q.change >= 0;
    const sign = isUp ? "+" : "";
    const div = document.createElement("div");
    div.className = "wl-item";
    div.innerHTML = `
      <div>
        <div class="wl-ticker">${q.ticker}</div>
        <div class="wl-name">${q.name?.slice(0, 25) || ""}</div>
      </div>
      <div>
        <div class="wl-price">$${q.price.toFixed(2)}</div>
        <div class="wl-change ${isUp ? "green" : "red"}">${sign}${q.changePercent.toFixed(2)}%</div>
      </div>
    `;
    div.addEventListener("click", () => analyzeTickerInline(q.ticker));
    watchlistEl.appendChild(div);
  }

  if (quotes.every((q) => q === null)) {
    watchlistEl.innerHTML = '<div class="loading">Could not load quotes. Check API connection.</div>';
  }
}

// Load recent analyses
async function loadRecent() {
  const config = await getConfig();
  if (config.recentAnalyses.length === 0) return;

  recentLabel.style.display = "";
  recentEl.innerHTML = "";
  for (const a of config.recentAnalyses.slice(0, 5)) {
    const div = document.createElement("div");
    div.className = "recent-item";
    div.innerHTML = `<strong>${a.ticker}</strong>${a.summary.slice(0, 60)}...`;
    div.addEventListener("click", () => analyzeTickerInline(a.ticker));
    recentEl.appendChild(div);
  }
}

// Show inline analysis result
function showResult(title: string, text: string) {
  resultText.innerHTML = `<strong>${title}</strong><br><br>${text}`;
  mainView.style.display = "none";
  resultView.style.display = "block";
}

function hideResult() {
  mainView.style.display = "";
  resultView.style.display = "none";
}

// Analyze a ticker and show result
async function analyzeTickerInline(ticker: string) {
  showResult(ticker, '<span class="muted">Analyzing...</span>');
  const analysis = await fetchQuickAnalysis(ticker);
  showResult(ticker, analysis);
  addRecentAnalysis(ticker, analysis.slice(0, 100));
}

// Search handler
let searchTimeout: ReturnType<typeof setTimeout>;
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const val = searchInput.value.trim().toUpperCase();
    if (val.length >= 1 && val.length <= 5) {
      analyzeTickerInline(val);
    }
  }
});

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const val = searchInput.value.trim().toUpperCase();
    if (val.length >= 2 && val.length <= 5 && /^[A-Z]+$/.test(val)) {
      // Show a subtle hint
      searchInput.style.borderColor = "rgba(167,139,250,0.4)";
    } else {
      searchInput.style.borderColor = "";
    }
  }, 300);
});

// Analyze page button — uses message passing to content script
$("#analyze-page").addEventListener("click", async () => {
  showResult("Page Analysis", '<span class="muted">Reading page content...</span>');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      showResult("Error", "No active tab found.");
      return;
    }

    // Skip chrome:// and extension pages
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
      showResult("Page Analysis", "Cannot analyze browser internal pages. Navigate to a website first.");
      return;
    }

    // Try scripting API first, fall back to tab title/URL analysis
    let pageText = "";
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText.slice(0, 5000),
      });
      pageText = results?.[0]?.result || "";
    } catch {
      // Scripting failed (restricted page) — analyze from URL + title
      pageText = `Page: ${tab.title || "Unknown"}\nURL: ${tab.url}`;
    }

    if (pageText.length < 20) {
      pageText = `Page: ${tab.title || "Unknown"}\nURL: ${tab.url}`;
    }

    showResult("Page Analysis", '<span class="muted">AI is analyzing...</span>');
    const analysis = await analyzePageContent(pageText, tab.url);
    showResult("Page Analysis", analysis);
  } catch (e) {
    showResult("Error", `Could not analyze page: ${(e as Error).message}`);
  }
});

// Back button
$("#back-btn").addEventListener("click", hideResult);

// Settings link
(async () => {
  const base = await getBaseUrl();
  ($("#settings-link") as HTMLAnchorElement).href = `${base}/settings`;
})();

// Init
loadWatchlist();
loadRecent();
searchInput.focus();
