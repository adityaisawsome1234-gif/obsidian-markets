import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Obsidian Markets — See Through the Noise",
  description:
    "All-in-one financial research and intelligence platform. Real-time market data, AI-powered analysis, options flow, and portfolio tracking.",
  keywords: [
    "stock market",
    "trading",
    "financial research",
    "options flow",
    "portfolio tracker",
    "AI analysis",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="antialiased"
        style={{ fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
