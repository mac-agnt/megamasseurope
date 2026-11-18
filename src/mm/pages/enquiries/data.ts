import type {
  Currency, Enquiry, EnquiryStage, FollowUp, FollowUpKind, Line, MMState, Priority, Qualification, RecordKind,
} from "../../types";
import {
  GBP_TO_EUR, STAGES, awaitingCustomer, customerOf, enquiryCurrency, enquiryValue, eurEq, ix, outstanding, quoteTotal, unanswered,
} from "../../select";
import { countryName, plural } from "../../format";
import type { Tone } from "../../ui";

/* Derived views for the Enquiries module. Pure functions over the store state,
   so every count on these pages moves as soon as a record changes. */

export const DAY = 86_400_000;
export const HOUR = 3_600_000;

/* ── open pipeline ────────────────────────────────────────────────────────── */

export const OPEN_STAGES: EnquiryStage[] = ["New", "Qualified", "Freight Requested", "Quote Ready", "Quote Sent"];
export const isOpen = (e: Enquiry) => OPEN_STAGES.includes(e.stage);
export const openEnquiries = (s: MMState) => s.enquiries.filter(isOpen);
export const highPriorityOpen = (s: MMState) => openEnquiries(s).filter((e) => e.priority === "High");
/** Same tests as unanswered() and awaitingCustomer() in select.ts, for a single record. */
export const isUnanswered = (e: Enquiry) => e.stage === "New" && !e.replied;
export const isWaiting = (e: Enquiry) => e.stage === "New" && e.replied;
/** Unanswered enquiries whose prepared reply can go as it is: nothing missing. */
export const draftsReady = (s: MMState) => unanswered(s).filter((e) => e.missing.length === 0);
export const receivedWithin = (s: MMState, ms: number) => s.enquiries.filter((e) => s.now - e.receivedAt < ms);
export function oldestUnanswered(s: MMState): Enquiry | undefined {
  let o: Enquiry | undefined;
  for (const e of unanswered(s)) if (!o || e.receivedAt < o.receivedAt) o = e;
  return o;
}

/* ── priority, money and machines ─────────────────────────────────────────── */

export const PRIORITY_RANK: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
export const PRIORITY_TONE: Record<Priority, Tone> = { High: "bad", Medium: "warn", Low: "neutral" };

export const valueEur = (s: MMState, e: Enquiry) => eurEq(enquiryValue(s, e), enquiryCurrency(s, e));
export const sumEur = (s: MMState, list: Enquiry[]) => list.reduce((n, e) => n + valueEur(s, e), 0);
export const unitsOf = (lines: { qty: number }[]) => lines.reduce((n, l) => n + l.qty, 0);
export const byPriorityThenValue = (s: MMState) => (a: Enquiry, b: Enquiry) =>
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || valueEur(s, b) - valueEur(s, a);

export const EUR_EQ = "EUR eq.";
export const EUR_EQ_NOTE = "EUR eq. is the EUR equivalent at demo rate £1 = €" + GBP_TO_EUR.toFixed(2)
  + ". EUR and GBP amounts are never added together raw.";

export const productName = (s: MMState, id: string) => ix(s).product[id]?.name ?? id;
export const lineLabel = (s: MMState, l: Line) => (l.qty > 1 ? l.qty + " × " : "") + productName(s, l.productId);
export const linesText = (s: MMState, e: Enquiry) => e.lines.map((l) => lineLabel(s, l)).join(", ");

export function machineSummary(s: MMState, e: Enquiry): string {
  if (!e.lines.length) return "No machine named";
  const first = lineLabel(s, e.lines[0]);
  return e.lines.length > 1 ? first + " + " + (e.lines.length - 1) + " more" : first;
}
/** The machines asked about, each named once. */
export const interestOf = (s: MMState, e: Enquiry) => [...new Set(e.lines.map((l) => productName(s, l.productId)))].join(", ");
export function quantityText(e: Enquiry): string {
  const n = unitsOf(e.lines);
  return e.lines.length > 1 ? n + " machines (" + e.lines.length + " models)" : String(n);
}

export const SOURCE_SHORT: Record<Enquiry["source"], string> = {
  "Website quote form": "Website", Email: "Email", Instagram: "Instagram", Phone: "Phone", Referral: "Referral",
};
/** Same tones the kit's Status badge uses, for places that need a shorter stage label. */
export const STAGE_TONE: Record<EnquiryStage, Tone> = {
  New: "accent", Qualified: "info", "Freight Requested": "warn", "Quote Ready": "accent", "Quote Sent": "info", Won: "ok", Lost: "neutral",
};

/* ── inbox list ───────────────────────────────────────────────────────────── */

export type InboxFilter = "unanswered" | "waiting" | "open" | "high";
export type InboxSort = "newest" | "priority" | "oldest";

export function inboxRows(s: MMState, f: InboxFilter): Enquiry[] {
  if (f === "unanswered") return unanswered(s);
  if (f === "waiting") return awaitingCustomer(s);
  if (f === "high") return highPriorityOpen(s);
  return openEnquiries(s);
}

export function sortEnquiries(list: Enquiry[], sort: InboxSort): Enquiry[] {
  const a = list.slice();
  if (sort === "oldest") return a.sort((x, y) => x.receivedAt - y.receivedAt);
  if (sort === "priority") return a.sort((x, y) => PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority] || y.receivedAt - x.receivedAt);
  return a.sort((x, y) => y.receivedAt - x.receivedAt);
}

const fold = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export function matchesQuery(s: MMState, e: Enquiry, q: string): boolean {
  const t = fold(q.trim());
  if (!t) return true;
  const c = customerOf(s, e.customerId);
  const ct = s.contacts.find((x) => x.id === e.contactId);
  const hay = [e.id, c.name, c.city, countryName(c.country), ct?.name ?? "", ct?.email ?? "", e.source, e.qualification,
    e.message, ...e.lines.map((l) => productName(s, l.productId))].join(" ");
  return fold(hay).includes(t);
}

/** "3d 14h", "5h", "42 min": the precise age used for the oldest enquiry. */
export function ageLong(ms: number): string {
  const h = Math.max(0, ms) / HOUR;
  if (h < 1) return Math.max(1, Math.round(h * 60)) + " min";
  if (h < 24) return Math.round(h) + "h";
  const d = Math.floor(h / 24), r = Math.round(h - d * 24);
  return r ? d + "d " + r + "h" : d + "d";
}

/* ── pipeline ─────────────────────────────────────────────────────────────── */

export const FLOW: EnquiryStage[] = ["New", "Qualified", "Freight Requested", "Quote Ready", "Quote Sent", "Won"];

/** How many enquiries reached each stage or went past it. Lost ones count as
    having reached Quote Sent, the same rule funnel() in select.ts uses. */
export function reachedCounts(s: MMState): Record<EnquiryStage, number> {
  const out = Object.fromEntries(STAGES.map((k) => [k, 0])) as Record<EnquiryStage, number>;
  for (const e of s.enquiries) {
    const top = e.stage === "Lost" ? FLOW.indexOf("Quote Sent") : FLOW.indexOf(e.stage);
    for (let i = 0; i <= top; i++) out[FLOW[i]]++;
    if (e.stage === "Lost") out.Lost++;
  }
  return out;
}
export const ratio = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

/* ── qualification board ──────────────────────────────────────────────────── */

/** Board order follows the agent's priority: wholesale and high-value first. */
export const BOARD: Qualification[] = [
  "Wholesale / distributor", "High-value project", "Returning customer", "Commercial gym", "Retail", "Incomplete enquiry",
];

/** Short stage names for tight spaces; the full name goes in a tooltip. */
export const STAGE_SHORT: Record<EnquiryStage, string> = {
  New: "New", Qualified: "Qualified", "Freight Requested": "Freight", "Quote Ready": "Quote ready", "Quote Sent": "Quote sent", Won: "Won", Lost: "Lost",
};
const MISSING_SHORT: Record<string, string> = {
  "Delivery postcode": "postcode", "Delivery address": "address", "Delivery country": "country", Quantity: "quantity",
};
export const missingShort = (m: string) => MISSING_SHORT[m] ?? m.toLowerCase();

/** A customer the business has dealt with before: flagged returning or with an order on file. */
export const isExistingCustomer = (s: MMState, customerId: string) =>
  !!customerOf(s, customerId).returning || s.orders.some((o) => o.customerId === customerId);

/** One short reason the agent put a card in its column. */
export function whyChip(s: MMState, e: Enquiry): { text: string; tone: Tone } {
  const c = customerOf(s, e.customerId);
  const n = unitsOf(e.lines);
  switch (e.qualification) {
    case "Wholesale / distributor": return { text: plural(n, "unit"), tone: "info" };
    case "High-value project": return { text: n > 1 ? plural(n, "machine") : "single large order", tone: "info" };
    case "Returning customer": {
      const orders = s.orders.filter((o) => o.customerId === c.id).length;
      return { text: orders ? plural(orders, "earlier order") : "returning", tone: "ok" };
    }
    case "Incomplete enquiry": return { text: e.missing.length ? "missing " + missingShort(e.missing[0]) : "details to confirm", tone: "warn" };
    case "Retail": return { text: e.facility.toLowerCase(), tone: "neutral" };
    default: return { text: n > 1 ? plural(n, "machine") : c.type.toLowerCase(), tone: "neutral" };
  }
}

/* ── enquiry timeline ─────────────────────────────────────────────────────── */

export type TLItem = { key: string; at: number; title: string; detail?: string; who?: string; tone?: Tone };

const nameOnly = (addr: string) => addr.replace(/\s*<[^>]*>\s*/, "").trim() || addr;

/** The record's current extraction, as the Enquiry Agent states it. */
export const extractionLine = (s: MMState, e: Enquiry) =>
  [linesText(s, e), e.qualification, e.missing.length ? "missing " + e.missing.join(", ").toLowerCase() : "nothing missing"].join(" · ");

/** Activity and email for an enquiry and everything it led to (quote, freight,
    order, invoice), newest first. Updates live as actions add events. */
export function enquiryTimeline(s: MMState, e: Enquiry): TLItem[] {
  const ids = new Set<string>([e.id]);
  if (e.quoteId) ids.add(e.quoteId);
  for (const f of s.freight) if (f.enquiryId === e.id) ids.add(f.id);
  for (const o of s.orders) if (e.quoteId && o.quoteId === e.quoteId) { ids.add(o.id); if (o.invoiceId) ids.add(o.invoiceId); }
  const out: TLItem[] = [];
  for (const a of s.activity) {
    if (!ids.has(a.recordId)) continue;
    /* Workaround: the seed logs some extractions before the record's
       qualification or missing fields were finalised, so the logged detail can
       disagree with the record. Show the record's current extraction instead. */
    const extraction = a.recordId === e.id && a.actor === "Enquiry Agent" && a.title === "Enquiry Agent extracted the requirements";
    out.push({ key: a.id, at: a.at, title: a.title, detail: extraction ? extractionLine(s, e) : a.detail, who: a.actor,
      tone: a.attention ? "warn" : a.actorKind === "person" ? "accent" : a.actorKind === "agent" ? "info" : undefined });
  }
  for (const m of s.emails) {
    if (!ids.has(m.recordId)) continue;
    if (m.direction === "in" && m.recordKind === "enquiry" && m.at === e.receivedAt) continue; // the original request is shown on its own
    out.push({ key: m.id, at: m.at, who: "Gmail", detail: m.subject,
      title: m.direction === "out" ? "Email sent to " + nameOnly(m.to) : m.direction === "in" ? "Email from " + nameOnly(m.from) : "Email drafted for " + nameOnly(m.to) + ", not sent",
      tone: m.direction === "out" ? "ok" : undefined });
  }
  return out.sort((a, b) => b.at - a.at);
}

/* ── follow-ups ───────────────────────────────────────────────────────────── */

export const FOLLOW_KINDS: FollowUpKind[] = ["No reply", "Quote decision", "Going cold", "No first response", "Payment promise"];
export const FOLLOW_HINT: Record<FollowUpKind, string> = {
  "No reply": "You answered. The customer hasn't come back with what was asked for.",
  "Quote decision": "Quote sent. No yes or no from the customer yet.",
  "Going cold": "Larger quotes with no response. Carrier rates only hold for so long.",
  "No first response": "Enquiries still waiting on a first reply from us.",
  "Payment promise": "Customers who said a payment is on the way.",
};
export const CADENCE_OPTIONS = [3, 7, 14, 30];

export type FollowContext = { kind: RecordKind; id: string; value: number | null; currency: Currency };
/** The record a follow-up is about, valued with the same selectors the other modules use. */
export function followContext(s: MMState, f: FollowUp): FollowContext {
  if (f.invoiceId) {
    const inv = ix(s).invoice[f.invoiceId];
    return { kind: "invoice", id: f.invoiceId, value: inv ? outstanding(s, inv) : f.value, currency: inv ? inv.currency : f.currency };
  }
  if (f.quoteId) {
    const q = ix(s).quote[f.quoteId];
    return { kind: "quote", id: f.quoteId, value: q ? quoteTotal(s, q) : f.value, currency: q ? q.currency : f.currency };
  }
  if (f.enquiryId) {
    const e = ix(s).enquiry[f.enquiryId];
    return { kind: "enquiry", id: f.enquiryId, value: e ? enquiryValue(s, e) : f.value, currency: e ? enquiryCurrency(s, e) : f.currency };
  }
  return { kind: "followup", id: f.id, value: f.value, currency: f.currency };
}
export const followDue = (f: FollowUp) => f.lastTouch + f.dueInDays * DAY;
