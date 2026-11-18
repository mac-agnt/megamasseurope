import type { Country, Currency } from "./types";
import { COUNTRY_NAME } from "./seed";

const DAY = 86_400_000;

export const sym = (c: Currency) => (c === "GBP" ? "£" : "€");

/** €21,915 · £3,515 */
export function money(amount: number, cur: Currency = "EUR", decimals = 0): string {
  const n = Math.abs(amount).toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (amount < 0 ? "−" : "") + sym(cur) + n;
}

/** €46.8k · €1.2m */
export function moneyShort(amount: number, cur: Currency = "EUR"): string {
  const a = Math.abs(amount);
  if (a >= 1_000_000) return sym(cur) + (a / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  if (a >= 10_000) return sym(cur) + Math.round(a / 1000) + "k";
  if (a >= 1000) return sym(cur) + (a / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return sym(cur) + Math.round(a);
}

export const num = (n: number) => n.toLocaleString("en-GB");
export const pct = (n: number, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : "0") + "%";

export function since(ts: number, now = Date.now()): string {
  const s = Math.max(0, now - ts) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.round(s / 60) + " min ago";
  if (s < 86400) return Math.round(s / 3600) + " h ago";
  const d = Math.floor(s / 86400);
  if (d === 1) return "yesterday";
  return d + " days ago";
}

/** "12m", "3h", "2d": the compact age used in tables. */
export function age(ts: number, now = Date.now()): string {
  const s = Math.max(0, now - ts) / 1000;
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + "m";
  if (s < 86400) return Math.round(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

export function until(ts: number, now = Date.now()): string {
  const d = Math.round((ts - now) / DAY);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return d > 0 ? "in " + d + " days" : Math.abs(d) + " days ago";
}

export const days = (from: number, to = Date.now()) => Math.floor((to - from) / DAY);

export function dateShort(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
export function dateLong(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
export function time(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
export function stamp(ts: number, now = Date.now()): string {
  const d = new Date(ts), n = new Date(now);
  const sameDay = d.toDateString() === n.toDateString();
  const y = new Date(now - DAY);
  if (sameDay) return "Today " + time(ts);
  if (d.toDateString() === y.toDateString()) return "Yesterday " + time(ts);
  return dateShort(ts) + " " + time(ts);
}

export const countryName = (c: Country) => COUNTRY_NAME[c];

const FLAGS: Record<Country, string> = {
  IT: "🇮🇹", NL: "🇳🇱", FR: "🇫🇷", DE: "🇩🇪", ES: "🇪🇸", SK: "🇸🇰", IE: "🇮🇪", GB: "🇬🇧", BE: "🇧🇪", PL: "🇵🇱",
  AT: "🇦🇹", PT: "🇵🇹", DK: "🇩🇰", CZ: "🇨🇿", SE: "🇸🇪",
};
export const flag = (c: Country) => FLAGS[c];

export function initials(name: string): string {
  const parts = name.replace(/[()]/g, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] || "")).toUpperCase();
}

export const plural = (n: number, one: string, many = one + "s") => num(n) + " " + (n === 1 ? one : many);
