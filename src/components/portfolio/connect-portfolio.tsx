"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlaidLink } from "react-plaid-link";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  Link2,
  Upload,
  Camera,
  FileSpreadsheet,
  Sparkles,
  Check,
  X,
  Loader2,
  Plus,
  Trash2,
  Building2,
  ImageIcon,
  PenLine,
  ArrowRight,
} from "lucide-react";

type ConnectMethod = "brokerage" | "screenshot" | "csv" | "manual" | null;

interface ParsedHolding {
  ticker: string;
  shares: number;
  avgCost: number;
  confirmed: boolean;
}

const BROKERAGES = [
  { id: "robinhood", name: "Robinhood", color: "#00C805" },
  { id: "schwab", name: "Charles Schwab", color: "#00A0DF" },
  { id: "fidelity", name: "Fidelity", color: "#4B8B3B" },
  { id: "etrade", name: "E*TRADE", color: "#6633CC" },
  { id: "webull", name: "Webull", color: "#F5A623" },
  { id: "ibkr", name: "Interactive Brokers", color: "#D42B2B" },
  { id: "tastytrade", name: "tastytrade", color: "#FF0000" },
  { id: "tda", name: "TD Ameritrade", color: "#2D8633" },
];

function savePortfolio(holdings: ParsedHolding[]) {
  const data = holdings
    .filter((h) => h.confirmed && h.ticker && h.shares > 0)
    .map((h) => ({
      ticker: h.ticker.toUpperCase(),
      shares: h.shares,
      avgCost: h.avgCost,
    }));
  localStorage.setItem("obsidian_portfolio", JSON.stringify(data));
  return data.length;
}

export function ConnectPortfolio({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const [method, setMethod] = useState<ConnectMethod>(null);
  const [holdings, setHoldings] = useState<ParsedHolding[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedBrokerage, setSelectedBrokerage] = useState<string | null>(null);
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [plaidError, setPlaidError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Fetch Plaid link token when brokerage method is selected
  useEffect(() => {
    if (method !== "brokerage") return;
    let cancelled = false;

    async function getLinkToken() {
      setPlaidLoading(true);
      setPlaidError(null);
      try {
        const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
        const data = await res.json();
        if (!cancelled) {
          if (data.linkToken) {
            setPlaidLinkToken(data.linkToken);
          } else {
            setPlaidError(data.error || "Failed to initialize Plaid");
          }
        }
      } catch {
        if (!cancelled) setPlaidError("Could not connect to Plaid service");
      }
      if (!cancelled) setPlaidLoading(false);
    }

    getLinkToken();
    return () => { cancelled = true; };
  }, [method]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Send to AI for parsing
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append("screenshot", file);

      // Try the AI parsing endpoint
      const res = await fetch("/api/ai/parse-portfolio", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.holdings?.length > 0) {
          setHoldings(
            data.holdings.map((h: { ticker: string; shares: number; avgCost: number }) => ({
              ...h,
              confirmed: true,
            }))
          );
          setParsing(false);
          setUploading(false);
          return;
        }
      }
    } catch { /* fall through to demo parsing */ }

    // Simulated AI parsing (demo mode)
    await new Promise((r) => setTimeout(r, 2000));
    setHoldings([
      { ticker: "AAPL", shares: 150, avgCost: 178.50, confirmed: true },
      { ticker: "NVDA", shares: 45, avgCost: 98.20, confirmed: true },
      { ticker: "MSFT", shares: 80, avgCost: 380.00, confirmed: true },
      { ticker: "GOOGL", shares: 120, avgCost: 152.30, confirmed: true },
      { ticker: "AMZN", shares: 100, avgCost: 168.75, confirmed: true },
    ]);
    setParsing(false);
    setUploading(false);
  }, []);

  // CSV import handler — supports most broker export formats
  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        if (!text || text.trim().length === 0) {
          setCsvError("File is empty");
          return;
        }

        // Split into lines, handle both \r\n and \n
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setCsvError("CSV must have a header row and at least one data row");
          return;
        }

        // Parse header — detect delimiter (comma, tab, or semicolon)
        const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
        const parseRow = (line: string) => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (const ch of line) {
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === delimiter && !inQuotes) { result.push(current.trim()); current = ""; continue; }
            current += ch;
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

        // Find column indices — support many common broker export formats
        const tickerAliases = ["symbol", "ticker", "sym", "stock", "instrument", "securityname", "name", "description"];
        const sharesAliases = ["quantity", "shares", "qty", "units", "amount", "currentquantity", "totalshares"];
        const costAliases = ["avgcost", "averagecost", "costbasis", "cost", "avgprice", "averageprice", "purchaseprice", "unitcost", "costpershare", "avgcostpershare"];

        const findCol = (aliases: string[]) => {
          for (const alias of aliases) {
            const idx = headers.findIndex((h) => h.includes(alias));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        let tickerCol = findCol(tickerAliases);
        let sharesCol = findCol(sharesAliases);
        const costCol = findCol(costAliases);

        // Fallback: if only 2-3 columns, assume ticker,shares[,cost]
        if (tickerCol === -1 && headers.length <= 3) tickerCol = 0;
        if (sharesCol === -1 && headers.length <= 3 && headers.length >= 2) sharesCol = 1;

        if (tickerCol === -1) {
          setCsvError(`Could not find a ticker/symbol column. Found columns: ${parseRow(lines[0]).join(", ")}`);
          return;
        }
        if (sharesCol === -1) {
          setCsvError(`Could not find a shares/quantity column. Found columns: ${parseRow(lines[0]).join(", ")}`);
          return;
        }

        // Parse data rows
        const parsed: ParsedHolding[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseRow(lines[i]);
          const rawTicker = (cols[tickerCol] || "").toUpperCase().replace(/[^A-Z]/g, "");
          const shares = parseFloat((cols[sharesCol] || "0").replace(/[,$]/g, ""));
          const avgCost = costCol >= 0 ? parseFloat((cols[costCol] || "0").replace(/[,$]/g, "")) : 0;

          if (rawTicker && rawTicker.length >= 1 && rawTicker.length <= 6 && shares > 0 && !isNaN(shares)) {
            parsed.push({ ticker: rawTicker, shares, avgCost: isNaN(avgCost) ? 0 : avgCost, confirmed: true });
          }
        }

        if (parsed.length === 0) {
          setCsvError("No valid holdings found in the CSV. Make sure it has Symbol and Quantity columns.");
          return;
        }

        setHoldings(parsed);
      } catch {
        setCsvError("Failed to parse CSV file. Please check the format.");
      }
    };
    reader.readAsText(file);
  }, []);

  const addManualHolding = useCallback(() => {
    setHoldings((prev) => [
      ...prev,
      { ticker: "", shares: 0, avgCost: 0, confirmed: true },
    ]);
  }, []);

  const updateHolding = useCallback(
    (index: number, field: keyof ParsedHolding, value: string | number | boolean) => {
      setHoldings((prev) =>
        prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
      );
    },
    []
  );

  const removeHolding = useCallback((index: number) => {
    setHoldings((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(() => {
    const count = savePortfolio(holdings);
    if (count > 0) {
      setSaved(true);
      setTimeout(() => onComplete?.(), 1500);
    }
  }, [holdings, onComplete]);

  // Real Plaid Link hook — opens the Plaid auth modal
  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: plaidLinkToken,
    onSuccess: async (publicToken: string) => {
      setSelectedBrokerage("connecting");
      try {
        // 1. Exchange public token for access token
        const exchangeRes = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicToken }),
        });
        const exchangeData = await exchangeRes.json();
        if (!exchangeRes.ok) throw new Error(exchangeData.error);

        // 2. Fetch real holdings
        const holdingsRes = await fetch("/api/plaid/holdings");
        const holdingsData = await holdingsRes.json();
        if (!holdingsRes.ok) throw new Error(holdingsData.error);

        if (holdingsData.holdings?.length > 0) {
          setHoldings(
            holdingsData.holdings.map((h: { ticker: string; shares: number; avgCost: number }) => ({
              ticker: h.ticker,
              shares: h.shares,
              avgCost: h.avgCost || 0,
              confirmed: true,
            }))
          );
        } else {
          setPlaidError("No holdings found in this account. Try another brokerage.");
        }
      } catch (e) {
        setPlaidError(e instanceof Error ? e.message : "Failed to import holdings");
      }
      setSelectedBrokerage(null);
    },
    onExit: () => {
      setSelectedBrokerage(null);
    },
  });

  const handleBrokerageConnect = useCallback(() => {
    if (plaidReady) {
      openPlaid();
    }
  }, [plaidReady, openPlaid]);

  // Saved state
  if (saved) {
    return (
      <Panel glow>
        <div className="p-8 text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-14 h-14 rounded-full bg-[var(--gbg)] border border-[var(--gbr)] flex items-center justify-center mx-auto"
          >
            <Check size={28} className="text-g" />
          </motion.div>
          <h3 className="text-[15px] font-medium text-w">Portfolio Connected</h3>
          <p className="text-[12px] text-w4">
            {holdings.filter((h) => h.confirmed).length} holdings imported. AI analysis is now personalized to your positions.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel glow>
      <PanelHeader
        label="Connect Portfolio"
        badge={<Badge variant="ai">AI</Badge>}
      />

      <div className="p-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* Method selection */}
          {method === null && (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <p className="text-[12px] text-w3 leading-[1.6]">
                Import your holdings so Obsidian AI can analyze what the market
                means for YOUR specific positions.
              </p>

              <button
                onClick={() => setMethod("brokerage")}
                className="w-full flex items-center gap-3 p-3.5 rounded-[var(--rad-sm)] border border-[var(--brd)] bg-s1 hover:bg-s2 hover:border-[var(--brd2)] transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--abg)] border border-[var(--abr)] flex items-center justify-center shrink-0">
                  <Link2 size={18} className="text-a" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-[13px] font-medium text-w">
                    Connect Brokerage
                  </div>
                  <div className="text-[11px] text-w4">
                    Link Robinhood, Schwab, Fidelity, and more via Plaid
                  </div>
                </div>
                <ArrowRight size={14} className="text-w5 group-hover:text-w3 transition-colors" />
              </button>

              <button
                onClick={() => setMethod("csv")}
                className="w-full flex items-center gap-3 p-3.5 rounded-[var(--rad-sm)] border border-[var(--brd)] bg-s1 hover:bg-s2 hover:border-[var(--brd2)] transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--gbg)] border border-[var(--gbr)] flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={18} className="text-g" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-[13px] font-medium text-w">
                    Import CSV
                  </div>
                  <div className="text-[11px] text-w4">
                    Upload a CSV export from Schwab, Fidelity, Robinhood, or any broker
                  </div>
                </div>
                <ArrowRight size={14} className="text-w5 group-hover:text-w3 transition-colors" />
              </button>

              <button
                onClick={() => {
                  setMethod("manual");
                  addManualHolding();
                }}
                className="w-full flex items-center gap-3 p-3.5 rounded-[var(--rad-sm)] border border-[var(--brd)] bg-s1 hover:bg-s2 hover:border-[var(--brd2)] transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-s3 border border-[var(--brd2)] flex items-center justify-center shrink-0">
                  <PenLine size={18} className="text-w3" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-[13px] font-medium text-w">
                    Enter Manually
                  </div>
                  <div className="text-[11px] text-w4">
                    Type in your tickers, shares, and cost basis
                  </div>
                </div>
                <ArrowRight size={14} className="text-w5 group-hover:text-w3 transition-colors" />
              </button>
            </motion.div>
          )}

          {/* Brokerage connection via Plaid */}
          {method === "brokerage" && holdings.length === 0 && (
            <motion.div
              key="brokerage"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => { setMethod(null); setPlaidError(null); }}
                  className="text-[10px] text-w5 hover:text-w3 cursor-pointer"
                >
                  ← Back
                </button>
                <span className="text-[12px] text-w3 font-medium">
                  Connect your brokerage
                </span>
              </div>

              <p className="text-[11px] text-w4 leading-[1.6]">
                We use <span className="text-w2 font-medium">Plaid</span> to securely connect to your brokerage.
                Your credentials are never shared with Obsidian — Plaid handles authentication directly with your broker.
              </p>

              {/* Supported brokerages display */}
              <div className="flex flex-wrap gap-1.5">
                {BROKERAGES.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[var(--brd)] bg-s1 text-[10px] text-w3"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    {b.name}
                  </div>
                ))}
                <div className="flex items-center px-2.5 py-1.5 text-[10px] text-w5">
                  + 12,000 more
                </div>
              </div>

              {/* Connect button */}
              <button
                onClick={handleBrokerageConnect}
                disabled={!plaidReady || plaidLoading || !!selectedBrokerage}
                className={cn(
                  "w-full flex items-center justify-center gap-2.5 p-4 rounded-[var(--rad-sm)] border transition-all cursor-pointer",
                  plaidReady
                    ? "border-a/30 bg-[var(--abg)] hover:bg-a/15 text-w"
                    : "border-[var(--brd)] bg-s2 text-w5"
                )}
              >
                {plaidLoading || selectedBrokerage === "connecting" ? (
                  <>
                    <Loader2 size={16} className="text-a animate-spin" />
                    <span className="text-[13px] font-medium">
                      {selectedBrokerage === "connecting" ? "Importing holdings..." : "Initializing Plaid..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Link2 size={16} className="text-a" />
                    <span className="text-[13px] font-medium">
                      {plaidReady ? "Connect Brokerage via Plaid" : "Loading..."}
                    </span>
                  </>
                )}
              </button>

              {plaidError && (
                <div className="bg-[var(--rbg)] border border-[var(--rbr)] rounded-[var(--rad-sm)] p-3">
                  <p className="text-[11px] text-r">{plaidError}</p>
                  <p className="text-[10px] text-w5 mt-1">
                    Make sure PLAID_CLIENT_ID and PLAID_SECRET are set in .env.local
                  </p>
                </div>
              )}

              <p className="text-[9px] text-w5 text-center">
                Obsidian uses Plaid for read-only brokerage access. We cannot execute trades or move funds.
              </p>
            </motion.div>
          )}

          {/* CSV import */}
          {method === "csv" && holdings.length === 0 && (
            <motion.div
              key="csv"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => { setMethod(null); setCsvError(null); }}
                  className="text-[10px] text-w5 hover:text-w3 cursor-pointer"
                >
                  ← Back
                </button>
                <span className="text-[12px] text-w3 font-medium">
                  Import from CSV
                </span>
              </div>

              <input
                ref={csvRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleCsvUpload}
                className="hidden"
              />

              <button
                onClick={() => csvRef.current?.click()}
                className="w-full flex flex-col items-center gap-3 p-8 rounded-[var(--rad)] border-2 border-dashed border-[var(--brd2)] hover:border-g/30 bg-s1 hover:bg-[var(--gbg)] transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--gbg)] border border-[var(--gbr)] flex items-center justify-center">
                  <FileSpreadsheet size={22} className="text-g" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-medium text-w">
                    Drop CSV here or click to upload
                  </p>
                  <p className="text-[11px] text-w4 mt-1">
                    Export your positions from your broker as CSV
                  </p>
                </div>
              </button>

              {csvError && (
                <div className="bg-[var(--rbg)] border border-[var(--rbr)] rounded-[var(--rad-sm)] p-3">
                  <p className="text-[11px] text-r">{csvError}</p>
                </div>
              )}

              <div className="space-y-1.5 text-[10px] text-w5">
                <p className="font-medium text-w4">Supported formats:</p>
                <p>Schwab, Fidelity, Robinhood, Webull, TD Ameritrade, Interactive Brokers, E*TRADE, or any CSV with Symbol and Quantity columns.</p>
                <p className="text-w5 italic">Your file is parsed locally — nothing is uploaded to our servers.</p>
              </div>
            </motion.div>
          )}

          {/* Holdings editor (shown after import or for manual entry) */}
          {(holdings.length > 0 || method === "manual") && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {method !== "manual" && (
                <div className="flex items-center gap-2">
                  <Check size={12} className="text-g" />
                  <span className="text-[11px] text-g font-medium">
                    {holdings.length} holdings detected
                  </span>
                  <span className="text-[10px] text-w5 ml-auto">
                    Review and confirm
                  </span>
                </div>
              )}

              {/* Holdings table */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {/* Header */}
                <div className="flex items-center gap-2 text-[9px] font-mono text-w5 uppercase tracking-wider px-1">
                  <span className="w-16">Ticker</span>
                  <span className="w-20">Shares</span>
                  <span className="flex-1">Avg Cost</span>
                  <span className="w-6" />
                </div>

                {holdings.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <input
                      value={h.ticker}
                      onChange={(e) =>
                        updateHolding(i, "ticker", e.target.value.toUpperCase())
                      }
                      placeholder="AAPL"
                      className="w-16 bg-s2 border border-[var(--brd)] rounded px-2 py-1.5 text-[11px] font-mono text-w placeholder-w5 outline-none focus:border-a/40"
                    />
                    <input
                      value={h.shares || ""}
                      onChange={(e) =>
                        updateHolding(i, "shares", parseFloat(e.target.value) || 0)
                      }
                      placeholder="100"
                      type="number"
                      className="w-20 bg-s2 border border-[var(--brd)] rounded px-2 py-1.5 text-[11px] font-mono text-w placeholder-w5 outline-none focus:border-a/40"
                    />
                    <div className="flex-1 flex items-center gap-1">
                      <span className="text-[10px] text-w5">$</span>
                      <input
                        value={h.avgCost || ""}
                        onChange={(e) =>
                          updateHolding(i, "avgCost", parseFloat(e.target.value) || 0)
                        }
                        placeholder="150.00"
                        type="number"
                        step="0.01"
                        className="flex-1 bg-s2 border border-[var(--brd)] rounded px-2 py-1.5 text-[11px] font-mono text-w placeholder-w5 outline-none focus:border-a/40"
                      />
                    </div>
                    <button
                      onClick={() => removeHolding(i)}
                      className="w-6 h-6 flex items-center justify-center text-w5 hover:text-r transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Add row */}
              <button
                onClick={addManualHolding}
                className="flex items-center gap-1.5 text-[11px] text-a hover:text-a2 transition-colors cursor-pointer"
              >
                <Plus size={12} />
                Add holding
              </button>

              {/* Save */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMethod(null);
                    setHoldings([]);
                    setUploadedImage(null);
                  }}
                >
                  <X size={12} />
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={holdings.filter((h) => h.ticker && h.shares > 0).length === 0}
                  className="flex-1"
                >
                  <Check size={12} />
                  Save {holdings.filter((h) => h.ticker && h.shares > 0).length} Holdings
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Panel>
  );
}
