"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("text-[13px] text-w2 leading-[1.7]", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-[16px] font-bold text-w mt-4 mb-2 tracking-[-0.3px]">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[14px] font-semibold text-w mt-3 mb-1.5 tracking-[-0.2px]">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[13px] font-semibold text-w mt-2 mb-1">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-w">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-w3 italic">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-none space-y-1 mb-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-2 text-w2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-w2 flex items-start gap-1.5">
              <span className="text-w5 mt-[2px] shrink-0">-</span>
              <span>{children}</span>
            </li>
          ),
          code: ({ children, className: codeClassName }) => {
            const isBlock = codeClassName?.includes("language-");
            if (isBlock) {
              return (
                <pre className="bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] px-3 py-2 my-2 overflow-x-auto">
                  <code className="text-[12px] font-mono text-w2">{children}</code>
                </pre>
              );
            }
            return (
              <code className="bg-s2 border border-[var(--brd)] rounded px-1.5 py-0.5 text-[12px] font-mono text-a">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-a/30 pl-3 my-2 text-w3 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-[var(--brd)] my-3" />,
          a: ({ children, href }) => (
            <a href={href} className="text-a hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full text-[12px] border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-w4 uppercase tracking-wide border-b border-[var(--brd)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1.5 border-b border-[var(--brd)] text-w2">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
