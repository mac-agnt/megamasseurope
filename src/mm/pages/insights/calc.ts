import type { Country, Customer, Enquiry, EnquiryStage, Invoice, Line, MMState, Order, Product, Quote } from "../../types";
import type { Tone } from "../../ui";
import {
  GBP_TO_EUR, MARKETS, cashCollected, confirmedSales, enquiriesByDay, enquiryCurrency, enquiryValue, eurEq, funnel,
  invoiceStatus, invoicedTotal, ix, markets, orderValue, outstanding, overdueInvoices, productDemand, quoteEquipment,
  quoteTotal, revenueAtRisk, stockOf, unanswered,
} from "../../select";
import { countryName } from "../../format";
import { SKU } from "../../catalog";

/* Insights maths. Everything here is derived from the records through the shared
   selectors; nothing is typed in. EUR and GBP only meet through eurEq. */

export const DAY = 86_400_000;
export const EQ_NOTE = "EUR eq. at demo rate £1 = €" + GBP_TO_EUR.toFixed(2);

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const unitsOf = (lines: { qty: number }[]) => lines.reduce((n, l) => n + l.qty, 0);
export const share = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);
export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const a = xs.slice().sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);

export const isWholesale = (c: Customer) => c.type === "Wholesale distributor" || c.type === "Reseller";
export const enqEq = (s: MMState, e: Enquiry) => eurEq(enquiryValue(s, e), enquiryCurrency(s, e));
export const quoteEq = (s: MMState, q: Quote) => eurEq(quoteTotal(s, q), q.currency);
export const orderEq = (o: Order) => eurEq(orderValue(o), o.currency);
export const owedEq = (s: MMState, i: Invoice) => eurEq(outstanding(s, i), i.currency);

/** "T-Bar Linear Row" or "2 × T-Bar Linear Row, Swing Squat Pro" */
export function linesText(s: MMState, lines: Line[]): string {
  const P = ix(s).product;
  return lines.map((l) => (l.qty > 1 ? l.qty + " × " : "") + (P[l.productId]?.name ?? l.productId)).join(", ");
}

/** Days between two timestamps, one decimal. */
export const daysBetween = (from: number, to: number) => Math.max(0, (to - from) / DAY);
export function fmtDays(d: number): string {
  if (d < 1) return "under 1 day";
  const t = d.toFixed(1).replace(/\.0$/, "");
  return t + (t === "1" ? " day" : " days");
}

/* ── executive ────────────────────────────────────────────────────────────── */

export function executiveStats(s: MMState) {
  const days = enquiriesByDay(s, 14);
  const last7 = sum(days.slice(-7).map((d) => d.n));
  const prior7 = sum(days.slice(0, 7).map((d) => d.n));
  const last14 = sum(days.map((d) => d.n));
  const total = s.enquiries.length;
  const replied = s.enquiries.filter((e) => e.replied).length;
  const quoted = funnel(s).find((f) => f.key === "quoted")?.n ?? 0;
  const accepted = s.quotes.filter((q) => q.status === "Accepted").length;
  const decided = s.quotes.filter((q) => q.status === "Accepted" || q.status === "Declined" || q.status === "Expired").length;
  const overdueList = overdueInvoices(s);
  const owed = sum(s.invoices.map((i) => owedEq(s, i)));
  const overdue = sum(overdueList.map((i) => owedEq(s, i)));
  const peak = days.reduce((best, d, i) => (d.n > days[best].n ? i : best), 0);
  return {
    days, last7, prior7, last14, total, replied, quoted, accepted, decided, peak,
    confirmed: confirmedSales(s), orders: s.orders.length,
    invoiced: invoicedTotal(s), invoices: s.invoices.length,
    collected: cashCollected(s), payments: s.payments.length,
    owed, overdue, overdueCount: overdueList.length,
    openInvoices: s.invoices.filter((i) => outstanding(s, i) > 0).length,
    notInvoiced: s.orders.filter((o) => !o.invoiceId).length,
  };
}

/* ── funnel ───────────────────────────────────────────────────────────────── */

export type StageKey = "enquiry" | "qualified" | "quoted" | "accepted" | "invoiced" | "paid";
const PATH: EnquiryStage[] = ["New", "Qualified", "Freight Requested", "Quote Ready", "Quote Sent", "Won"];
const OPEN_STAGES: EnquiryStage[] = ["New", "Qualified", "Freight Requested", "Quote Ready", "Quote Sent"];
export const isOpen = (e: Enquiry) => OPEN_STAGES.includes(e.stage);

/** Same rule the funnel selector uses: a lost enquiry got as far as a sent quote. */
export function reached(e: Enquiry, k: EnquiryStage): boolean {
  if (e.stage === "Lost") return k !== "Won" && PATH.indexOf(k) <= PATH.indexOf("Quote Sent");
  return PATH.indexOf(e.stage) >= PATH.indexOf(k);
}

export type StageRecords =
  | { kind: "enquiry"; rows: Enquiry[] }
  | { kind: "quote"; rows: Quote[] }
  | { kind: "order"; rows: Order[] }
  | { kind: "invoice"; rows: Invoice[] };

function invoicedOrders(s: MMState): Invoice[] {
  const X = ix(s);
  return s.orders.map((o) => (o.invoiceId ? X.invoice[o.invoiceId] : undefined)).filter((i): i is Invoice => !!i);
}

export function stageRecords(s: MMState, key: StageKey): StageRecords {
  const X = ix(s);
  switch (key) {
    case "qualified":
      return { kind: "enquiry", rows: s.enquiries.filter((e) => reached(e, "Qualified")).sort((a, b) => b.receivedAt - a.receivedAt) };
    case "quoted":
      return { kind: "quote", rows: s.enquiries.filter((e) => reached(e, "Quote Sent"))
        .map((e) => (e.quoteId ? X.quote[e.quoteId] : undefined)).filter((q): q is Quote => !!q)
        .sort((a, b) => (b.sentAt ?? b.updatedAt) - (a.sentAt ?? a.updatedAt)) };
    case "accepted":
      return { kind: "order", rows: s.orders.slice().sort((a, b) => b.acceptedAt - a.acceptedAt) };
    case "invoiced":
      return { kind: "invoice", rows: invoicedOrders(s).sort((a, b) => b.issuedAt - a.issuedAt) };
    case "paid":
      return { kind: "invoice", rows: invoicedOrders(s).filter((i) => invoiceStatus(s, i) === "Paid").sort((a, b) => b.issuedAt - a.issuedAt) };
    default:
      return { kind: "enquiry", rows: s.enquiries.slice().sort((a, b) => b.receivedAt - a.receivedAt) };
  }
}

export type HeldGroup = { label: string; n: number; value: number; money: "pipeline" | "owed" | "order"; go: [string, string]; tone: Tone };

/** What stopped at a stage without reaching the next one, grouped by where it sits now, with the module that moves it on. */
export function heldUp(s: MMState, key: StageKey): HeldGroup[] {
  const group = (label: string, list: Enquiry[], go: [string, string], tone: Tone): HeldGroup =>
    ({ label, n: list.length, value: sum(list.map((e) => enqEq(s, e))), money: "pipeline", go, tone });
  if (key === "enquiry") {
    const stuck = s.enquiries.filter((e) => !reached(e, "Qualified"));
    return [
      group("Unanswered", stuck.filter((e) => !e.replied), ["Enquiries", "inbox"], "warn"),
      group("Answered, waiting on the customer", stuck.filter((e) => e.replied), ["Enquiries", "followups"], "info"),
    ];
  }
  if (key === "qualified") {
    const stuck = s.enquiries.filter((e) => reached(e, "Qualified") && !reached(e, "Quote Sent"));
    return [
      group("Carrier request waiting for approval", stuck.filter((e) => e.stage === "Qualified"), ["Freight", "requests"], "accent"),
      group("Waiting on a carrier rate", stuck.filter((e) => e.stage === "Freight Requested"), ["Freight", "awaiting"], "warn"),
      group("Quote ready, waiting for approval", stuck.filter((e) => e.stage === "Quote Ready"), ["Quotes", "approvals"], "info"),
    ];
  }
  if (key === "quoted") {
    const stuck = s.enquiries.filter((e) => reached(e, "Quote Sent") && !reached(e, "Won"));
    return [
      group("Awaiting the customer's decision", stuck.filter((e) => e.stage === "Quote Sent"), ["Quotes", "sent"], "info"),
      group("Lost: declined or expired", stuck.filter((e) => e.stage === "Lost"), ["Enquiries", "pipeline"], "neutral"),
    ];
  }
  if (key === "accepted") {
    const stuck = s.orders.filter((o) => !o.invoiceId);
    return [{ label: "Accepted, invoice not raised yet", n: stuck.length, value: sum(stuck.map(orderEq)), money: "order", go: ["Orders", "confirmed"], tone: "warn" }];
  }
  if (key === "invoiced") {
    const open = invoicedOrders(s).filter((i) => invoiceStatus(s, i) !== "Paid");
    const by = (st: string) => open.filter((i) => invoiceStatus(s, i) === st);
    const g = (label: string, st: string, go: [string, string], tone: Tone): HeldGroup =>
      ({ label, n: by(st).length, value: sum(by(st).map((i) => owedEq(s, i))), money: "owed", go, tone });
    return [g("Overdue", "Overdue", ["Orders", "invoices"], "bad"), g("Sent, not yet due", "Sent", ["Orders", "invoices"], "info"), g("Part paid", "Part paid", ["Orders", "payments"], "warn")];
  }
  return [];
}

export function funnelSummary(s: MMState) {
  const steps = funnel(s);
  const first = steps[0]?.n ?? 0;
  const last = steps[steps.length - 1]?.n ?? 0;
  let weakest = 1;
  for (let i = 1; i < steps.length; i++) {
    const r = steps[i - 1].n ? steps[i].n / steps[i - 1].n : 1;
    const w = steps[weakest - 1].n ? steps[weakest].n / steps[weakest - 1].n : 1;
    if (r < w) weakest = i;
  }
  const open = s.enquiries.filter(isOpen);
  return {
    steps, overall: share(last, first), weakest,
    weakestRate: steps[weakest - 1]?.n ? share(steps[weakest].n, steps[weakest - 1].n) : 0,
    openCount: open.length, openValue: sum(open.map((e) => enqEq(s, e))),
  };
}

/* ── markets ──────────────────────────────────────────────────────────────── */

export type MarketKey = Country | "Other";
export const CONTINENTAL: MarketKey[] = ["NL", "IT", "FR", "DE", "ES"];
export const marketOf = (c: Country): MarketKey => (MARKETS.includes(c) ? c : "Other");
export const marketName = (k: MarketKey) => (k === "Other" ? "Other markets" : countryName(k));

export function marketTable(s: MMState) {
  const X = ix(s);
  const rows = markets(s);
  return rows.map((r) => {
    const enq = s.enquiries.filter((e) => marketOf(X.customer[e.customerId].country) === r.key);
    const trade = enq.filter((e) => isWholesale(X.customer[e.customerId]));
    const countries = Array.from(new Set(enq.map((e) => X.customer[e.customerId].country)));
    return { ...r, key: r.key as MarketKey, name: marketName(r.key), tradeEnquiries: trade.length, units: sum(enq.map((e) => unitsOf(e.lines))), countries };
  });
}
export type MarketRow = ReturnType<typeof marketTable>[number];

/** Leading group on a metric: the top two when they clear the rest, else the top one, else everyone level at the top. */
export function leaders<T>(rows: T[], metric: (r: T) => number): T[] {
  const a = rows.slice().sort((x, y) => metric(y) - metric(x));
  if (a.length < 2) return a;
  if (metric(a[0]) <= 0) return [];
  if (a.length === 2 || metric(a[1]) > metric(a[2])) return a.slice(0, 2).filter((r) => metric(r) > 0);
  if (metric(a[0]) > metric(a[1])) return a.slice(0, 1);
  return a.filter((r) => metric(r) === metric(a[0]));
}

export const joinNames = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);

export function marketDetail(s: MMState, k: MarketKey) {
  const X = ix(s);
  const mine = (customerId: string) => marketOf(X.customer[customerId].country) === k;
  const units: Record<string, number> = {};
  for (const e of s.enquiries) if (mine(e.customerId)) for (const l of e.lines) units[l.productId] = (units[l.productId] || 0) + l.qty;
  return {
    orders: s.orders.filter((o) => mine(o.customerId)).sort((a, b) => b.acceptedAt - a.acceptedAt),
    open: s.enquiries.filter((e) => mine(e.customerId) && isOpen(e)).sort((a, b) => enqEq(s, b) - enqEq(s, a)),
    lost: s.enquiries.filter((e) => mine(e.customerId) && e.stage === "Lost").length,
    demand: Object.entries(units).map(([id, n]) => ({ product: X.product[id], units: n })).filter((d) => !!d.product)
      .sort((a, b) => b.units - a.units || a.product.name.localeCompare(b.product.name)),
  };
}

/* ── sales ────────────────────────────────────────────────────────────────── */

const READY_OR_LATER = new Set<Quote["status"]>(["Ready for Review", "Approved", "Sent", "Accepted", "Declined", "Expired"]);
export const RESPONSE_BUCKETS = [
  { label: "<1d", lo: 0, hi: 1 }, { label: "1-2d", lo: 1, hi: 2 }, { label: "2-3d", lo: 2, hi: 3 }, { label: "3-5d", lo: 3, hi: 5 },
  { label: "5-7d", lo: 5, hi: 7 }, { label: "7-10d", lo: 7, hi: 10 }, { label: "10d+", lo: 10, hi: Infinity },
];
const bucketise = (xs: number[]) => RESPONSE_BUCKETS.map((b) => ({ label: b.label, value: xs.filter((d) => d >= b.lo && d < b.hi).length }));

export function salesStats(s: MMState) {
  const X = ix(s);
  const sold: Record<string, number> = {};
  for (const o of s.orders) for (const l of o.lines) sold[l.productId] = (sold[l.productId] || 0) + l.qty;
  const best = s.products.map((p) => ({ product: p, units: sold[p.id] || 0, orders: s.orders.filter((o) => o.lines.some((l) => l.productId === p.id)).length }))
    .filter((x) => x.units > 0).sort((a, b) => b.units - a.units || a.product.name.localeCompare(b.product.name));
  const unitsSold = sum(Object.values(sold));

  const tbar: Product | undefined = X.product[SKU.tbar];
  const demand = productDemand(s);
  const tbarDemand = demand.find((d) => d.product.id === SKU.tbar);
  const requestedUnits = sum(s.enquiries.map((e) => unitsOf(e.lines)));
  const requestLines = sum(s.enquiries.map((e) => e.lines.length));
  const tbarEnquiries = s.enquiries.filter((e) => e.lines.some((l) => l.productId === SKU.tbar)).length;
  const tbarOnly = s.enquiries.filter((e) => e.lines.length > 0 && e.lines.every((l) => l.productId === SKU.tbar)).length;

  const single = s.orders.filter((o) => unitsOf(o.lines) === 1);
  const perOrder = [1, 2, 3, 4, 5].map((k) => ({ label: k === 5 ? "5+" : String(k),
    value: s.orders.filter((o) => (k === 5 ? unitsOf(o.lines) >= 5 : unitsOf(o.lines) === k)).length }));
  const multi = s.orders.filter((o) => unitsOf(o.lines) > 1);

  const tradeEnq = s.enquiries.filter((e) => isWholesale(X.customer[e.customerId]));
  const tradeOrders = s.orders.filter((o) => isWholesale(X.customer[o.customerId]));

  const toReady = s.quotes.filter((q) => READY_OR_LATER.has(q.status) && X.enquiry[q.enquiryId])
    .map((q) => daysBetween(X.enquiry[q.enquiryId].receivedAt, q.createdAt));
  const toSent = s.quotes.filter((q) => q.sentAt && X.enquiry[q.enquiryId])
    .map((q) => daysBetween(X.enquiry[q.enquiryId].receivedAt, q.sentAt as number));
  /* How much of the enquiry-to-quote time was spent waiting on a carrier rate. */
  const legs = s.quotes.filter((q) => q.sentAt && X.enquiry[q.enquiryId] && q.freightId).map((q) => {
    const f = X.freight[q.freightId as string];
    const total = daysBetween(X.enquiry[q.enquiryId].receivedAt, q.sentAt as number);
    const wait = f?.requestedAt && f.carrierQuote ? daysBetween(f.requestedAt, f.carrierQuote.receivedAt) : null;
    return { total, wait };
  }).filter((l): l is { total: number; wait: number } => l.wait !== null);

  return {
    best, unitsSold,
    tbar, tbarEnquiries, tbarOnly, tbarUnits: tbarDemand?.units ?? 0, tbarSold: sold[SKU.tbar] || 0,
    tbarStock: tbar ? stockOf(s, tbar) : null,
    requestedUnits, requestLines, totalEnquiries: s.enquiries.length,
    single: { n: single.length, avg: mean(single.map(orderEq)) }, perOrder,
    multi: { n: multi.length, avg: mean(multi.map(orderEq)), units: sum(multi.map((o) => unitsOf(o.lines))) },
    aov: s.orders.length ? confirmedSales(s) / s.orders.length : 0,
    orders: s.orders.length,
    trade: {
      enquiries: tradeEnq.length, units: sum(tradeEnq.map((e) => unitsOf(e.lines))), open: tradeEnq.filter(isOpen).length,
      share: share(tradeEnq.length, s.enquiries.length),
      orders: tradeOrders.length, orderUnits: sum(tradeOrders.map((o) => unitsOf(o.lines))), revenue: sum(tradeOrders.map(orderEq)),
      openValue: sum(tradeEnq.filter(isOpen).map((e) => enqEq(s, e))),
      list: tradeEnq.filter(isOpen).sort((a, b) => enqEq(s, b) - enqEq(s, a)),
    },
    response: {
      ready: { n: toReady.length, median: median(toReady), mean: mean(toReady), buckets: bucketise(toReady) },
      sent: { n: toSent.length, median: median(toSent), mean: mean(toSent), buckets: bucketise(toSent),
        within2: toSent.filter((d) => d < 2).length },
      carrier: { n: legs.length, avgWait: mean(legs.map((l) => l.wait)), share: share(sum(legs.map((l) => l.wait)), sum(legs.map((l) => l.total))) },
    },
  };
}

/* ── revenue at risk ──────────────────────────────────────────────────────── */

const RISK_STAGES: EnquiryStage[] = ["New", "Qualified", "Freight Requested", "Quote Ready", "Quote Sent"];

export function riskLists(s: MMState) {
  const X = ix(s);
  const totals = revenueAtRisk(s);
  const leads = unanswered(s).slice().sort((a, b) => enqEq(s, b) - enqEq(s, a));
  const cold = s.quotes.filter((q) => q.status === "Sent" && q.sentAt && s.now - q.sentAt > 7 * DAY).sort((a, b) => quoteEq(s, b) - quoteEq(s, a));
  const waitingDays = (q: Quote) => {
    const f = q.freightId ? X.freight[q.freightId] : undefined;
    return f?.requestedAt ? daysBetween(f.requestedAt, s.now) : 0;
  };
  const blocked = s.quotes.filter((q) => q.status === "Awaiting Freight").sort((a, b) => waitingDays(b) - waitingDays(a));
  const big = s.enquiries.filter((e) => RISK_STAGES.includes(e.stage) && enqEq(s, e) >= 10000).sort((a, b) => enqEq(s, b) - enqEq(s, a));
  const overdue = overdueInvoices(s);
  const stale = leads.filter((e) => s.now - e.receivedAt > 2 * DAY);
  const late = blocked.filter((q) => waitingDays(q) > 3);
  const veryCold = cold.filter((q) => q.sentAt && s.now - q.sentAt > 14 * DAY);
  const broken = overdue.filter((i) => i.promise?.broken);
  const firstMoves = [
    { key: "stale", title: "Reply to enquiries waiting over 48 hours", n: stale.length, sub: "Pipeline value, not revenue", value: sum(stale.map((e) => enqEq(s, e))), go: ["Enquiries", "inbox"] as [string, string] },
    { key: "late", title: "Chase carrier rates outstanding over 3 days", n: late.length, sub: "Equipment value held up", value: sum(late.map((q) => eurEq(quoteEquipment(q), q.currency))), go: ["Freight", "awaiting"] as [string, string] },
    { key: "veryCold", title: "Follow up quotes sent over 14 days ago", n: veryCold.length, sub: "Pipeline value, not revenue", value: sum(veryCold.map((q) => quoteEq(s, q))), go: ["Quotes", "sent"] as [string, string] },
    { key: "broken", title: "Call about broken payment promises", n: broken.length, sub: "Owed on overdue invoices", value: sum(broken.map((i) => owedEq(s, i))), go: ["Orders", "invoices"] as [string, string] },
  ].filter((m) => m.n > 0);
  return {
    totals, leads, cold, blocked, big, waitingDays, firstMoves,
    overdue,
    leadsOver48h: leads.filter((e) => s.now - e.receivedAt > 2 * DAY).length,
    blockedLate: blocked.filter((q) => waitingDays(q) > 3).length,
    equipmentEq: (q: Quote) => eurEq(quoteEquipment(q), q.currency),
  };
}
