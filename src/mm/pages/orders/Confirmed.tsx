import { useState } from "react";
import { go, openPanel, useMM } from "../../store";
import { customerOf, eurEq, invoiceStatus, orderValue } from "../../select";
import { dateShort, money, plural, since } from "../../format";
import { Button, Card, CountryTag, I, MONO, Note, Page, PageHead, Row, Seg, Table, type Col } from "../../ui";
import type { MMState, Order } from "../../types";
import { allocation, allocationText, etaOf, invoiceOf, isShipped, lcFirst, MachinesCell, NumCell, payState, RATE_NOTE, StageText, Tinted } from "./shared";

type Filter = "all" | "progress" | "unpaid" | "delivered";

export default function ConfirmedOrders() {
  const s = useMM();
  const [f, setF] = useState<Filter>("all");
  const all = [...s.orders].sort((a, b) => b.acceptedAt - a.acceptedAt);
  const progress = all.filter((o) => !isShipped(o));
  const unpaid = all.filter((o) => !payState(s, o).paid);
  const delivered = all.filter((o) => o.status === "Delivered");
  const rows = f === "progress" ? progress : f === "unpaid" ? unpaid : f === "delivered" ? delivered : all;
  const total = rows.reduce((n, o) => n + eurEq(orderValue(o), o.currency), 0);
  const gbp = rows.some((o) => o.currency === "GBP");

  return (
    <Page>
      <PageHead title="Confirmed orders"
        sub="Every accepted quote with its FreshBooks invoice, payment, stock allocation and delivery on one line."
        right={<>
          <Button icon={I.money} onClick={() => go("Orders", "invoices")}>FreshBooks invoices</Button>
          <Button icon={I.truck} onClick={() => go("Orders", "fulfilment")}>Fulfilment</Button>
        </>} />

      <Note icon={I.link}>Accepted quotes create matching orders. FreshBooks stays the record for completed deals: Pulse reads invoices and payments, and anything it writes back is simulated in this demo.</Note>

      <Card pad="16px 18px"
        title={plural(rows.length, "order")}
        hint={money(total) + (gbp ? " " + RATE_NOTE : " in total")}
        right={<Seg<Filter> value={f} onChange={setF} options={[
          ["all", "All " + all.length], ["progress", "In progress " + progress.length], ["unpaid", "Unpaid " + unpaid.length], ["delivered", "Delivered " + delivered.length],
        ]} />}>
        <Table rows={rows} limit={14} rowKey={(o) => o.id} onRow={(o) => openPanel("order", o.id)} cols={cols(s)}
          empty="No orders match this filter." />
      </Card>
    </Page>
  );
}

function cols(s: MMState): Col<Order>[] {
  return [
    { key: "id", label: "Order", width: "84px", render: (o) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ ...MONO, color: "var(--ink)" }}>{o.id}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{since(o.acceptedAt)}</div>
      </div>
    ) },
    { key: "customer", label: "Customer", width: "minmax(0,1.25fr)", render: (o) => {
      const c = customerOf(s, o.customerId);
      return (
        <div style={{ minWidth: 0 }}>
          <Row gap={7}><span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span><CountryTag c={c.country} /></Row>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{c.city}</div>
        </div>
      );
    } },
    { key: "machines", label: "Machines", width: "minmax(0,1.35fr)", render: (o) => <MachinesCell s={s} lines={o.lines} /> },
    { key: "value", label: "Value", width: "92px", align: "right", render: (o) => <NumCell top={money(orderValue(o), o.currency)} sub={o.currency} /> },
    { key: "invoice", label: "FreshBooks", width: "92px", render: (o) => {
      const inv = invoiceOf(s, o);
      if (!inv) return <Tinted tone="neutral">Not raised</Tinted>;
      const st = invoiceStatus(s, inv);
      return (
        <div style={{ minWidth: 0 }}>
          <div style={{ ...MONO, color: "var(--ink)" }}>{inv.id}</div>
          <div style={{ fontSize: 11.5, marginTop: 2 }}><Tinted tone={st === "Paid" ? "ok" : st === "Overdue" ? "bad" : st === "Part paid" ? "warn" : "info"}>{st}</Tinted></div>
        </div>
      );
    } },
    { key: "payment", label: "Payment", width: "minmax(0,0.85fr)", render: (o) => {
      const p = payState(s, o);
      return (
        <div style={{ minWidth: 0 }}>
          <Tinted tone={p.tone}>{p.label}</Tinted>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.detail}</div>
        </div>
      );
    } },
    { key: "alloc", label: "Allocation", width: "minmax(0,0.9fr)", render: (o) => {
      const a = allocationText(allocation(s, o));
      return (
        <div style={{ minWidth: 0 }}>
          <Tinted tone={a.tone}>{a.label}</Tinted>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.sub}</div>
        </div>
      );
    } },
    { key: "delivery", label: "Delivery", width: "minmax(0,1fr)", render: (o) => (
      <div style={{ minWidth: 0 }}>
        <StageText status={o.status} />
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deliveryNote(s, o)}</div>
      </div>
    ) },
  ];
}

function deliveryNote(s: MMState, o: Order): string {
  const eta = etaOf(s, o);
  if (o.status === "Delivered") return o.deliveredAt ? "Delivered " + dateShort(o.deliveredAt) : "Delivered";
  if (o.status === "Dispatched") return (o.dispatchedAt ? "Left " + dateShort(o.dispatchedAt) : "On its way") + (eta ? ", " + lcFirst(eta) : "");
  return eta ?? "Delivery date set at dispatch";
}
