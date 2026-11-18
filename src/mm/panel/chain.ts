import type {
  Customer, Enquiry, FollowUp, FreightRequest, IncomingShipment, Invoice, MMState, Order, PanelRef, Product, Quote, RecordKind, Supplier,
} from "../types";
import { customerGraph, ix, stockOf } from "../select";
import { isOpenStage } from "./kit";

/* The commercial chain behind any record:
   Customer → Enquiry → Machine → Freight request → Quote → Invoice → Order → Shipment.
   Resolved from the record ids in the store, so it stays right as actions move records on. */

export interface Chain {
  customer?: Customer;
  enquiry?: Enquiry;
  products: Product[];
  freight?: FreightRequest;
  quote?: Quote;
  invoice?: Invoice;
  order?: Order;
  shipments: IncomingShipment[];
  carrier?: Supplier;
  followUps: FollowUp[];
}

type Seed = { customerId?: string; enquiry?: Enquiry; quote?: Quote; freight?: FreightRequest; order?: Order; invoice?: Invoice };

function build(s: MMState, seed: Seed): Chain {
  const x = ix(s);
  let { enquiry, quote, freight, order, invoice } = seed;
  if (!order && invoice) order = x.order[invoice.orderId];
  if (!quote && order) quote = x.quote[order.quoteId];
  if (!quote && freight?.quoteId) quote = x.quote[freight.quoteId];
  if (!order && freight?.orderId) order = x.order[freight.orderId];
  if (!enquiry && quote) enquiry = x.enquiry[quote.enquiryId];
  if (!enquiry && freight?.enquiryId) enquiry = x.enquiry[freight.enquiryId];
  if (!quote && enquiry?.quoteId) quote = x.quote[enquiry.quoteId];
  const qid = quote?.id;
  if (!order && qid) order = s.orders.find((o) => o.quoteId === qid);
  if (!freight && order?.freightId) freight = x.freight[order.freightId];
  if (!freight && quote?.freightId) freight = x.freight[quote.freightId];
  const eid = enquiry?.id;
  if (!freight && eid) freight = s.freight.find((f) => f.enquiryId === eid);
  if (!invoice && order?.invoiceId) invoice = x.invoice[order.invoiceId];

  const customerId = seed.customerId ?? enquiry?.customerId ?? quote?.customerId ?? freight?.customerId ?? order?.customerId ?? invoice?.customerId;
  const customer = customerId ? x.customer[customerId] : undefined;

  const lines: { productId: string; qty: number }[] = order?.lines ?? quote?.lines ?? enquiry?.lines ?? freight?.lines ?? [];
  const products: Product[] = [];
  for (const l of lines) {
    const p = x.product[l.productId];
    if (p && !products.includes(p)) products.push(p);
  }

  /* Incoming stock: an order shows the shipments its reservations come from.
     Before an order exists, a shipment is linked when warehouse stock cannot cover a line. */
  let shipments: IncomingShipment[] = [];
  const oid = order?.id;
  if (oid) {
    const ids = new Set(s.reservations.filter((r) => r.orderId === oid && r.shipmentId).map((r) => r.shipmentId as string));
    shipments = s.shipments.filter((sh) => ids.has(sh.id));
  } else if (!enquiry || isOpenStage(enquiry.stage)) {
    const short = new Set(lines.filter((l) => {
      const p = x.product[l.productId];
      return p ? stockOf(s, p).available < l.qty : false;
    }).map((l) => l.productId));
    shipments = s.shipments.filter((sh) => sh.lines.some((l) => short.has(l.productId)));
  }

  const carrierId = freight?.carrierId;
  const carrier = carrierId ? s.suppliers.find((su) => su.id === carrierId) : undefined;
  const followUps = s.followUps.filter((f) => (eid !== undefined && f.enquiryId === eid) || (qid !== undefined && f.quoteId === qid)
    || (invoice !== undefined && f.invoiceId === invoice.id));
  return { customer, enquiry, products, freight, quote, invoice, order, shipments, carrier, followUps };
}

export function chainOf(s: MMState, ref: PanelRef): Chain | null {
  const x = ix(s);
  switch (ref.kind) {
    case "enquiry": { const e = x.enquiry[ref.id]; return e ? build(s, { enquiry: e }) : null; }
    case "quote": { const q = x.quote[ref.id]; return q ? build(s, { quote: q }) : null; }
    case "freight": { const f = x.freight[ref.id]; return f ? build(s, { freight: f }) : null; }
    case "order": { const o = x.order[ref.id]; return o ? build(s, { order: o }) : null; }
    case "invoice": { const i = x.invoice[ref.id]; return i ? build(s, { invoice: i }) : null; }
    case "followup": {
      const f = s.followUps.find((y) => y.id === ref.id);
      if (!f) return null;
      return build(s, {
        customerId: f.customerId,
        quote: f.quoteId ? x.quote[f.quoteId] : undefined,
        enquiry: f.enquiryId ? x.enquiry[f.enquiryId] : undefined,
        invoice: f.invoiceId ? x.invoice[f.invoiceId] : undefined,
      });
    }
    default: return null;
  }
}

/* ── chips for the "Linked records" row ───────────────────────────────────── */

export type LinkItem = {
  kind: RecordKind;
  id: string;
  step: string;
  label: string;
  current: boolean;
  product?: Product;
  extra?: boolean;
};

const TRANSACTIONAL: RecordKind[] = ["enquiry", "quote", "freight", "invoice", "order", "followup"];
const same = (a: PanelRef, b: PanelRef) => a.kind === b.kind && a.id === b.id;

/** The most recent record on the trail that has a commercial chain. */
export function anchorOf(path: PanelRef[]): PanelRef | null {
  for (let i = path.length - 1; i >= 0; i--) if (TRANSACTIONAL.includes(path[i].kind)) return path[i];
  return null;
}

function inChain(ch: Chain, cur: PanelRef): boolean {
  switch (cur.kind) {
    case "customer": return ch.customer?.id === cur.id;
    case "product": return ch.products.some((p) => p.id === cur.id);
    case "shipment": return ch.shipments.some((sh) => sh.id === cur.id);
    case "supplier": return ch.carrier?.id === cur.id;
    case "followup": return ch.followUps.some((f) => f.id === cur.id);
    default: return false;
  }
}

function chainItems(ch: Chain, cur: PanelRef): LinkItem[] {
  const mk = (kind: RecordKind, id: string, step: string, label: string, more?: Partial<LinkItem>): LinkItem =>
    ({ kind, id, step, label, current: cur.kind === kind && cur.id === id, ...more });
  const items: LinkItem[] = [];
  if (ch.customer) items.push(mk("customer", ch.customer.id, "Customer", ch.customer.name));
  if (ch.enquiry) items.push(mk("enquiry", ch.enquiry.id, "Enquiry", ch.enquiry.id));
  for (const p of ch.products) items.push(mk("product", p.id, "Machine", p.name, { product: p }));
  if (ch.freight) items.push(mk("freight", ch.freight.id, "Freight", ch.freight.id));
  if (ch.quote) items.push(mk("quote", ch.quote.id, "Quote", ch.quote.id));
  if (ch.invoice) items.push(mk("invoice", ch.invoice.id, "Invoice", ch.invoice.id));
  if (ch.order) items.push(mk("order", ch.order.id, "Order", ch.order.id));
  for (const sh of ch.shipments) items.push(mk("shipment", sh.id, "Incoming", sh.name));
  if (ch.carrier) items.push(mk("supplier", ch.carrier.id, "Carrier", ch.carrier.name, { extra: true }));
  for (const f of ch.followUps) {
    if (f.status === "Awaiting review" || (cur.kind === "followup" && cur.id === f.id)) items.push(mk("followup", f.id, "Follow-up", f.kind, { extra: true }));
  }
  return items;
}

/** Links for records that sit outside a single chain (customer, machine, shipment, supplier). */
function ownLinks(s: MMState, cur: PanelRef): LinkItem[] {
  const x = ix(s);
  const mk = (kind: RecordKind, id: string, step: string, label: string, more?: Partial<LinkItem>): LinkItem =>
    ({ kind, id, step, label, current: cur.kind === kind && cur.id === id, ...more });
  const maker = s.suppliers.find((su) => su.kind === "Manufacturer");
  switch (cur.kind) {
    case "customer": {
      const c = x.customer[cur.id];
      if (!c) return [];
      const g = customerGraph(s, c.id);
      return [
        mk("customer", c.id, "Customer", c.name),
        ...[...g.enquiries].sort((a, b) => b.receivedAt - a.receivedAt).map((e) => mk("enquiry", e.id, "Enquiry", e.id)),
        ...g.freight.map((f) => mk("freight", f.id, "Freight", f.id)),
        ...g.quotes.map((q) => mk("quote", q.id, "Quote", q.id)),
        ...g.invoices.map((i) => mk("invoice", i.id, "Invoice", i.id)),
        ...g.orders.map((o) => mk("order", o.id, "Order", o.id)),
      ];
    }
    case "product": {
      const p = x.product[cur.id];
      if (!p) return [];
      const orderIds = [...new Set(s.reservations.filter((r) => r.productId === p.id).map((r) => r.orderId))].slice(0, 4);
      return [
        mk("product", p.id, "Machine", p.name, { product: p }),
        ...s.shipments.filter((sh) => sh.lines.some((l) => l.productId === p.id)).map((sh) => mk("shipment", sh.id, "Incoming", sh.name)),
        ...orderIds.map((id) => mk("order", id, "Reserved on", id)),
        ...(maker ? [mk("supplier", maker.id, "Supplier", maker.name, { extra: true })] : []),
      ];
    }
    case "shipment": {
      const sh = s.shipments.find((y) => y.id === cur.id);
      if (!sh) return [];
      const orderIds = [...new Set(s.reservations.filter((r) => r.shipmentId === sh.id).map((r) => r.orderId))];
      return [
        mk("shipment", sh.id, "Incoming", sh.name),
        ...sh.lines.flatMap((l) => { const p = x.product[l.productId]; return p ? [mk("product", p.id, "Machine", p.name, { product: p })] : []; }),
        ...orderIds.map((id) => mk("order", id, "Order", id)),
        ...(maker ? [mk("supplier", maker.id, "Supplier", maker.name, { extra: true })] : []),
      ];
    }
    case "supplier": {
      const su = s.suppliers.find((y) => y.id === cur.id);
      if (!su) return [];
      const open = s.freight.filter((f) => f.carrierId === su.id && (f.status === "To request" || f.status === "Awaiting rate"))
        .sort((a, b) => (a.requestedAt ?? Infinity) - (b.requestedAt ?? Infinity)).slice(0, 6);
      return [
        mk("supplier", su.id, su.kind, su.name),
        ...open.map((f) => mk("freight", f.id, "Freight", f.id)),
        ...(su.kind === "Manufacturer" ? s.shipments.map((sh) => mk("shipment", sh.id, "Incoming", sh.name)) : []),
      ];
    }
    default:
      return [];
  }
}

/** Chips to show for the current record. Inside a chain the whole chain shows, with the current node marked. */
export function linksFor(s: MMState, cur: PanelRef, trail: PanelRef[]): { items: LinkItem[]; chain: boolean } {
  const anchor = anchorOf(trail.concat([cur]));
  if (anchor) {
    const ch = chainOf(s, anchor);
    if (ch && (same(anchor, cur) || inChain(ch, cur))) return { items: chainItems(ch, cur), chain: true };
  }
  return { items: ownLinks(s, cur), chain: false };
}
