import type {
  Country, Currency, Customer, Enquiry, EnquiryStage, FreightRequest, Invoice, MMState, Order, Product, Quote,
} from "./types";

/* Everything the UI shows as a number is computed here from the records.
   Nothing is typed in by hand, so an approval anywhere moves every counter. */

const DAY = 86_400_000;

/** Niall's own figure from the 17 Nov call. Historical, not from connected data. */
export const HISTORY = {
  reported: 163,
  window: "Sat 14 to Tue 17 Nov",
  source: "Reported by Niall on the 17 November call",
  note: "Historical reference only. Not drawn from a connected system and not part of the demo dataset.",
};

/** Demo-only conversion used when EUR and GBP are summed together. Labelled wherever used. */
export const GBP_TO_EUR = 1.15;
export const eurEq = (amount: number, cur: Currency) => (cur === "GBP" ? amount * GBP_TO_EUR : amount);

type Index = {
  customer: Record<string, Customer>;
  enquiry: Record<string, Enquiry>;
  quote: Record<string, Quote>;
  freight: Record<string, FreightRequest>;
  invoice: Record<string, Invoice>;
  order: Record<string, Order>;
  product: Record<string, Product>;
  paidByInvoice: Record<string, number>;
};
const cache = new WeakMap<MMState, Index>();
export function ix(s: MMState): Index {
  let x = cache.get(s);
  if (x) return x;
  const by = <T extends { id: string }>(a: T[]) => Object.fromEntries(a.map((r) => [r.id, r])) as Record<string, T>;
  const paidByInvoice: Record<string, number> = {};
  for (const p of s.payments) paidByInvoice[p.invoiceId] = (paidByInvoice[p.invoiceId] || 0) + p.amount;
  x = { customer: by(s.customers), enquiry: by(s.enquiries), quote: by(s.quotes), freight: by(s.freight),
    invoice: by(s.invoices), order: by(s.orders), product: by(s.products), paidByInvoice };
  cache.set(s, x);
  return x;
}

export const customerOf = (s: MMState, id: string) => ix(s).customer[id];
export const contactOf = (s: MMState, c: Customer) => s.contacts.find((x) => x.id === c.contactId)!;
export const productOf = (s: MMState, id: string) => ix(s).product[id];

/* ── money on quotes and freight ─────────────────────────────────────────── */

export function freightCharge(f: FreightRequest | undefined): number | null {
  if (!f) return null;
  if (typeof f.charge === "number") return f.charge;
  if (!f.carrierQuote) return null;
  return Math.round(f.carrierQuote.cost * (1 + f.markupPct / 100));
}
export const markupAmount = (f: FreightRequest) => (freightCharge(f) ?? 0) - (f.carrierQuote?.cost ?? 0);
export const quoteEquipment = (q: Quote) => q.lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
export function quoteFreight(s: MMState, q: Quote): number | null {
  return q.freightId ? freightCharge(ix(s).freight[q.freightId]) : null;
}
export function quoteTotal(s: MMState, q: Quote): number {
  return quoteEquipment(q) + (quoteFreight(s, q) ?? 0);
}
export const hasOverride = (q: Quote) => q.lines.some((l) => l.unitPrice !== l.listPrice);
export const quoteUnits = (q: Quote) => q.lines.reduce((n, l) => n + l.qty, 0);

/* ── invoices ─────────────────────────────────────────────────────────────── */

export const paidOn = (s: MMState, inv: Invoice) => ix(s).paidByInvoice[inv.id] || 0;
export const outstanding = (s: MMState, inv: Invoice) => Math.max(0, inv.amount - paidOn(s, inv));
export function invoiceStatus(s: MMState, inv: Invoice): "Paid" | "Overdue" | "Part paid" | "Sent" {
  const out = outstanding(s, inv);
  if (out <= 0) return "Paid";
  if (inv.dueAt < s.now) return "Overdue";
  return paidOn(s, inv) > 0 ? "Part paid" : "Sent";
}
export const daysOverdue = (s: MMState, inv: Invoice) => Math.max(0, Math.floor((s.now - inv.dueAt) / DAY));
export const overdueInvoices = (s: MMState) => s.invoices.filter((i) => invoiceStatus(s, i) === "Overdue")
  .sort((a, b) => daysOverdue(s, b) - daysOverdue(s, a));

/* ── stock ────────────────────────────────────────────────────────────────── */

export function stockOf(s: MMState, p: Product) {
  const live = s.reservations.filter((r) => r.productId === p.id);
  const reserved = live.filter((r) => r.source === "Warehouse stock").reduce((n, r) => n + r.units, 0);
  const incoming = s.shipments.reduce((n, sh) => n + sh.lines.filter((l) => l.productId === p.id).reduce((m, l) => m + l.units, 0), 0);
  const incomingReserved = live.filter((r) => r.source === "Incoming").reduce((n, r) => n + r.units, 0);
  return { inStock: p.inStock, reserved, available: p.inStock - reserved, incoming, incomingReserved, incomingFree: incoming - incomingReserved };
}

/* ── the headline numbers ─────────────────────────────────────────────────── */

export const unanswered = (s: MMState) => s.enquiries.filter((e) => e.stage === "New" && !e.replied);
export const awaitingCustomer = (s: MMState) => s.enquiries.filter((e) => e.stage === "New" && e.replied);
/** Quotes waiting on Niall. A quote whose approval he put on hold leaves the queue. */
export const quotesForApproval = (s: MMState) => {
  const held = new Set(s.approvals.filter((a) => a.status === "Held").map((a) => a.recordId));
  return s.quotes.filter((q) => q.status === "Ready for Review" && !held.has(q.id));
};
export const freightOutstanding = (s: MMState) => s.freight.filter((f) => f.status === "Awaiting rate");
export const freightToRequest = (s: MMState) => s.freight.filter((f) => f.status === "To request");
export const followUpsToReview = (s: MMState) => s.followUps.filter((f) => f.status === "Awaiting review");
export const openApprovals = (s: MMState) => s.approvals.filter((a) => a.status === "Ready" || a.status === "Needs action")
  .sort((a, b) => (a.pinned ?? 99) - (b.pinned ?? 99) || eurEq(b.amount ?? 0, b.currency) - eurEq(a.amount ?? 0, a.currency));
export const lateRates = (s: MMState) => freightOutstanding(s).filter((f) => f.requestedAt !== null && s.now - f.requestedAt > 3 * DAY);

export function headline(s: MMState) {
  const overdue = overdueInvoices(s);
  return {
    unanswered: unanswered(s).length,
    quotesAwaiting: quotesForApproval(s).length,
    freightOutstanding: freightOutstanding(s).length,
    overdueCount: overdue.length,
    overdueValue: overdue.filter((i) => i.currency === "EUR").reduce((n, i) => n + outstanding(s, i), 0),
    overdueGBP: overdue.filter((i) => i.currency === "GBP").reduce((n, i) => n + outstanding(s, i), 0),
    followUps: followUpsToReview(s).length,
    approvals: openApprovals(s).length,
    promises: s.invoices.filter((i) => i.promise && invoiceStatus(s, i) !== "Paid").length,
  };
}

/* ── pipeline ─────────────────────────────────────────────────────────────── */

export const STAGES: EnquiryStage[] = ["New", "Qualified", "Freight Requested", "Quote Ready", "Quote Sent", "Won", "Lost"];
export function stageCounts(s: MMState): Record<EnquiryStage, number> {
  const o = Object.fromEntries(STAGES.map((k) => [k, 0])) as Record<EnquiryStage, number>;
  for (const e of s.enquiries) o[e.stage]++;
  return o;
}
export function enquiryValue(s: MMState, e: Enquiry): number {
  const q = e.quoteId ? ix(s).quote[e.quoteId] : undefined;
  if (q) return quoteTotal(s, q);
  const cur = ix(s).customer[e.customerId].currency;
  return e.lines.reduce((n, l) => n + (cur === "GBP" ? ix(s).product[l.productId].gbp : ix(s).product[l.productId].eur) * l.qty, 0);
}
export const enquiryCurrency = (s: MMState, e: Enquiry) => ix(s).customer[e.customerId].currency;

/** Funnel from the records: everything that reached a stage or went past it. */
export function funnel(s: MMState) {
  const reached = (e: Enquiry, k: EnquiryStage) => {
    const order: EnquiryStage[] = ["New", "Qualified", "Freight Requested", "Quote Ready", "Quote Sent", "Won"];
    if (e.stage === "Lost") return k === "New" || k === "Qualified" || k === "Freight Requested" || k === "Quote Ready" || k === "Quote Sent";
    return order.indexOf(e.stage) >= order.indexOf(k);
  };
  const enquiries = s.enquiries.length;
  const qualified = s.enquiries.filter((e) => reached(e, "Qualified")).length;
  const quoted = s.enquiries.filter((e) => reached(e, "Quote Sent")).length;
  const accepted = s.orders.length;
  const invoiced = s.orders.filter((o) => o.invoiceId).length;
  const paid = s.orders.filter((o) => o.invoiceId && invoiceStatus(s, ix(s).invoice[o.invoiceId]) === "Paid").length;
  return [
    { key: "enquiry", label: "Website enquiry", n: enquiries },
    { key: "qualified", label: "Qualified", n: qualified },
    { key: "quoted", label: "Quoted", n: quoted },
    { key: "accepted", label: "Accepted", n: accepted },
    { key: "invoiced", label: "Invoiced", n: invoiced },
    { key: "paid", label: "Paid", n: paid },
  ];
}

/* ── sales and markets ────────────────────────────────────────────────────── */

export const orderValue = (o: Order) => o.lines.reduce((n, l) => n + l.unitPrice * l.qty, 0) + o.freightCharge;
export const cashCollected = (s: MMState) => s.payments.reduce((n, p) => n + eurEq(p.amount, p.currency), 0);
export const invoicedTotal = (s: MMState) => s.invoices.reduce((n, i) => n + eurEq(i.amount, i.currency), 0);
export const confirmedSales = (s: MMState) => s.orders.reduce((n, o) => n + eurEq(orderValue(o), o.currency), 0);

export const MARKETS: (Country | "Other")[] = ["GB", "IE", "NL", "IT", "FR", "DE", "ES", "Other"];
export function markets(s: MMState) {
  const keyOf = (c: Country): Country | "Other" => (MARKETS.includes(c) ? c : "Other");
  const rows = MARKETS.map((k) => ({ key: k, enquiries: 0, quotes: 0, won: 0, revenue: 0, wholesale: 0, individual: 0 }));
  const row = (c: Country) => rows.find((r) => r.key === keyOf(c))!;
  for (const e of s.enquiries) {
    const c = ix(s).customer[e.customerId];
    const r = row(c.country);
    r.enquiries++;
    if (e.stage === "Quote Sent" || e.stage === "Won" || e.stage === "Lost") r.quotes++;
  }
  for (const o of s.orders) {
    const c = ix(s).customer[o.customerId];
    const r = row(c.country);
    r.won++;
    r.revenue += eurEq(orderValue(o), o.currency);
    if (c.type === "Wholesale distributor" || c.type === "Reseller") r.wholesale++; else r.individual++;
  }
  return rows.map((r) => ({ ...r, conversion: r.quotes ? (r.won / r.quotes) * 100 : 0, avgDeal: r.won ? r.revenue / r.won : 0 }));
}

/** Machines asked for across every enquiry (units). */
export function productDemand(s: MMState) {
  const n: Record<string, number> = {};
  const enquiries: Record<string, number> = {};
  for (const e of s.enquiries) for (const l of e.lines) {
    n[l.productId] = (n[l.productId] || 0) + l.qty;
    enquiries[l.productId] = (enquiries[l.productId] || 0) + 1;
  }
  return s.products.map((p) => ({ product: p, units: n[p.id] || 0, enquiries: enquiries[p.id] || 0 }))
    .sort((a, b) => b.units - a.units);
}

/** Enquiries received per day for the last `days` days, oldest first. */
export function enquiriesByDay(s: MMState, daysBack = 14) {
  const start = new Date(s.now); start.setHours(0, 0, 0, 0);
  const out: { day: number; label: string; n: number }[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const from = start.getTime() - i * DAY, to = from + DAY;
    out.push({ day: from, label: new Date(from).toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2),
      n: s.enquiries.filter((e) => e.receivedAt >= from && e.receivedAt < to).length });
  }
  return out;
}

export function revenueAtRisk(s: MMState) {
  const sumEnq = (list: Enquiry[]) => list.reduce((n, e) => n + eurEq(enquiryValue(s, e), enquiryCurrency(s, e)), 0);
  const cold = s.quotes.filter((q) => q.status === "Sent" && q.sentAt && s.now - q.sentAt > 7 * DAY);
  const blocked = s.quotes.filter((q) => q.status === "Awaiting Freight");
  const overdue = overdueInvoices(s);
  const big = s.enquiries.filter((e) => ["New", "Qualified", "Freight Requested", "Quote Ready", "Quote Sent"].includes(e.stage)
    && eurEq(enquiryValue(s, e), enquiryCurrency(s, e)) >= 10000);
  return {
    unanswered: { n: unanswered(s).length, value: sumEnq(unanswered(s)) },
    cold: { n: cold.length, value: cold.reduce((n, q) => n + eurEq(quoteTotal(s, q), q.currency), 0) },
    overdue: { n: overdue.length, value: overdue.reduce((n, i) => n + eurEq(outstanding(s, i), i.currency), 0) },
    freightBlocked: { n: blocked.length, value: blocked.reduce((n, q) => n + eurEq(quoteEquipment(q), q.currency), 0) },
    highValue: { n: big.length, value: sumEnq(big) },
  };
}

export const avgMarkup = (s: MMState) => {
  const xs = s.freight.filter((f) => f.carrierQuote && f.status !== "To request");
  return xs.length ? xs.reduce((n, f) => n + f.markupPct, 0) / xs.length : 0;
};
export function carrierStats(s: MMState, carrierId: string) {
  const xs = s.freight.filter((f) => f.carrierId === carrierId && f.carrierQuote && f.requestedAt);
  const hrs = xs.map((f) => (f.carrierQuote!.receivedAt - f.requestedAt!) / 3600_000).filter((h) => h > 0);
  const waiting = s.freight.filter((f) => f.carrierId === carrierId && f.status === "Awaiting rate");
  return { replied: hrs.length, avgHours: hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0, waiting: waiting.length,
    late: waiting.filter((f) => f.requestedAt !== null && s.now - f.requestedAt > 3 * DAY).length };
}

/** Everything linked to a customer, for the record view and timelines. */
export function customerGraph(s: MMState, customerId: string) {
  return {
    enquiries: s.enquiries.filter((e) => e.customerId === customerId),
    quotes: s.quotes.filter((q) => q.customerId === customerId),
    freight: s.freight.filter((f) => f.customerId === customerId),
    orders: s.orders.filter((o) => o.customerId === customerId),
    invoices: s.invoices.filter((i) => i.customerId === customerId),
    emails: s.emails.filter((m) => m.customerId === customerId).sort((a, b) => a.at - b.at),
    activity: s.activity.filter((a) => a.customerId === customerId),
    followUps: s.followUps.filter((f) => f.customerId === customerId),
    approvals: s.approvals.filter((a) => a.customerId === customerId),
  };
}
