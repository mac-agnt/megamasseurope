import type { Approval, MMState } from "./types";
import { PRODUCT_BY_ID } from "./catalog";
import { customerOf, freightCharge, invoiceStatus, ix, openApprovals, outstanding, quoteEquipment, quoteTotal, stockOf, daysOverdue, headline, lateRates, overdueInvoices, quotesForApproval, confirmedSales, unanswered, eurEq } from "./select";
import { money, moneyShort, since, time } from "./format";

/* Adapters from the Mega Mass store to the data shapes Pulse's own template
   views already render (Work approvals viewer, Home task widget, notifications,
   activity widget). Keeps PulseLogic edits small and the numbers live. */

const GREEN = "var(--ok)", AMBER = "var(--warn)", RED = "var(--bad)", LIME = "var(--accent)", NEUTRAL = "var(--neutral)";
const DAY = 86_400_000;

type Step = { who: string; state: string; dot: string };
export type LegacyApproval = {
  id: string; title: string; subject: string; age: string; status: string; steps: Step[]; mmId: string;
  work: Record<string, unknown>;
};

function quoteWork(s: MMState, a: Approval) {
  const q = ix(s).quote[a.recordId];
  const f = q.freightId ? ix(s).freight[q.freightId] : undefined;
  const c = customerOf(s, q.customerId);
  const e = ix(s).enquiry[q.enquiryId];
  const cur = q.currency;
  const fc = freightCharge(f);
  const flex = q.lines.filter((l) => stockOf(s, ix(s).product[l.productId]).available < l.qty).map((l) => PRODUCT_BY_ID[l.productId].name);
  const grew = e?.initialLines && e.initialLines.length < q.lines.length;
  return {
    kind: "table", label: "CUSTOMER QUOTATION", viewLabel: "View quote",
    headline: q.id + " · " + c.name, sub: c.city + " · " + cur + " · valid " + q.validDays + " days · VAT treatment pending confirmation",
    cols: ["Machine", "Qty", "Unit", "Total"], align: ["left", "right", "right", "right"],
    rows: q.lines.map((l) => [PRODUCT_BY_ID[l.productId].name, String(l.qty), money(l.unitPrice, cur), money(l.unitPrice * l.qty, cur)]),
    totals: [["Equipment", money(quoteEquipment(q), cur)], ["Freight (incl. markup)", fc === null ? "Pending" : money(fc, cur)], ["Total excl. VAT", money(quoteTotal(s, q), cur)]],
    thinking: [
      ["Read the enquiry", grew ? "Started as one machine; customer expanded it to " + q.lines.length : e?.message ? "Matched to " + (e.id || "the enquiry") : "Built from the enquiry"],
      ["Priced from the " + cur + " price book", money(quoteEquipment(q), cur) + ", no overrides"],
      ["Got the carrier rate", f?.carrierQuote ? s.suppliers.find((x) => x.id === f.carrierId)!.name + " " + money(f.carrierQuote.cost, cur) + ", ref " + f.carrierQuote.ref : "No rate yet"],
      ["Applied the markup", f ? f.markupPct + "% = " + money((fc ?? 0) - (f.carrierQuote?.cost ?? 0), cur) : "Not applied"],
      ["Checked stock", flex.length ? flex.join(", ") + " depend on the Flex intake (late November, unconfirmed)" : "All lines available from warehouse stock"],
    ],
    tools: [["price_book.read", "read"], ["carrier_email.read", "read"], ["gmail.draft", "write"], ["quote.send", "external"]],
    risk: flex.length ? "Delivery date depends on the Flex intake arriving. Quote notes say it will be confirmed on receipt." : "None found. Price matches the price book.",
  };
}

function legacyWork(s: MMState, a: Approval): Record<string, unknown> {
  if (a.kind === "Customer quotation") return quoteWork(s, a);
  const c = customerOf(s, a.customerId);
  if (a.kind === "Price review") {
    const q = ix(s).quote[a.recordId];
    return {
      kind: "doc", label: "PRICING QUESTION", viewLabel: "Read question", headline: q.id + " · " + c.name,
      sub: "Quote sent at list price · " + money(quoteTotal(s, q), q.currency) + " excl. VAT",
      doc: [["What they asked", q.overrideRequested || "Asked about volume pricing."],
        ["Where it stands", "Ten T-Bar Linear Rows at the private EUR price, freight €2,035 including a 10% markup. No discount applied."],
        ["Options", "Hold the quoted price and reply, or set a manual unit price in the quote builder. Any override needs your approval."],
        ["Why it matters", "A distributor reordering every quarter means fewer, larger orders and far less admin than ten separate buyers."]],
      totals: [["Equipment", money(quoteEquipment(q), q.currency)], ["Freight", money(quoteTotal(s, q) - quoteEquipment(q), q.currency)], ["Quoted total", money(quoteTotal(s, q), q.currency)]],
      thinking: [["Read the reply", "Daan Visser asked about flexibility at this volume"], ["Checked the rules", "No automatic wholesale discounts in the price book"], ["Checked stock", "Ten available from the 14 in County Derry"]],
      tools: [["quote.read", "read"], ["gmail.draft", "write"]],
      risk: "Any discount sets a precedent for other distributors.",
    };
  }
  if (a.kind === "Freight request") {
    const f = ix(s).freight[a.recordId];
    const carrier = s.suppliers.find((x) => x.id === f.carrierId)!;
    const waited = f.requestedAt ? Math.floor((s.now - f.requestedAt) / DAY) : 0;
    return {
      kind: "table", label: f.status === "Awaiting rate" ? "CARRIER CHASE" : "CARRIER RATE REQUEST", viewLabel: "View request",
      headline: f.id + " · " + carrier.name, sub: "County Derry warehouse to " + f.destination,
      cols: ["Machine", "Qty", "Weight", "Dimensions"], align: ["left", "right", "right", "right"],
      rows: f.lines.map((l) => { const p = PRODUCT_BY_ID[l.productId]; return [p.name, String(l.qty), p.weightKg ? p.weightKg + " kg" : "TBC", p.dims || "TBC"]; }),
      totals: [["Carrier", carrier.name], ["Status", f.status === "Awaiting rate" ? "No reply for " + waited + " days" : "Drafted, not sent"], ["Customer", c.name]],
      thinking: [["Built from the quote", f.quoteId || "Quote"], ["Checked the specs", f.missing.length ? f.missing.join("; ") : "Weights and dimensions on file"],
        ["Chose the carrier", carrier.name + " for " + carrier.region.toLowerCase()]],
      tools: [["gmail.draft", "write"], ["gmail.send", "external"]],
      risk: f.status === "Awaiting rate" ? "The quote cannot go out until the rate arrives." : f.missing.length ? "Missing details are flagged in the request, not guessed." : "None.",
    };
  }
  const inv = ix(s).invoice[a.recordId];
  return {
    kind: "table", label: "PAYMENT FOLLOW-UP", viewLabel: "View invoice", headline: inv.id + " · " + c.name,
    sub: "FreshBooks invoice · " + daysOverdue(s, inv) + " days overdue",
    cols: ["Invoice", "Amount", "Outstanding", "Status"], align: ["left", "right", "right", "right"],
    rows: [[inv.id, money(inv.amount, inv.currency), money(outstanding(s, inv), inv.currency), invoiceStatus(s, inv)]],
    totals: [["Due", new Date(inv.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })], ["Days overdue", String(daysOverdue(s, inv))]],
    thinking: [["Read FreshBooks", "No payment recorded against " + inv.id], ["Checked correspondence", "No dispute on file"], ["Chose the tone", "Polite payment-status email"]],
    tools: [["freshbooks.read", "read"], ["gmail.draft", "write"], ["gmail.send", "external"]],
    risk: "None. Nothing is sent until you approve it.",
  };
}

export function legacyApprovals(s: MMState): LegacyApproval[] {
  const open = openApprovals(s).map((a) => ({ a, done: false }));
  const decided = s.approvals.filter((a) => a.status === "Approved").slice(-6).map((a) => ({ a, done: true }));
  return open.concat(decided).map(({ a, done }) => {
    const c = customerOf(s, a.customerId);
    const value = a.amount === null ? "" : " · " + money(a.amount, a.currency);
    return {
      id: a.id, mmId: a.id, title: a.action + value, subject: c.name + " · prepared by " + a.preparedBy,
      age: since(a.createdAt, s.now).replace(" ago", ""), status: done ? "approved" : "awaiting you",
      steps: [{ who: a.preparedBy, state: "prepared " + time(a.createdAt), dot: GREEN }, { who: "Niall", state: done ? "approved" : "pending", dot: done ? GREEN : AMBER }],
      work: legacyWork(s, a),
    };
  });
}

export function legacyTasks(s: MMState) {
  return s.tasks.filter((t) => t.status !== "Done").map((t) => {
    const dueIn = Math.floor((t.due - s.now) / DAY);
    const due = dueIn <= 0 ? "Today" : dueIn === 1 ? "Tomorrow" : new Date(t.due).toLocaleDateString("en-GB", { weekday: "short" });
    const who = t.owner === "Niall" ? "NI" : t.owner === "Natalie" ? "NA" : "AI";
    const queue = [t.owner === "Niall" ? "mine" : "team"].concat(dueIn <= 0 ? ["overdue"] : dueIn <= 7 ? ["upcoming"] : []);
    return { id: t.id, title: t.title, due, who, queue, subject: t.recordId, priority: t.priority === "High" ? "high" : t.priority === "Low" ? "low" : "normal", late: false };
  });
}

export function legacyNotifications(s: MMState) {
  return s.activity.filter((e) => e.actorKind !== "system" || e.attention).slice(0, 6).map((e) => ({
    dot: e.attention ? RED : e.actorKind === "agent" ? LIME : NEUTRAL,
    text: e.title + ". " + e.detail,
    event: (e.source + "." + e.recordKind).toLowerCase(),
    channel: e.source === "Agent" ? "Pulse" : e.source,
    meta: since(e.at, Date.now()).replace(" ago", ""),
  }));
}

export function legacyActivity(s: MMState) {
  return s.activity.slice(0, 5).map((e) => ({
    who: e.actor, what: e.title.charAt(0).toLowerCase() + e.title.slice(1),
    event: (e.source + "." + e.recordKind).toLowerCase(), when: since(e.at, Date.now()).replace(" ago", ""),
    dot: e.attention ? RED : e.actorKind === "agent" ? LIME : e.actorKind === "person" ? GREEN : NEUTRAL,
  }));
}

/* Dashboard KPI tiles (same shape as KPI_DEFS in data.js), live from the store. */
export function kpiDefs(s: MMState) {
  const h = headline(s);
  const fresh = unanswered(s).filter((e) => s.now - e.receivedAt < DAY).length;
  const quoteValue = quotesForApproval(s).reduce((n, q) => n + eurEq(quoteTotal(s, q), q.currency), 0);
  const oldest = overdueInvoices(s).reduce((m, i) => Math.max(m, daysOverdue(s, i)), 0);
  return {
    unanswered: { label: "Unanswered enquiries", value: String(h.unanswered), delta: fresh + " today", dir: "down", hint: "no reply yet", hero: true },
    quotes: { label: "Quotes awaiting approval", value: String(h.quotesAwaiting), delta: moneyShort(quoteValue), dir: "up", hint: "ready for you" },
    freight: { label: "Freight rates outstanding", value: String(h.freightOutstanding), delta: lateRates(s).length + " late", dir: "down", hint: "waiting on carriers" },
    overdue: { label: "Overdue invoices", value: String(h.overdueCount), delta: h.promises + " promised", dir: "down", hint: "FreshBooks" },
    overdueValue: { label: "Overdue value", value: money(h.overdueValue), delta: "oldest " + oldest + "d", dir: "down", hint: "EUR excl. VAT" },
    followups: { label: "Follow-ups to review", value: String(h.followUps), delta: "auto-send off", dir: "up", hint: "drafted, not sent" },
    sales: { label: "Confirmed sales", value: moneyShort(confirmedSales(s)), delta: s.orders.length + " orders", dir: "up", hint: "EUR eq." },
  } as Record<string, { label: string; value: string; delta: string; dir: string; hint: string; hero?: boolean }>;
}
