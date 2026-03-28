/**
 * Workaround: Next.js 16 + Turbopack may not load .env.local in all environments,
 * especially when the project path contains spaces. This manually parses
 * .env.local and injects missing vars into process.env.
 */
import { readFileSync } from "fs";
import { join } from "path";

let loaded = false;

/** Parse a value that may be quoted with single or double quotes */
function parseValue(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function ensureEnv() {
  if (loaded) return;
  loaded = true;

  // Only load if a key env var is missing
  if (process.env.ANTHROPIC_API_KEY && process.env.FMP_API_KEY) return;

  try {
    const envPath = join(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = parseValue(trimmed.slice(eqIdx + 1));
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local not found — expected in production (env set via deployment platform)
  }
}
