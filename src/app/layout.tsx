import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

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
        className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter), var(--f)" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
