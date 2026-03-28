"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  PieChart,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { usePortfolioScan } from "@/hooks/use-portfolio-ai";
import type { PortfolioHolding } from "@/types/portfolio";
import type { PortfolioAlert } from "@/services/portfolio-ai.service";

const ALERT_ICONS: Record<string, typeof AlertTriangle> = {
  large_move: Activity,
  earnings_approaching: Calendar,
  sector_concentration: PieChart,
  technical_break: TrendingUp,
  correlation_risk: AlertTriangle,
};

const SEVERITY_BADGE: Record<string, "warning" | "down" | "neutral"> = {
  high: "warning",
  medium: "down",
  low: "neutral",
};

function AlertCard({
  alert,
  narrative,
}: {
  alert: PortfolioAlert;
  narrative: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ALERT_ICONS[alert.type] || AlertTriangle;
  const isUp = alert.type === "large_move" && (alert.data.changePercent as number) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[var(--brd)] rounded-[var(--rad-sm)] bg-s1/50 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-s2/30 transition-colors cursor-pointer"
      >
        <Icon
          size={14}
          className={cn(
            alert.severity === "high"
              ? "text-y"
              : isUp
                ? "text-g"
                : "text-r"
          )}
        />
        <div className="flex-1 text-left min-w-0">
          <div className="text-[12px] font-medium text-w truncate">
            {alert.title}
          </div>
          {alert.ticker && (
            <span className="text-[10px] font-mono text-a">
              {alert.ticker}
            </span>
          )}
        </div>
        <Badge variant={SEVERITY_BADGE[alert.severity]}>
          {alert.severity}
        </Badge>
        {expanded ? (
          <ChevronUp size={12} className="text-w5" />
        ) : (
          <ChevronDown size={12} className="text-w5" />
        )}
      </button>

      <AnimatePresence>
        {expanded && narrative && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0.5 border-t border-[var(--brd)]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={10} className="text-a" />
                <span className="text-[9px] font-semibold text-a uppercase tracking-[0.5px]">
                  AI Analysis
                </span>
              </div>
              <p className="text-[12px] text-w3 leading-[1.7]">{narrative}</p>

              {/* Key metrics from alert data */}
              <div className="flex gap-3 mt-2 pt-2 border-t border-[var(--brd)]">
                {alert.data.weight != null && (
                  <Metric label="Weight" value={`${(alert.data.weight as number).toFixed(1)}%`} />
                )}
                {alert.data.dollarImpact != null && (
                  <Metric
                    label="Impact"
                    value={`${(alert.data.dollarImpact as number) >= 0 ? "+" : ""}$${Math.abs(alert.data.dollarImpact as number).toLocaleString()}`}
                    color={(alert.data.dollarImpact as number) >= 0 ? "text-g" : "text-r"}
                  />
                )}
                {alert.data.unrealizedPL != null && (
                  <Metric
                    label="Unrealized"
                    value={`${(alert.data.unrealizedPL as number) >= 0 ? "+" : ""}$${Math.abs(alert.data.unrealizedPL as number).toLocaleString()}`}
                    color={(alert.data.unrealizedPL as number) >= 0 ? "text-g" : "text-r"}
                  />
                )}
                {alert.data.correlation != null && (
                  <Metric label="Correlation" value={`${((alert.data.correlation as number) * 100).toFixed(0)}%`} />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div className="text-[9px] text-w5 uppercase tracking-wider">{label}</div>
      <div className={cn("text-[11px] font-mono font-medium", color || "text-w")}>
        {value}
      </div>
    </div>
  );
}

export function PortfolioAlerts({
  holdings,
}: {
  holdings: PortfolioHolding[];
}) {
  const scan = usePortfolioScan(holdings);

  return (
    <Panel glow>
      <PanelHeader
        label="Portfolio Intelligence"
        badge={<Badge variant="ai">AI</Badge>}
        actions={
          scan.data?.scannedAt ? (
            <span className="text-[9px] font-mono text-w5">
              Scanned{" "}
              {new Date(scan.data.scannedAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "America/New_York",
              })}{" "}
              ET
            </span>
          ) : undefined
        }
      />

      <div className="p-3.5 space-y-3">
        {/* Scan button */}
        {!scan.data && (
          <div className="text-center py-4">
            <p className="text-[12px] text-w3 mb-3">
              Scan your portfolio for events, risks, and opportunities.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => scan.mutate()}
              disabled={scan.isPending}
              className="gap-1.5"
            >
              {scan.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              {scan.isPending ? "Scanning..." : "Run Portfolio Scan"}
            </Button>
          </div>
        )}

        {/* Results */}
        {scan.data && (
          <>
            {/* Summary bar */}
            {scan.data.context && (
              <div className="flex gap-3 px-2">
                <Metric
                  label="Portfolio"
                  value={`$${scan.data.context.totalValue.toLocaleString()}`}
                />
                <Metric
                  label="P&L"
                  value={`${scan.data.context.totalUnrealizedPL >= 0 ? "+" : ""}$${scan.data.context.totalUnrealizedPL.toLocaleString()}`}
                  color={scan.data.context.totalUnrealizedPL >= 0 ? "text-g" : "text-r"}
                />
                <Metric label="Beta" value={scan.data.context.portfolioBeta.toFixed(2)} />
                <Metric
                  label="1d VaR"
                  value={`$${scan.data.context.var95.toLocaleString()}`}
                  color="text-y"
                />
              </div>
            )}

            {/* Alerts list */}
            {scan.data.alerts.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-[12px] text-g">
                  No portfolio events detected. All clear.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {scan.data.alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    narrative={alert.narrative}
                  />
                ))}
              </div>
            )}

            {/* Rescan button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scan.mutate()}
              disabled={scan.isPending}
              className="gap-1.5"
            >
              {scan.isPending ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Activity size={11} />
              )}
              Rescan
            </Button>
          </>
        )}

        {/* Error */}
        {scan.isError && (
          <p className="text-[11px] text-r">Scan failed. Try again.</p>
        )}
      </div>
    </Panel>
  );
}
