import { useState } from "react";
import type { MMState, Order, OrderStatus, Reservation } from "../../types";
import { openPanel, useMM } from "../../store";
import { invoiceStatus, ix, orderValue } from "../../select";
import { Cell, I, Money, Page, Seg, Status, Table, type Col, type Tone } from "../../ui";
import { countryName, dateShort, num, plural } from "../../format";
import { HeadRow, NONE, RecChip, SearchBox, TableFrame, matches } from "./shared";

/* Records › Orders: each order as a record, linked to its quote, FreshBooks
   invoice, freight request and stock reservations. Chips open those records. */

type Group = "All" | "Awaiting payment" | "Ready to ship" | "Dispatched" | "Delivered";
const GROUP_OF: Record<OrderStatus, Exclude<Group, "All">> = {
  "Quote accepted": "Awaiting payment", "Invoice created": "Awaiting payment", "Payment pending": "Awaiting payment",
  "Payment confirmed": "Ready to ship", "Equipment allocated": "Ready to ship", Dispatched: "Dispatched", Delivered: "Delivered",
};
const GROUPS: Exclude<Group, "All">[] = ["Awaiting payment", "Ready to ship", "Dispatched", "Delivered"];

const INVOICE_TONE: Record<string, Tone> = { Paid: "ok", Overdue: "bad", "Part paid": "warn", Sent: "info" };
const FREIGHT_TONE: Record<string, Tone> = { "To request": "neutral", "Awaiting rate": "warn", "Rate received": "ok", Booked: "info", Dispatched: "info", Delivered: "ok" };

function columns(s: MMState): Col<Order>[] {
  const x = ix(s);
  const resOf = (o: Order): Reservation[] => s.reservations.filter((r) => r.orderId === o.id);
  return [
    { key: "id", label: "Order", width: "118px", render: (o) => <Cell top={<span style={{ fontVariantNumeric: "tabular-nums" }}>{o.id}</span>} sub={"Accepted " + dateShort(o.acceptedAt)} /> },
    { key: "cust", label: "Customer", width: "minmax(180px,1.4fr)", render: (o) => {
      const c = x.customer[o.customerId];
      return <Cell top={c?.name ?? o.customerId} sub={c ? c.city + ", " + countryName(c.country) : undefined} />;
    } },
    { key: "status", label: "Status", width: "152px", render: (o) => <Status s={o.status} /> },
    { key: "value", label: "Value", width: "96px", align: "right", render: (o) => <Money v={orderValue(o)} cur={o.currency} /> },
    { key: "quote", label: "Quote", width: "92px", render: (o) => <RecChip kind="quote" id={o.quoteId} icon={I.quote} /> },
    { key: "inv", label: "Invoice", width: "104px", render: (o) => {
      const inv = o.invoiceId ? x.invoice[o.invoiceId] : undefined;
      if (!inv) return NONE;
      const st = invoiceStatus(s, inv);
      return <RecChip kind="invoice" id={inv.id} tone={INVOICE_TONE[st] ?? "neutral"} title={"FreshBooks " + inv.id + ", " + st.toLowerCase()} />;
    } },
    { key: "freight", label: "Freight", width: "98px", render: (o) => {
      const f = o.freightId ? x.freight[o.freightId] : undefined;
      if (!f) return NONE;
      return <RecChip kind="freight" id={f.id} tone={FREIGHT_TONE[f.status] ?? "neutral"} title={f.id + ", " + f.status.toLowerCase()} />;
    } },
    { key: "res", label: "Reservations", width: "minmax(190px,1.4fr)", render: (o) => {
      const res = resOf(o);
      if (!res.length) return NONE;
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, minWidth: 0 }}>
          {res.map((r) => {
            const p = x.product[r.productId];
            const incoming = r.source === "Incoming" && r.shipmentId;
            return (
              <RecChip key={r.id} kind={incoming ? "shipment" : "product"} id={incoming ? (r.shipmentId as string) : r.productId}
                icon={incoming ? I.calendar : I.box} label={r.units + " × " + (p?.name ?? r.productId)}
                title={(incoming ? "Incoming stock, " + r.window : "Warehouse stock, " + r.window) + ". " + r.status + "."} />
            );
          })}
        </div>
      );
    } },
  ];
}

export default function OrdersTab() {
  const s = useMM();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<Group>("All");
  const x = ix(s);
  const all = [...s.orders].sort((a, b) => b.acceptedAt - a.acceptedAt);
  const count = (g: Group) => (g === "All" ? all.length : all.filter((o) => GROUP_OF[o.status] === g).length);
  const options: [Group, string][] = [["All", "All " + all.length], ...GROUPS.map((g): [Group, string] => [g, g + " " + count(g)])];
  const rows = all.filter((o) => (group === "All" || GROUP_OF[o.status] === group)
    && matches(q, o.id, o.quoteId, o.invoiceId, o.freightId, x.customer[o.customerId]?.name, x.customer[o.customerId]?.city));

  const reserved = s.reservations.reduce((n, r) => n + r.units, 0);
  const incoming = s.reservations.filter((r) => r.source === "Incoming").reduce((n, r) => n + r.units, 0);

  return (
    <Page>
      <HeadRow title="Orders" count={all.length}
        summary={num(count("Awaiting payment")) + " awaiting payment · " + num(count("Ready to ship")) + " ready to ship · "
          + plural(reserved, "unit") + " reserved, " + num(incoming) + " on incoming stock"}>
        <SearchBox value={q} onChange={setQ} label="Search order or customer" />
      </HeadRow>
      <div><Seg<Group> options={options} value={group} onChange={setGroup} /></div>
      <TableFrame min={1080}>
        <Table cols={columns(s)} rows={rows} rowKey={(o) => o.id} limit={20} onRow={(o) => openPanel("order", o.id)}
          empty={q ? "No order matches “" + q + "”." : "No orders in this group."} />
      </TableFrame>
    </Page>
  );
}
