"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Tabs } from "@/components/ui/tabs";
import { useTrades, useCreateTrade, useCloseTrade } from "@/hooks/use-alpha-engine";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Loader2, Plus, X, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { Trade, StrategyTag, TradeSide } from "@/types/alpha-engine";

const STRATEGY_OPTIONS: StrategyTag[] = [
  "momentum", "mean_reversion", "breakout", "earnings_play", "options_flow",
  "value", "trend_following", "gap_fill", "sector_rotation", "catalyst", "other",
];

export default function JournalPage() {
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [showForm, setShowForm] = useState(false);
  const [closingTrade, setClosingTrade] = useState<string | null>(null);
  const [closePrice, setClosePrice] = useState("");

  const statusFilter = filter === "all" ? undefined : filter;
  const { data, isLoading } = useTrades({ status: statusFilter });
  const createTrade = useCreateTrade();
  const closeTradeAction = useCloseTrade();

  const tabs = [
    { id: "all", label: "All Trades" },
    { id: "open", label: "Open" },
    { id: "closed", label: "Closed" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-w tracking-[-0.5px]">Trade Journal</h1>
          <p className="text-[11px] text-w4 mt-0.5">Log and track your trades to build your alpha profile</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-w bg-s3 hover:bg-s4 rounded-md transition-colors"
        >
          {showForm ? <X size={11} /> : <Plus size={11} />}
          {showForm ? "Cancel" : "New Trade"}
        </button>
      </div>

      {/* New trade form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <TradeEntryForm
              onSubmit={(input) => {
                createTrade.mutate(input, { onSuccess: () => setShowForm(false) });
              }}
              isPending={createTrade.isPending}
              error={createTrade.error?.message}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs
        tabs={tabs}
        activeTab={filter}
        onChange={(id) => setFilter(id as "all" | "open" | "closed")}
      />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 size={14} className="animate-spin text-w5" />
          <span className="text-[11px] text-w5">Loading trades...</span>
        </div>
      ) : data?.trades.length ? (
        <Panel>
          <PanelHeader
            label="Trade History"
            badge={<span className="text-[9px] text-w5">{data.total} trades</span>}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--brd)]">
                  <th className="px-3.5 py-2 text-[9px] font-semibold text-w5 uppercase tracking-[0.5px]">Symbol</th>
                  <th className="px-3.5 py-2 text-[9px] font-semibold text-w5 uppercase tracking-[0.5px]">Side</th>
                  <th className="px-3.5 py-2 text-[9px] font-semibold text-w5 uppercase tracking-[0.5px]">Strategy</th>
                  <th className="px-3.5 py-2 text-[9px] font-semibold text-w5 uppercase tracking-[0.5px]">Entry</th>
                  <th className="px-3.5 py-2 text-[9px] font-semibold text-w5 uppercase tracking-[0.5px]">Exit</th>
                  <th className="px-3.5 py-2 text-[9px] font-semibold text-w5 uppercase tracking-[0.5px]">P&L</th>
                  <th className="px-3.5 py-2 text-[9px] font-semibold text-w5 uppercase tracking-[0.5px]">Hold</th>
                  <th className="px-3.5 py-2 text-[9px] font-semibold text-w5 uppercase tracking-[0.5px]">Status</th>
                  <th className="px-3.5 py-2 text-[9px] font-semibold text-w5 uppercase tracking-[0.5px]"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {data.trades.map((trade) => (
                    <motion.tr
                      key={trade.id}
                      variants={staggerItem}
                      className="border-b border-[var(--brd)] hover:bg-s2/50 transition-colors"
                    >
                      <td className="px-3.5 py-2.5">
                        <span className="text-[12px] font-bold text-w">{trade.symbol}</span>
                        {trade.sector && <span className="text-[9px] text-w5 ml-1.5">{trade.sector}</span>}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`flex items-center gap-0.5 text-[10px] font-medium ${trade.side === "long" ? "text-g" : "text-r"}`}>
                          {trade.side === "long" ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {trade.side}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-[10px] text-w3">
                        {trade.strategyTag.replace(/_/g, " ")}
                      </td>
                      <td className="px-3.5 py-2.5 text-[11px] font-mono text-w3">
                        ${trade.entryPrice.toFixed(2)}
                      </td>
                      <td className="px-3.5 py-2.5 text-[11px] font-mono text-w3">
                        {trade.exitPrice != null ? `$${trade.exitPrice.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {trade.pnlPercent != null ? (
                          <span className={`text-[11px] font-mono font-bold ${trade.pnlPercent >= 0 ? "text-g" : "text-r"}`}>
                            {trade.pnlPercent >= 0 ? "+" : ""}{trade.pnlPercent.toFixed(1)}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3.5 py-2.5 text-[10px] text-w4 font-mono">
                        {trade.holdingPeriodDays != null ? `${trade.holdingPeriodDays}d` : "—"}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                          trade.status === "open" ? "text-blue bg-blue/10" : "text-w4 bg-s3"
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        {trade.status === "open" && (
                          closingTrade === trade.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Exit $"
                                value={closePrice}
                                onChange={e => setClosePrice(e.target.value)}
                                className="w-[72px] px-1.5 py-0.5 text-[10px] bg-s3 border border-[var(--brd)] rounded text-w"
                              />
                              <button
                                onClick={() => {
                                  const price = parseFloat(closePrice);
                                  if (price > 0) {
                                    closeTradeAction.mutate({ tradeId: trade.id, exitPrice: price }, {
                                      onSuccess: () => { setClosingTrade(null); setClosePrice(""); },
                                    });
                                  }
                                }}
                                className="text-[9px] text-g hover:text-g/80"
                              >
                                Close
                              </button>
                              <button
                                onClick={() => { setClosingTrade(null); setClosePrice(""); }}
                                className="text-[9px] text-w5"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setClosingTrade(trade.id)}
                              className="text-[9px] text-blue hover:text-blue/80 font-medium"
                            >
                              Close
                            </button>
                          )
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Panel>
          <div className="flex flex-col items-center py-12 text-center">
            <Plus size={24} className="text-w5 mb-3" />
            <p className="text-[12px] text-w3 mb-1">No trades yet</p>
            <p className="text-[11px] text-w5 max-w-[300px]">
              Start logging trades to build your alpha profile. Click &quot;New Trade&quot; above.
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ── Trade Entry Form ── */

function TradeEntryForm({ onSubmit, isPending, error }: {
  onSubmit: (input: import("@/types/alpha-engine").TradeCreateInput) => void;
  isPending: boolean;
  error?: string;
}) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<TradeSide>("long");
  const [quantity, setQuantity] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [strategyTag, setStrategyTag] = useState<StrategyTag>("momentum");
  const [sector, setSector] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      symbol: symbol.toUpperCase(),
      side,
      quantity: parseFloat(quantity),
      entryPrice: parseFloat(entryPrice),
      openedAt: new Date().toISOString(),
      strategyTag,
      sector: (sector || undefined) as import("@/types/alpha-engine").Sector | undefined,
    });
  };

  return (
    <Panel>
      <PanelHeader label="Log New Trade" />
      <form onSubmit={handleSubmit} className="p-3.5 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[9px] text-w5 uppercase tracking-[0.3px] mb-1 block">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="NVDA"
              required
              className="w-full px-2.5 py-1.5 text-[11px] bg-s3 border border-[var(--brd)] rounded text-w placeholder:text-w5"
            />
          </div>
          <div>
            <label className="text-[9px] text-w5 uppercase tracking-[0.3px] mb-1 block">Side</label>
            <select
              value={side}
              onChange={e => setSide(e.target.value as TradeSide)}
              className="w-full px-2.5 py-1.5 text-[11px] bg-s3 border border-[var(--brd)] rounded text-w"
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] text-w5 uppercase tracking-[0.3px] mb-1 block">Quantity</label>
            <input
              type="number"
              step="0.01"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="100"
              required
              className="w-full px-2.5 py-1.5 text-[11px] bg-s3 border border-[var(--brd)] rounded text-w placeholder:text-w5"
            />
          </div>
          <div>
            <label className="text-[9px] text-w5 uppercase tracking-[0.3px] mb-1 block">Entry Price</label>
            <input
              type="number"
              step="0.01"
              value={entryPrice}
              onChange={e => setEntryPrice(e.target.value)}
              placeholder="135.50"
              required
              className="w-full px-2.5 py-1.5 text-[11px] bg-s3 border border-[var(--brd)] rounded text-w placeholder:text-w5"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] text-w5 uppercase tracking-[0.3px] mb-1 block">Strategy</label>
            <select
              value={strategyTag}
              onChange={e => setStrategyTag(e.target.value as StrategyTag)}
              className="w-full px-2.5 py-1.5 text-[11px] bg-s3 border border-[var(--brd)] rounded text-w"
            >
              {STRATEGY_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-w5 uppercase tracking-[0.3px] mb-1 block">Sector (optional)</label>
            <input
              type="text"
              value={sector}
              onChange={e => setSector(e.target.value)}
              placeholder="Technology"
              className="w-full px-2.5 py-1.5 text-[11px] bg-s3 border border-[var(--brd)] rounded text-w placeholder:text-w5"
            />
          </div>
        </div>
        {error && <p className="text-[10px] text-r">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-w bg-s4 hover:bg-s5 rounded-md transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 size={11} className="animate-spin" />}
          Log Trade
        </button>
      </form>
    </Panel>
  );
}
