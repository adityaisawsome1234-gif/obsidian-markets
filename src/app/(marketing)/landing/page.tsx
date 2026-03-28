"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

import {
  BarChart3,
  Brain,
  TrendingUp,
  Shield,
  Zap,
  Eye,
  LineChart,
  Target,
  Star,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";

/* ── Animated counter ── */
function Counter({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value]);

  return (
    <span ref={ref} className="font-mono">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

/* ── Animated feature row ── */
const features = [
  { icon: <Brain size={28} className="text-purple-400" />, title: "Portfolio-Aware AI", description: "AI that knows YOUR positions, YOUR risk exposure, YOUR earnings dates. Not generic summaries — personalized intelligence that adapts to your portfolio in real-time.", tag: "INTELLIGENCE" },
  { icon: <Eye size={28} className="text-purple-400" />, title: "Options Flow Intelligence", description: "Smart money scored 0-100. Sweep, block, and split classification with historical accuracy tracking per ticker. See what the big players are doing before the move.", tag: "FLOW" },
  { icon: <BarChart3 size={28} className="text-purple-400" />, title: "Strategy Builder", description: "Multi-leg P&L visualization for verticals, iron condors, straddles. Max profit, max loss, probability of profit — all computed instantly.", tag: "STRATEGY" },
  { icon: <Zap size={28} className="text-purple-400" />, title: "What-If Simulator", description: "Ask in plain English: 'What if NVDA drops 15%?' Get instant before/after portfolio impact analysis. Stress-test any scenario in seconds.", tag: "SIMULATION" },
  { icon: <Target size={28} className="text-purple-400" />, title: "Earnings Intelligence", description: "AI-extracted tone scores, guidance details, red flags from transcripts. Track management confidence over quarters and spot shifts early.", tag: "EARNINGS" },
  { icon: <LineChart size={28} className="text-purple-400" />, title: "SEC Filing Analyzer", description: "AI reads every 8-K, 10-Q, 10-K filing. Extracts material events, guidance changes, insider transactions automatically — minutes after publication.", tag: "FILINGS" },
];

function FeatureRow({ icon, title, description, tag, index }: { icon: React.ReactNode; title: string; description: string; tag: string; index: number }) {
  const isEven = index % 2 === 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: isEven ? -80 : 80 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-16 py-12 ${isEven ? "" : "md:flex-row-reverse"}`}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative shrink-0"
      >
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Glow backdrop */}
          <div className="absolute inset-0 rounded-2xl bg-purple-500/10 blur-xl animate-pulse" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/20" />
          <div className="relative z-10">{icon}</div>
        </div>
      </motion.div>

      {/* Text */}
      <div className={`flex-1 ${isEven ? "" : "md:text-right"}`}>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <span className="inline-block text-[10px] font-bold text-purple-400/70 uppercase tracking-[0.2em] mb-2">
            {tag}
          </span>
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-xl md:text-2xl font-bold text-white tracking-[-0.02em] mb-3"
        >
          {title}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-[14px] text-white/45 leading-[1.7] max-w-lg"
          style={isEven ? {} : { marginLeft: "auto" }}
        >
          {description}
        </motion.p>
      </div>
    </motion.div>
  );
}

/* ── Testimonial ── */
function TestimonialCard({ quote, name, role, company, companyLogo }: { quote: string; name: string; role: string; company: string; companyLogo: string }) {
  return (
    <div className="w-[340px] shrink-0 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#1a1a24] to-[#101018] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
          ))}
        </div>
        <span className="text-[10px] text-white/25 font-medium tracking-wide uppercase">{companyLogo}</span>
      </div>
      <p className="text-[13px] text-white/70 leading-[1.7] italic">&quot;{quote}&quot;</p>
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-[11px] font-bold text-white/70">
            {name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <div className="text-[12px] font-medium text-white/90">{name}</div>
            <div className="text-[10px] text-white/40">{role}</div>
          </div>
        </div>
        <div className="text-[9px] text-purple-400/60 font-medium">
          ex-{company}
        </div>
      </div>
    </div>
  );
}

const testimonials = [
  { quote: "Replaced Unusual Whales, TradingView, and Seeking Alpha with one tool. The options flow scoring alone is worth the price.", name: "Priya Sharma", role: "Options Trader, 8 years", company: "Unusual Whales", companyLogo: "UW" },
  { quote: "The portfolio-aware AI is a game-changer. It doesn't just tell me what happened in the market — it tells me what it means for MY positions.", name: "James Chen", role: "Swing Trader", company: "TradingView", companyLogo: "TV" },
  { quote: "The earnings transcript analyzer caught a tone shift in management confidence that I completely missed reading the call myself. Saved me from a bad position.", name: "David Thompson", role: "Long-term Investor", company: "Seeking Alpha", companyLogo: "SA" },
  { quote: "I was paying $97/mo for Unusual Whales + $60/mo for TradingView. Obsidian gives me more for $49/mo. The smart money scoring is legitimately better.", name: "Alex Rodriguez", role: "Full-time Trader", company: "Bloomberg", companyLogo: "BBG" },
  { quote: "Finally, an AI that hedges its language properly and doesn't pretend to be an advisor. The compliance approach builds real trust.", name: "Sarah Kim", role: "RIA, Portfolio Manager", company: "Fidelity", companyLogo: "FDL" },
];

/* ── Features section with scroll-linked line ── */
function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.85], ["0%", "100%"]);

  return (
    <section id="features" className="max-w-4xl mx-auto px-6 mb-32" ref={containerRef}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <p className="text-[11px] text-purple-400 uppercase tracking-[0.2em] mb-3">Core Platform</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.03em]">
          <span className="text-white/40">Everything you need</span>{" "}
          <span className="italic bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
            to solve problems.
          </span>
        </h2>
      </motion.div>

      <div className="relative">
        {/* Scroll-linked vertical connector */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden md:block">
          <div className="absolute inset-0 bg-white/[0.04]" />
          <motion.div
            className="absolute top-0 left-0 w-full bg-gradient-to-b from-purple-500/60 via-purple-400/30 to-transparent"
            style={{ height: lineHeight }}
          />
        </div>

        {/* Feature rows */}
        <div className="divide-y divide-white/[0.04] md:divide-y-0">
          {features.map((f, i) => (
            <FeatureRow key={f.tag} {...f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ LANDING PAGE ═══ */
export default function LandingPage() {
  // Force body to allow scrolling on this page
  useEffect(() => {
    document.body.style.overflow = "auto";
    document.body.style.overflowX = "hidden";
    document.body.style.background = "#0b0b0f";
    return () => {
      document.body.style.overflow = "";
      document.body.style.overflowX = "";
      document.body.style.background = "";
    };
  }, []);

  return (
    <div className="landing-page min-h-screen bg-[#0b0b0f] text-white overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0b0b0f]/80 border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <span className="text-white font-bold text-[13px]">O</span>
            </div>
            <span className="text-[15px] font-semibold tracking-[-0.3px]" style={{ fontFamily: "var(--font-serif), serif" }}>Obsidian Markets</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-white/50">
            <a href="#features" className="hover:text-white/90 transition-colors">Features</a>
            <a href="#stats" className="hover:text-white/90 transition-colors">Performance</a>
            <a href="#testimonials" className="hover:text-white/90 transition-colors">Reviews</a>
            <Link href="/developers" className="hover:text-white/90 transition-colors">API</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] text-white/60 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/login">
              <LiquidButton size="sm">
                <span className="text-[13px] font-medium">Get Started Free</span>
              </LiquidButton>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── CINEMATIC HERO (GSAP scroll-pinned) ── */}
      <CinematicHero
        brandName="Obsidian"
        tagline1="See through"
        tagline2="the noise."
        cardHeading="Intelligence, amplified."
        cardDescription={
          <>
            <span className="text-white font-semibold">Obsidian Markets</span> consolidates
            real-time data, options flow, AI research, and portfolio analytics into one
            professional terminal — powered by AI that understands YOUR positions.
          </>
        }
        metricValue={72}
        metricLabel="AI Accuracy"
      />

      {/* ── PRODUCT DEMO SCROLL ── */}
      <ContainerScroll
        titleComponent={
          <>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-[13px] text-purple-400 font-medium uppercase tracking-[0.15em] mb-4"
            >
              AI-Powered Research Terminal
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-[5rem] font-bold leading-[0.95] tracking-[-0.04em]"
            >
              <span className="text-white/40">See through</span>
              <br />
              <span className="bg-gradient-to-r from-white via-white/90 to-white/50 bg-clip-text text-transparent italic">
                the noise.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-[15px] md:text-[17px] text-white/40 max-w-lg mx-auto mt-6 leading-[1.7]"
            >
              The AI research terminal for serious traders who&apos;ve outgrown their broker&apos;s tools. Real-time data, options flow, portfolio AI — one platform.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-4 mt-8"
            >
              <Link href="/login">
                <LiquidButton size="lg">
                  <span className="text-[14px] font-semibold flex items-center gap-2">
                    Start Free <ArrowRight size={16} />
                  </span>
                </LiquidButton>
              </Link>
              <a href="#features" className="text-[13px] text-white/50 hover:text-white/80 transition-colors underline underline-offset-4 decoration-white/20">
                Explore Features
              </a>
            </motion.div>
          </>
        }
      >
        {/* Dashboard preview inside the scroll card */}
        <div className="w-full h-full bg-[#0b0b0f] p-4 overflow-hidden relative">
          {/* Fake dashboard UI */}
          <div className="flex gap-3 h-full">
            {/* Sidebar */}
            <div className="w-12 bg-[#101014] rounded-xl border border-white/[0.04] flex flex-col items-center py-3 gap-3 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.04]" />
              ))}
            </div>
            {/* Main content */}
            <div className="flex-1 space-y-3 overflow-hidden">
              {/* Topbar */}
              <div className="h-10 bg-[#101014] rounded-xl border border-white/[0.04] flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-white/30">Obsidian / </div>
                  <div className="text-[10px] text-white/70 font-medium">Dashboard</div>
                </div>
                <div className="w-40 h-6 rounded-md bg-white/[0.03] border border-white/[0.04]" />
              </div>
              {/* Ticker strip */}
              <div className="flex gap-2">
                {["S&P 500", "NASDAQ", "DOW", "VIX", "BTC"].map((t) => (
                  <div key={t} className="flex-1 bg-[#101014] rounded-lg border border-white/[0.04] p-2">
                    <div className="text-[8px] text-white/30 uppercase">{t}</div>
                    <div className="text-[11px] font-mono text-white/80 mt-0.5">
                      {t === "VIX" ? "26.78" : (4000 + Math.random() * 2000).toFixed(0)}
                    </div>
                    <div className={`text-[8px] font-mono ${t === "VIX" ? "text-red-400" : "text-green-400"}`}>
                      {t === "VIX" ? "+11.31%" : `+${(Math.random() * 2).toFixed(2)}%`}
                    </div>
                  </div>
                ))}
              </div>
              {/* Content grid */}
              <div className="grid grid-cols-3 gap-2 flex-1">
                <div className="col-span-2 bg-[#101014] rounded-xl border border-white/[0.04] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-[9px] text-white/30 uppercase tracking-wider font-semibold">Daily Edge</div>
                    <div className="text-[7px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-bold">AI</div>
                  </div>
                  <div className="space-y-1.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-3 bg-white/[0.03] rounded-sm" style={{ width: `${90 - i * 15}%` }} />
                    ))}
                  </div>
                </div>
                <div className="bg-[#101014] rounded-xl border border-white/[0.04] p-3">
                  <div className="text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-2">Portfolio</div>
                  <div className="text-[16px] font-mono text-white font-semibold">$247,831</div>
                  <div className="text-[9px] font-mono text-green-400">+$1,842 (+0.75%)</div>
                </div>
                <div className="bg-[#101014] rounded-xl border border-white/[0.04] p-3">
                  <div className="text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-2">Options Flow</div>
                  <div className="text-[9px] text-green-400/70 font-mono">NVDA $950C</div>
                  <div className="text-[9px] text-white/40 font-mono">$3.2M sweep</div>
                </div>
                <div className="col-span-2 bg-[#101014] rounded-xl border border-white/[0.04] p-3">
                  <div className="text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-2">Watchlist</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["AAPL", "NVDA", "MSFT", "GOOGL", "AMZN", "META"].map((t) => (
                      <div key={t} className="bg-white/[0.02] rounded p-1.5">
                        <div className="text-[9px] font-semibold text-white/80">{t}</div>
                        <div className="text-[8px] font-mono text-green-400">+{(Math.random() * 3).toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContainerScroll>

      {/* ── TRUSTED BY ── */}
      <div className="max-w-5xl mx-auto px-6 -mt-20 mb-32">
        <p className="text-[11px] text-white/25 uppercase tracking-[0.2em] text-center mb-6">
          Trusted by 3,200+ active traders
        </p>
        <div className="flex items-center justify-center gap-12 opacity-30">
          {["Bloomberg Terminal refugees", "Unusual Whales migrants", "TradingView power users", "Seeking Alpha alumni"].map((t) => (
            <span key={t} className="text-[11px] text-white/60 whitespace-nowrap">{t}</span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <FeaturesSection />

      {/* ── STATS ── */}
      <section id="stats" className="max-w-5xl mx-auto px-6 mb-32">
        <div className="border-t border-white/[0.06] pt-16">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.03em]">
                <span className="text-white">Our achie</span>
                <span className="text-white/30">vements</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-[4rem] md:text-[5rem] font-bold tracking-[-0.04em] leading-none bg-gradient-to-b from-white to-white/30 bg-clip-text text-transparent">
                  <Counter value={3200} suffix="+" />
                </div>
                <p className="text-[13px] text-white/40 mt-2">Active traders on platform</p>
              </div>
              <div>
                <div className="text-[4rem] md:text-[5rem] font-bold tracking-[-0.04em] leading-none bg-gradient-to-b from-white to-white/30 bg-clip-text text-transparent">
                  <Counter value={72} suffix="%" />
                </div>
                <p className="text-[13px] text-white/40 mt-2">AI directional accuracy</p>
              </div>
              <div>
                <div className="text-[4rem] md:text-[5rem] font-bold tracking-[-0.04em] leading-none bg-gradient-to-b from-white to-white/30 bg-clip-text text-transparent">
                  <Counter value={2} suffix="M+" prefix="$" />
                </div>
                <p className="text-[13px] text-white/40 mt-2">Options flow analyzed daily</p>
              </div>
              <div>
                <div className="text-[4rem] md:text-[5rem] font-bold tracking-[-0.04em] leading-none bg-gradient-to-b from-white to-white/30 bg-clip-text text-transparent">
                  <Counter value={500} suffix="+" />
                </div>
                <p className="text-[13px] text-white/40 mt-2">SEC filings analyzed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="mb-32 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between"
          >
            <h2 className="text-3xl font-bold tracking-[-0.03em]">
              <span className="text-white">Trader</span>{" "}
              <span className="italic bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">reviews</span>
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-2 border-[#0b0b0f]" />
                ))}
              </div>
              <span className="text-[11px] text-white/40">
                <Star size={12} className="text-yellow-400 fill-yellow-400 inline mr-1" />
                4.8/5 from 340+ reviews
              </span>
            </div>
          </motion.div>
        </div>
        {/* Infinite marquee — cards duplicated for seamless loop */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0b0b0f] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0b0b0f] to-transparent z-10 pointer-events-none" />
          <div className="flex gap-5 animate-marquee w-max">
            {[...testimonials, ...testimonials].map((t, i) => (
              <TestimonialCard key={`${t.name}-${i}`} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-3xl mx-auto px-6 mb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border border-white/[0.06] bg-gradient-to-b from-[#16161b] to-[#0b0b0f] p-12"
        >
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-[80px]" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.03em] mb-4">
              Ready to see clearly?
            </h2>
            <p className="text-[15px] text-white/40 max-w-md mx-auto mb-8 leading-[1.7]">
              Join 3,200+ traders who upgraded from scattered tools to one intelligent platform.
            </p>
            <Link href="/login">
              <LiquidButton size="xl">
                <span className="text-[15px] font-semibold flex items-center gap-2">
                  <Sparkles size={16} /> Start Free — No Credit Card
                </span>
              </LiquidButton>
            </Link>
            <p className="text-[11px] text-white/25 mt-4">
              Free tier includes 10 AI queries/day. Upgrade anytime.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <span className="text-white font-bold text-[11px]">O</span>
              </div>
              <span className="text-[13px] font-medium text-white/60" style={{ fontFamily: "var(--font-serif), serif" }}>Obsidian Markets</span>
            </div>
            <div className="flex items-center gap-6 text-[11px] text-white/30">
              <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
              <Link href="/developers" className="hover:text-white/60 transition-colors">API Docs</Link>
              <a href="mailto:hello@obsidianmarkets.com" className="hover:text-white/60 transition-colors">Contact</a>
            </div>
          </div>
          <p className="text-[10px] text-white/20 mt-6 max-w-2xl leading-[1.7]">
            Obsidian Markets provides financial data analysis for informational purposes only. This is not investment advice.
            AI-generated analysis may contain errors. Always consult a qualified financial advisor.
          </p>
        </div>
      </footer>
    </div>
  );
}
