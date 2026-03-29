/**
 * Personal Alpha Engine — Trade Management Service
 *
 * Handles trade CRUD, closing, PnL computation, and CSV import.
 * Uses in-memory storage (mirroring Prisma schema) for V1.
 */

import type {
  Trade,
  TradeCreateInput,
  TradeCloseInput,
  TradeStatus,
  HoldingPeriodBucket,
} from "@/types/alpha-engine";
import { HOLDING_PERIOD_BUCKETS } from "./config";

/* ═══════════════════════════════════════════════════════
   IN-MEMORY STORE
   ═══════════════════════════════════════════════════════ */

const tradeStore = new Map<string, Trade>();

function genId(): string {
  return `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ═══════════════════════════════════════════════════════
   CRUD
   ═══════════════════════════════════════════════════════ */

export function createTrade(userId: string, input: TradeCreateInput): Trade {
  const now = new Date().toISOString();
  const id = genId();

  const holdingDays = input.closedAt
    ? daysBetween(input.openedAt, input.closedAt)
    : null;

  const pnl = input.exitPrice != null
    ? computePnl(input.side ?? "long", input.entryPrice, input.exitPrice, input.quantity)
    : null;

  const trade: Trade = {
    id,
    userId,
    portfolioId: null,
    symbol: input.symbol.toUpperCase(),
    assetType: input.assetType ?? "STOCK",
    side: input.side,
    quantity: input.quantity,
    entryPrice: input.entryPrice,
    exitPrice: input.exitPrice ?? null,
    openedAt: input.openedAt,
    closedAt: input.closedAt ?? null,
    holdingPeriodDays: holdingDays,
    pnlAbsolute: pnl?.absolute ?? null,
    pnlPercent: pnl?.percent ?? null,
    status: input.closedAt ? "closed" : "open",
    strategyTag: input.strategyTag,
    sector: input.sector ?? null,
    marketCapBucket: input.marketCapBucket ?? null,
    source: input.source ?? "manual",
    recommendationId: input.recommendationId ?? null,
    notes: input.notes ?? null,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };

  tradeStore.set(id, trade);
  return trade;
}

export function updateTrade(userId: string, tradeId: string, updates: Partial<TradeCreateInput>): Trade | null {
  const trade = tradeStore.get(tradeId);
  if (!trade || trade.userId !== userId) return null;

  const updated: Trade = {
    ...trade,
    ...(updates.symbol !== undefined && { symbol: updates.symbol.toUpperCase() }),
    ...(updates.assetType !== undefined && { assetType: updates.assetType }),
    ...(updates.side !== undefined && { side: updates.side }),
    ...(updates.quantity !== undefined && { quantity: updates.quantity }),
    ...(updates.entryPrice !== undefined && { entryPrice: updates.entryPrice }),
    ...(updates.strategyTag !== undefined && { strategyTag: updates.strategyTag }),
    ...(updates.sector !== undefined && { sector: updates.sector }),
    ...(updates.marketCapBucket !== undefined && { marketCapBucket: updates.marketCapBucket }),
    ...(updates.notes !== undefined && { notes: updates.notes }),
    ...(updates.tags !== undefined && { tags: updates.tags }),
    updatedAt: new Date().toISOString(),
  };

  tradeStore.set(tradeId, updated);
  return updated;
}

export function closeTrade(userId: string, tradeId: string, input: TradeCloseInput): Trade | null {
  const trade = tradeStore.get(tradeId);
  if (!trade || trade.userId !== userId) return null;
  if (trade.status === "closed") return null;

  const closedAt = input.closedAt ?? new Date().toISOString();
  const holdingDays = daysBetween(trade.openedAt, closedAt);
  const pnl = computePnl(trade.side, trade.entryPrice, input.exitPrice, trade.quantity);

  const closed: Trade = {
    ...trade,
    exitPrice: input.exitPrice,
    closedAt,
    holdingPeriodDays: holdingDays,
    pnlAbsolute: pnl.absolute,
    pnlPercent: pnl.percent,
    status: "closed",
    updatedAt: new Date().toISOString(),
  };

  tradeStore.set(tradeId, closed);
  return closed;
}

export function getTrade(userId: string, tradeId: string): Trade | null {
  const trade = tradeStore.get(tradeId);
  if (!trade || trade.userId !== userId) return null;
  return trade;
}

export function listTrades(
  userId: string,
  filters?: {
    status?: TradeStatus;
    symbol?: string;
    strategyTag?: string;
    sector?: string;
    limit?: number;
    offset?: number;
  },
): { trades: Trade[]; total: number } {
  let trades = Array.from(tradeStore.values()).filter(t => t.userId === userId);

  if (filters?.status) trades = trades.filter(t => t.status === filters.status);
  if (filters?.symbol) trades = trades.filter(t => t.symbol === filters.symbol!.toUpperCase());
  if (filters?.strategyTag) trades = trades.filter(t => t.strategyTag === filters.strategyTag);
  if (filters?.sector) trades = trades.filter(t => t.sector === filters.sector);

  // Sort by openedAt descending
  trades.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());

  const total = trades.length;
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 50;
  trades = trades.slice(offset, offset + limit);

  return { trades, total };
}

export function getOpenPositions(userId: string): Trade[] {
  return Array.from(tradeStore.values())
    .filter(t => t.userId === userId && t.status === "open");
}

export function getRecentClosedTrades(userId: string, days: number = 30): Trade[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return Array.from(tradeStore.values())
    .filter(t =>
      t.userId === userId &&
      t.status === "closed" &&
      t.closedAt != null &&
      new Date(t.closedAt) >= cutoff
    )
    .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime());
}

export function getClosedTrades(userId: string): Trade[] {
  return Array.from(tradeStore.values())
    .filter(t => t.userId === userId && t.status === "closed")
    .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime());
}

/* ═══════════════════════════════════════════════════════
   CSV IMPORT
   ═══════════════════════════════════════════════════════ */

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export function importTradesFromCsv(userId: string, rows: Record<string, string>[]): CsvImportResult {
  const result: CsvImportResult = { imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const symbol = row.symbol?.trim().toUpperCase();
      if (!symbol || !/^[A-Z0-9.\-^=]{1,12}$/.test(symbol)) {
        result.errors.push({ row: i + 1, message: `Invalid symbol: "${row.symbol}"` });
        continue;
      }

      const entryPrice = parseFloat(row.entry_price || row.entryPrice || "");
      if (isNaN(entryPrice) || entryPrice <= 0) {
        result.errors.push({ row: i + 1, message: "Invalid entry price" });
        continue;
      }

      const quantity = parseFloat(row.quantity || row.shares || "");
      if (isNaN(quantity) || quantity <= 0) {
        result.errors.push({ row: i + 1, message: "Invalid quantity" });
        continue;
      }

      const side = (row.side?.toLowerCase() === "short") ? "short" as const : "long" as const;
      const openedAt = row.opened_at || row.openedAt || row.date || new Date().toISOString();

      if (isNaN(new Date(openedAt).getTime())) {
        result.errors.push({ row: i + 1, message: "Invalid open date" });
        continue;
      }

      const exitPrice = parseFloat(row.exit_price || row.exitPrice || "");
      const closedAt = row.closed_at || row.closedAt || "";
      const strategyTag = (row.strategy_tag || row.strategy || "other") as TradeCreateInput["strategyTag"];

      createTrade(userId, {
        symbol,
        side,
        quantity,
        entryPrice,
        exitPrice: isNaN(exitPrice) ? undefined : exitPrice,
        openedAt,
        closedAt: closedAt && !isNaN(new Date(closedAt).getTime()) ? closedAt : undefined,
        strategyTag,
        sector: (row.sector as TradeCreateInput["sector"]) || undefined,
        marketCapBucket: (row.market_cap || row.marketCap) as TradeCreateInput["marketCapBucket"] || undefined,
        source: "imported",
        notes: row.notes || undefined,
        tags: row.tags ? row.tags.split(",").map(t => t.trim()) : undefined,
      });
      result.imported++;
    } catch {
      result.errors.push({ row: i + 1, message: "Unexpected error parsing row" });
    }
  }

  return result;
}

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function computePnl(
  side: "long" | "short",
  entryPrice: number,
  exitPrice: number,
  quantity: number,
): { absolute: number; percent: number } {
  const direction = side === "long" ? 1 : -1;
  const priceDiff = (exitPrice - entryPrice) * direction;
  const absolute = priceDiff * quantity;
  const percent = (priceDiff / entryPrice) * 100;
  return {
    absolute: Math.round(absolute * 100) / 100,
    percent: Math.round(percent * 100) / 100,
  };
}

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export function getHoldingPeriodBucket(days: number): HoldingPeriodBucket {
  for (const [bucket, range] of Object.entries(HOLDING_PERIOD_BUCKETS)) {
    if (days >= range.min && days <= range.max) {
      return bucket as HoldingPeriodBucket;
    }
  }
  return "long_term";
}

/** Reset store — for testing only */
export function _resetTradeStore(): void {
  tradeStore.clear();
}
