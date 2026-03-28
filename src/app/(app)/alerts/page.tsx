"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Bell, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface AlertItem {
  id: string;
  ticker: string;
  type: string;
  condition: string;
  isActive: boolean;
  lastTriggered: string | null;
}

const INITIAL_ALERTS: AlertItem[] = [
  { id: "1", ticker: "AAPL", type: "Price Above", condition: "$200.00", isActive: true, lastTriggered: null },
  { id: "2", ticker: "NVDA", type: "Price Below", condition: "$800.00", isActive: true, lastTriggered: null },
  { id: "3", ticker: "SPY", type: "% Change", condition: "> 2% in 1 day", isActive: true, lastTriggered: "Mar 14, 2:30 PM" },
  { id: "4", ticker: "TSLA", type: "Volume Spike", condition: "> 2x avg volume", isActive: false, lastTriggered: "Mar 12, 10:15 AM" },
  { id: "5", ticker: "PLTR", type: "Options Flow", condition: "Unusual activity > $1M", isActive: true, lastTriggered: null },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);

  const toggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
  };

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const addAlert = () => {
    const id = String(Date.now());
    setAlerts((prev) => [
      ...prev,
      {
        id,
        ticker: "NEW",
        type: "Price Above",
        condition: "$0.00",
        isActive: true,
        lastTriggered: null,
      },
    ]);
  };

  const activeCount = alerts.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
          Alerts
        </h1>
        <Button variant="primary" size="sm" onClick={addAlert}>
          <Plus size={12} />
          New Alert
        </Button>
      </div>

      <Panel glow>
        <PanelHeader
          label="Active Alerts"
          badge={
            <span className="text-[10px] font-mono text-w4">
              {activeCount} active
            </span>
          }
        />
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="divide-y divide-[var(--brd)]"
        >
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              variants={staggerItem}
              layout
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-s2/50 transition-colors"
            >
              <Bell
                size={14}
                className={alert.isActive ? "text-w3" : "text-w5"}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-w tracking-[-0.2px]">
                    {alert.ticker}
                  </span>
                  <Badge variant={alert.isActive ? "live" : "neutral"}>
                    {alert.isActive ? "Active" : "Paused"}
                  </Badge>
                </div>
                <div className="text-[11px] text-w3 mt-0.5">
                  {alert.type}: {alert.condition}
                </div>
                {alert.lastTriggered && (
                  <div className="text-[9px] font-mono text-w5 mt-0.5">
                    Last triggered: {alert.lastTriggered}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAlert(alert.id)}
                  className={cn(
                    "w-9 h-5 rounded-full cursor-pointer relative transition-colors duration-200",
                    alert.isActive ? "bg-g/30" : "bg-s4"
                  )}
                  aria-label={alert.isActive ? "Pause alert" : "Activate alert"}
                >
                  <motion.div
                    className={cn(
                      "w-3.5 h-3.5 rounded-full absolute top-[3px]",
                      alert.isActive ? "bg-g" : "bg-w5"
                    )}
                    animate={{ left: alert.isActive ? 18 : 3 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-w5 hover:text-r hover:bg-[var(--rbg)] transition-colors cursor-pointer"
                  aria-label="Delete alert"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </motion.div>
          ))}
          {alerts.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Bell size={20} className="text-w5 mx-auto mb-2" />
              <p className="text-[12px] text-w4">No alerts configured</p>
              <p className="text-[10px] text-w5 mt-1">Click &quot;New Alert&quot; to get started</p>
            </div>
          )}
        </motion.div>
      </Panel>
    </div>
  );
}
