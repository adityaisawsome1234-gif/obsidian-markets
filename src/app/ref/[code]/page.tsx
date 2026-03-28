import type { Metadata } from "next";
import Link from "next/link";
import { validateReferralCode } from "@/services/referral.service";

interface Props {
  params: Promise<{ code: string }>;
}

/**
 * Referral Landing Page — /ref/[code]
 *
 * When someone shares their referral link, the referred user lands here.
 * Shows the referral benefit (30-day trial) and redirects to registration.
 * SSR for instant load + OG tags for social sharing.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: "Join Obsidian Markets — 30 Days Free",
    description: "You've been invited to Obsidian Markets. Get 30 days free access to AI-powered financial research, real-time options flow, and portfolio analytics.",
    openGraph: {
      title: "Join Obsidian Markets — Extended 30-Day Trial",
      description: "AI-powered stock analysis, options flow intelligence, and portfolio tracking. Free for 30 days.",
      url: `https://obsidianmarkets.com/ref/${code}`,
      siteName: "Obsidian Markets",
      type: "website",
    },
  };
}

export default async function ReferralPage({ params }: Props) {
  const { code } = await params;
  const isValid = validateReferralCode(code);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0a0f 0%, #111118 100%)",
        color: "#e0e0e8",
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "480px", textAlign: "center" }}>
        {/* Logo */}
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #7c5cfc, #5a3fd6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            fontWeight: "800",
            color: "white",
            margin: "0 auto 24px",
          }}
        >
          O
        </div>

        <h1
          style={{
            fontSize: "28px",
            fontWeight: "800",
            color: "#fff",
            letterSpacing: "-0.5px",
            marginBottom: "12px",
          }}
        >
          You&apos;ve been invited
        </h1>

        <p
          style={{
            fontSize: "15px",
            color: "#8b8b9e",
            lineHeight: "1.7",
            marginBottom: "28px",
          }}
        >
          Someone thinks you&apos;d love Obsidian Markets. Sign up now and get
          <strong style={{ color: "#7c5cfc" }}> 30 days free</strong> (normally 14).
        </p>

        {/* Benefits */}
        <div
          style={{
            textAlign: "left",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            marginBottom: "28px",
          }}
        >
          {[
            "AI-powered stock analysis + deep dives",
            "Real-time options flow intelligence",
            "Earnings transcript AI analysis",
            "Portfolio impact simulator",
            "Smart money flow scoring",
          ].map((benefit) => (
            <div
              key={benefit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 0",
              }}
            >
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "rgba(124,92,252,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: "#7c5cfc",
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              <span style={{ fontSize: "13px", color: "#c0c0d0" }}>
                {benefit}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href={`/register?ref=${code}`}
          style={{
            display: "inline-block",
            fontSize: "14px",
            fontWeight: "700",
            color: "white",
            background: "linear-gradient(135deg, #7c5cfc, #5a3fd6)",
            padding: "14px 40px",
            borderRadius: "10px",
            textDecoration: "none",
            marginBottom: "16px",
          }}
        >
          Claim 30 Days Free →
        </Link>

        <p style={{ fontSize: "11px", color: "#3a3a4e", marginTop: "8px" }}>
          No credit card required • Cancel anytime
        </p>

        {!isValid && (
          <p
            style={{
              fontSize: "11px",
              color: "#5a5a6e",
              marginTop: "16px",
              padding: "10px",
              borderRadius: "6px",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            Referral code not recognized, but you can still sign up with a standard 14-day trial.
          </p>
        )}
      </div>
    </div>
  );
}
