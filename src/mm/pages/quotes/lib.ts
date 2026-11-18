import type { Approval, FollowUp, FreightRequest, MMState, Product, Quote, QuoteStatus } from "../../types";
import { GBP_TO_EUR, eurEq, hasOverride, ix, quoteFreight, quoteTotal, quoteUnits, stockOf } from "../../select";
import { plural } from "../../format";
import { toneInk, type Tone } from "../../ui";

/* Quote module helpers. Everything here reads the live records; nothing is typed in. */

export const DAY = 86_400_000;
export const HOUR = 3_600_000;

export const STATUS_ORDER: QuoteStatus[] = ["Draft", "Awaiting Freight", "Ready for Review", "Approved", "Sent", "Accepted", "Declined", "Expired"];
/** Statuses the builder can open. */
export const OPEN: QuoteStatus[] = ["Draft", "Awaiting Freight", "Ready for Review", "Sent"];
/** Statuses whose lines can still change. Anything sent is locked. */
export const EDITABLE: QuoteStatus[] = ["Draft", "Awaiting Freight", "Ready for Review"];
const READY_OR_LATER: QuoteStatus[] = ["Ready for Review", "Approved", "Sent", "Accepted", "Declined", "Expired"];

export const RATE_NOTE = "EUR eq. at demo rate £1 = €" + GBP_TO_EUR.toFixed(2);

/** Colour per status for the status band (theme tokens, plus the kit's info tone). */
export const STATUS_INK: Record<QuoteStatus, string> = {
  Draft: "var(--faint)",
  "Awaiting Freight": "var(--warn)",
  "Ready for Review": "var(--accent)",
  Approved: "var(--ok)",
  Sent: toneInk("info"),
  Accepted: "var(--ok)",
  Declined: "var(--bad)",
  Expired: "var(--border-strong)",
};

export const isEditable = (q: Quote) => EDITABLE.includes(q.status);

/** "Flex series", but "X-Series" stays as it is. */
export const seriesLabel = (p: Product) => (/series$/i.test(p.series) ? p.series : p.series + " series");
/** "Leverage Range · Flex series", or just the range when the series is already in its name. */
export const rangeLabel = (p: Product, sep = " · ") =>
  p.range.toLowerCase().includes(p.series.toLowerCase()) ? p.range : p.range + sep + seriesLabel(p);

/** The incoming shipment that carries a product, if any. */
export const intakeFor = (s: MMState, productId: string) => s.shipments.find((x) => x.lines.some((l) => l.productId === productId));

export function byStatus(s: MMState): Record<QuoteStatus, Quote[]> {
  const o = Object.fromEntries(STATUS_ORDER.map((k) => [k, [] as Quote[]])) as Record<QuoteStatus, Quote[]>;
  for (const q of s.quotes) o[q.status].push(q);
  return o;
}

/** Quote value in EUR equivalent, for sorting and mixed-currency totals only. */
export const eqOf = (s: MMState, q: Quote) => eurEq(quoteTotal(s, q), q.currency);

/** EUR and GBP kept apart, with the EUR equivalent alongside. */
export function sums(s: MMState, qs: Quote[]) {
  let eur = 0, gbp = 0;
  for (const q of qs) {
    const t = quoteTotal(s, q);
    if (q.currency === "GBP") gbp += t; else eur += t;
  }
  return { n: qs.length, eur, gbp, eq: eur + eurEq(gbp, "GBP") };
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Hours from enquiry received to quote ready (quote assembled and carrier rate in), over every quote that got there. */
export function hoursToReady(s: MMState) {
  const xs: number[] = [];
  for (const q of s.quotes) {
    if (!READY_OR_LATER.includes(q.status)) continue;
    const e = ix(s).enquiry[q.enquiryId];
    if (!e) continue;
    const f = freightOf(s, q);
    const ready = Math.max(q.createdAt, f?.carrierQuote?.receivedAt ?? 0);
    if (ready > e.receivedAt) xs.push((ready - e.receivedAt) / HOUR);
  }
  return { median: median(xs), n: xs.length };
}

export const freightOf = (s: MMState, q: Quote): FreightRequest | undefined => (q.freightId ? ix(s).freight[q.freightId] : undefined);
export const isPriced = (s: MMState, q: Quote) => quoteFreight(s, q) !== null;

/** "T-Bar Linear Row" / "2 × T-Bar Linear Row" / "T-Bar Linear Row +5 more". */
export function machines(s: MMState, q: Quote): { top: string; sub: string } {
  if (!q.lines.length) return { top: "No machines yet", sub: "" };
  const first = q.lines[0];
  const name = ix(s).product[first.productId]?.name ?? first.productId;
  const units = quoteUnits(q);
  if (q.lines.length === 1) return { top: (first.qty > 1 ? first.qty + " × " : "") + name, sub: plural(units, "unit") };
  return { top: name + " +" + (q.lines.length - 1) + " more", sub: plural(q.lines.length, "machine") + ", " + plural(units, "unit") };
}

/* ── stock against a quote line ───────────────────────────────────────────── */

export type AvailKind = "ok" | "intake" | "partial" | "none" | "short" | "over";
export type Avail = { kind: AvailKind; tone: Tone; short: number; text: string | null; st: ReturnType<typeof stockOf> };

/** How a line of `qty` units is covered by County Derry stock and incoming intake. Never lets "available" go negative quietly. */
export function availability(s: MMState, p: Product, qty: number): Avail {
  const st = stockOf(s, p);
  if (st.available < 0) {
    return { kind: "over", tone: "bad", short: qty, st,
      text: "Reservations exceed stock by " + Math.abs(st.available) + ". Check reservations before quoting." };
  }
  const short = Math.max(0, qty - st.available);
  if (short === 0) return { kind: "ok", tone: "ok", short: 0, text: null, st };
  const sh = s.shipments.find((x) => x.lines.some((l) => l.productId === p.id));
  if (sh && st.incomingFree > 0) {
    const intake = sh.name.split(",")[0] + " intake, " + sh.eta.charAt(0).toLowerCase() + sh.eta.slice(1) + ", " + (sh.confirmed ? "confirmed" : "unconfirmed");
    if (st.incomingFree >= short) {
      return { kind: "intake", tone: "warn", short, st,
        text: st.available > 0 ? st.available + " from stock, " + short + " from " + intake : "From " + intake };
    }
    return { kind: "partial", tone: "bad", short, st,
      text: "Only " + (st.available + st.incomingFree) + " covered (" + st.available + " in stock, " + st.incomingFree + " free in the " + sh.name.split(",")[0]
        + " intake). " + (short - st.incomingFree) + " not covered. Confirm lead time before quoting." };
  }
  if (st.available <= 0) {
    const label = p.websiteLabel;
    const says = /pre-order/i.test(label) && /2027/.test(label) ? "pre-order 2027" : "“" + label + "”";
    const intakeFull = sh ? " The " + sh.name.split(",")[0] + " intake is fully reserved." : "";
    return { kind: "none", tone: "bad", short, st, text: "No stock." + intakeFull + " Website says " + says + ". Confirm lead time before quoting." };
  }
  return { kind: "short", tone: "bad", short, st,
    text: "Only " + st.available + " available in County Derry, " + short + " short. Confirm before quoting." };
}

/** Everything worth flagging on a quote before Niall approves it. */
export function flagsOf(s: MMState, q: Quote) {
  const P = ix(s).product;
  const stock = q.lines
    .map((l) => ({ productId: l.productId, name: P[l.productId]?.name ?? l.productId, a: availability(s, P[l.productId], l.qty) }))
    .filter((x) => x.a.kind !== "ok");
  const f = freightOf(s, q);
  const dims = (f?.missing ?? []).filter((m) => m.toLowerCase().startsWith("dimensions"));
  const otherMissing = (f?.missing ?? []).filter((m) => !m.toLowerCase().startsWith("dimensions"));
  const stockTone: Tone | null = stock.some((x) => x.a.tone === "bad") ? "bad" : stock.length ? "warn" : null;
  return { stock, stockTone, override: hasOverride(q), dims, otherMissing, freight: f };
}

export const overriddenLines = (s: MMState, q: Quote) =>
  q.lines.filter((l) => l.unitPrice !== l.listPrice).map((l) => ({ ...l, name: ix(s).product[l.productId]?.name ?? l.productId }));

/* ── approvals and follow-ups tied to a quote ─────────────────────────────── */

const isOpen = (a: Approval) => a.status === "Ready" || a.status === "Needs action";

export const openApprovalFor = (s: MMState, quoteId: string, kind: Approval["kind"] = "Customer quotation") =>
  s.approvals.find((a) => a.recordId === quoteId && a.kind === kind && isOpen(a));
export const heldApprovalFor = (s: MMState, quoteId: string) =>
  s.approvals.find((a) => a.recordId === quoteId && a.kind === "Customer quotation" && a.status === "Held");
export const pinnedFor = (s: MMState, quoteId: string) =>
  s.approvals.find((a) => a.recordId === quoteId && isOpen(a) && a.pinned !== undefined)?.pinned;

export const priceQuestions = (s: MMState) => s.approvals.filter((a) => a.kind === "Price review" && isOpen(a));

/** The follow-up that matters most for a quote: one awaiting review first, then the latest. */
export function followUpFor(s: MMState, quoteId: string): FollowUp | undefined {
  const xs = s.followUps.filter((f) => f.quoteId === quoteId);
  return xs.find((f) => f.status === "Awaiting review") ?? xs.sort((a, b) => b.lastTouch - a.lastTouch)[0];
}

export const orderFor = (s: MMState, quoteId: string) => s.orders.find((o) => o.quoteId === quoteId);
