"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { cn } from "@/lib/cn";

const TICKERS = ["AAPL", "NVDA", "MSFT", "GOOGL", "AMZN", "JPM"];

// Upper-triangle correlation matrix (symmetric)
// Values represent realistic correlations between tech stocks + JPM
const CORRELATIONS: Record<string, Record<string, number>> = {
  AAPL:  { AAPL: 1.00, NVDA: 0.72, MSFT: 0.81, GOOGL: 0.76, AMZN: 0.68, JPM: 0.31 },
  NVDA:  { AAPL: 0.72, NVDA: 1.00, MSFT: 0.69, GOOGL: 0.65, AMZN: 0.58, JPM: 0.18 },
  MSFT:  { AAPL: 0.81, NVDA: 0.69, MSFT: 1.00, GOOGL: 0.84, AMZN: 0.74, JPM: 0.35 },
  GOOGL: { AAPL: 0.76, NVDA: 0.65, GOOGL: 1.00, MSFT: 0.84, AMZN: 0.79, JPM: 0.29 },
  AMZN:  { AAPL: 0.68, NVDA: 0.58, MSFT: 0.74, GOOGL: 0.79, AMZN: 1.00, JPM: 0.26 },
  JPM:   { AAPL: 0.31, NVDA: 0.18, MSFT: 0.35, GOOGL: 0.29, AMZN: 0.26, JPM: 1.00 },
};

function getCorrelationColor(value: number): string {
  // Map -1..0..1 to blue..neutral..red
  if (value >= 0.8) return "bg-r/60";
  if (value >= 0.6) return "bg-r/35";
  if (value >= 0.4) return "bg-r/20";
  if (value >= 0.2) return "bg-[var(--rbg)]";
  if (value >= -0.2) return "bg-s3";
  if (value >= -0.4) return "bg-blue-500/15";
  if (value >= -0.6) return "bg-blue-500/25";
  if (value >= -0.8) return "bg-blue-500/40";
  return "bg-blue-500/55";
}

function getTextColor(value: number): string {
  if (Math.abs(value) >= 0.6) return "text-w";
  if (Math.abs(value) >= 0.3) return "text-w2";
  return "text-w4";
}

export function CorrelationHeatmap() {
  const gridSize = TICKERS.length;

  return (
    <Panel>
      <PanelHeader
        label="Correlation Matrix"
        actions={
          <span className="text-[9px] font-mono text-w5">90-day rolling</span>
        }
      />
      <div className="p-3.5">
        <div className="overflow-x-auto">
          {/* Grid with header row */}
          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: `48px repeat(${gridSize}, minmax(52px, 1fr))`,
            }}
          >
            {/* Top-left empty corner */}
            <div />

            {/* Column headers */}
            {TICKERS.map((ticker) => (
              <div
                key={`col-${ticker}`}
                className="text-center text-[9px] font-mono font-semibold text-w4 pb-1.5"
              >
                {ticker}
              </div>
            ))}

            {/* Rows */}
            {TICKERS.map((rowTicker, rowIndex) => (
              <Fragment key={`row-${rowTicker}`}>
                {/* Row header */}
                <div className="text-[9px] font-mono font-semibold text-w4 flex items-center pr-2">
                  {rowTicker}
                </div>

                {/* Cells */}
                {TICKERS.map((colTicker, colIndex) => {
                  const value = CORRELATIONS[rowTicker][colTicker];
                  const isDiagonal = rowIndex === colIndex;
                  const delayIndex = rowIndex * gridSize + colIndex;

                  return (
                    <motion.div
                      key={`${rowTicker}-${colTicker}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.2,
                        delay: delayIndex * 0.015,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-[3px] transition-colors",
                        isDiagonal ? "bg-s4" : getCorrelationColor(value)
                      )}
                    >
                      <span
                        className={cn(
                          "font-mono text-[10px] font-medium",
                          isDiagonal ? "text-w5" : getTextColor(value)
                        )}
                      >
                        {value.toFixed(2)}
                      </span>
                    </motion.div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-[var(--brd)]">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-[2px] bg-blue-500/40" />
            <span className="text-[9px] text-w5">Negative</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-[2px] bg-s3" />
            <span className="text-[9px] text-w5">Neutral</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-[2px] bg-r/40" />
            <span className="text-[9px] text-w5">Positive</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
