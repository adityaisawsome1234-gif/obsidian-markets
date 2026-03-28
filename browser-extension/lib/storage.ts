/**
 * Chrome storage wrapper for extension state.
 */

export interface ExtensionConfig {
  apiBaseUrl: string;
  apiKey: string;
  watchlist: string[];
  recentAnalyses: { ticker: string; summary: string; timestamp: number }[];
  enabled: boolean;
}

const DEFAULTS: ExtensionConfig = {
  apiBaseUrl: "http://localhost:3000",
  apiKey: "",
  watchlist: ["AAPL", "NVDA", "MSFT", "GOOGL", "TSLA"],
  recentAnalyses: [],
  enabled: true,
};

export async function getConfig(): Promise<ExtensionConfig> {
  try {
    const data = await chrome.storage.local.get("obsidian_config");
    return { ...DEFAULTS, ...data.obsidian_config };
  } catch {
    return DEFAULTS;
  }
}

export async function setConfig(partial: Partial<ExtensionConfig>): Promise<void> {
  const current = await getConfig();
  await chrome.storage.local.set({ obsidian_config: { ...current, ...partial } });
}

export async function addRecentAnalysis(ticker: string, summary: string): Promise<void> {
  const config = await getConfig();
  const recent = [
    { ticker, summary, timestamp: Date.now() },
    ...config.recentAnalyses.filter((a) => a.ticker !== ticker),
  ].slice(0, 20);
  await setConfig({ recentAnalyses: recent });
}

export async function getApiKey(): Promise<string> {
  const config = await getConfig();
  return config.apiKey;
}

export async function getBaseUrl(): Promise<string> {
  const config = await getConfig();
  return config.apiBaseUrl;
}
