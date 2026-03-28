/**
 * Referral System
 *
 * Every user gets a referral code. When a referred user converts to paid:
 * - Referrer gets 1 month free Pro
 * - Referred user gets 30-day trial (vs standard 14-day)
 *
 * In-memory storage (production → PostgreSQL).
 */

/* ── Types ── */

export type ReferralStatus = "pending" | "converted" | "expired";

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string | null;
  code: string;
  status: ReferralStatus;
  createdAt: string;
  convertedAt: string | null;
}

export interface ReferralStats {
  code: string;
  link: string;
  totalReferred: number;
  converted: number;
  pending: number;
  expired: number;
  monthsEarned: number;
}

/* ── Storage ── */

const referrals: Referral[] = [];
const codeToUser = new Map<string, string>(); // code → referrerId
let idCounter = 0;

/* ── Code generation ── */

function generateCode(userId: string): string {
  // Deterministic code from userId for idempotency
  const base = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  const suffix = Math.abs(hashStr(userId) % 1000).toString().padStart(3, "0");
  return `${base}${suffix}`;
}

function hashStr(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return hash;
}

/* ── Public API ── */

/**
 * Get or create a referral code for a user.
 */
export function getReferralCode(userId: string): string {
  // Check if user already has a code
  for (const [code, uid] of codeToUser) {
    if (uid === userId) return code;
  }
  const code = generateCode(userId);
  codeToUser.set(code, userId);
  return code;
}

/**
 * Register a referred signup. Called when a new user signs up via /ref/CODE.
 */
export function registerReferral(
  code: string,
  referredUserId: string
): Referral | null {
  const referrerId = codeToUser.get(code.toUpperCase());
  if (!referrerId) return null;

  // Don't allow self-referral
  if (referrerId === referredUserId) return null;

  // Check if this user was already referred
  const existing = referrals.find((r) => r.referredId === referredUserId);
  if (existing) return existing;

  const referral: Referral = {
    id: `ref_${++idCounter}`,
    referrerId,
    referredId: referredUserId,
    code: code.toUpperCase(),
    status: "pending",
    createdAt: new Date().toISOString(),
    convertedAt: null,
  };
  referrals.push(referral);
  return referral;
}

/**
 * Convert a referral when the referred user upgrades to paid.
 * Returns the referrerId who should receive their free month.
 */
export function convertReferral(referredUserId: string): string | null {
  const referral = referrals.find(
    (r) => r.referredId === referredUserId && r.status === "pending"
  );
  if (!referral) return null;

  referral.status = "converted";
  referral.convertedAt = new Date().toISOString();
  return referral.referrerId;
}

/**
 * Get referral stats for a user's dashboard.
 */
export function getReferralStats(userId: string): ReferralStats {
  const code = getReferralCode(userId);
  const userReferrals = referrals.filter((r) => r.referrerId === userId);

  return {
    code,
    link: `https://obsidianmarkets.com/ref/${code}`,
    totalReferred: userReferrals.length,
    converted: userReferrals.filter((r) => r.status === "converted").length,
    pending: userReferrals.filter((r) => r.status === "pending").length,
    expired: userReferrals.filter((r) => r.status === "expired").length,
    monthsEarned: userReferrals.filter((r) => r.status === "converted").length,
  };
}

/**
 * Validate a referral code. Returns the referrer userId if valid.
 */
export function validateReferralCode(code: string): string | null {
  return codeToUser.get(code.toUpperCase()) ?? null;
}

/**
 * Get the trial duration for a user (extended if referred).
 */
export function getTrialDays(userId: string): number {
  const wasReferred = referrals.some(
    (r) => r.referredId === userId && r.status !== "expired"
  );
  return wasReferred ? 30 : 14;
}
