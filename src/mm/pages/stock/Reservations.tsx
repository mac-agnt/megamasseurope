import { useState } from "react";
import { go, openPanel, useMM } from "../../store";
import { customerOf, invoiceStatus, ix, productOf, stockOf } from "../../select";
import { dateShort, plural } from "../../format";
import { Badge, Button, Card, CountryTag, Grid, I, MONO, Note, Page, PageHead, ProductThumb, Row, Seg, Status, Table, type Col } from "../../ui";
import type { MMState, Product, Reservation } from "../../types";
import { intakeName, unitsHeld } from "../orders/shared";

type Filter = "all" | "stock" | "incoming";

export default function Reservations() {
  const s = useMM();
  const [f, setF] = useState<Filter>("all");
  const all = [...s.reservations].sort((a, b) => b.allocatedAt - a.allocatedAt);
  const fromStock = all.filter((r) => r.source === "Warehouse stock");
  const incoming = all.filter((r) => r.source === "Incoming");
  const rows = f === "stock" ? fromStock : f === "incoming" ? incoming : all;
  const customers = new Set(rows.map((r) => r.customerId)).size;

  /* Totals per machine, read straight from stockOf so they always match Availability. */
  const totals = s.products.map((p) => ({ p, st: stockOf(s, p) }));
  const whTotals = totals.filter((x) => x.st.reserved > 0);
  const incTotals = totals.filter((x) => x.st.incomingReserved > 0);
  const sh = s.shipments[0];

  return (
    <Page>
      <PageHead title="Reservations"
        sub="Every machine held for a customer, from County Derry stock or from an incoming shipment. Totals here are the same numbers Availability uses."
        right={<>
          <Button icon={I.box} onClick={() => go("Stock", "availability")}>Availability</Button>
          <Button icon={I.truck} onClick={() => go("Orders", "fulfilment")}>Fulfilment</Button>
        </>} />

      <Grid cols="minmax(0,1fr) minmax(0,1fr)" gap={14} style={{ alignItems: "stretch" }}>
        <Card title="Held from County Derry stock" hint={plural(whTotals.reduce((n, x) => n + x.st.reserved, 0), "machine") + " reserved across " + plural(whTotals.length, "model")}>
          {whTotals.map(({ p, st }, i) => (
            <TotalRow key={p.id} first={i === 0} p={p} onClick={() => openPanel("product", p.id)}
              value={st.reserved} tone="var(--accent)" label="reserved" detail={st.available + " of " + st.inStock + " still available"} />
          ))}
          {whTotals.length === 0 && <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nothing reserved from stock</div>}
        </Card>
        <Card title={"Held on the " + (sh ? sh.name : "incoming shipment")}
          hint={sh ? plural(incTotals.reduce((n, x) => n + x.st.incomingReserved, 0), "machine") + " held. " + sh.eta + ", " + (sh.confirmed ? "arrival confirmed" : "arrival not confirmed") : undefined}>
          {incTotals.map(({ p, st }, i) => (
            <TotalRow key={p.id} first={i === 0} p={p} onClick={() => openPanel("product", p.id)}
              value={st.incomingReserved} tone="var(--warn)" label="held" detail={st.incomingFree + " of " + st.incoming + " still free"} />
          ))}
          {incTotals.length === 0 && <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nothing held on incoming stock</div>}
          {sh && incTotals.length > 0 && (
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12 }}>Ships to these customers only after receipt at County Derry.</div>
          )}
        </Card>
      </Grid>

      <Card pad="16px 18px" title={plural(unitsHeld(rows), "machine") + " held for " + plural(customers, "customer")}
        hint="Newest allocation first. Dispatching an order releases its stock reservation."
        right={<Seg<Filter> value={f} onChange={setF} options={[
          ["all", "All " + all.length], ["stock", "From stock " + fromStock.length], ["incoming", "Incoming " + incoming.length],
        ]} />}>
        <Table rows={rows} rowKey={(r) => r.id} onRow={(r) => openPanel("order", r.orderId)} cols={cols(s)} empty="No reservations match this filter." />
      </Card>

      <Note icon={I.lock}>A reservation never takes available stock below zero. Committing incoming units to a new customer is a stock commitment and needs Niall's approval.</Note>
    </Page>
  );
}

function TotalRow({ p, value, tone, label, detail, first, onClick }: {
  p: Product; value: number; tone: string; label: string; detail: string; first: boolean; onClick: () => void;
}) {
  return (
    <div onClick={onClick} className="mm-row"
      style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: "8px 10px", margin: "0 -10px",
        borderRadius: 12, cursor: "pointer", borderTop: first ? undefined : "1px solid var(--border)" }}>
      <ProductThumb p={p} size={34} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{detail}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: tone, fontVariantNumeric: "tabular-nums" }}>{value}</span>
        <span style={{ fontSize: 11.5, color: "var(--faint)", marginLeft: 6 }}>{label}</span>
      </div>
    </div>
  );
}

function cols(s: MMState): Col<Reservation>[] {
  return [
    { key: "cust", label: "Customer", width: "minmax(0,1.3fr)", render: (r) => {
      const c = customerOf(s, r.customerId);
      return (
        <div style={{ minWidth: 0 }}>
          <Row gap={7}><span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span><CountryTag c={c.country} /></Row>
          <div style={{ ...MONO, fontSize: 10.5, color: "var(--faint)", marginTop: 3 }}>{r.orderId}</div>
        </div>
      );
    } },
    { key: "machine", label: "Machine", width: "minmax(0,1.3fr)", render: (r) => {
      const p = productOf(s, r.productId);
      return (
        <Row gap={9}>
          <ProductThumb p={p} size={28} />
          <span style={{ color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{p.name}</span>
        </Row>
      );
    } },
    { key: "units", label: "Units", width: "54px", align: "right", render: (r) => <span style={{ fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{r.units}</span> },
    { key: "inv", label: "Invoice", width: "140px", render: (r) => {
      const o = ix(s).order[r.orderId];
      const inv = o?.invoiceId ? ix(s).invoice[o.invoiceId] : undefined;
      return inv
        ? <Row gap={7}><span style={{ ...MONO, fontSize: 12 }}>{inv.id}</span><Status s={invoiceStatus(s, inv)} /></Row>
        : <span style={{ color: "var(--faint)" }}>Not raised yet</span>;
    } },
    { key: "at", label: "Allocated", width: "92px", render: (r) => <span style={{ whiteSpace: "nowrap" }}>{dateShort(r.allocatedAt)}</span> },
    { key: "window", label: "Arrival window", width: "minmax(0,1.1fr)", render: (r) => (
      <span title={r.window} style={{ color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{r.window}</span>
    ) },
    { key: "status", label: "Status", width: "160px", render: (r) => <Status s={r.status} /> },
    { key: "source", label: "Source", width: "110px", render: (r) => r.source === "Warehouse stock"
      ? <Badge tone="neutral">Warehouse</Badge>
      : <Badge tone="warn">{intakeName(s, r.shipmentId)}</Badge> },
  ];
}
