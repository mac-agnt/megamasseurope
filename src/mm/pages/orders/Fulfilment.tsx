import { go, markBooked, markDispatched, openPanel, recordPayment, useMM } from "../../store";
import { customerOf, eurEq, invoiceStatus, orderValue, outstanding, productOf } from "../../select";
import { dateShort, money, moneyShort, plural } from "../../format";
import { Badge, Button, Card, CountryTag, Grid, I, Icon, MONO, Note, Page, PageHead, ProductThumb, Row, Status, toneInk } from "../../ui";
import type { MMState, Order, OrderStatus } from "../../types";
import { allocation, carrierOf, etaOf, FB_SIM, invoiceOf, lcFirst, lineLabel, linesText, payState, readiness, sourceText, Thumbs, Tinted, unitCount } from "./shared";

const COLUMNS: { status: OrderStatus; hint: string }[] = [
  { status: "Payment confirmed", hint: "Paid in FreshBooks, machines being allocated" },
  { status: "Equipment allocated", hint: "Machines assigned, carrier to book" },
  { status: "Dispatched", hint: "Left County Derry, on the road" },
  { status: "Delivered", hint: "With the customer" },
];
const BEFORE_PAYMENT: OrderStatus[] = ["Quote accepted", "Invoice created", "Payment pending"];
const DELIVERED_SHOWN = 5;

export default function Fulfilment() {
  const s = useMM();
  const waiting = s.orders.filter((o) => BEFORE_PAYMENT.includes(o.status)).sort((a, b) => a.acceptedAt - b.acceptedAt);
  const ready = s.orders.filter((o) => readiness(s, o).ready);

  return (
    <Page>
      <PageHead title="Fulfilment"
        sub="From paid order to delivered machine. An order ships only when FreshBooks shows the payment and every machine is reserved from County Derry stock."
        right={<>
          <Badge tone={ready.length ? "ok" : "neutral"} dot>{plural(ready.length, "order")} ready to dispatch</Badge>
          <Button icon={I.box} onClick={() => go("Stock", "reservations")}>Reservations</Button>
        </>} />

      {waiting.length > 0 && <AwaitingPayment s={s} orders={waiting} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12, alignItems: "stretch" }}>
        {COLUMNS.map((col) => {
          const all = s.orders.filter((o) => o.status === col.status)
            .sort((a, b) => col.status === "Delivered" ? (b.deliveredAt ?? 0) - (a.deliveredAt ?? 0)
              : col.status === "Dispatched" ? (b.dispatchedAt ?? 0) - (a.dispatchedAt ?? 0)
              : Number(readiness(s, b).ready) - Number(readiness(s, a).ready) || a.acceptedAt - b.acceptedAt);
          const shown = col.status === "Delivered" ? all.slice(0, DELIVERED_SHOWN) : all;
          const value = all.reduce((n, o) => n + eurEq(orderValue(o), o.currency), 0);
          return (
            <div key={col.status} style={{ background: "var(--surface-faint)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", padding: 12, minWidth: 0 }}>
              <Row gap={8} style={{ padding: "2px 4px 0" }}>
                <Status s={col.status} />
                <span style={{ flex: 1 }} />
                <span style={{ ...MONO, fontSize: 12, color: "var(--ink)" }}>{all.length}</span>
              </Row>
              <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "7px 4px 12px", lineHeight: 1.4 }}>
                {col.hint}{all.length ? ". " + moneyShort(value) + " EUR eq." : ""}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {shown.length === 0 && (
                  <div style={{ padding: "22px 10px", textAlign: "center", fontSize: 12.5, color: "var(--faint)", border: "1px dashed var(--border)", borderRadius: 14 }}>No orders at this stage</div>
                )}
                {shown.map((o) => col.status === "Delivered" || col.status === "Dispatched"
                  ? <ShippedCard key={o.id} s={s} o={o} />
                  : <OrderCard key={o.id} s={s} o={o} />)}
                {all.length > shown.length && (
                  <button onClick={() => go("Orders", "confirmed")}
                    style={{ border: "1px solid var(--border)", background: "none", color: "var(--accent)", fontSize: 12.5, cursor: "pointer", padding: "9px 12px", borderRadius: 12 }}>
                    {all.length - shown.length} more delivered orders
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Note icon={I.truck}>Mark dispatched is only offered when an order is paid and every machine is reserved from County Derry stock. Dispatching releases the reservation and takes the machines off the stock count. Carrier booking happens outside Pulse.</Note>
    </Page>
  );
}

/* ── orders holding stock before payment ─────────────────────────────────── */

function AwaitingPayment({ s, orders }: { s: MMState; orders: Order[] }) {
  const units = orders.reduce((n, o) => n + allocation(s, o).stock, 0);
  return (
    <Card title="Stock held, payment not confirmed" hint={plural(units, "machine") + " reserved for " + plural(orders.length, "order") + ". They do not ship until FreshBooks shows the payment."}
      right={<Button size="sm" kind="ghost" icon={I.arrow} onClick={() => go("Orders", "invoices")}>Invoices</Button>}>
      <Grid cols="repeat(auto-fit,minmax(250px,1fr))" gap={10}>
        {orders.map((o) => {
          const c = customerOf(s, o.customerId);
          const inv = invoiceOf(s, o);
          const p = payState(s, o);
          const a = allocation(s, o);
          return (
            <div key={o.id} onClick={() => openPanel("order", o.id)} className="mm-card-click"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 13px", cursor: "pointer", minWidth: 0 }}>
              <Row gap={8}>
                <span style={{ ...MONO, fontSize: 11, color: "var(--faint)" }}>{o.id}</span>
                <span style={{ flex: 1 }} />
                <Status s={o.status} />
              </Row>
              <Row gap={7} style={{ marginTop: 7 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                <CountryTag c={c.country} />
              </Row>
              <Row gap={9} style={{ marginTop: 9 }}>
                <Thumbs s={s} lines={o.lines} size={26} />
                <div style={{ minWidth: 0, fontSize: 12, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {linesText(s, o.lines)}
                  <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{a.stock ? a.stock + " held from County Derry stock" : "Nothing held yet"}</div>
                </div>
              </Row>
              <div style={{ marginTop: 10, fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <Tinted tone={p.tone}>{inv ? inv.id + ": " + lcFirst(p.label) : p.label}</Tinted>
                <span style={{ color: "var(--faint)" }}>{", " + lcFirst(p.detail)}</span>
              </div>
              {inv && outstanding(s, inv) > 0 && (
                <Row gap={8} style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--faint)", flex: 1 }}>Payment in? Record it to release the order.</span>
                  <Button size="sm" title={FB_SIM} onClick={() => recordPayment(inv.id)}>Record payment</Button>
                </Row>
              )}
            </div>
          );
        })}
      </Grid>
    </Card>
  );
}

/* ── board cards ─────────────────────────────────────────────────────────── */

function OrderCard({ s, o }: { s: MMState; o: Order }) {
  const c = customerOf(s, o.customerId);
  const a = allocation(s, o);
  const r = readiness(s, o);
  const carrier = carrierOf(s, o);
  return (
    <div onClick={() => openPanel("order", o.id)} className="mm-card-click"
      style={{ background: "var(--surface)", border: "1px solid " + (r.ready ? "color-mix(in srgb, var(--ok) 35%, transparent)" : "var(--border)"),
        borderRadius: 14, padding: "12px 13px", cursor: "pointer", minWidth: 0 }}>
      <Row gap={8}>
        <span style={{ ...MONO, fontSize: 11, color: "var(--faint)" }}>{o.id}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(orderValue(o), o.currency)}</span>
      </Row>
      <Row gap={7} style={{ marginTop: 6 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
        <CountryTag c={c.country} />
      </Row>

      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10 }}>
        {a.lines.map((l) => {
          const src = sourceText(s, l, a.shipped);
          return (
            <Row key={l.productId} gap={9}>
              <ProductThumb p={productOf(s, l.productId)} size={28} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lineLabel(s, l)}</div>
                <div style={{ fontSize: 11, color: toneInk(src.tone), marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{src.label}</div>
              </div>
            </Row>
          );
        })}
      </div>

      <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, background: r.ready ? "var(--ok-soft)" : "var(--surface-2)" }}>
        <Row gap={7}>
          <Icon d={r.ready ? I.check : I.clock} size={13} style={{ color: r.ready ? "var(--ok)" : "var(--dim)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: r.ready ? "var(--ok)" : "var(--body)" }}>{r.ready ? "Ready to ship: yes" : "Ready to ship: no"}</span>
        </Row>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.45 }}>{r.why}</div>
      </div>

      {carrier && (
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>
          {carrier.name}, {carrier.booked ? "collection booked" : "collection not booked"}
          {o.eta ? ". " + o.eta : ""}
        </div>
      )}

      {r.ready && (
        <Row gap={7} wrap style={{ marginTop: 10 }}>
          <Button size="sm" kind="primary" icon={I.truck} onClick={() => markDispatched(o.id)}>Mark dispatched</Button>
          {carrier && !carrier.booked && <Button size="sm" kind="ghost" icon={I.calendar} onClick={() => markBooked(o.id)}>Mark booked</Button>}
        </Row>
      )}
    </div>
  );
}

function ShippedCard({ s, o }: { s: MMState; o: Order }) {
  const c = customerOf(s, o.customerId);
  const p = payState(s, o);
  const inv = invoiceOf(s, o);
  const when = o.status === "Delivered"
    ? (o.deliveredAt ? "Delivered " + dateShort(o.deliveredAt) : "Delivered")
    : (o.dispatchedAt ? "Left " + dateShort(o.dispatchedAt) : "On its way") + (etaOf(s, o) ? ". " + etaOf(s, o) : "");
  return (
    <div onClick={() => openPanel("order", o.id)} className="mm-card-click"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "11px 13px", cursor: "pointer", minWidth: 0 }}>
      <Row gap={8}>
        <span style={{ ...MONO, fontSize: 11, color: "var(--faint)" }}>{o.id}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(orderValue(o), o.currency)}</span>
      </Row>
      <Row gap={7} style={{ marginTop: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
        <CountryTag c={c.country} />
      </Row>
      <Row gap={9} style={{ marginTop: 8 }}>
        <Thumbs s={s} lines={o.lines} size={24} />
        <span style={{ fontSize: 12, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {o.lines.length === 1 ? lineLabel(s, o.lines[0]) : plural(unitCount(o.lines), "machine")}
        </span>
      </Row>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>{when}</div>
      <div style={{ fontSize: 11.5, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <Tinted tone={p.tone}>{inv ? inv.id + ": " + (invoiceStatus(s, inv) === "Paid" ? "paid" : lcFirst(p.label)) : p.label}</Tinted>
      </div>
    </div>
  );
}
