/**
 * Side Panel — Full streaming AI chat.
 * Same quality as the web app's /ai page.
 */

import { streamChat } from "../lib/api";

const messagesEl = document.getElementById("messages")!;
const inputEl = document.getElementById("input") as HTMLTextAreaElement;
const sendBtn = document.getElementById("send") as HTMLButtonElement;
const emptyEl = document.getElementById("empty")!;

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const history: ChatMsg[] = [];
let isStreaming = false;
let abortController: AbortController | null = null;

function addMessage(role: "user" | "assistant", content: string): HTMLDivElement {
  emptyEl.style.display = "none";

  const div = document.createElement("div");
  div.className = role === "user" ? "msg msg-user" : "msg msg-ai";
  div.textContent = content;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

async function send() {
  const text = inputEl.value.trim();
  if (!text || isStreaming) return;

  inputEl.value = "";
  inputEl.style.height = "40px";
  isStreaming = true;
  sendBtn.disabled = true;

  // Add user message
  history.push({ role: "user", content: text });
  addMessage("user", text);

  // Create AI message placeholder
  const aiDiv = addMessage("assistant", "");
  aiDiv.innerHTML = '<span class="typing">Thinking</span>';

  // Stream response
  abortController = new AbortController();
  let fullText = "";

  try {
    await streamChat(
      history,
      (chunk) => {
        fullText += chunk;
        aiDiv.textContent = fullText;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      },
      abortController.signal
    );
  } catch (e) {
    if ((e as Error).name !== "AbortError") {
      fullText = fullText || "Error: Could not get response.";
      aiDiv.textContent = fullText;
    }
  }

  history.push({ role: "assistant", content: fullText });
  isStreaming = false;
  sendBtn.disabled = false;
  abortController = null;
  inputEl.focus();
}

// Send on Enter (Shift+Enter for newline)
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

// Auto-resize textarea
inputEl.addEventListener("input", () => {
  inputEl.style.height = "40px";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
});

sendBtn.addEventListener("click", send);

// Check for context from background (ticker click or page analysis)
async function checkContext() {
  try {
    const data = await chrome.storage.session.get("sidepanel_context");
    const ctx = data.sidepanel_context;
    if (!ctx || Date.now() - ctx.timestamp > 10000) return; // Stale context

    // Clear it
    await chrome.storage.session.remove("sidepanel_context");

    if (ctx.ticker) {
      inputEl.value = `Give me a comprehensive analysis of ${ctx.ticker}. Cover price action, fundamentals, options activity, and key risks.`;
      send();
    } else if (ctx.analyzePage && ctx.url) {
      inputEl.value = `Analyze the financial content on this page: ${ctx.url}`;
      send();
    }
  } catch {
    // Session storage not available
  }
}

checkContext();
inputEl.focus();
