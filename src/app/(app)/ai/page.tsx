"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, User, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { FeedbackWidget } from "@/components/ai/feedback-widget";
import { AnimatedAIChat } from "@/components/ui/animated-ai-chat";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "@/stores/user.store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Suggestions moved into AnimatedAIChat component

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const experienceLevel = useUserStore((s) => s.getEffectiveLevel());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStreamingId(null);
  }, []);

  const handleSend = useCallback(
    async (value: string) => {
      if (!value.trim() || isLoading) return;

      const userMsg: Message = {
        id: String(Date.now()),
        role: "user",
        content: value,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const aiMsgId = String(Date.now() + 1);
      const aiMsg: Message = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setIsLoading(true);
      setStreamingId(aiMsgId);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // Build message history for the API (exclude the empty AI message we just added)
        const apiMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, experienceLevel }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;

          accumulated += decoder.decode(chunk, { stream: true });

          // Update the AI message content with accumulated text
          const currentText = accumulated;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId ? { ...m, content: currentText } : m
            )
          );
        }

        // Final update with complete text
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: accumulated,
                  timestamp: new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                }
              : m
          )
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // User cancelled - keep whatever we streamed so far
          return;
        }
        // Show error in the AI message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: `**Error:** ${(err as Error).message || "Failed to get response. Please try again."}`,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        setStreamingId(null);
        abortControllerRef.current = null;
      }
    },
    [isLoading, messages]
  );

  const handleNewChat = useCallback(() => {
    handleStop();
    setMessages([]);
  }, [handleStop]);

  return (
    <div className="h-[calc(100vh-44px-40px)] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 pb-3"
      >
        <Sparkles size={16} className="text-a" />
        <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
          Obsidian AI
        </h1>
        <Badge variant="ai">Claude Sonnet 4</Badge>
        {messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleNewChat}
            className="ml-auto flex items-center gap-1.5 text-[11px] text-w4 hover:text-w2 px-2.5 py-1.5 rounded-lg border border-[var(--brd)] hover:border-[var(--brd2)] hover:bg-s2 transition-colors cursor-pointer"
          >
            <Plus size={12} />
            New Chat
          </motion.button>
        )}
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <AnimatedAIChat onSend={handleSend} isLoading={isLoading} />
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : ""
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-[var(--abg)] border border-[var(--abr)] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={14} className="text-a" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[680px] rounded-xl px-4 py-3",
                    msg.role === "user"
                      ? "bg-s3 text-w"
                      : "bg-s1 border border-[var(--brd)]"
                  )}
                >
                  {msg.role === "assistant" ? (
                    msg.content ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : streamingId === msg.id ? (
                      <div className="flex gap-1.5 items-center py-1">
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full bg-a"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.2,
                            delay: 0,
                          }}
                        />
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full bg-a"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.2,
                            delay: 0.2,
                          }}
                        />
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full bg-a"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.2,
                            delay: 0.4,
                          }}
                        />
                      </div>
                    ) : null
                  ) : (
                    <div className="text-[13px] text-w2 leading-[1.7]">
                      {msg.content}
                    </div>
                  )}
                  {(msg.role === "user" || msg.content) && (
                    <div className="flex items-center justify-between mt-1.5 gap-3">
                      <div className="text-[9px] font-mono text-w5">
                        {msg.timestamp}
                      </div>
                      {msg.role === "assistant" && msg.content && streamingId !== msg.id && (
                        <FeedbackWidget
                          messageId={msg.id}
                          compact
                          context={{
                            query: messages.find((m) => m.role === "user" && m.id < msg.id)?.content,
                            endpoint: "/api/ai/chat",
                            model: "claude-sonnet-4-6",
                            responsePreview: msg.content.slice(0, 200),
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-a to-a2 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={13} className="text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Input Box — only shown when chat has messages */}
      {messages.length > 0 && (
        <div className="shrink-0 pt-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PromptInputBox
              onSubmit={(value) => handleSend(value)}
              isSubmitting={isLoading}
              onStop={handleStop}
            />
          </motion.div>
          <p className="text-[9px] text-w5 text-center mt-2">
            AI-generated analysis is for informational purposes only. Not
            investment advice.
          </p>
        </div>
      )}
    </div>
  );
}
