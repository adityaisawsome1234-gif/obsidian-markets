"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";

const PLAN_OPTIONS = [
  { id: "FREE", name: "Free", price: "$0", features: ["15min delayed data", "10 watchlist tickers", "10 AI chats/day"] },
  { id: "STARTER", name: "Starter", price: "$15/mo", features: ["Real-time data", "50 tickers", "50 AI chats/day", "5 deep dives/mo"] },
  { id: "PRO", name: "Pro", price: "$39/mo", features: ["Real-time data", "Unlimited tickers", "200 AI chats/day", "20 deep dives/mo", "Full options flow"] },
  { id: "ELITE", name: "Elite", price: "$79/mo", features: ["Everything in Pro", "Unlimited AI", "API access", "Priority support"] },
];

export default function SettingsPage() {
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    "Email notifications": true,
    "Push notifications": true,
    "SMS notifications": false,
  });

  const [selectedPlan, setSelectedPlan] = useState("FREE");
  const [saved, setSaved] = useState(false);

  const toggleNotification = (label: string) => {
    setNotifications((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleSaveProfile = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
        Settings
      </h1>

      {/* Profile */}
      <Panel>
        <PanelHeader label="Profile" />
        <div className="p-3.5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-a to-a2 flex items-center justify-center text-[16px] font-bold text-white">
              O
            </div>
            <div>
              <div className="text-[13px] font-medium text-w">Trader</div>
              <div className="text-[11px] text-w4">trader@obsidianmarkets.com</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-w5 uppercase tracking-[0.4px] block mb-1">
                Name
              </label>
              <Input defaultValue="Trader" />
            </div>
            <div>
              <label className="text-[10px] text-w5 uppercase tracking-[0.4px] block mb-1">
                Email
              </label>
              <Input defaultValue="trader@obsidianmarkets.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-w5 uppercase tracking-[0.4px] block mb-1">
                Investor Type
              </label>
              <select className="w-full bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] px-2.5 py-1.5 text-[12px] text-w2 outline-none">
                <option>Day Trader</option>
                <option>Swing Trader</option>
                <option>Options Trader</option>
                <option>Long-Term Investor</option>
                <option>Casual Investor</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-w5 uppercase tracking-[0.4px] block mb-1">
                Timezone
              </label>
              <select className="w-full bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] px-2.5 py-1.5 text-[12px] text-w2 outline-none">
                <option>America/New_York</option>
                <option>America/Chicago</option>
                <option>America/Denver</option>
                <option>America/Los_Angeles</option>
              </select>
            </div>
          </div>
          <Button size="sm" onClick={handleSaveProfile}>
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </Panel>

      {/* Plan */}
      <Panel>
        <PanelHeader
          label="Subscription"
          badge={<Badge variant="ai">Free Plan</Badge>}
        />
        <div className="p-3.5">
          <div className="grid grid-cols-4 gap-2 max-md:grid-cols-2">
            {PLAN_OPTIONS.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "border rounded-[var(--rad-sm)] p-3 cursor-pointer transition-colors",
                  plan.id === selectedPlan
                    ? "border-[var(--brd3)] bg-s2"
                    : "border-[var(--brd)] hover:border-[var(--brd2)]"
                )}
              >
                <div className="text-[12px] font-medium text-w">{plan.name}</div>
                <div className="font-mono text-[16px] font-semibold text-w mt-1">
                  {plan.price}
                </div>
                <ul className="mt-2 space-y-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-[10px] text-w4">{f}</li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={plan.id === selectedPlan ? "ghost" : "primary"}
                  className="w-full mt-3"
                  disabled={plan.id === selectedPlan}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(plan.id);
                  }}
                >
                  {plan.id === selectedPlan ? "Current" : "Upgrade"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Notifications */}
      <Panel>
        <PanelHeader label="Notifications" />
        <div className="divide-y divide-[var(--brd)]">
          {[
            { label: "Email notifications", desc: "Alerts and daily briefings via email" },
            { label: "Push notifications", desc: "Browser push for real-time alerts" },
            { label: "SMS notifications", desc: "Text messages for critical alerts" },
          ].map((n) => {
            const enabled = notifications[n.label] ?? false;
            return (
              <div key={n.label} className="flex items-center justify-between px-3.5 py-3">
                <div>
                  <div className="text-[12px] text-w2">{n.label}</div>
                  <div className="text-[10px] text-w4">{n.desc}</div>
                </div>
                <button
                  onClick={() => toggleNotification(n.label)}
                  className={cn(
                    "w-9 h-5 rounded-full transition-colors cursor-pointer relative",
                    enabled ? "bg-g/30" : "bg-s4"
                  )}
                >
                  <motion.div
                    className={cn(
                      "w-3.5 h-3.5 rounded-full absolute top-[3px]",
                      enabled ? "bg-g" : "bg-w5"
                    )}
                    animate={{ left: enabled ? 18 : 3 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
