"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, TrendingUp, BarChart3, Crown, X, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/user.store";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ExperienceLevel, OnboardingInterest } from "@/types/user";

const LEVELS = [
  { key: "BEGINNER" as const, icon: Sprout, title: "Beginner", sub: "Just getting started with investing" },
  { key: "INTERMEDIATE" as const, icon: TrendingUp, title: "Intermediate", sub: "I invest regularly but want better tools" },
  { key: "ADVANCED" as const, icon: BarChart3, title: "Advanced", sub: "I actively trade stocks and options" },
  { key: "PROFESSIONAL" as const, icon: Crown, title: "Professional", sub: "I'm a professional or full-time trader" },
] as const;

const INTERESTS: { label: string; value: OnboardingInterest }[] = [
  { label: "Understanding my portfolio better", value: "portfolio" },
  { label: "Finding new stocks to invest in", value: "stock_research" },
  { label: "Options trading and flow", value: "options" },
  { label: "Macro and economic trends", value: "macro" },
  { label: "AI-powered research", value: "ai_research" },
];

const SUGGESTIONS = ["SPY", "AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "QQQ", "META"];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

const COMPLETION_MSG: Record<ExperienceLevel, string> = {
  BEGINNER: "We've set up a simplified dashboard. As you explore, we'll gradually introduce more powerful tools.",
  INTERMEDIATE: "Your dashboard is configured with the essentials. Advanced features are just a click away.",
  ADVANCED: "Full power mode activated. Every tool is at your fingertips.",
  PROFESSIONAL: "Full power mode activated. Every tool is at your fingertips.",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding, onboarding } = useUserStore();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [experience, setExperience] = useState<ExperienceLevel>("BEGINNER");
  const [interests, setInterests] = useState<OnboardingInterest[]>([]);
  const [tickers, setTickers] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ symbol: string; name: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (onboarding.completed) router.replace("/");
  }, [onboarding.completed, router]);

  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setShowDropdown(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) { setResults([]); return; }
        const data = await res.json();
        setResults(Array.isArray(data) ? data.slice(0, 6) : []);
        setShowDropdown(true);
      } catch { setResults([]); }
    }, 300);
  }, []);

  const addTicker = (t: string) => {
    const upper = t.toUpperCase();
    if (!tickers.includes(upper)) setTickers((p) => [...p, upper]);
    setQuery(""); setResults([]); setShowDropdown(false);
  };

  const next = () => { setDir(1); setStep((s) => Math.min(s + 1, 3)); };
  const back = () => { setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  const finish = () => {
    completeOnboarding(experience, interests, tickers);
    router.push("/");
  };

  const toggleInterest = (v: OnboardingInterest) =>
    setInterests((p) => (p.includes(v) ? p.filter((i) => i !== v) : [...p, v]));

  return (
    <div className="min-h-screen bg-bg flex items-start justify-center">
      <div className="w-full max-w-[560px] mx-auto py-12 px-4">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <span className="text-[18px] font-semibold text-w">Obsidian Markets</span>
          <span className="text-[10px] text-a bg-a/10 px-1.5 py-0.5 rounded-[var(--rad-sm)]">Setup</span>
        </div>

        {/* Step dots */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn("w-2 h-2 rounded-full transition-colors", i === step ? "bg-a" : "bg-s3")} />
          ))}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {step === 0 && (
              <StepShell title="What describes you best?" sub="We'll customize your experience based on your level">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LEVELS.map((l) => {
                    const Icon = l.icon;
                    const sel = experience === l.key;
                    return (
                      <div
                        key={l.key}
                        onClick={() => setExperience(l.key)}
                        className={cn(
                          "flex items-start gap-3 bg-s1 border rounded-[var(--rad)] p-5 cursor-pointer transition-colors",
                          sel ? "border-a/60 bg-[var(--abg)]" : "border-[var(--brd)] hover:border-[var(--brd2)]"
                        )}
                      >
                        <Icon size={18} className={cn("mt-0.5 shrink-0", sel ? "text-a" : "text-w3")} />
                        <div>
                          <p className="text-[13px] font-medium text-w">{l.title}</p>
                          <p className="text-[11px] text-w3 mt-0.5">{l.sub}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 1 && (
              <StepShell title="What are you most interested in?" sub="Select all that apply — we'll prioritize these on your dashboard">
                <div className="flex flex-wrap gap-2.5">
                  {INTERESTS.map((i) => {
                    const sel = interests.includes(i.value);
                    return (
                      <button
                        key={i.value}
                        onClick={() => toggleInterest(i.value)}
                        className={cn(
                          "px-4 py-2.5 rounded-full border text-[12px] cursor-pointer transition-colors",
                          sel ? "border-a/60 bg-[var(--abg)] text-a" : "border-[var(--brd)] bg-s2 text-w3 hover:text-w2"
                        )}
                      >
                        {i.label}
                      </button>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 2 && (
              <StepShell title="Add some tickers you follow" sub="We'll create your first watchlist">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-w5" />
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
                    onFocus={() => results.length > 0 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Search tickers..."
                    className="w-full bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] pl-8 pr-3 py-2 text-[13px] text-w placeholder-w5 outline-none focus:border-a/40"
                  />
                  {showDropdown && results.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] overflow-hidden">
                      {results.map((r) => (
                        <button
                          key={r.symbol}
                          onMouseDown={() => addTicker(r.symbol)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-s3 transition-colors cursor-pointer"
                        >
                          <span className="text-[12px] font-mono text-w">{r.symbol}</span>
                          <span className="text-[11px] text-w4 truncate">{r.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected tickers */}
                {tickers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {tickers.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 bg-s3 text-w text-[11px] font-mono px-2 py-1 rounded-[var(--rad-sm)]">
                        {t}
                        <X size={12} className="cursor-pointer text-w4 hover:text-w" onClick={() => setTickers((p) => p.filter((x) => x !== t))} />
                      </span>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                <div className="mt-4">
                  <p className="text-[10px] text-w4 uppercase tracking-wider mb-2">Popular</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.filter((s) => !tickers.includes(s)).map((s) => (
                      <button
                        key={s}
                        onClick={() => addTicker(s)}
                        className="bg-s2 text-w3 text-[11px] font-mono px-2.5 py-1 rounded-[var(--rad-sm)] border border-[var(--brd)] hover:text-w hover:border-[var(--brd2)] transition-colors cursor-pointer"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </StepShell>
            )}

            {step === 3 && (
              <StepShell title="You're all set!" sub={COMPLETION_MSG[experience]}>
                <Panel className="p-4 space-y-3">
                  <Row label="Experience" value={experience.charAt(0) + experience.slice(1).toLowerCase()} />
                  <Row label="Interests" value={interests.length > 0 ? interests.map((i) => INTERESTS.find((x) => x.value === i)?.label).join(", ") : "None selected"} />
                  <Row label="Tickers" value={tickers.length > 0 ? tickers.join(", ") : "None added"} mono={tickers.length > 0} />
                </Panel>
              </StepShell>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 0 ? <Button variant="ghost" size="md" onClick={back}>Back</Button> : <div />}
          {step < 3 ? (
            <Button variant="primary" size="md" onClick={next} disabled={step === 1 && interests.length === 0}>
              Continue
            </Button>
          ) : (
            <Button variant="primary" size="lg" onClick={finish}>Launch Dashboard</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[18px] font-semibold text-w">{title}</h2>
      <p className="text-[13px] text-w3 mt-1 mb-6">{sub}</p>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[11px] text-w4 shrink-0">{label}</span>
      <span className={cn("text-[12px] text-w text-right", mono && "font-mono")}>{value}</span>
    </div>
  );
}
