"use client";
import { useEffect, useRef, useCallback, useTransition } from "react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  ImageIcon,
  FileUp,
  Figma,
  MonitorIcon,
  CircleUserRound,
  ArrowUpIcon,
  Paperclip,
  PlusIcon,
  SendIcon,
  XIcon,
  LoaderIcon,
  Sparkles,
  Command,
  TrendingUp,
  BarChart3,
  Layers,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(
          textarea.scrollHeight,
          maxHeight ?? Number.POSITIVE_INFINITY
        )
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
  icon: React.ReactNode;
  label: string;
  description: string;
  prefix: string;
}

interface AnimatedAIChatProps {
  onSend: (value: string) => void;
  isLoading?: boolean;
}

export function AnimatedAIChat({ onSend, isLoading = false }: AnimatedAIChatProps) {
  const [value, setValue] = useState("");
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [recentCommand, setRecentCommand] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });
  const [inputFocused, setInputFocused] = useState(false);
  const commandPaletteRef = useRef<HTMLDivElement>(null);

  const commandSuggestions: CommandSuggestion[] = [
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: "Analyze Stock",
      description: "Deep dive analysis on any ticker",
      prefix: "/analyze",
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      label: "Compare",
      description: "Compare two or more tickers",
      prefix: "/compare",
    },
    {
      icon: <Layers className="w-4 h-4" />,
      label: "Options Flow",
      description: "Unusual options activity analysis",
      prefix: "/flow",
    },
    {
      icon: <Globe className="w-4 h-4" />,
      label: "Macro Brief",
      description: "Macro outlook and portfolio impact",
      prefix: "/macro",
    },
  ];

  useEffect(() => {
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowCommandPalette(true);
      const matchingSuggestionIndex = commandSuggestions.findIndex(
        (cmd) => cmd.prefix.startsWith(value)
      );
      if (matchingSuggestionIndex >= 0) {
        setActiveSuggestion(matchingSuggestionIndex);
      } else {
        setActiveSuggestion(-1);
      }
    } else {
      setShowCommandPalette(false);
    }
  }, [value]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const commandButton = document.querySelector("[data-command-button]");
      if (
        commandPaletteRef.current &&
        !commandPaletteRef.current.contains(target) &&
        !commandButton?.contains(target)
      ) {
        setShowCommandPalette(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPalette) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev < commandSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev > 0 ? prev - 1 : commandSuggestions.length - 1
        );
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        if (activeSuggestion >= 0) {
          const selectedCommand = commandSuggestions[activeSuggestion];
          setValue(selectedCommand.prefix + " ");
          setShowCommandPalette(false);
          setRecentCommand(selectedCommand.label);
          setTimeout(() => setRecentCommand(null), 3500);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        handleSendMessage();
      }
    }
  };

  const handleSendMessage = () => {
    if (value.trim() && !isLoading) {
      onSend(value);
      setValue("");
      adjustHeight(true);
    }
  };

  const selectCommandSuggestion = (index: number) => {
    const selectedCommand = commandSuggestions[index];
    setValue(selectedCommand.prefix + " ");
    setShowCommandPalette(false);
    setRecentCommand(selectedCommand.label);
    setTimeout(() => setRecentCommand(null), 2000);
  };

  return (
    <div className="flex flex-col w-full items-center justify-center text-w relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-a/[0.06] rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue/[0.04] rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-a2/[0.05] rounded-full mix-blend-normal filter blur-[96px] animate-pulse" />
      </div>

      <div className="w-full max-w-2xl mx-auto relative">
        <motion.div
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Heading */}
          <div className="text-center space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--abg)] border border-[var(--abr)] flex items-center justify-center mx-auto mb-4">
                <Sparkles size={24} className="text-a" />
              </div>
              <h1 className="text-[22px] font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-w to-w3 pb-1">
                What would you like to research?
              </h1>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-[var(--brd3)] to-transparent mt-2"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.p
              className="text-[12px] text-w4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Type a command or ask about any stock, sector, or strategy
            </motion.p>
          </div>

          {/* Input card */}
          <motion.div
            className="relative backdrop-blur-2xl bg-s1/80 rounded-[var(--rad)] border border-[var(--brd)] shadow-2xl"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Command palette */}
            <AnimatePresence>
              {showCommandPalette && (
                <motion.div
                  ref={commandPaletteRef}
                  className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-s1 rounded-[var(--rad-sm)] z-50 shadow-lg border border-[var(--brd2)] overflow-hidden"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="py-1">
                    {commandSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.prefix}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 text-xs transition-colors cursor-pointer",
                          activeSuggestion === index
                            ? "bg-s3 text-w"
                            : "text-w3 hover:bg-s2"
                        )}
                        onClick={() => selectCommandSuggestion(index)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div className="w-5 h-5 flex items-center justify-center text-a">
                          {suggestion.icon}
                        </div>
                        <div className="font-medium text-[11px]">
                          {suggestion.label}
                        </div>
                        <div className="text-w5 text-[10px] font-mono ml-1">
                          {suggestion.prefix}
                        </div>
                        <div className="text-w5 text-[10px] ml-auto">
                          {suggestion.description}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea area */}
            <div className="p-4">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Ask about any stock, compare companies, analyze options flow..."
                className={cn(
                  "w-full px-2 py-2",
                  "resize-none",
                  "bg-transparent",
                  "border-none outline-none",
                  "text-w text-[13px]",
                  "placeholder:text-w5",
                  "min-h-[60px]",
                  "font-[var(--f)]"
                )}
                style={{ overflow: "hidden" }}
              />
            </div>

            {/* Bottom toolbar */}
            <div className="px-4 pb-3 flex items-center justify-between gap-4 border-t border-[var(--brd)] pt-3">
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  data-command-button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCommandPalette((prev) => !prev);
                  }}
                  whileTap={{ scale: 0.94 }}
                  className={cn(
                    "p-1.5 text-w5 hover:text-w3 rounded-[var(--rad-sm)] transition-colors cursor-pointer",
                    showCommandPalette && "bg-s3 text-a"
                  )}
                >
                  <Command className="w-4 h-4" />
                </motion.button>
                <span className="text-[9px] text-w5 font-mono">
                  / for commands
                </span>
              </div>

              <motion.button
                type="button"
                onClick={handleSendMessage}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                disabled={isLoading || !value.trim()}
                className={cn(
                  "px-3.5 py-1.5 rounded-[var(--rad-sm)] text-[11px] font-medium transition-all cursor-pointer",
                  "flex items-center gap-1.5",
                  value.trim()
                    ? "bg-a2 text-white shadow-lg shadow-a2/20"
                    : "bg-s3 text-w5"
                )}
              >
                {isLoading ? (
                  <LoaderIcon className="w-3.5 h-3.5 animate-[spin_2s_linear_infinite]" />
                ) : (
                  <SendIcon className="w-3.5 h-3.5" />
                )}
                <span>Send</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Quick action chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {commandSuggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.prefix}
                onClick={() => selectCommandSuggestion(index)}
                className="flex items-center gap-1.5 px-3 py-2 bg-s1 hover:bg-s2 rounded-[var(--rad-sm)] text-[11px] text-w4 hover:text-w2 transition-all border border-[var(--brd)] hover:border-[var(--brd2)] cursor-pointer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <span className="text-a">{suggestion.icon}</span>
                <span>{suggestion.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Thinking indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="fixed bottom-8 backdrop-blur-2xl bg-s1/90 rounded-full px-4 py-2 shadow-lg border border-[var(--brd)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--abg)] border border-[var(--abr)] flex items-center justify-center">
                <Sparkles size={12} className="text-a" />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-w3">
                <span>Thinking</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mouse follow glow */}
      {inputFocused && (
        <motion.div
          className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.015] bg-gradient-to-r from-a via-a2 to-blue blur-[96px]"
          animate={{
            x: mousePosition.x - 400,
            y: mousePosition.y - 400,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-a rounded-full mx-0.5"
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
