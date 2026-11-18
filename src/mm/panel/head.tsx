import type { ReactNode } from "react";
import type { MMState, PanelRef, Priority, RecordKind } from "../types";
import { freightCharge, invoiceStatus, ix, orderValue, quoteTotal, quoteUnits, stockOf } from "../select";
import { Badge, I, Status, type Tone } from "../ui";
import { countryName, dateLong, dateShort, money, plural, since } from "../format";

/* Header content for the record drawer: what it is, which one, and its state. */

export type Head = { kindLabel: string; icon: string; id: string; title: string; badges: ReactNode; sub: ReactNode };

export const KIND_LABEL: Record<RecordKind, string> = {
  customer: "Customer", enquiry: "Enquiry", quote: "Quote", freight: "Freight request", invoice: "FreshBooks invoice",
  order: "Order", product: "Machine", shipment: "Incoming stock", followup: "Follow-up", supplier: "Supplier",
};

export const KIND_ICON: Record<RecordKind, string> = {
  customer: I.building, enquiry: I.inbox, quote: I.quote, freight: I.truck, invoice: I.money,
  order: I.order, product: I.box, shipment: I.calendar, followup: I.clock, supplier: I.globe,
};

const PRIORITY_TONE: Record<Priority, Tone> = { High: "bad", Medium: "warn", Low: "neutral" };

export function headOf(s: MMState, ref: PanelRef): Head {
  const x = ix(s);
  const base = { kindLabel: KIND_LABEL[ref.kind], icon: KIND_ICON[ref.kind], id: ref.id };
  const missing: Head = { ...base, title: "Record not found", badges: null, sub: "It may have been removed from the demo data." };
  switch (ref.kind) {
    case "enquiry": {
      const e = x.enquiry[ref.id];
      if (!e) return missing;
      const c = x.customer[e.customerId];
      return { ...base, title: c.name,
        badges: <><Status s={e.stage} /><Badge tone={PRIORITY_TONE[e.priority]}>{e.priority} priority</Badge></>,
        sub: c.city + ", " + countryName(c.country) + " · " + e.source + " · received " + since(e.receivedAt) };
    }
    case "quote": {
      const q = x.quote[ref.id];
      if (!q) return missing;
      const c = x.customer[q.customerId];
      return { ...base, title: c.name, badges: <Status s={q.status} />,
        sub: money(quoteTotal(s, q), q.currency) + " ex VAT · " + plural(quoteUnits(q), "machine") + " · " + q.currency };
    }
    case "freight": {
      const f = x.freight[ref.id];
      if (!f) return missing;
      const c = x.customer[f.customerId];
      const carrier = s.suppliers.find((su) => su.id === f.carrierId);
      const charge = freightCharge(f);
      return { ...base, title: c.name, badges: <Status s={f.status} />,
        sub: (carrier ? carrier.name : "Carrier") + " · to " + f.destination + (charge !== null ? " · " + money(charge, c.currency) + " to customer" : "") };
    }
    case "invoice": {
      const inv = x.invoice[ref.id];
      if (!inv) return missing;
      const c = x.customer[inv.customerId];
      return { ...base, title: c.name, badges: <Status s={invoiceStatus(s, inv)} />,
        sub: money(inv.amount, inv.currency) + " · issued " + dateShort(inv.issuedAt) + " · due " + dateShort(inv.dueAt) };
    }
    case "order": {
      const o = x.order[ref.id];
      if (!o) return missing;
      const c = x.customer[o.customerId];
      return { ...base, title: c.name, badges: <Status s={o.status} />,
        sub: money(orderValue(o), o.currency) + " · accepted " + dateShort(o.acceptedAt) + (o.eta ? " · " + o.eta : "") };
    }
    case "customer": {
      const c = x.customer[ref.id];
      if (!c) return missing;
      return { ...base, title: c.name,
        badges: <><Badge tone="neutral">{c.type}</Badge>{c.returning && <Badge tone="ok">Returning</Badge>}</>,
        sub: c.city + ", " + countryName(c.country) + " · " + c.currency + " · customer since " + dateLong(Date.parse(c.since)) };
    }
    case "product": {
      const p = x.product[ref.id];
      if (!p) return missing;
      const st = stockOf(s, p);
      const badge = st.available > 0 ? <Badge tone="ok" dot>{st.available} available</Badge>
        : st.available < 0 ? <Badge tone="bad" dot>Over-reserved</Badge>
        : st.incomingFree > 0 ? <Badge tone="warn" dot>Incoming only</Badge>
        : <Badge tone="neutral" dot>None free</Badge>;
      return { ...base, title: p.name, badges: badge, sub: p.series + " · " + p.range + " · " + p.category };
    }
    case "shipment": {
      const sh = s.shipments.find((y) => y.id === ref.id);
      if (!sh) return missing;
      const units = sh.lines.reduce((n, l) => n + l.units, 0);
      return { ...base, title: sh.name,
        badges: sh.confirmed ? <Badge tone="ok" dot>Arrival confirmed</Badge> : <Badge tone="warn" dot>Arrival not confirmed</Badge>,
        sub: sh.eta + " · " + plural(units, "unit") + " · into County Derry" };
    }
    case "followup": {
      const f = s.followUps.find((y) => y.id === ref.id);
      if (!f) return missing;
      const c = x.customer[f.customerId];
      return { ...base, title: c.name, badges: <><Status s={f.status} /><Badge tone="neutral">{f.kind}</Badge></>,
        sub: "Suggested at day " + f.dueInDays + " · last touch " + since(f.lastTouch) };
    }
    case "supplier": {
      const su = s.suppliers.find((y) => y.id === ref.id);
      if (!su) return missing;
      return { ...base, kindLabel: su.kind, icon: su.kind === "Carrier" ? I.truck : I.globe, title: su.name,
        badges: su.confirmed ? <Badge tone="ok" dot>Confirmed</Badge> : <Badge tone="warn" dot>To confirm</Badge>,
        sub: su.region + " · " + su.workflow };
    }
  }
}

/** Short name for a record, used on the Back button. */
export function shortLabel(s: MMState, ref: PanelRef): string {
  const x = ix(s);
  if (ref.kind === "customer") return x.customer[ref.id]?.name ?? ref.id;
  if (ref.kind === "product") return x.product[ref.id]?.name ?? ref.id;
  if (ref.kind === "shipment") return s.shipments.find((y) => y.id === ref.id)?.name ?? ref.id;
  if (ref.kind === "supplier") return s.suppliers.find((y) => y.id === ref.id)?.name ?? ref.id;
  return ref.id;
}
