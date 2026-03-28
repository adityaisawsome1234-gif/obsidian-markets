"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/cn";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const INJECTED_STYLES = `
  .gsap-reveal { visibility: hidden; }
  .film-grain {
    position: absolute; inset: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 50; opacity: 0.04; mix-blend-mode: overlay;
    background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  }
  .bg-grid-cin {
    background-size: 60px 60px;
    background-image:
      linear-gradient(to right, rgba(167,139,250,0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(167,139,250,0.04) 1px, transparent 1px);
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }
  .text-3d-matte {
    color: rgba(236,236,239,0.4);
    text-shadow: 0 10px 30px rgba(167,139,250,0.15), 0 2px 4px rgba(167,139,250,0.08);
  }
  .text-silver-matte {
    background: linear-gradient(180deg, #FFFFFF 0%, rgba(236,236,239,0.4) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; transform: translateZ(0);
    filter: drop-shadow(0px 10px 20px rgba(167,139,250,0.12)) drop-shadow(0px 2px 4px rgba(255,255,255,0.06));
  }
  .text-card-silver {
    background: linear-gradient(180deg, #FFFFFF 0%, #A1A1AA 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; transform: translateZ(0);
    filter: drop-shadow(0px 12px 24px rgba(0,0,0,0.8)) drop-shadow(0px 4px 8px rgba(0,0,0,0.6));
  }
  .premium-card {
    background: linear-gradient(145deg, #1a1040 0%, #0b0b0f 100%);
    box-shadow:
      0 40px 100px -20px rgba(0,0,0,0.9), 0 20px 40px -20px rgba(0,0,0,0.8),
      inset 0 1px 2px rgba(167,139,250,0.12), inset 0 -2px 4px rgba(0,0,0,0.8);
    border: 1px solid rgba(167,139,250,0.06);
    position: relative;
  }
  .card-sheen-cin {
    position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
    background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(167,139,250,0.06) 0%, transparent 40%);
    mix-blend-mode: screen; transition: opacity 0.3s ease;
  }
  .terminal-bezel {
    background-color: #101014;
    box-shadow:
      inset 0 0 0 2px #2a2a31, inset 0 0 0 6px #0b0b0f,
      0 40px 80px -15px rgba(0,0,0,0.9), 0 15px 25px -5px rgba(0,0,0,0.7);
    transform-style: preserve-3d;
  }
  .screen-glare-cin { background: linear-gradient(110deg, rgba(167,139,250,0.06) 0%, transparent 45%); }
  .widget-depth-cin {
    background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
    box-shadow: 0 10px 20px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.04), inset 0 -1px 1px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.03);
  }
  .floating-badge-cin {
    background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%);
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    box-shadow:
      0 0 0 1px rgba(167,139,250,0.1), 0 25px 50px -12px rgba(0,0,0,0.8),
      inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.5);
  }
  .cin-progress-ring {
    transform: rotate(-90deg); transform-origin: center;
    stroke-dasharray: 327; stroke-dashoffset: 327; stroke-linecap: round;
  }
`;

export interface CinematicHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  brandName?: string;
  tagline1?: string;
  tagline2?: string;
  cardHeading?: string;
  cardDescription?: React.ReactNode;
  metricValue?: number;
  metricLabel?: string;
}

export function CinematicHero({
  brandName = "Obsidian",
  tagline1 = "See through",
  tagline2 = "the noise.",
  cardHeading = "Intelligence, amplified.",
  cardDescription = (
    <>
      <span className="text-white font-semibold">Obsidian Markets</span> consolidates
      real-time data, options flow, AI research, and portfolio analytics into one
      professional terminal — powered by AI that understands YOUR positions.
    </>
  ),
  metricValue = 72,
  metricLabel = "AI Accuracy",
  className,
  ...props
}: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

  // Mouse parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.scrollY > window.innerHeight * 2) return;
      cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(() => {
        if (mainCardRef.current && mockupRef.current) {
          const rect = mainCardRef.current.getBoundingClientRect();
          mainCardRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
          mainCardRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
          const xVal = (e.clientX / window.innerWidth - 0.5) * 2;
          const yVal = (e.clientY / window.innerHeight - 0.5) * 2;
          gsap.to(mockupRef.current, { rotationY: xVal * 12, rotationX: -yVal * 12, ease: "power3.out", duration: 1.2 });
        }
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => { window.removeEventListener("mousemove", handleMouseMove); cancelAnimationFrame(requestRef.current); };
  }, []);

  // Cinematic scroll timeline
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const ctx = gsap.context(() => {
      gsap.set(".cin-text-track", { autoAlpha: 0, y: 60, scale: 0.85, filter: "blur(20px)", rotationX: -20 });
      gsap.set(".cin-text-days", { autoAlpha: 1, clipPath: "inset(0 100% 0 0)" });
      gsap.set(".cin-main-card", { y: window.innerHeight + 200, autoAlpha: 1 });
      gsap.set([".cin-card-left", ".cin-card-right", ".cin-mockup-wrap", ".cin-float-badge", ".cin-widget"], { autoAlpha: 0 });

      const introTl = gsap.timeline({ delay: 0.3 });
      introTl
        .to(".cin-text-track", { duration: 1.8, autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", rotationX: 0, ease: "expo.out" })
        .to(".cin-text-days", { duration: 1.4, clipPath: "inset(0 0% 0 0)", ease: "power4.inOut" }, "-=1.0");

      const scrollTl = gsap.timeline({
        scrollTrigger: { trigger: containerRef.current, start: "top top", end: "+=5000", pin: true, scrub: 1, anticipatePin: 1 },
      });

      scrollTl
        .to([".cin-hero-text", ".bg-grid-cin"], { scale: 1.15, filter: "blur(20px)", opacity: 0.2, ease: "power2.inOut", duration: 2 }, 0)
        .to(".cin-main-card", { y: 0, ease: "power3.inOut", duration: 2 }, 0)
        .to(".cin-main-card", { width: "100%", height: "100%", borderRadius: "0px", ease: "power3.inOut", duration: 1.5 })
        .fromTo(".cin-mockup-wrap",
          { y: 300, z: -500, rotationX: 50, rotationY: -30, autoAlpha: 0, scale: 0.6 },
          { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 2.5 }, "-=0.8")
        .fromTo(".cin-widget", { y: 40, autoAlpha: 0, scale: 0.95 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.15, ease: "back.out(1.2)", duration: 1.5 }, "-=1.5")
        .to(".cin-progress-ring", { strokeDashoffset: 327 - (metricValue / 100) * 327, duration: 2, ease: "power3.inOut" }, "-=1.2")
        .to(".cin-counter", { innerHTML: metricValue, snap: { innerHTML: 1 }, duration: 2, ease: "expo.out" }, "-=2.0")
        .fromTo(".cin-float-badge", { y: 100, autoAlpha: 0, scale: 0.7, rotationZ: -10 }, { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: "back.out(1.5)", duration: 1.5, stagger: 0.2 }, "-=2.0")
        .fromTo(".cin-card-left", { x: -50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: "power4.out", duration: 1.5 }, "-=1.5")
        .fromTo(".cin-card-right", { x: 50, autoAlpha: 0, scale: 0.8 }, { x: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 1.5 }, "<")
        .to({}, { duration: 2 })
        .to([".cin-mockup-wrap", ".cin-float-badge", ".cin-card-left", ".cin-card-right"], {
          scale: 0.9, y: -40, z: -200, autoAlpha: 0, ease: "power3.in", duration: 1.2, stagger: 0.05,
        })
        .to(".cin-main-card", {
          width: isMobile ? "92vw" : "85vw", height: isMobile ? "92vh" : "85vh",
          borderRadius: isMobile ? "32px" : "40px", ease: "expo.inOut", duration: 1.8,
        }, "pullback")
        .to(".cin-main-card", { y: -window.innerHeight - 300, ease: "power3.in", duration: 1.5 });
    }, containerRef);
    return () => ctx.revert();
  }, [metricValue]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-screen overflow-hidden flex items-center justify-center bg-[#0b0b0f] text-white font-sans antialiased", className)}
      style={{ perspective: "1500px" }}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="film-grain" aria-hidden="true" />
      <div className="bg-grid-cin absolute inset-0 z-0 pointer-events-none opacity-50" aria-hidden="true" />

      {/* Hero Text */}
      <div className="cin-hero-text absolute z-10 flex flex-col items-center justify-center text-center w-full px-4 will-change-transform">
        <h1 className="cin-text-track gsap-reveal text-3d-matte text-5xl md:text-7xl lg:text-[6rem] font-bold tracking-tight mb-2">
          {tagline1}
        </h1>
        <h1 className="cin-text-days gsap-reveal text-silver-matte text-5xl md:text-7xl lg:text-[6rem] font-extrabold tracking-tighter italic">
          {tagline2}
        </h1>
      </div>

      {/* Deep Card */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none" style={{ perspective: "1500px" }}>
        <div
          ref={mainCardRef}
          className="cin-main-card premium-card relative overflow-hidden gsap-reveal flex items-center justify-center pointer-events-auto w-[92vw] md:w-[85vw] h-[92vh] md:h-[85vh] rounded-[32px] md:rounded-[40px]"
        >
          <div className="card-sheen-cin" aria-hidden="true" />

          <div className="relative w-full h-full max-w-7xl mx-auto px-4 lg:px-12 flex flex-col justify-evenly lg:grid lg:grid-cols-3 items-center lg:gap-8 z-10 py-6 lg:py-0">

            {/* Brand name */}
            <div className="cin-card-right gsap-reveal order-1 lg:order-3 flex justify-center lg:justify-end z-20 w-full">
              <h2 className="text-5xl md:text-[5rem] lg:text-[7rem] font-black uppercase tracking-tighter text-card-silver">
                {brandName}
              </h2>
            </div>

            {/* Terminal mockup */}
            <div className="cin-mockup-wrap order-2 relative w-full h-[350px] lg:h-[550px] flex items-center justify-center z-10" style={{ perspective: "1000px" }}>
              <div className="relative w-full h-full flex items-center justify-center transform scale-[0.7] md:scale-[0.85] lg:scale-100">
                <div
                  ref={mockupRef}
                  className="relative w-[300px] h-[460px] rounded-[1.25rem] terminal-bezel flex flex-col will-change-transform"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="absolute inset-[4px] bg-[#0b0b0f] rounded-[1rem] overflow-hidden text-white z-10">
                    <div className="absolute inset-0 screen-glare-cin z-40 pointer-events-none" />
                    <div className="relative w-full h-full pt-5 px-3.5 pb-3 flex flex-col">
                      {/* Topbar */}
                      <div className="cin-widget flex justify-between items-center mb-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded bg-purple-500/30 border border-purple-500/40" />
                          <span className="text-[9px] font-semibold text-white/60">Dashboard</span>
                        </div>
                        <div className="w-20 h-4 rounded bg-white/[0.03] border border-white/[0.04]" />
                      </div>

                      {/* Metric ring */}
                      <div className="cin-widget relative w-28 h-28 mx-auto flex items-center justify-center mb-3">
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(167,139,250,0.06)" strokeWidth="7" />
                          <circle className="cin-progress-ring" cx="60" cy="60" r="52" fill="none" stroke="#a78bfa" strokeWidth="7" />
                        </svg>
                        <div className="text-center z-10 flex flex-col items-center">
                          <span className="cin-counter text-2xl font-extrabold tracking-tighter text-white">0</span>
                          <span className="text-[6px] text-purple-300/50 uppercase tracking-[0.12em] font-bold mt-0.5">{metricLabel}</span>
                        </div>
                      </div>

                      {/* Tickers */}
                      <div className="cin-widget flex gap-1 mb-2">
                        {[
                          { t: "SPX", v: "5,842", c: "+0.8%", up: true },
                          { t: "NDX", v: "21,647", c: "-2.0%", up: false },
                          { t: "VIX", v: "26.78", c: "+11%", up: false },
                        ].map((d) => (
                          <div key={d.t} className="flex-1 widget-depth-cin rounded-lg p-1.5">
                            <div className="text-[6px] text-white/30 uppercase font-bold">{d.t}</div>
                            <div className="text-[9px] font-mono text-white/80">{d.v}</div>
                            <div className={`text-[7px] font-mono ${d.up ? "text-green-400" : "text-red-400"}`}>{d.c}</div>
                          </div>
                        ))}
                      </div>

                      {/* Flow rows */}
                      <div className="space-y-1.5">
                        {[
                          { type: "C", ticker: "NVDA $950C", detail: "$3.2M sweep", score: "92", color: "green" },
                          { type: "P", ticker: "SPY $580P", detail: "$1.8M block", score: "74", color: "red" },
                          { type: "C", ticker: "AAPL $195C", detail: "$980K sweep", score: "81", color: "green" },
                        ].map((f, i) => (
                          <div key={i} className="cin-widget widget-depth-cin rounded-lg p-2 flex items-center">
                            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${f.color === "green" ? "from-green-500/20 to-green-600/5 border-green-400/20" : "from-red-500/20 to-red-600/5 border-red-400/20"} flex items-center justify-center mr-2 border`}>
                              <span className={`text-[8px] font-bold ${f.color === "green" ? "text-green-400" : "text-red-400"}`}>{f.type}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[9px] text-white/80 font-semibold truncate">{f.ticker}</div>
                              <div className="text-[7px] text-white/30 font-mono">{f.detail}</div>
                            </div>
                            <div className="text-[8px] font-mono text-purple-300 font-bold">{f.score}</div>
                          </div>
                        ))}
                      </div>

                      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[90px] h-[3px] bg-white/10 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="cin-float-badge absolute flex top-2 lg:top-8 left-[-5px] lg:left-[-70px] floating-badge-cin rounded-xl p-2 lg:p-3 items-center gap-2 lg:gap-3 z-30">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-gradient-to-b from-purple-500/20 to-purple-900/10 flex items-center justify-center border border-purple-400/20">
                    <span className="text-xs lg:text-sm">📈</span>
                  </div>
                  <div>
                    <p className="text-white text-[9px] lg:text-xs font-bold tracking-tight">Smart Money Alert</p>
                    <p className="text-purple-200/50 text-[8px] lg:text-[10px]">Score 92/100</p>
                  </div>
                </div>
                <div className="cin-float-badge absolute flex bottom-8 lg:bottom-14 right-[-5px] lg:right-[-70px] floating-badge-cin rounded-xl p-2 lg:p-3 items-center gap-2 lg:gap-3 z-30">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-gradient-to-b from-green-500/20 to-green-900/10 flex items-center justify-center border border-green-400/20">
                    <span className="text-xs lg:text-sm">🎯</span>
                  </div>
                  <div>
                    <p className="text-white text-[9px] lg:text-xs font-bold tracking-tight">Earnings Beat</p>
                    <p className="text-green-200/50 text-[8px] lg:text-[10px]">NVDA +12.4%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card text */}
            <div className="cin-card-left gsap-reveal order-3 lg:order-1 flex flex-col justify-center text-center lg:text-left z-20 w-full px-4 lg:px-0">
              <h3 className="text-white text-xl md:text-2xl lg:text-3xl font-bold mb-0 lg:mb-4 tracking-tight">
                {cardHeading}
              </h3>
              <p className="hidden md:block text-blue-100/60 text-sm lg:text-base leading-relaxed mx-auto lg:mx-0 max-w-sm lg:max-w-none">
                {cardDescription}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
