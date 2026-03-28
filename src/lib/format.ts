import numeral from "numeral";

export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  if (Math.abs(value) >= 1000) return numeral(value).format("0,0.00");
  if (Math.abs(value) >= 1) return numeral(value).format("0.00");
  return numeral(value).format("0.0000");
}

export function formatPct(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${numeral(value).format("0.00")}%`;
}

export function formatChange(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${numeral(value).format("0.00")}`;
}

export function formatVolume(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1e9) return numeral(value).format("0.00a").toUpperCase();
  if (value >= 1e6) return numeral(value).format("0.00a").toUpperCase();
  if (value >= 1e3) return numeral(value).format("0.0a").toUpperCase();
  return numeral(value).format("0,0");
}

export function formatMarketCap(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1e12) return `$${numeral(value / 1e12).format("0.00")}T`;
  if (value >= 1e9) return `$${numeral(value / 1e9).format("0.00")}B`;
  if (value >= 1e6) return `$${numeral(value / 1e6).format("0.00")}M`;
  return `$${numeral(value).format("0,0")}`;
}

export function formatCompact(value: number | null | undefined): string {
  if (value == null) return "—";
  return numeral(value).format("0.[00]a").toUpperCase();
}

export function formatRatio(value: number | null | undefined): string {
  if (value == null) return "—";
  return numeral(value).format("0.00");
}

export function formatLargeNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return numeral(value).format("0,0");
}
