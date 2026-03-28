/**
 * Content Script — Ticker Detector
 *
 * Scans the visible DOM for stock ticker mentions and adds
 * interactive highlights. Clicking a highlighted ticker opens
 * the floating analysis panel.
 */

import { findTickers, isKnownTicker } from "../lib/ticker-regex";

const SCAN_INTERVAL = 3000; // Re-scan every 3s for dynamic pages
const ATTR = "data-obsidian-ticker";
const PROCESSED = "data-obsidian-processed";

/** Walk text nodes in the DOM and wrap ticker mentions */
function scanNode(root: Node): number {
  let count = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;

      // Skip already-processed nodes
      if (parent.hasAttribute(ATTR) || parent.hasAttribute(PROCESSED))
        return NodeFilter.FILTER_REJECT;

      // Skip script, style, input, textarea, code, pre
      const tag = parent.tagName;
      if (["SCRIPT", "STYLE", "INPUT", "TEXTAREA", "CODE", "PRE", "SVG", "NOSCRIPT"].includes(tag))
        return NodeFilter.FILTER_REJECT;

      // Skip tiny text nodes
      const text = node.textContent || "";
      if (text.trim().length < 2) return NodeFilter.FILTER_REJECT;

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);

  for (const textNode of nodes) {
    const text = textNode.textContent || "";
    const matches = findTickers(text);
    if (matches.length === 0) continue;

    const parent = textNode.parentElement;
    if (!parent) continue;

    // Mark parent as processed to avoid re-scanning
    parent.setAttribute(PROCESSED, "1");

    // Build replacement fragment
    const frag = document.createDocumentFragment();
    let lastIndex = 0;

    for (const m of matches) {
      // Add text before this match
      if (m.start > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, m.start)));
      }

      // Create highlighted span
      const span = document.createElement("span");
      span.setAttribute(ATTR, m.ticker);
      span.textContent = text.slice(m.start, m.end);
      span.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Dispatch custom event for floating-panel.ts to handle
        window.dispatchEvent(
          new CustomEvent("obsidian-ticker-click", {
            detail: { ticker: m.ticker, x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY },
          })
        );
      });
      frag.appendChild(span);
      lastIndex = m.end;
      count++;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    parent.replaceChild(frag, textNode);
  }

  return count;
}

/** Initial scan + periodic re-scan for SPAs */
function init() {
  // Don't run on our own app
  if (window.location.hostname === "localhost" && window.location.port === "3000") return;
  if (window.location.hostname.includes("obsidianmarkets.com")) return;

  let totalFound = 0;

  // Initial scan
  setTimeout(() => {
    totalFound = scanNode(document.body);
    if (totalFound > 0) {
      console.log(`[Obsidian Markets] Found ${totalFound} ticker mentions`);
    }
  }, 1000);

  // Re-scan periodically for dynamic content (SPAs like Yahoo Finance)
  setInterval(() => {
    const newCount = scanNode(document.body);
    if (newCount > 0) totalFound += newCount;
  }, SCAN_INTERVAL);

  // Also re-scan on URL changes (SPA navigation)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(() => scanNode(document.body), 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

init();
