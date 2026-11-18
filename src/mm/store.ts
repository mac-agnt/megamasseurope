import { useSyncExternalStore } from "react";
import { createSeed, freightBody } from "./seed";
import { PRODUCT_BY_ID } from "./catalog";
import { contactOf, customerOf, freightCharge, ix, outstanding, quoteTotal } from "./select";
import { money } from "./format";
import type {
  ActivityEvent, AgentId, AgentRun, Approval, MMState, PanelRef, Quote, QuoteLine, RecordKind,
} from "./types";

/* One shared, in-memory store for the demo. Every action is local and
   simulated: nothing is emailed, nothing reaches FreshBooks or a carrier. */

let state: MMState = createSeed();
const listeners = new Set<() => void>();

export const mm = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
  set(update: (s: MMState) => Partial<MMState>) {
    state = { ...state, ...update(state) };
    listeners.forEach((l) => l());
  },
};

/** The whole state. Components derive what they need with select.ts. */
export function useMM(): MMState {
  return useSyncExternalStore(mm.subscribe, mm.get, mm.get);
}

/* Navigation lives in PulseLogic; it registers these on mount. */
export const bridge = {
  go: (_page: string, _tab?: string) => {},
  ask: (_q: string) => {},
};
export const go = (page: string, tab?: string) => bridge.go(page, tab);

/* ── small internals ──────────────────────────────────────────────────────── */

const now = () => Date.now();
let tid = 0;

/** Next free number in a prefixed id series, e.g. FB-1064 -> FB-1065. */
function nextId(ids: string[], prefix: string): string {
  const max = ids.filter((i) => i.startsWith(prefix)).reduce((m, i) => Math.max(m, parseInt(i.slice(prefix.length), 10) || 0), 0);
  return prefix + (max + 1);
}

function evt(s: MMState, e: Omit<ActivityEvent, "id" | "at"> & { at?: number }): ActivityEvent {
  return { id: "AC-L" + (s.seq + 1) + "-" + Math.round(Math.random() * 1e6), at: e.at ?? now(), ...e };
}
function agentRun(s: MMState, r: Omit<AgentRun, "id" | "at">): AgentRun {
  return { id: "RN-L" + (s.seq + 1) + "-" + Math.round(Math.random() * 1e6), at: now(), ...r };
}

export function toast(text: string, sub?: string) {
  const id = ++tid;
  mm.set((s) => ({ toasts: s.toasts.concat([{ id, text, sub }]).slice(-3) }));
  setTimeout(() => mm.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
}

const SIM = "Simulated in this demo: nothing was sent.";

/* ── panel ────────────────────────────────────────────────────────────────── */

export function openPanel(kind: RecordKind, id: string) { mm.set(() => ({ panel: { kind, id } as PanelRef })); }
export function closePanel() { mm.set(() => ({ panel: null })); }

/* ── quotes ───────────────────────────────────────────────────────────────── */

function patchQuote(s: MMState, id: string, patch: Partial<Quote>): Quote[] {
  return s.quotes.map((q) => (q.id === id ? { ...q, ...patch, updatedAt: now() } : q));
}
function resolveApprovals(s: MMState, recordId: string, status: Approval["status"]): Approval[] {
  return s.approvals.map((a) => (a.recordId === recordId && (a.status === "Ready" || a.status === "Needs action" || (status === "Approved" && a.status === "Held")) ? { ...a, status } : a));
}

/* Keep an open approval's amount in step with the quote after builder edits. */
function syncAmounts(s: MMState, quotes: Quote[], quoteId: string): Approval[] {
  const q = quotes.find((x) => x.id === quoteId);
  if (!q) return s.approvals;
  const total = quoteTotal({ ...s, quotes }, q);
  return s.approvals.map((a) => (a.recordId === quoteId && a.kind === "Customer quotation" && a.status !== "Approved" ? { ...a, amount: total } : a));
}

/** Approve and send (simulated) a customer quotation. */
export function approveQuote(quoteId: string) {
  const s0 = mm.get();
  const q = ix(s0).quote[quoteId];
  if (!q) return;
  const c = customerOf(s0, q.customerId);
  const total = money(quoteTotal(s0, q), q.currency);
  mm.set((s) => ({
    seq: s.seq + 1,
    quotes: patchQuote(s, quoteId, { status: "Sent", sentAt: now() }),
    enquiries: s.enquiries.map((e) => (e.id === q.enquiryId ? { ...e, stage: "Quote Sent", lastContactAt: now(), aiAction: "Await customer decision" } : e)),
    approvals: resolveApprovals(s, quoteId, "Approved"),
    tasks: s.tasks.map((t) => (t.recordId === quoteId && t.title.startsWith("Approve") ? { ...t, status: "Done" } : t)),
    emails: s.emails.map((m) => (m.recordId === quoteId && m.direction === "draft" ? { ...m, direction: "out", at: now() } : m)),
    activity: [
      evt(s, { actor: "Pulse", actorKind: "system", source: "Gmail", title: "Quote emailed to " + c.name,
        detail: quoteId + " · " + total + " ex VAT. " + SIM, recordKind: "quote", recordId: quoteId, customerId: c.id, simulated: true }),
      evt(s, { actor: "Niall", actorKind: "person", source: "Pulse", title: "Niall approved the customer quotation",
        detail: quoteId + " for " + c.name + ", " + total + ".", recordKind: "quote", recordId: quoteId, customerId: c.id }),
    ].concat(s.activity),
    runs: [agentRun(s, { agentId: "quote", title: "Sent " + quoteId + " after approval", outcome: total + " to " + c.name + " (simulated)",
      status: "Completed", recordKind: "quote", recordId: quoteId, durationSec: 3 })].concat(s.runs),
  }));
  toast("Quote " + quoteId + " approved", c.name + " · " + total + ". " + SIM);
}

export function holdApproval(approvalId: string) {
  const a = mm.get().approvals.find((x) => x.id === approvalId);
  if (!a) return;
  const c = customerOf(mm.get(), a.customerId);
  mm.set((s) => ({
    seq: s.seq + 1,
    approvals: s.approvals.map((x) => (x.id === approvalId ? { ...x, status: "Held" } : x)),
    activity: [evt(s, { actor: "Niall", actorKind: "person", source: "Pulse", title: "Niall put an approval on hold",
      detail: a.action + " for " + c.name + ".", recordKind: a.recordKind, recordId: a.recordId, customerId: c.id })].concat(s.activity),
  }));
  toast("On hold", a.action + " · " + c.name);
}

/** Approve whatever an approval represents. */
export function approve(approvalId: string) {
  const a = mm.get().approvals.find((x) => x.id === approvalId);
  if (!a) return;
  if (a.kind === "Customer quotation") return approveQuote(a.recordId);
  if (a.kind === "Freight request") return sendFreightRequest(a.recordId);
  if (a.kind === "Payment follow-up") return sendPaymentFollowUp(a.recordId);
  if (a.kind === "Price review") return keepListPrice(a.recordId);
}

/** Rotterdam-style pricing question: keep list price and reply. */
export function keepListPrice(quoteId: string) {
  const s0 = mm.get();
  const q = ix(s0).quote[quoteId];
  const c = customerOf(s0, q.customerId);
  mm.set((s) => ({
    seq: s.seq + 1,
    quotes: patchQuote(s, quoteId, { overrideRequested: undefined }),
    approvals: resolveApprovals(s, quoteId, "Approved"),
    activity: [evt(s, { actor: "Niall", actorKind: "person", source: "Gmail", title: "Niall confirmed list pricing",
      detail: quoteId + ": reply sent to " + c.name + " holding the quoted price. " + SIM, recordKind: "quote", recordId: quoteId, customerId: c.id, simulated: true })].concat(s.activity),
  }));
  toast("Reply approved", c.name + ": quoted price held. " + SIM);
}

export function setLine(quoteId: string, idx: number, patch: Partial<QuoteLine>) {
  mm.set((s) => {
    const quotes = s.quotes.map((q) => (q.id === quoteId
      ? { ...q, updatedAt: now(), lines: q.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)) } : q));
    return { quotes, approvals: syncAmounts(s, quotes, quoteId) };
  });
}
export function addLine(quoteId: string, productId: string) {
  mm.set((s) => {
    const quotes = s.quotes.map((q) => {
      if (q.id !== quoteId) return q;
      const price = q.currency === "GBP" ? PRODUCT_BY_ID[productId].gbp : PRODUCT_BY_ID[productId].eur;
      return { ...q, updatedAt: now(), lines: q.lines.concat([{ productId, qty: 1, unitPrice: price, listPrice: price }]) };
    });
    return { quotes, approvals: syncAmounts(s, quotes, quoteId) };
  });
}
export function removeLine(quoteId: string, idx: number) {
  mm.set((s) => {
    const quotes = s.quotes.map((q) => (q.id === quoteId ? { ...q, updatedAt: now(), lines: q.lines.filter((_, i) => i !== idx) } : q));
    return { quotes, approvals: syncAmounts(s, quotes, quoteId) };
  });
}
export function setBuilderQuote(quoteId: string) { mm.set(() => ({ builderQuoteId: quoteId })); }

export function saveDraft(quoteId: string) {
  mm.set((s) => ({ quotes: patchQuote(s, quoteId, {}) }));
  toast("Draft saved", quoteId);
}

/** Submit for approval: a quote with a freight charge moves to Ready for Review. */
export function submitForApproval(quoteId: string) {
  const s0 = mm.get();
  const q = ix(s0).quote[quoteId];
  const c = customerOf(s0, q.customerId);
  const f = q.freightId ? ix(s0).freight[q.freightId] : undefined;
  if (!f || freightCharge(f) === null) { toast("Freight still missing", "Request a carrier rate before this quote can go for approval."); return; }
  const override = q.lines.some((l) => l.unitPrice !== l.listPrice);
  mm.set((s) => ({
    seq: s.seq + 1,
    quotes: patchQuote(s, quoteId, { status: "Ready for Review" }),
    enquiries: s.enquiries.map((e) => (e.id === q.enquiryId ? { ...e, stage: "Quote Ready", aiAction: "Approve quotation" } : e)),
    approvals: s.approvals.some((a) => a.recordId === quoteId && (a.status === "Ready" || a.status === "Needs action")) ? s.approvals
      : s.approvals.concat([{ id: "AP-L" + (s.seq + 1), kind: "Customer quotation", action: override ? "Approve quotation with price override" : "Approve quotation",
        customerId: c.id, recordKind: "quote", recordId: quoteId, amount: quoteTotal(s, q), currency: q.currency, status: "Ready",
        preparedBy: "Quote Agent", createdAt: now(), context: override ? "Unit price differs from the price book." : "Built in the quote builder." }]),
    activity: [evt(s, { actor: "Niall", actorKind: "person", source: "Pulse", title: "Quote submitted for approval",
      detail: quoteId + " for " + c.name + ".", recordKind: "quote", recordId: quoteId, customerId: c.id })].concat(s.activity),
  }));
  toast("Submitted for approval", quoteId + " · " + c.name);
}

/** Simulate the customer saying yes: creates the order and a FreshBooks invoice record. */
export function markAccepted(quoteId: string) {
  const s0 = mm.get();
  const q = ix(s0).quote[quoteId];
  const c = customerOf(s0, q.customerId);
  const orderId = nextId(s0.orders.map((o) => o.id), "SO-");
  const invId = nextId(s0.invoices.map((i) => i.id), "FB-");
  const f = q.freightId ? ix(s0).freight[q.freightId] : undefined;
  const freight = freightCharge(f) ?? 0;
  const amount = q.lines.reduce((n, l) => n + l.unitPrice * l.qty, 0) + freight;
  mm.set((s) => ({
    seq: s.seq + 1,
    quotes: patchQuote(s, quoteId, { status: "Accepted", decidedAt: now() }),
    enquiries: s.enquiries.map((e) => (e.id === q.enquiryId ? { ...e, stage: "Won", aiAction: "Track payment and dispatch" } : e)),
    orders: s.orders.concat([{ id: orderId, quoteId, customerId: c.id, invoiceId: invId, freightId: q.freightId, currency: q.currency,
      lines: q.lines, freightCharge: freight, status: "Invoice created", acceptedAt: now() }]),
    invoices: s.invoices.concat([{ id: invId, customerId: c.id, orderId, currency: q.currency, amount, issuedAt: now(), dueAt: now() + 14 * 86_400_000 }]),
    activity: [
      evt(s, { actor: "FreshBooks", actorKind: "system", source: "FreshBooks", title: "FreshBooks invoice created",
        detail: invId + " for " + money(amount, q.currency) + ". " + SIM, recordKind: "invoice", recordId: invId, customerId: c.id, simulated: true }),
      evt(s, { actor: c.name, actorKind: "system", source: "Gmail", title: "Quote accepted",
        detail: quoteId + " accepted. Order " + orderId + " created.", recordKind: "order", recordId: orderId, customerId: c.id }),
    ].concat(s.activity),
  }));
  toast("Order " + orderId + " created", "Invoice " + invId + " raised in FreshBooks (simulated).");
}

/* ── enquiries ────────────────────────────────────────────────────────────── */

export function setDraftReply(enquiryId: string, text: string) {
  mm.set((s) => ({ enquiries: s.enquiries.map((e) => (e.id === enquiryId ? { ...e, draftReply: text } : e)) }));
}

/** Approve the prepared reply. Complete enquiries move to Qualified; incomplete ones wait on the customer. */
export function approveReply(enquiryId: string, quiet = false) {
  const s0 = mm.get();
  const e = ix(s0).enquiry[enquiryId];
  if (!e || e.replied) return;
  const c = customerOf(s0, e.customerId);
  const complete = e.missing.length === 0;
  mm.set((s) => ({
    seq: s.seq + 1,
    enquiries: s.enquiries.map((x) => (x.id === enquiryId ? { ...x, replied: true, awaitingCustomer: !complete, stage: complete ? "Qualified" : "New",
      lastContactAt: now(), aiAction: complete ? "Request freight rate" : "Waiting on " + e.missing.join(", ").toLowerCase() } : x)),
    emails: s.emails.concat([{ id: "EM-L" + (s.seq + 1), recordKind: "enquiry", recordId: enquiryId, customerId: c.id, direction: "out",
      from: "Niall <sales@megamasseurope.com>", to: contactOf(s, c).email, at: now(), subject: "RE: your Mega Mass enquiry", body: e.draftReply }]),
    followUps: s.followUps.map((f) => (f.enquiryId === enquiryId && f.kind === "No first response" && f.status === "Awaiting review" ? { ...f, status: "Approved" } : f)),
    activity: [evt(s, { actor: "Niall", actorKind: "person", source: "Gmail", title: "Reply approved and sent to " + c.name,
      detail: (complete ? "Price list sent." : "Asked for " + e.missing.join(", ").toLowerCase() + ".") + " " + SIM,
      recordKind: "enquiry", recordId: enquiryId, customerId: c.id, simulated: true })].concat(s.activity),
    runs: [agentRun(s, { agentId: "enquiry", title: "Sent approved reply for " + enquiryId, outcome: complete ? "Qualified" : "Waiting on customer",
      status: "Completed", recordKind: "enquiry", recordId: enquiryId, durationSec: 2 })].concat(s.runs),
  }));
  if (!quiet) toast("Reply sent to " + c.name, SIM);
}

export function approveReplies(ids: string[]) {
  ids.forEach((id) => approveReply(id, true));
  toast(ids.length + " replies approved", SIM);
}

/** Start a quote from an enquiry, then open it in the builder. */
export function createQuote(enquiryId: string): string {
  const s0 = mm.get();
  const e = ix(s0).enquiry[enquiryId];
  if (e.quoteId) { setBuilderQuote(e.quoteId); return e.quoteId; }
  const c = customerOf(s0, e.customerId);
  const id = nextId(s0.quotes.map((q) => q.id), "Q-");
  const lines = e.lines.map((l) => {
    const price = c.currency === "GBP" ? PRODUCT_BY_ID[l.productId].gbp : PRODUCT_BY_ID[l.productId].eur;
    return { productId: l.productId, qty: l.qty, unitPrice: price, listPrice: price };
  });
  mm.set((s) => ({
    seq: s.seq + 1,
    quotes: s.quotes.concat([{ id, enquiryId, customerId: c.id, currency: c.currency, lines, status: "Draft", createdAt: now(), updatedAt: now(),
      validDays: 14, preparedBy: "Quote Agent", notes: [] }]),
    enquiries: s.enquiries.map((x) => (x.id === enquiryId ? { ...x, quoteId: id, stage: x.stage === "New" ? "Qualified" : x.stage, replied: true } : x)),
    builderQuoteId: id,
    activity: [evt(s, { actor: "Quote Agent", actorKind: "agent", source: "Agent", title: "Draft quote started",
      detail: id + " for " + c.name + " from " + enquiryId + ".", recordKind: "quote", recordId: id, customerId: c.id })].concat(s.activity),
  }));
  return id;
}

/* ── freight ──────────────────────────────────────────────────────────────── */

/** Prepare a carrier request for a quote (lands in approvals, not sent). */
export function requestFreight(quoteId: string) {
  const s0 = mm.get();
  const q = ix(s0).quote[quoteId];
  if (q.freightId) { toast("Freight already requested", q.freightId); return; }
  const c = customerOf(s0, q.customerId);
  const id = nextId(s0.freight.map((f) => f.id), "FR-");
  const carrierId = c.country === "GB" || c.country === "IE" ? "SU-HARB" : "SU-GREY";
  const enq = ix(s0).enquiry[q.enquiryId];
  const missing = q.lines.filter((l) => PRODUCT_BY_ID[l.productId].dims === null).map((l) => "Dimensions for " + PRODUCT_BY_ID[l.productId].name + " (catalogue says TBC)");
  if (!enq?.postcode) missing.push("Delivery postcode");
  mm.set((s) => ({
    seq: s.seq + 1,
    freight: s.freight.concat([{ id, quoteId, enquiryId: q.enquiryId, customerId: c.id, carrierId, collection: "County Derry warehouse",
      destination: c.city + ", " + c.country + (enq?.postcode ? " " + enq.postcode : ""), lines: q.lines.map((l) => ({ productId: l.productId, qty: l.qty })),
      requestedAt: null, status: "To request", markupPct: s.controls.defaultMarkup, missing, service: "Palletised, kerbside delivery", chases: 0 }]),
    quotes: patchQuote(s, quoteId, { freightId: id }),
    approvals: s.approvals.concat([{ id: "AP-L" + (s.seq + 1), kind: "Freight request", action: "Send carrier rate request", customerId: c.id,
      recordKind: "freight", recordId: id, amount: null, currency: c.currency, status: "Ready", preparedBy: "Freight Agent", createdAt: now(),
      context: "Prepared from " + quoteId + "." + (missing.length ? " Missing: " + missing.join("; ") + "." : "") }]),
    activity: [evt(s, { actor: "Freight Agent", actorKind: "agent", source: "Agent", title: "Freight Agent prepared a shipping request",
      detail: id + " to " + c.city + ". Waiting for your approval before it goes to the carrier.", recordKind: "freight", recordId: id, customerId: c.id })].concat(s.activity),
  }));
  toast("Carrier request prepared", id + " · approve it to send. " + SIM);
}

/** Approve sending a prepared request, or chase a late one. */
export function sendFreightRequest(freightId: string) {
  const s0 = mm.get();
  const f = ix(s0).freight[freightId];
  const c = customerOf(s0, f.customerId);
  const carrier = s0.suppliers.find((x) => x.id === f.carrierId)!;
  const chase = f.status === "Awaiting rate";
  mm.set((s) => ({
    seq: s.seq + 1,
    freight: s.freight.map((x) => (x.id === freightId ? (chase ? { ...x, chases: x.chases + 1 } : { ...x, status: "Awaiting rate", requestedAt: now() }) : x)),
    quotes: chase ? s.quotes : s.quotes.map((q) => (q.id === f.quoteId ? { ...q, status: "Awaiting Freight", updatedAt: now() } : q)),
    enquiries: chase ? s.enquiries : s.enquiries.map((e) => (e.id === f.enquiryId ? { ...e, stage: "Freight Requested", aiAction: "Waiting on " + carrier.name } : e)),
    approvals: resolveApprovals(s, freightId, "Approved"),
    emails: s.emails.concat([{ id: "EM-L" + (s.seq + 1), recordKind: "freight", recordId: freightId, customerId: c.id, supplierId: carrier.id,
      direction: "out", from: "Niall <sales@megamasseurope.com>", to: carrier.name, at: now(),
      subject: (chase ? "Chasing: " : "") + "Freight quotation request, equipment to " + c.city,
      body: chase ? "Hi,\n\nFollowing up on our request " + freightId + " for delivery to " + c.city + ". Could you send the rate today if possible?\n\nThanks,\nNiall" : freightBody(f) }]),
    activity: [evt(s, { actor: "Niall", actorKind: "person", source: "Gmail", title: chase ? "Carrier chased for a rate" : "Niall approved the carrier request",
      detail: freightId + " · " + carrier.name + " · " + c.name + ". " + SIM, recordKind: "freight", recordId: freightId, customerId: c.id, simulated: true })].concat(s.activity),
    runs: [agentRun(s, { agentId: "freight", title: (chase ? "Chased " : "Sent ") + freightId + " to " + carrier.name, outcome: "After Niall's approval (simulated)",
      status: "Completed", recordKind: "freight", recordId: freightId, durationSec: 2 })].concat(s.runs),
  }));
  toast(chase ? "Chase sent to " + carrier.name : "Request sent to " + carrier.name, freightId + ". " + SIM);
}

/** Demo control: pretend the carrier's reply has just landed in Gmail. */
export function simulateCarrierReply(freightId: string, cost?: number) {
  const s0 = mm.get();
  const f = ix(s0).freight[freightId];
  if (!f || f.carrierQuote) return;
  const c = customerOf(s0, f.customerId);
  const units = f.lines.reduce((n, l) => n + l.qty, 0);
  const zone = c.country === "GB" ? [220, 130] : c.country === "IE" ? [200, 120] : c.country === "NL" || c.country === "BE" ? [280, 160]
    : c.country === "FR" ? [320, 170] : ["DE", "AT", "DK", "CZ", "PL"].includes(c.country) ? [340, 180] : c.country === "SK" || c.country === "SE" ? [420, 280] : [360, 190];
  const amount = cost ?? Math.round((zone[0] + zone[1] * units) / 5) * 5;
  const carrier = s0.suppliers.find((x) => x.id === f.carrierId)!;
  const ref = (f.carrierId === "SU-HARB" ? "HF-" : "GX-") + (60000 + s0.seq);
  const cq = { cost: amount, currency: c.currency, ref, eta: f.carrierId === "SU-HARB" ? "2 to 3 working days" : "5 to 7 working days",
    validUntil: new Date(now() + 14 * 86_400_000).toISOString(), exclusions: "Tail-lift not included", receivedAt: now() };
  const q = f.quoteId ? ix(s0).quote[f.quoteId] : undefined;
  const charge = Math.round(amount * (1 + f.markupPct / 100));
  mm.set((s) => ({
    seq: s.seq + 1,
    freight: s.freight.map((x) => (x.id === freightId ? { ...x, carrierQuote: cq, status: "Rate received" } : x)),
    quotes: q ? patchQuote(s, q.id, { status: "Ready for Review" }) : s.quotes,
    enquiries: s.enquiries.map((e) => (e.id === f.enquiryId ? { ...e, stage: "Quote Ready", aiAction: "Approve quotation" } : e)),
    approvals: resolveApprovals(s, freightId, "Approved").concat(q ? [{ id: "AP-L" + (s.seq + 1), kind: "Customer quotation" as const,
      action: "Approve quotation", customerId: c.id, recordKind: "quote" as const, recordId: q.id,
      amount: q.lines.reduce((n, l) => n + l.unitPrice * l.qty, 0) + charge, currency: q.currency, status: "Ready" as const,
      preparedBy: "Quote Agent", createdAt: now(), context: carrier.name + " rate just received; " + f.markupPct + "% markup applied." }] : []),
    emails: s.emails.concat([{ id: "EM-L" + (s.seq + 1), recordKind: "freight", recordId: freightId, customerId: c.id, supplierId: carrier.id,
      direction: "in", from: carrier.name, to: "sales@megamasseurope.com", at: now(), subject: "RE: Freight quotation request, equipment to " + c.city,
      body: "Hi Niall,\n\nRate for " + units + " machine" + (units > 1 ? "s" : "") + " to " + c.city + ": " + money(amount, c.currency) + " ex VAT. Ref " + ref
        + ". Transit " + cq.eta + ". Tail-lift not included. Valid 14 days.\n\nRegards,\n" + carrier.name }]),
    activity: [
      evt(s, { actor: "Freight Agent", actorKind: "agent", source: "Agent", title: "Freight Agent applied the markup",
        detail: f.markupPct + "% on " + money(amount, c.currency) + " = " + money(charge, c.currency) + " customer charge.", recordKind: "freight", recordId: freightId, customerId: c.id }),
      evt(s, { actor: carrier.name, actorKind: "system", source: "Carrier", title: "Carrier quotation recorded",
        detail: money(amount, c.currency) + ", ref " + ref + ", for " + c.city + ". Simulated reply.", recordKind: "freight", recordId: freightId, customerId: c.id, simulated: true }),
    ].concat(s.activity),
    runs: [agentRun(s, { agentId: "freight", title: "Read " + carrier.name + " reply for " + freightId, outcome: money(amount, c.currency) + " + " + f.markupPct + "% = " + money(charge, c.currency),
      status: "Completed", recordKind: "freight", recordId: freightId, durationSec: 6 })].concat(s.runs),
  }));
  toast("Carrier rate received", carrier.name + " · " + money(amount, c.currency) + " → customer charge " + money(charge, c.currency));
}

export function setMarkup(freightId: string, pct: number) {
  const v = Math.max(0, Math.min(60, Math.round(pct * 10) / 10));
  mm.set((s) => ({ freight: s.freight.map((f) => (f.id === freightId ? { ...f, markupPct: v, charge: undefined } : f)) }));
}

export function markBooked(orderId: string) {
  const s0 = mm.get();
  const o = ix(s0).order[orderId];
  const c = customerOf(s0, o.customerId);
  mm.set((s) => ({
    seq: s.seq + 1,
    freight: s.freight.map((f) => (f.id === o.freightId ? { ...f, status: "Booked" } : f)),
    activity: [evt(s, { actor: "Niall", actorKind: "person", source: "Pulse", title: "Collection marked as booked",
      detail: orderId + " for " + c.name + ". Booked with the carrier outside Pulse.", recordKind: "order", recordId: orderId, customerId: c.id })].concat(s.activity),
  }));
  toast("Marked as booked", orderId + " · " + c.name);
}

export function markDispatched(orderId: string) {
  const s0 = mm.get();
  const o = ix(s0).order[orderId];
  const c = customerOf(s0, o.customerId);
  mm.set((s) => ({
    seq: s.seq + 1,
    orders: s.orders.map((x) => (x.id === orderId ? { ...x, status: "Dispatched", dispatchedAt: now(), eta: "In transit" } : x)),
    freight: s.freight.map((f) => (f.id === o.freightId ? { ...f, status: "Dispatched" } : f)),
    reservations: s.reservations.filter((r) => !(r.orderId === orderId && r.source === "Warehouse stock")),
    products: s.products.map((p) => {
      const n = s.reservations.filter((r) => r.orderId === orderId && r.productId === p.id && r.source === "Warehouse stock").reduce((m, r) => m + r.units, 0);
      return n ? { ...p, inStock: p.inStock - n } : p;
    }),
    activity: [evt(s, { actor: "Niall", actorKind: "person", source: "Pulse", title: "Order dispatched",
      detail: orderId + " left County Derry for " + c.city + ".", recordKind: "order", recordId: orderId, customerId: c.id })].concat(s.activity),
  }));
  toast("Dispatched", orderId + " · " + c.name);
}

export function markDelivered(orderId: string) {
  const s0 = mm.get();
  const o = ix(s0).order[orderId];
  const c = customerOf(s0, o.customerId);
  mm.set((s) => ({
    seq: s.seq + 1,
    orders: s.orders.map((x) => (x.id === orderId ? { ...x, status: "Delivered", deliveredAt: now(), eta: "Delivered" } : x)),
    freight: s.freight.map((f) => (f.id === o.freightId ? { ...f, status: "Delivered" } : f)),
    activity: [evt(s, { actor: "Niall", actorKind: "person", source: "Pulse", title: "Delivery confirmed",
      detail: orderId + " delivered to " + c.name + ".", recordKind: "order", recordId: orderId, customerId: c.id })].concat(s.activity),
  }));
  toast("Delivered", orderId + " · " + c.name);
}

/* ── finance ──────────────────────────────────────────────────────────────── */

/** Record a payment against a FreshBooks invoice (simulated). Full balance by default. */
export function recordPayment(invoiceId: string, amount?: number) {
  const s0 = mm.get();
  const inv = ix(s0).invoice[invoiceId];
  const due = outstanding(s0, inv);
  const paid = Math.min(due, amount ?? due);
  if (paid <= 0) return;
  const c = customerOf(s0, inv.customerId);
  const full = paid >= due;
  mm.set((s) => ({
    seq: s.seq + 1,
    payments: s.payments.concat([{ id: "PY-L" + (s.seq + 1), invoiceId, amount: paid, currency: inv.currency, at: now(), method: "Bank transfer" }]),
    orders: s.orders.map((o) => (o.id === inv.orderId && full && (o.status === "Payment pending" || o.status === "Invoice created") ? { ...o, status: "Payment confirmed" } : o)),
    approvals: full ? resolveApprovals(s, invoiceId, "Approved") : s.approvals,
    followUps: full ? s.followUps.map((f) => (f.invoiceId === invoiceId && f.status === "Awaiting review" ? { ...f, status: "Dismissed" } : f)) : s.followUps,
    activity: [evt(s, { actor: "FreshBooks", actorKind: "system", source: "FreshBooks", title: full ? "Payment recorded in FreshBooks" : "Part payment recorded",
      detail: invoiceId + " · " + money(paid, inv.currency) + " from " + c.name + ". Simulated, FreshBooks unchanged.", recordKind: "invoice", recordId: invoiceId, customerId: c.id, simulated: true })].concat(s.activity),
    runs: [agentRun(s, { agentId: "receivables", title: "Matched payment on " + invoiceId, outcome: money(paid, inv.currency) + (full ? ", invoice cleared" : ", balance remains"),
      status: "Completed", recordKind: "invoice", recordId: invoiceId, durationSec: 4 })].concat(s.runs),
  }));
  toast("Payment recorded", invoiceId + " · " + money(paid, inv.currency) + " · " + c.name + ". Simulated, FreshBooks unchanged.");
}

export function sendPaymentFollowUp(invoiceId: string) {
  const s0 = mm.get();
  const inv = ix(s0).invoice[invoiceId];
  const c = customerOf(s0, inv.customerId);
  mm.set((s) => ({
    seq: s.seq + 1,
    approvals: resolveApprovals(s, invoiceId, "Approved"),
    emails: s.emails.map((m) => (m.recordId === invoiceId && m.direction === "draft" ? { ...m, direction: "out", at: now() } : m)),
    activity: [evt(s, { actor: "Niall", actorKind: "person", source: "Gmail", title: "Payment follow-up approved",
      detail: invoiceId + " · " + c.name + ". " + SIM, recordKind: "invoice", recordId: invoiceId, customerId: c.id, simulated: true })].concat(s.activity),
    runs: [agentRun(s, { agentId: "receivables", title: "Sent payment-status email for " + invoiceId, outcome: "Approved by Niall (simulated)",
      status: "Completed", recordKind: "invoice", recordId: invoiceId, durationSec: 2 })].concat(s.runs),
  }));
  toast("Payment email approved", c.name + " · " + invoiceId + ". " + SIM);
}

/* ── follow-ups ───────────────────────────────────────────────────────────── */

export function decideFollowUp(id: string, status: "Approved" | "Snoozed" | "Dismissed") {
  const s0 = mm.get();
  const f = s0.followUps.find((x) => x.id === id);
  if (!f) return;
  const c = customerOf(s0, f.customerId);
  mm.set((s) => ({
    seq: s.seq + 1,
    followUps: s.followUps.map((x) => (x.id === id ? { ...x, status } : x)),
    activity: status === "Approved" ? [evt(s, { actor: "Niall", actorKind: "person", source: "Gmail", title: "Follow-up approved",
      detail: f.kind + " · " + c.name + ". " + SIM, recordKind: "followup", recordId: id, customerId: c.id, simulated: true })].concat(s.activity) : s.activity,
  }));
  toast(status === "Approved" ? "Follow-up approved" : status === "Snoozed" ? "Snoozed" : "Dismissed", c.name + (status === "Approved" ? ". " + SIM : ""));
}
export function setFollowUpDraft(id: string, draft: string) {
  mm.set((s) => ({ followUps: s.followUps.map((x) => (x.id === id ? { ...x, draft } : x)) }));
}

/* ── settings ─────────────────────────────────────────────────────────────── */

export function setControl(patch: Partial<MMState["controls"]>) {
  mm.set((s) => ({ controls: { ...s.controls, ...patch } }));
}
export function toggleApprovalRule(key: string) {
  mm.set((s) => ({ controls: { ...s.controls, requireApproval: { ...s.controls.requireApproval, [key]: !s.controls.requireApproval[key] } } }));
}
export function toggleAgent(id: AgentId) {
  mm.set((s) => ({ controls: { ...s.controls, agentsOn: { ...s.controls.agentsOn, [id]: !s.controls.agentsOn[id] } } }));
}
export function setTask(id: string, status: MMState["tasks"][number]["status"]) {
  mm.set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
}
