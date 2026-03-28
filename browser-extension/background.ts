/**
 * Background Service Worker
 *
 * Handles extension lifecycle, side panel management,
 * and message routing between content scripts and popup.
 */

// Open side panel when requested
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "open-sidepanel" && sender.tab?.windowId) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(() => {
      // Side panel might not be available
    });

    // Pass ticker context to side panel
    if (msg.ticker) {
      chrome.storage.session.set({ sidepanel_context: { ticker: msg.ticker, timestamp: Date.now() } });
    }
  }

  if (msg.type === "get-page-content" && sender.tab?.id) {
    // Request content from the active tab
    chrome.tabs.sendMessage(sender.tab.id, { type: "extract-content" });
  }
});

// Context menu: "Analyze with Obsidian"
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "obsidian-analyze",
    title: "Analyze with Obsidian AI",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "obsidian-analyze-page",
    title: "Analyze this page with Obsidian AI",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.windowId) return;

  if (info.menuItemId === "obsidian-analyze" && info.selectionText) {
    // Check if selection looks like a ticker
    const text = info.selectionText.trim().toUpperCase().replace("$", "");
    chrome.storage.session.set({
      sidepanel_context: { ticker: text, timestamp: Date.now() },
    });
    chrome.sidePanel.open({ windowId: tab.windowId });
  }

  if (info.menuItemId === "obsidian-analyze-page") {
    chrome.storage.session.set({
      sidepanel_context: { analyzePage: true, url: info.pageUrl, timestamp: Date.now() },
    });
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Set side panel behavior — open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
