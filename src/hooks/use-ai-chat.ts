"use client";

import { useState, useCallback } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // In production, this streams from the Claude API
      // For now, mock a response
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: `I'm analyzing your question about "${content}". In production, this would stream a response from Claude using real-time market data, financial statements, and sentiment analysis.`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
