/**
 * Ticker detection patterns for financial websites.
 * Matches $AAPL, AAPL (in financial context), and common formats.
 */

// Known US tickers (top 200 by volume) — prevents false positives on common words
const KNOWN_TICKERS = new Set([
  "AAPL", "MSFT", "NVDA", "GOOGL", "GOOG", "AMZN", "META", "TSLA", "BRK.A", "BRK.B",
  "AVGO", "JPM", "LLY", "V", "UNH", "MA", "XOM", "COST", "HD", "PG",
  "JNJ", "NFLX", "ABBV", "CRM", "BAC", "CVX", "ORCL", "MRK", "WMT", "KO",
  "CSCO", "PEP", "AMD", "ACN", "TMO", "LIN", "MCD", "ABT", "ADBE", "PM",
  "DIS", "INTC", "QCOM", "TXN", "INTU", "DHR", "AMGN", "CMCSA", "IBM", "VZ",
  "GE", "NOW", "ISRG", "CAT", "AXP", "GS", "SPGI", "AMAT", "BKNG", "BLK",
  "SYK", "MDLZ", "ADI", "PFE", "LRCX", "DE", "CB", "MMC", "VRTX", "GILD",
  "SCHW", "ETN", "FI", "REGN", "MU", "KLAC", "BSX", "PANW", "SNPS", "CDNS",
  "SHW", "BDX", "SO", "DUK", "CME", "PLD", "CI", "CL", "ICE", "ZTS",
  "PLTR", "SOFI", "COIN", "HOOD", "MARA", "SMCI", "ARM", "GME", "AMC", "RIVN",
  "IONQ", "SNOW", "DDOG", "NET", "CRWD", "ZS", "MDB", "SHOP", "SQ", "ROKU",
  "UBER", "ABNB", "DASH", "RBLX", "U", "SNAP", "PINS", "TTD", "WDAY", "VEEV",
  "SPY", "QQQ", "IWM", "DIA", "VTI", "VOO", "ARKK", "XLF", "XLE", "XLK",
]);

// Words that look like tickers but aren't
const FALSE_POSITIVES = new Set([
  "CEO", "CFO", "CTO", "COO", "IPO", "ETF", "SEC", "FDA", "FED", "GDP",
  "CPI", "EPS", "P/E", "NYSE", "NASDAQ", "DOW", "API", "USA", "USD", "EUR",
  "THE", "FOR", "AND", "NOT", "BUT", "ARE", "WAS", "HAS", "HAD", "HIS",
  "HER", "ITS", "OUR", "WHO", "HOW", "WHY", "ALL", "NEW", "OLD", "BIG",
  "LOW", "HIGH", "UP", "DOWN", "TOP", "AI", "US", "UK", "EU", "UN",
  "IT", "AT", "TO", "IN", "ON", "OR", "IF", "SO", "BY", "NO",
  "DO", "GO", "AM", "PM", "EST", "PST", "UTC", "PDF", "CEO", "COO",
  "TV", "PC", "HR", "PR", "VP", "MD", "DR", "MR", "MS", "JR",
  "SR", "LLC", "INC", "LTD", "CO", "VS", "RE", "FY", "YTD", "QOQ",
  "MOM", "YOY", "EV", "PE", "PB", "PS", "FCF", "ROE", "ROA", "ROI",
]);

/** Matches $AAPL or standalone uppercase 1-5 letter words that are known tickers */
const DOLLAR_TICKER = /\$([A-Z]{1,5})\b/g;
const BARE_TICKER = /\b([A-Z]{1,5})\b/g;

export interface TickerMatch {
  ticker: string;
  start: number;
  end: number;
  hasDollarSign: boolean;
}

/**
 * Find all ticker mentions in a text string.
 * $AAPL always matches. Bare AAPL only matches if it's a known ticker.
 */
export function findTickers(text: string): TickerMatch[] {
  const matches: TickerMatch[] = [];
  const seen = new Set<string>();

  // First pass: $TICKER (always trust dollar-sign prefix)
  let m: RegExpExecArray | null;
  DOLLAR_TICKER.lastIndex = 0;
  while ((m = DOLLAR_TICKER.exec(text)) !== null) {
    const ticker = m[1];
    if (!FALSE_POSITIVES.has(ticker)) {
      const key = `${m.index}:${ticker}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({ ticker, start: m.index, end: m.index + m[0].length, hasDollarSign: true });
      }
    }
  }

  // Second pass: bare TICKER (only known tickers, skip false positives)
  BARE_TICKER.lastIndex = 0;
  while ((m = BARE_TICKER.exec(text)) !== null) {
    const ticker = m[1];
    if (KNOWN_TICKERS.has(ticker) && !FALSE_POSITIVES.has(ticker)) {
      const key = `${m.index}:${ticker}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({ ticker, start: m.index, end: m.index + m[0].length, hasDollarSign: false });
      }
    }
  }

  return matches;
}

export function isKnownTicker(text: string): boolean {
  const upper = text.replace("$", "").toUpperCase().trim();
  return KNOWN_TICKERS.has(upper);
}
