"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Github,
  Lock,
  Mail,
  ArrowRight,
  Chrome,
} from "lucide-react";

/* ─── particle canvas ─── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    type P = { x: number; y: number; v: number; o: number };
    let ps: P[] = [];
    let raf = 0;

    const make = (): P => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      v: Math.random() * 0.25 + 0.05,
      o: Math.random() * 0.35 + 0.15,
    });

    const init = () => {
      ps = [];
      const count = Math.floor((canvas.width * canvas.height) / 9000);
      for (let i = 0; i < count; i++) ps.push(make());
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ps.forEach((p) => {
        p.y -= p.v;
        if (p.y < 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + Math.random() * 40;
          p.v = Math.random() * 0.25 + 0.05;
          p.o = Math.random() * 0.35 + 0.15;
        }
        ctx.fillStyle = `rgba(250,250,250,${p.o})`;
        ctx.fillRect(p.x, p.y, 0.7, 2.2);
      });
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      setSize();
      init();
    };
    window.addEventListener("resize", onResize);
    init();
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-50 mix-blend-screen pointer-events-none"
    />
  );
}

/* ─── main page ─── */
export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  return (
    <section className="fixed inset-0 bg-bg text-w">
      {/* CSS for accent grid lines */}
      <style>{`
        .accent-lines{position:absolute;inset:0;pointer-events:none;opacity:.7}
        .hline,.vline{position:absolute;will-change:transform,opacity}
        .hline{left:0;right:0;height:1px;background:var(--brd);transform:scaleX(0);transform-origin:50% 50%;animation:drawX .8s cubic-bezier(.22,.61,.36,1) forwards}
        .vline{top:0;bottom:0;width:1px;background:var(--brd);transform:scaleY(0);transform-origin:50% 0%;animation:drawY .9s cubic-bezier(.22,.61,.36,1) forwards}
        .hline:nth-child(1){top:18%;animation-delay:.12s}
        .hline:nth-child(2){top:50%;animation-delay:.22s}
        .hline:nth-child(3){top:82%;animation-delay:.32s}
        .vline:nth-child(4){left:22%;animation-delay:.42s}
        .vline:nth-child(5){left:50%;animation-delay:.54s}
        .vline:nth-child(6){left:78%;animation-delay:.66s}
        .hline::after,.vline::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(139,92,246,.24),transparent);opacity:0;animation:shimmer .9s ease-out forwards}
        .hline:nth-child(1)::after{animation-delay:.12s}
        .hline:nth-child(2)::after{animation-delay:.22s}
        .hline:nth-child(3)::after{animation-delay:.32s}
        .vline:nth-child(4)::after{animation-delay:.42s}
        .vline:nth-child(5)::after{animation-delay:.54s}
        .vline:nth-child(6)::after{animation-delay:.66s}
        @keyframes drawX{0%{transform:scaleX(0);opacity:0}60%{opacity:.95}100%{transform:scaleX(1);opacity:.7}}
        @keyframes drawY{0%{transform:scaleY(0);opacity:0}60%{opacity:.95}100%{transform:scaleY(1);opacity:.7}}
        @keyframes shimmer{0%{opacity:0}35%{opacity:.25}100%{opacity:0}}
      `}</style>

      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(80%_60%_at_50%_30%,rgba(139,92,246,0.04),transparent_60%)]" />

      {/* Animated accent lines */}
      <div className="accent-lines">
        <div className="hline" />
        <div className="hline" />
        <div className="hline" />
        <div className="vline" />
        <div className="vline" />
        <div className="vline" />
      </div>

      {/* Particles */}
      <ParticleCanvas />

      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-[var(--brd)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-a2 rounded-md flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-sm" />
          </div>
          <span className="text-xs tracking-[0.14em] uppercase text-w3">
            Obsidian Markets
          </span>
        </div>
        <Link
          href="/"
          className="inline-flex items-center h-9 px-4 rounded-lg border border-[var(--brd)] bg-s2 text-w2 text-sm hover:bg-s3 transition-colors"
        >
          <span className="mr-2">Explore Demo</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      {/* Main content: Login card + 3D robot */}
      <div className="h-full w-full flex items-center justify-center px-4 pt-16">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 items-center">
          {/* Login Card */}
          <motion.div
            className="relative z-10 w-full max-w-sm mx-auto lg:mx-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <Card className="border-[var(--brd)] bg-s1/70 backdrop-blur supports-[backdrop-filter]:bg-s1/60">
              <div className="flex flex-col space-y-1.5 p-6">
                <h2 className="text-2xl font-semibold tracking-tight text-w">
                  Welcome back
                </h2>
                <p className="text-sm text-w4">Sign in to your account</p>
              </div>

              <div className="p-6 pt-0 grid gap-5">
                {/* Email */}
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-w3">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-w5" />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="w-full h-9 bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] pl-10 pr-3 text-sm text-w placeholder:text-w5 outline-none transition-colors focus:border-[var(--brd3)] focus:bg-s3"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-w3">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-w5" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full h-9 bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] pl-10 pr-10 text-sm text-w placeholder:text-w5 outline-none transition-colors focus:border-[var(--brd3)] focus:bg-s3"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-w4 hover:text-w2"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" />
                    <Label htmlFor="remember" className="text-w4 text-xs">
                      Remember me
                    </Label>
                  </div>
                  <a
                    href="#"
                    className="text-xs text-w3 hover:text-w transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Submit */}
                <button
                  onClick={() => {
                    document.cookie = "obsidian_session=1; path=/; max-age=604800";
                    router.push("/");
                  }}
                  className="w-full h-10 rounded-lg bg-w text-bg font-medium text-sm hover:bg-w/90 transition-colors"
                >
                  Continue
                </button>

                {/* Divider */}
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-s1/70 px-2 text-[11px] uppercase tracking-widest text-w5">
                    or
                  </span>
                </div>

                {/* Social buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      document.cookie = "obsidian_session=1; path=/; max-age=604800";
                      router.push("/");
                    }}
                    className="inline-flex items-center justify-center h-10 rounded-lg border border-[var(--brd)] bg-s2 text-w2 text-sm hover:bg-s3 transition-colors"
                  >
                    <Github className="h-4 w-4 mr-2" />
                    GitHub
                  </button>
                  <button
                    onClick={() => {
                      document.cookie = "obsidian_session=1; path=/; max-age=604800";
                      router.push("/");
                    }}
                    className="inline-flex items-center justify-center h-10 rounded-lg border border-[var(--brd)] bg-s2 text-w2 text-sm hover:bg-s3 transition-colors"
                  >
                    <Chrome className="h-4 w-4 mr-2" />
                    Google
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-center p-6 pt-0 text-sm text-w4">
                Don&apos;t have an account?
                <Link
                  className="ml-1 text-w2 hover:underline"
                  href="/register"
                >
                  Create one
                </Link>
              </div>
            </Card>
          </motion.div>

          {/* 3D Robot - right side */}
          <motion.div
            className="relative h-[600px] hidden lg:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.6 }}
          >
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
