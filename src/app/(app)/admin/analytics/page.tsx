"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { staggerContainer, staggerItem } from "@/lib/animations";
import {
  BarChart3, Users, TrendingUp, DollarSign, Zap, Target,
  Activity, ShieldCheck, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, AreaChart, Area,
} from "recharts";

interface Dashboard {
  retention: { d1: number; d7: number; d14: number; d30: number; d60: number; d90: number; trend: string };
  retentionCohorts: { signupDate: string; cohortSize: number; d1: number; d7: number; d14: number; d30: number }[];
  war: { week: string; count: number; changePercent: number }[];
  dauMau: { date: string; ratio: number; dau: number; mau: number }[];
  featureAdoption: { feature: string; label: string; adoptionRate: number; totalUsers: number }[];
  funnel: { step: string; label: string; count: number; percent: number; dropoff: number }[];
  revenue: { mrr: number; arr: number; arpu: number; ltv: number; cac: number; ltvCacRatio: number; churnRate: number; mrrGrowth: number };
  mrrHistory: { date: string; mrr: number }[];
  topUsers: { userId: string; sessions: number; aiQueries: number; lastActive: string }[];
  aiCosts: { date: string; cost: number; queries: number; cacheHitRate: number }[];
}

const chartTheme = {
  bg: "transparent",
  grid: "rgba(255,255,255,0.04)",
  text: "#5a5a6e",
  accent: "#7c5cfc",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  blue: "#3b82f6",
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[12px] text-w4 animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  const { retention, war, dauMau, featureAdoption, funnel, revenue, mrrHistory, topUsers, aiCosts } = data;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
        <BarChart3 size={16} className="text-a" />
        <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">Analytics Dashboard</h1>
        <Badge variant="warning">Admin</Badge>
        <Badge variant="ai">Pitch Deck Data</Badge>
      </motion.div>

      {/* Hero KPIs */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-6 gap-2.5 max-lg:grid-cols-3 max-md:grid-cols-2">
        <HeroKPI icon={Target} label="D30 Retention" value={`${retention.d30}%`} color={retention.d30 >= 50 ? "text-g" : "text-y"} sub={`trend: ${retention.trend}`} />
        <HeroKPI icon={Users} label="WAR" value={war[war.length - 1]?.count.toLocaleString() ?? "—"} color="text-a" sub={`${war[war.length - 1]?.changePercent >= 0 ? "+" : ""}${war[war.length - 1]?.changePercent}% WoW`} />
        <HeroKPI icon={Activity} label="DAU/MAU" value={`${dauMau[dauMau.length - 1]?.ratio ?? 0}`} color="text-w" sub={`${dauMau[dauMau.length - 1]?.dau.toLocaleString()} DAU`} />
        <HeroKPI icon={DollarSign} label="MRR" value={`$${(revenue.mrr / 1000).toFixed(0)}K`} color="text-g" sub={`+${revenue.mrrGrowth}% MoM`} />
        <HeroKPI icon={TrendingUp} label="LTV:CAC" value={`${revenue.ltvCacRatio}:1`} color={revenue.ltvCacRatio >= 3 ? "text-g" : "text-y"} sub={`LTV $${revenue.ltv} / CAC $${revenue.cac}`} />
        <HeroKPI icon={Zap} label="AI Cost/Query" value={`$${(aiCosts.reduce((s, d) => s + d.cost, 0) / aiCosts.reduce((s, d) => s + d.queries, 0)).toFixed(3)}`} color="text-a" sub={`${Math.round(aiCosts.reduce((s, d) => s + d.cacheHitRate, 0) / aiCosts.length * 100)}% cache hit`} />
      </motion.div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {/* Retention Curve */}
        <Panel>
          <PanelHeader label="Retention Curve" badge={<Badge variant="ai">Cohort Avg</Badge>} />
          <div className="p-3.5 h-64">
            <ResponsiveContainer>
              <LineChart data={[
                { day: "D1", value: retention.d1 },
                { day: "D7", value: retention.d7 },
                { day: "D14", value: retention.d14 },
                { day: "D30", value: retention.d30 },
                { day: "D60", value: retention.d60 || null },
                { day: "D90", value: retention.d90 || null },
              ].filter((d) => d.value)}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: chartTheme.text, fontSize: 10 }} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", fontSize: "11px", color: "#fff" }} />
                <Line type="monotone" dataKey="value" stroke={chartTheme.accent} strokeWidth={2.5} dot={{ r: 4, fill: chartTheme.accent }} name="Retention %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* WAR Trend */}
        <Panel>
          <PanelHeader label="Weekly Active Researchers" badge={<Badge variant="live">12 Weeks</Badge>} />
          <div className="p-3.5 h-64">
            <ResponsiveContainer>
              <BarChart data={war}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fill: chartTheme.text, fontSize: 9 }} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", fontSize: "11px", color: "#fff" }} />
                <Bar dataKey="count" fill={chartTheme.accent} radius={[3, 3, 0, 0]} name="WAR" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {/* DAU/MAU */}
        <Panel>
          <PanelHeader label="DAU / MAU Ratio" badge={<Badge variant="neutral">30 Days</Badge>} />
          <div className="p-3.5 h-64">
            <ResponsiveContainer>
              <AreaChart data={dauMau}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: chartTheme.text, fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} domain={[0, 0.5]} />
                <Tooltip contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", fontSize: "11px", color: "#fff" }} />
                <Area type="monotone" dataKey="ratio" stroke={chartTheme.green} fill={chartTheme.green} fillOpacity={0.1} strokeWidth={2} name="DAU/MAU" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* MRR */}
        <Panel>
          <PanelHeader label="Monthly Recurring Revenue" badge={<Badge variant="up">+{revenue.mrrGrowth}%</Badge>} />
          <div className="p-3.5 h-64">
            <ResponsiveContainer>
              <AreaChart data={mrrHistory}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: chartTheme.text, fontSize: 9 }} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", fontSize: "11px", color: "#fff" }} formatter={(v) => `$${Number(v).toLocaleString()}`} />
                <Area type="monotone" dataKey="mrr" stroke={chartTheme.green} fill={chartTheme.green} fillOpacity={0.1} strokeWidth={2} name="MRR" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Feature Adoption + Funnel */}
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {/* Feature Adoption */}
        <Panel>
          <PanelHeader label="Feature Adoption" badge={<Badge variant="neutral">First 7 Days</Badge>} />
          <div className="p-3.5 space-y-2">
            {featureAdoption.map((f) => (
              <div key={f.feature} className="flex items-center gap-2">
                <span className="text-[10px] text-w4 w-28 shrink-0 truncate">{f.label}</span>
                <div className="flex-1 h-2 bg-s2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-a" style={{ width: `${f.adoptionRate}%` }} />
                </div>
                <span className="text-[10px] font-mono text-w3 w-8 text-right">{f.adoptionRate}%</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Conversion Funnel */}
        <Panel>
          <PanelHeader label="Conversion Funnel" />
          <div className="p-3.5 space-y-1.5">
            {funnel.map((step, i) => (
              <div key={step.step} className="flex items-center gap-2">
                <span className="text-[10px] text-w4 w-32 shrink-0 truncate">{step.label}</span>
                <div className="flex-1 h-3 bg-s2 rounded overflow-hidden">
                  <div
                    className={cn("h-full rounded", i === 0 ? "bg-a" : i < 3 ? "bg-a/70" : i < 5 ? "bg-g/70" : "bg-g")}
                    style={{ width: `${step.percent}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-w3 w-14 text-right">
                  {step.count.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-w5 w-8 text-right">
                  {step.percent}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* AI Costs + Top Users */}
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {/* AI Cost */}
        <Panel>
          <PanelHeader label="AI Daily Cost" badge={<Badge variant="ai">Cost Optimizer</Badge>} />
          <div className="p-3.5 h-56">
            <ResponsiveContainer>
              <BarChart data={aiCosts.slice(-14)}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: chartTheme.text, fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", fontSize: "11px", color: "#fff" }} formatter={(v) => `$${Number(v).toFixed(2)}`} />
                <Bar dataKey="cost" fill={chartTheme.yellow} radius={[2, 2, 0, 0]} name="Cost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Top Users */}
        <Panel>
          <PanelHeader label="Top 20 Power Users" badge={<Badge variant="neutral">Interview Candidates</Badge>} />
          <div className="p-3.5 max-h-56 overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-w5 border-b border-[var(--brd)]">
                  <th className="text-left py-1 px-1">#</th>
                  <th className="text-left py-1 px-1">User</th>
                  <th className="text-right py-1 px-1">Sessions</th>
                  <th className="text-right py-1 px-1">AI Queries</th>
                  <th className="text-right py-1 px-1">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.slice(0, 12).map((u, i) => (
                  <tr key={u.userId} className="border-b border-[var(--brd)] last:border-0">
                    <td className="py-1 px-1 text-w5">{i + 1}</td>
                    <td className="py-1 px-1 font-mono text-w3">{u.userId}</td>
                    <td className="py-1 px-1 text-right font-mono text-w2">{u.sessions}</td>
                    <td className="py-1 px-1 text-right font-mono text-a">{u.aiQueries}</td>
                    <td className="py-1 px-1 text-right text-w4">{u.lastActive.slice(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function HeroKPI({ icon: Icon, label, value, color, sub }: {
  icon: typeof BarChart3; label: string; value: string; color: string; sub: string;
}) {
  return (
    <motion.div variants={staggerItem}>
      <Panel>
        <div className="p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon size={10} className="text-w5" />
            <span className="text-[8px] font-semibold tracking-[0.4px] text-w5 uppercase">{label}</span>
          </div>
          <div className={cn("font-mono text-[20px] font-bold tracking-[-0.5px]", color)}>{value}</div>
          <div className="text-[8px] text-w5 font-mono mt-0.5">{sub}</div>
        </div>
      </Panel>
    </motion.div>
  );
}
