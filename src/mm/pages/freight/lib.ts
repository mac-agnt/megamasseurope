import type {
  Approval, Currency, Customer, Email, Enquiry, FreightRequest, FreightStatus, MMState, Order, Product, Quote, QuoteStatus,
  Reservation, Supplier,
} from "../../types";
import { avgMarkup, carrierStats, eurEq, freightCharge, freightOutstanding, freightToRequest, ix, lateRates, quoteTotal } from "../../select";

/* Freight module logic. Everything here is derived from the shared records:
   nothing is typed in, and no freight cost exists until a carrier has replied. */

export const DAY = 86_400_000;
export const HOUR = 3_600_000;

/** The seven steps of one freight price, from enquiry to Niall's approval. */
export const FLOW: string[] = [
  "New customer enquiry",
  "Request preparation",
  "Awaiting carrier",
  "Carrier reply received",
  "Markup applied",
  "Customer quote",
  "Niall's approval",
];

/** Quote states in which the freight markup can still change. */
export const OPEN_QUOTE: QuoteStatus[] = ["Draft", "Awaiting Freight", "Ready for Review"];

export interface Machine { p: Product; qty: number }

/** One freight request with everything the UI needs around it. */
export interface FreightView {
  f: FreightRequest;
  c: Customer;
  q?: Quote;
  e?: Enquiry;
  o?: Order;
  carrier?: Supplier;
  cur: Currency;
  units: number;
  machines: Machine[];
  /** Machines whose weight or dimensions the catalogue lists as TBC. */
  tbc: Product[];
  postcodeMissing: boolean;
  cost: number | null; // carrier cost, only once a carrier has replied
  charge: number | null; // customer freight charge
  markupAmt: number | null;
  /** Waiting time: request to reply, or request to now while still waiting. */
  waitMs: number;
  late: boolean;
}

export function viewOf(s: MMState, f: FreightRequest): FreightView {
  const x = ix(s);
  const c = x.customer[f.customerId];
  const q = f.quoteId ? x.quote[f.quoteId] : undefined;
  const e = f.enquiryId ? x.enquiry[f.enquiryId] : undefined;
  const o = f.orderId ? x.order[f.orderId] : s.orders.find((r) => r.freightId === f.id);
  const carrier = s.suppliers.find((sp) => sp.id === f.carrierId);
  const machines: Machine[] = f.lines.map((l) => ({ p: x.product[l.productId], qty: l.qty })).filter((m) => m.p !== undefined);
  const tbc = machines.filter((m) => m.p.dims === null || m.p.weightKg === null).map((m) => m.p);
  const postcodeMissing = f.missing.some((m) => /postcode/i.test(m)) || (e !== undefined && !e.postcode);
  const cost = f.carrierQuote ? f.carrierQuote.cost : null;
  const charge = freightCharge(f);
  const end = f.carrierQuote ? f.carrierQuote.receivedAt : s.now;
  return {
    f, c, q, e, o, carrier,
    cur: f.carrierQuote?.currency ?? q?.currency ?? c.currency,
    units: machines.reduce((n, m) => n + m.qty, 0),
    machines, tbc, postcodeMissing, cost, charge,
    markupAmt: charge !== null && cost !== null ? charge - cost : null,
    waitMs: f.requestedAt === null ? 0 : Math.max(0, end - f.requestedAt),
    late: f.status === "Awaiting rate" && f.requestedAt !== null && s.now - f.requestedAt > 3 * DAY,
  };
}

/** Index of the current step in FLOW (FLOW.length when every step is done). */
export function flowStage(v: FreightView): number {
  const { f, q } = v;
  if (f.status === "To request") return 1;
  if (!f.carrierQuote) return 2;
  if (!q || q.status === "Draft" || q.status === "Awaiting Freight") return 5;
  if (q.status === "Ready for Review") return 6;
  return FLOW.length;
}

/** Why the markup can no longer change, or null when it can. */
export function markupLocked(v: FreightView): string | null {
  if (typeof v.f.charge === "number" || v.o) return "Freight charge agreed on the order";
  if (v.f.status === "Booked" || v.f.status === "Dispatched" || v.f.status === "Delivered") return "Shipment already booked";
  if (v.q && !OPEN_QUOTE.includes(v.q.status)) return "Quote already " + v.q.status.toLowerCase();
  return null;
}

/** Everything the record holds that the carrier has not given us yet, flagged rather than guessed. */
export function flagsOf(v: FreightView): string[] {
  const out = [...v.f.missing];
  if (v.postcodeMissing && !out.some((m) => /postcode/i.test(m))) out.push("Delivery postcode");
  if (v.tbc.length && !out.some((m) => /dimension/i.test(m)))
    out.push("Dimensions for " + v.tbc.map((p) => p.name).join(", ") + " (catalogue says TBC)");
  return out;
}

/** The emails on a freight record: the request, any chases and the carrier's reply. */
export function freightMails(s: MMState, id: string): { request?: Email; chases: Email[]; reply?: Email } {
  const all = s.emails.filter((m) => m.recordKind === "freight" && m.recordId === id).sort((a, b) => a.at - b.at);
  const out = all.filter((m) => m.direction === "out");
  return {
    request: out.find((m) => !m.subject.startsWith("Chasing")),
    chases: out.filter((m) => m.subject.startsWith("Chasing")),
    reply: [...all].reverse().find((m) => m.direction === "in"),
  };
}

/** Niall put the approval for this record on hold (the quote leaves his queue until released). */
export const isHeld = (s: MMState, recordId: string) => s.approvals.some((a) => a.recordId === recordId && a.status === "Held");

/** Open approval (Ready or Needs action) sitting on a record, if any. */
export function openApprovalFor(s: MMState, recordId: string): Approval | undefined {
  return s.approvals.find((a) => a.recordId === recordId && (a.status === "Ready" || a.status === "Needs action"));
}

/* ── KPI strip ────────────────────────────────────────────────────────────── */

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function carriers(s: MMState): Supplier[] {
  return s.suppliers.filter((x) => x.kind === "Carrier");
}

export function freightKpis(s: MMState) {
  const stats = carriers(s).map((c) => ({ c, st: carrierStats(s, c.id) }));
  const replied = stats.reduce((n, x) => n + x.st.replied, 0);
  const from = startOfDay(s.now);
  return {
    outstanding: freightOutstanding(s).length,
    toRequest: freightToRequest(s).length,
    late: lateRates(s).length,
    stats,
    avgHours: replied ? stats.reduce((n, x) => n + x.st.avgHours * x.st.replied, 0) / replied : 0,
    today: s.freight.filter((f) => f.carrierQuote && f.carrierQuote.receivedAt >= from).length,
    markup: avgMarkup(s),
    marked: s.freight.filter((f) => f.carrierQuote && f.status !== "To request").length,
    awaitingDispatch: s.orders.filter((o) => o.status === "Payment confirmed" || o.status === "Equipment allocated").length,
  };
}

/* ── requests table ───────────────────────────────────────────────────────── */

export type ReqFilter = "open" | "toreq" | "awaiting" | "received" | "all";

const STATUS_RANK: Record<FreightStatus, number> = {
  "To request": 0, "Awaiting rate": 1, "Rate received": 2, Booked: 3, Dispatched: 4, Delivered: 5,
};

export function isOpenRequest(v: FreightView): boolean {
  if (v.f.status === "To request" || v.f.status === "Awaiting rate") return true;
  return v.f.status === "Rate received" && !!v.q && OPEN_QUOTE.includes(v.q.status);
}

export function filterRequests(all: FreightView[], k: ReqFilter): FreightView[] {
  const rows = all.filter((v) => k === "all" ? true : k === "open" ? isOpenRequest(v)
    : k === "toreq" ? v.f.status === "To request" : k === "awaiting" ? v.f.status === "Awaiting rate" : v.f.status === "Rate received");
  return rows.sort((a, b) => {
    const r = STATUS_RANK[a.f.status] - STATUS_RANK[b.f.status];
    if (r) return r;
    if (a.f.status === "Awaiting rate") return (a.f.requestedAt ?? 0) - (b.f.requestedAt ?? 0); // longest wait first
    if (a.f.status === "To request") return (a.e?.lastContactAt ?? 0) - (b.e?.lastContactAt ?? 0);
    if (a.f.carrierQuote && b.f.carrierQuote) return b.f.carrierQuote.receivedAt - a.f.carrierQuote.receivedAt;
    return (b.f.requestedAt ?? 0) - (a.f.requestedAt ?? 0);
  });
}

/* ── rate review ──────────────────────────────────────────────────────────── */

/** Rates on open quotes, plus anything received or approved since the page loaded. */
export function reviewList(s: MMState): FreightView[] {
  const x = ix(s);
  const rows = s.freight.filter((f) => {
    if (!f.carrierQuote || !f.quoteId) return false;
    const q = x.quote[f.quoteId];
    if (!q) return false;
    return q.status === "Ready for Review" || f.carrierQuote.receivedAt > s.now || (q.sentAt !== undefined && q.sentAt > s.now);
  }).map((f) => viewOf(s, f));
  const pending = (v: FreightView) => v.q?.status === "Ready for Review";
  const fresh = (v: FreightView) => (v.f.carrierQuote?.receivedAt ?? 0) > s.now; // arrived while the page was open
  return rows.sort((a, b) => {
    if (pending(a) !== pending(b)) return pending(a) ? -1 : 1;
    if (!pending(a)) return (b.q?.sentAt ?? 0) - (a.q?.sentAt ?? 0);
    if (fresh(a) !== fresh(b)) return fresh(a) ? -1 : 1;
    if (fresh(a)) return b.f.carrierQuote!.receivedAt - a.f.carrierQuote!.receivedAt; // newest replies first
    return eurEq(quoteTotal(s, b.q!), b.q!.currency) - eurEq(quoteTotal(s, a.q!), a.q!.currency); // then largest quotes
  });
}

/* ── dispatch board ───────────────────────────────────────────────────────── */

export interface DispatchItem {
  o: Order;
  c: Customer;
  f?: FreightRequest;
  carrier?: Supplier;
  awaiting: Reservation[]; // units still to arrive on an incoming shipment
  warehouse: Reservation[]; // units held in County Derry
}

export function dispatchBoard(s: MMState) {
  const x = ix(s);
  const item = (o: Order): DispatchItem => {
    const f = o.freightId ? x.freight[o.freightId] : undefined;
    const rs = s.reservations.filter((r) => r.orderId === o.id);
    return {
      o, c: x.customer[o.customerId], f, carrier: f ? s.suppliers.find((sp) => sp.id === f.carrierId) : undefined,
      awaiting: rs.filter((r) => r.status === "Awaiting arrival"),
      warehouse: rs.filter((r) => r.source === "Warehouse stock"),
    };
  };
  const ready: DispatchItem[] = [], waiting: DispatchItem[] = [], transit: DispatchItem[] = [], delivered: DispatchItem[] = [], unpaid: DispatchItem[] = [];
  let olderDelivered = 0;
  for (const o of s.orders) {
    const it = item(o);
    if (o.status === "Dispatched") transit.push(it);
    else if (o.status === "Delivered") {
      if (o.deliveredAt !== undefined && s.now - o.deliveredAt <= 30 * DAY) delivered.push(it); else olderDelivered++;
    } else if (it.awaiting.length) waiting.push(it);
    else if (o.status === "Payment confirmed" || o.status === "Equipment allocated") ready.push(it);
    else unpaid.push(it);
  }
  ready.sort((a, b) => a.o.acceptedAt - b.o.acceptedAt);
  waiting.sort((a, b) => a.o.acceptedAt - b.o.acceptedAt);
  transit.sort((a, b) => (b.o.dispatchedAt ?? 0) - (a.o.dispatchedAt ?? 0));
  delivered.sort((a, b) => (b.o.deliveredAt ?? 0) - (a.o.deliveredAt ?? 0));
  return { ready, waiting, transit, delivered, unpaid, olderDelivered };
}

/** Incoming shipments with their reserved and unallocated units. */
export function intakes(s: MMState) {
  return s.shipments.map((sh) => {
    const units = sh.lines.reduce((n, l) => n + l.units, 0);
    const reserved = s.reservations.filter((r) => r.shipmentId === sh.id).reduce((n, r) => n + r.units, 0);
    return { sh, units, reserved, free: units - reserved };
  });
}

/* ── wording ──────────────────────────────────────────────────────────────── */

/** 15% · 12.5% */
export const mk = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1)) + "%";

export function waitText(ms: number): string {
  if (ms < HOUR) return "Under an hour";
  if (ms < DAY) return Math.round(ms / HOUR) + " h";
  const d = Math.round((ms / DAY) * 10) / 10;
  return d === 1 ? "1 day" : (Number.isInteger(d) ? d.toFixed(0) : d.toFixed(1)) + " days";
}

export function hoursText(h: number): string {
  if (h <= 0) return "No replies yet";
  if (h < 48) return Math.round(h) + " h";
  return (Math.round((h / 24) * 10) / 10).toFixed(1) + " days";
}

export const machinesText = (v: FreightView) =>
  v.machines.map((m) => (m.qty > 1 ? m.qty + " × " : "") + m.p.name).join(", ");

/** "Bratislava 821 08, Slovakia" → ["Bratislava 821 08", "Slovakia"] */
export function splitPlace(d: string): [string, string] {
  const i = d.lastIndexOf(",");
  return i < 0 ? [d, ""] : [d.slice(0, i).trim(), d.slice(i + 1).trim()];
}

export const carrierShort = (sp?: Supplier) => (sp ? sp.name.split(" ")[0] : "Carrier");
export const regionShort = (sp?: Supplier) => (sp ? sp.region.replace(/ shipments$/i, "").replace(/^European$/i, "Europe") : "");

/** "Flex series", but "X-Series" stays as it is. */
export const seriesText = (series: string) => (/series$/i.test(series) ? series : series + " series");
