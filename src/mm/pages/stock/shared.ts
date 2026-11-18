import type { EnquiryStage, IncomingShipment, MMState, Product, Quote, QuoteStatus } from "../../types";
import { productOf, stockOf } from "../../select";
import { plural } from "../../format";
import type { Tone } from "../../ui";
import { lcFirst, unitsHeld } from "../orders/shared";

/* Stock is kept simple on purpose: in stock, reserved, available, incoming.
   Every figure comes from stockOf() and the reservation records. */

const OPEN_STAGES: EnquiryStage[] = ["New", "Qualified", "Freight Requested", "Quote Ready", "Quote Sent"];
export const OPEN_QUOTES: QuoteStatus[] = ["Ready for Review", "Approved", "Sent", "Awaiting Freight", "Draft"];

/** Open enquiries (not won, not lost) asking for a machine. */
export function openDemand(s: MMState, productId: string) {
  let enquiries = 0, units = 0;
  for (const e of s.enquiries) {
    if (!OPEN_STAGES.includes(e.stage)) continue;
    const l = e.lines.find((x) => x.productId === productId);
    if (l) { enquiries++; units += l.qty; }
  }
  return { enquiries, units };
}

export const saysAvailable = (p: Product) => /^available/i.test(p.websiteLabel.trim());
export const shipmentFor = (s: MMState, productId: string) => s.shipments.find((sh) => sh.lines.some((l) => l.productId === productId));

export type Flag = { key: string; tone: Tone; title: string; detail: string };

/** Everything worth flagging on one machine, worked out from the records. */
export function stockFlags(s: MMState, p: Product): Flag[] {
  const st = stockOf(s, p);
  const out: Flag[] = [];
  const q = (t: string) => "“" + t + "”";
  if (st.available < 0) {
    out.push({ key: "neg", tone: "bad", title: "Over-committed", detail: plural(-st.available, "unit") + " more reserved than in stock. Needs a warning and a manual override." });
  }
  const sh = shipmentFor(s, p.id);
  if (st.available > 0 && !saysAvailable(p)) {
    out.push({ key: "web", tone: "warn", title: "Website out of date", detail: "Page says " + q(p.websiteLabel) + " while " + st.available + " are available in County Derry." });
  } else if (st.available <= 0 && st.incoming > 0 && !saysAvailable(p)) {
    out.push({ key: "web", tone: "warn", title: "Website out of date", detail: "Page says " + q(p.websiteLabel) + " while " + st.incoming + " are due " + (sh ? lcFirst(sh.eta) : "soon") + (sh?.confirmed ? "." : ", arrival not confirmed.") });
  } else if (st.available <= 0 && saysAvailable(p)) {
    out.push({ key: "web", tone: "warn", title: "Website overstates stock", detail: "Page says " + q(p.websiteLabel) + " but none are available." });
  }
  const d = openDemand(s, p.id);
  if (st.available <= 0 && d.enquiries > 0) {
    out.push({ key: "demand", tone: "info", title: "Open demand, none in stock", detail: plural(d.enquiries, "open enquiry", "open enquiries") + (d.enquiries === 1 ? " asks" : " ask") + " for " + plural(d.units, "unit")
      + (st.incomingFree > 0 ? ". " + st.incomingFree + " free on the incoming shipment." : st.incoming > 0 ? ". Incoming units all held." : ". Nothing incoming.") });
  }
  return out;
}

export type Claim = { quote: Quote; lines: { productId: string; units: number }[]; units: number };

/** Open quotes that would need units from an incoming shipment because the warehouse has none to give. */
export function intakeClaims(s: MMState, sh: IncomingShipment): Claim[] {
  const inShip = new Set(sh.lines.map((l) => l.productId));
  const out: Claim[] = [];
  for (const q of s.quotes) {
    if (!OPEN_QUOTES.includes(q.status)) continue;
    const lines = q.lines.filter((l) => inShip.has(l.productId)).map((l) => {
      const avail = Math.max(0, stockOf(s, productOf(s, l.productId)).available);
      return { productId: l.productId, units: Math.max(0, l.qty - avail) };
    }).filter((l) => l.units > 0);
    if (lines.length) out.push({ quote: q, lines, units: lines.reduce((n, l) => n + l.units, 0) });
  }
  return out.sort((a, b) => OPEN_QUOTES.indexOf(a.quote.status) - OPEN_QUOTES.indexOf(b.quote.status) || b.units - a.units);
}

/** Units of a shipment line already held for customers. */
export function heldOnShipment(s: MMState, sh: IncomingShipment, productId?: string) {
  return unitsHeld(s.reservations.filter((r) => r.source === "Incoming" && (r.shipmentId ?? sh.id) === sh.id && (!productId || r.productId === productId)));
}

export type ClaimGroup = "approval" | "sent" | "early";
export const claimGroup = (q: Quote): ClaimGroup =>
  q.status === "Ready for Review" || q.status === "Approved" ? "approval" : q.status === "Sent" ? "sent" : "early";
export const CLAIM_GROUP: Record<ClaimGroup, { label: string; when: string }> = {
  approval: { label: "Waiting for approval", when: "Before this quote goes out" },
  sent: { label: "Sent to customers", when: "If the customer accepts" },
  early: { label: "Earlier stages", when: "Before the quote is finished" },
};
