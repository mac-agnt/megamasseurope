import type { MMState, OrderStatus } from "../types";
import { markBooked, markDelivered, markDispatched } from "../store";
import { invoiceStatus, ix, orderValue, outstanding } from "../select";
import { Badge, Button, Facts, I, Icon, Note, ProductThumb, Status } from "../ui";
import { dateShort, money, plural, since } from "../format";
import {
  ActivityList, Box, Line2, Missing, Muted, OpenTasks, PanelBody, RecLink, RecordRow, RowList, Section, StageTrack, StatBand,
  activityFor, useNav,
} from "./kit";

/* Order record: where it is in the lifecycle, what it holds, and the
   invoice, freight and stock reservations behind it. */

const STEPS: OrderStatus[] = ["Quote accepted", "Invoice created", "Payment pending", "Payment confirmed", "Equipment allocated", "Dispatched", "Delivered"];

const tile = (d: string) => (
  <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--dim)",
    display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon d={d} size={16} /></span>
);

export default function OrderPanel({ s, id }: { s: MMState; id: string }) {
  const nav = useNav();
  const x = ix(s);
  const o = x.order[id];
  if (!o) return <Missing />;
  const c = x.customer[o.customerId];
  const inv = o.invoiceId ? x.invoice[o.invoiceId] : undefined;
  const f = o.freightId ? x.freight[o.freightId] : undefined;
  const carrier = f ? s.suppliers.find((su) => su.id === f.carrierId) : undefined;
  const cur = o.currency;
  const equipment = o.lines.reduce((n, l) => n + l.unitPrice * l.qty, 0);
  const res = s.reservations.filter((r) => r.orderId === o.id);
  const shipped = o.status === "Dispatched" || o.status === "Delivered";
  const paidUp = o.status === "Payment confirmed" || o.status === "Equipment allocated";
  const waitingStock = res.some((r) => r.source === "Incoming" && r.status === "Awaiting arrival");
  const canBook = !!f && !shipped && f.status !== "Booked" && f.status !== "Dispatched" && f.status !== "Delivered";
  const block = shipped ? null : !paidUp ? "Dispatch unlocks once payment is confirmed in FreshBooks."
    : waitingStock ? "Some machines on this order are still on the incoming shipment." : null;
  const out = inv ? outstanding(s, inv) : 0;

  const inTransit = o.status === "Dispatched";
  const actions = canBook || !shipped || inTransit ? (
    <>
      {!shipped && <Button kind="primary" icon={I.truck} disabled={!!block} title={block ?? "Records that the order left County Derry"} onClick={() => markDispatched(o.id)}>Mark dispatched</Button>}
      {canBook && <Button kind="secondary" icon={I.calendar} onClick={() => markBooked(o.id)}>Mark collection booked</Button>}
      {inTransit && <Button kind="primary" icon={I.check} title="Records that the customer has the machines" onClick={() => markDelivered(o.id)}>Mark delivered</Button>}
    </>
  ) : undefined;

  return (
    <PanelBody actions={actions} foot={!actions ? undefined : inTransit ? "Delivery is confirmed with the customer outside Pulse; this records it."
      : block ?? "Booking and dispatch happen with the carrier outside Pulse; this records them."}>
      <Section title="Lifecycle">
        <Box pad="18px 12px 14px">
          <StageTrack steps={STEPS} current={STEPS.indexOf(o.status)} />
          {(o.eta || block) && (
            <div style={{ marginTop: 14, padding: "0 6px", display: "flex", flexDirection: "column", gap: 8 }}>
              {o.eta && <Muted>Window: {o.eta}</Muted>}
              {block && <Note tone="warn" icon={I.clock}>{block}</Note>}
            </div>
          )}
        </Box>
      </Section>

      <StatBand items={[
        { label: "Order value", value: money(orderValue(o), cur), sub: "Ex VAT, " + cur },
        { label: "Equipment", value: money(equipment, cur), sub: plural(o.lines.reduce((n, l) => n + l.qty, 0), "machine") },
        { label: "Freight", value: money(o.freightCharge, cur), sub: carrier ? carrier.name : "Carrier not set" },
        { label: "Outstanding", value: inv ? money(out, cur) : "No invoice", tone: inv && invoiceStatus(s, inv) === "Overdue" ? "bad" : out > 0 ? "warn" : inv ? "ok" : undefined,
          sub: inv ? inv.id : "Not invoiced yet" },
      ]} />

      <Section title="Details">
        <Box>
          <Facts rows={[
            ["Customer", <RecLink kind="customer" id={c.id}>{c.name}</RecLink>],
            ["Quote", <RecLink kind="quote" id={o.quoteId}>{o.quoteId}</RecLink>],
            ["Accepted", dateShort(o.acceptedAt) + ", " + since(o.acceptedAt)],
            ["Window", o.eta ?? "Not set"],
            ["Dispatched", o.dispatchedAt ? dateShort(o.dispatchedAt) : "Not yet"],
            ["Delivered", o.deliveredAt ? dateShort(o.deliveredAt) : "Not yet"],
          ]} />
        </Box>
      </Section>

      <Section title="Lines">
        <Box pad="6px 6px 10px">
          {o.lines.map((l, i) => {
            const p = x.product[l.productId];
            if (!p) return null;
            return (
              <RecordRow key={i} onClick={() => nav.open("product", p.id)} lead={<ProductThumb p={p} size={40} />}
                title={l.qty + " × " + p.name} sub={money(l.unitPrice, cur) + " each · " + p.id}
                right={<span style={{ fontSize: 13.5, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(l.unitPrice * l.qty, cur)}</span>} />
            );
          })}
          <div style={{ padding: "2px 10px 0" }}>
            <Line2 top label="Equipment" value={money(equipment, cur)} />
            <Line2 label="Freight, agreed charge" value={money(o.freightCharge, cur)} />
            <Line2 strong label="Order total ex VAT" value={money(orderValue(o), cur)} />
          </div>
        </Box>
      </Section>

      <Section title="FreshBooks invoice">
        {inv ? (
          <Box pad="5px">
            <RecordRow onClick={() => nav.open("invoice", inv.id)} lead={tile(I.money)} title={inv.id + " · " + money(inv.amount, cur)}
              sub={"Due " + dateShort(inv.dueAt) + (out > 0 ? " · " + money(out, cur) + " outstanding" : " · paid in full")}
              right={<Status s={invoiceStatus(s, inv)} />} />
          </Box>
        ) : <Box><Muted>No FreshBooks invoice yet.</Muted></Box>}
      </Section>

      <Section title="Freight">
        {f ? (
          <Box pad="5px">
            <RecordRow onClick={() => nav.open("freight", f.id)} lead={tile(I.truck)} title={f.id + " · " + (carrier?.name ?? "Carrier")}
              sub={(f.carrierQuote ? "Ref " + f.carrierQuote.ref + " · " + f.carrierQuote.eta + " · " : "") + "charge " + money(o.freightCharge, cur)}
              right={<Status s={f.status} />} />
          </Box>
        ) : <Box><Muted>No freight request linked to this order.</Muted></Box>}
      </Section>

      <Section title="Stock reservations" right={res.length ? <Badge tone="neutral">{plural(res.reduce((n, r) => n + r.units, 0), "unit")}</Badge> : undefined}>
        <RowList rows={res} empty={shipped ? "Nothing reserved. Reservations clear once an order is dispatched." : "No stock reserved for this order yet."}
          render={(r) => {
            const p = x.product[r.productId];
            const sh = r.shipmentId ? s.shipments.find((y) => y.id === r.shipmentId) : undefined;
            return (
              <RecordRow onClick={() => (sh ? nav.open("shipment", sh.id) : nav.open("product", r.productId))}
                lead={p ? <ProductThumb p={p} size={36} /> : undefined}
                title={r.units + " × " + (p?.name ?? r.productId)}
                sub={(r.source === "Incoming" ? "Incoming, " + (sh?.name ?? "shipment") : "Warehouse stock") + " · " + r.window}
                right={<Status s={r.status} />} />
            );
          }} />
      </Section>

      <Section title="Activity">
        <ActivityList events={activityFor(s, [o.id, o.invoiceId ?? "", o.freightId ?? ""].filter(Boolean))} />
      </Section>

      <OpenTasks s={s} kind="order" id={o.id} />
    </PanelBody>
  );
}
