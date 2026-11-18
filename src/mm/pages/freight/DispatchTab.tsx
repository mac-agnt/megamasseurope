import type { ReactNode } from "react";
import type { MMState } from "../../types";
import { go, markBooked, markDispatched, openPanel } from "../../store";
import { ix } from "../../select";
import { dateShort, money, plural, since } from "../../format";
import { Badge, Button, Card, CountryTag, Facts, Grid, I, Icon, MONO, Note, Page, PageHead, ProductThumb, Row, Status } from "../../ui";
import { DAY, dispatchBoard, intakes, splitPlace, type DispatchItem } from "./lib";
import { joinAnd, ToConfirm } from "./bits";

/* Dispatch: paid orders ready to book, orders waiting on incoming stock,
   what is on the road and what arrived. Collections are booked with the
   carrier outside Pulse: there is no automated booking. */

function Column({ title, count, hint, tone, children }: { title: string; count: number; hint: string; tone: "accent" | "warn" | "info" | "ok"; children: ReactNode }) {
  return (
    <Card pad="16px 14px 14px" title={title} hint={hint} right={<Badge tone={count ? tone : "neutral"}>{count}</Badge>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </Card>
  );
}

function Tile({ s, it, eta, children }: { s: MMState; it: DispatchItem; eta: ReactNode; children?: ReactNode }) {
  const { o, c, f, carrier } = it;
  const x = ix(s);
  const first = o.lines[0] ? x.product[o.lines[0].productId] : undefined;
  const lines = o.lines.map((l) => (l.qty > 1 ? l.qty + " × " : "") + (x.product[l.productId]?.name ?? l.productId)).join(", ");
  const [place, country] = f ? splitPlace(f.destination) : [c.city, ""];
  return (
    <div className="mm-card-click" onClick={() => openPanel("order", o.id)}
      style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "12px 13px 13px", background: "var(--surface-faint)",
        display: "flex", flexDirection: "column", gap: 10, cursor: "pointer", minWidth: 0 }}>
      <div>
        <Row gap={8}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
          <CountryTag c={c.country} />
        </Row>
        <Row gap={8} style={{ marginTop: 6 }}>
          <span style={{ ...MONO, fontSize: 11, color: "var(--dim)" }}>{o.id}</span>
          <Status s={o.status} />
        </Row>
      </div>
      <Row gap={9}>
        {first && <ProductThumb p={first} size={34} />}
        <span style={{ fontSize: 12, color: "var(--body)", lineHeight: 1.4, minWidth: 0 }}>{lines}</span>
      </Row>
      <Facts cols={2} rows={[
        ["Destination", place + (country ? ", " + country : "")],
        ["Carrier", <Row gap={5} wrap>{carrier?.name ?? "To confirm"}<ToConfirm sup={carrier} /></Row>],
        ["Freight charge", money(o.freightCharge, o.currency)],
        ["ETA", eta],
      ]} />
      {children}
    </div>
  );
}

const Line = ({ icon, top, sub, tone }: { icon: string; top: ReactNode; sub?: ReactNode; tone?: string }) => (
  <Row gap={8} style={{ alignItems: "flex-start" }}>
    <span style={{ color: tone ?? "var(--dim)", marginTop: 1 }}><Icon d={icon} size={13} /></span>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, color: "var(--ink)" }}>{top}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>{sub}</div>}
    </div>
  </Row>
);

export default function DispatchTab({ s }: { s: MMState }) {
  const x = ix(s);
  const b = dispatchBoard(s);
  const pname = (id: string) => x.product[id]?.name ?? id;
  const transitOf = (it: DispatchItem) => it.f?.carrierQuote?.eta;

  return (
    <Page>
      <PageHead title="Dispatch"
        sub="Paid orders ready to leave County Derry, orders waiting on incoming stock, and what is on the road. Collections are booked with the carrier outside Pulse."
        right={<Badge tone="neutral" dot>No automated booking</Badge>} />

      <Grid cols="repeat(auto-fit,minmax(250px,1fr))" gap={14}>
        <Column title="Ready to book" count={b.ready.length} tone="accent" hint="Paid or allocated, stock reserved in County Derry">
          {b.ready.length === 0 && <Note>Nothing ready to book. Paid orders with reserved stock land here.</Note>}
          {b.ready.map((it) => {
            const booked = it.f?.status === "Booked";
            const transit = transitOf(it);
            return (
              <Tile key={it.o.id} s={s} it={it} eta={booked ? "Collection booked" : it.o.eta ?? "Not booked yet"}>
                {it.warehouse.length > 0
                  ? <Line icon={I.box} top={"Reserved: " + it.warehouse.map((r) => r.units + " × " + pname(r.productId)).join(", ")}
                      sub={transit ? "Carrier transit " + transit.toLowerCase() : undefined} />
                  : <Line icon={I.alert} tone="var(--warn)" top="No warehouse stock reserved yet" />}
                <Row gap={6} wrap>
                  {booked
                    ? <Badge tone="info" dot>Booked</Badge>
                    : <Button kind="primary" size="sm" icon={I.calendar} onClick={() => markBooked(it.o.id)}>Mark booked</Button>}
                  <Button kind={booked ? "primary" : "secondary"} size="sm" icon={I.truck} disabled={!booked}
                    title={booked ? "Record that the collection has left County Derry" : "Mark the collection as booked first"}
                    onClick={() => markDispatched(it.o.id)}>Mark dispatched</Button>
                </Row>
                <div style={{ fontSize: 11, color: "var(--faint)", lineHeight: 1.45 }}>Booked with the carrier outside Pulse. No automated booking.</div>
              </Tile>
            );
          })}
        </Column>

        <Column title="Waiting on stock" count={b.waiting.length} tone="warn" hint="Reserved on incoming stock, awaiting arrival">
          {intakes(s).map(({ sh, units, reserved, free }) => (
            <div key={sh.id} className="mm-row" onClick={() => openPanel("shipment", sh.id)}
              style={{ borderRadius: 12, padding: "10px 12px", border: "1px dashed var(--border-strong)", cursor: "pointer" }}>
              <Row gap={8}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{sh.name}</span>
                {!sh.confirmed && <Badge tone="warn" style={{ height: 20 }}>Unconfirmed</Badge>}
              </Row>
              <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4 }}>
                {sh.eta} · {plural(units, "unit")}: {reserved} reserved, {free} unallocated
              </div>
            </div>
          ))}
          {b.waiting.length === 0 && <Note>No orders waiting on incoming stock.</Note>}
          {b.waiting.map((it) => (
            <Tile key={it.o.id} s={s} it={it} eta={it.o.eta ?? it.awaiting[0]?.window ?? "On arrival"}>
              {it.awaiting.map((r) => {
                const sh = s.shipments.find((z) => z.id === r.shipmentId);
                return <Line key={r.id} icon={I.clock} tone="var(--warn)" top={r.units + " × " + pname(r.productId) + " awaiting arrival"}
                  sub={(sh ? sh.name + ", " : "") + r.window} />;
              })}
              {it.warehouse.map((r) => (
                <Line key={r.id} icon={I.box} top={r.units + " × " + pname(r.productId) + " held in County Derry"} sub={r.window} />
              ))}
            </Tile>
          ))}
        </Column>

        <Column title="Dispatched" count={b.transit.length} tone="info" hint="Left County Derry, on the road">
          {b.transit.length === 0 && <Note>Nothing on the road right now.</Note>}
          {b.transit.map((it) => {
            const fresh = (it.o.dispatchedAt ?? 0) > s.now;
            const transit = transitOf(it);
            const eta = fresh || !it.o.eta ? (transit ? "Transit " + transit.toLowerCase() : "To confirm with the carrier") : it.o.eta;
            return (
              <Tile key={it.o.id} s={s} it={it} eta={eta}>
                <Line icon={I.truck} top={"Dispatched " + (it.o.dispatchedAt ? since(it.o.dispatchedAt) : "")}
                  sub={it.o.dispatchedAt ? dateShort(it.o.dispatchedAt) + (fresh ? ". Marked in Pulse this session." : "") : undefined} />
              </Tile>
            );
          })}
        </Column>

        <Column title="Delivered" count={b.delivered.length} tone="ok" hint="Arrived in the last 30 days">
          {b.delivered.length === 0 && <Note>No deliveries in the last 30 days.</Note>}
          {b.delivered.map((it) => {
            const door = it.o.deliveredAt && it.o.dispatchedAt ? Math.max(1, Math.round((it.o.deliveredAt - it.o.dispatchedAt) / DAY)) : null;
            return (
              <Tile key={it.o.id} s={s} it={it} eta={it.o.deliveredAt ? "Delivered " + dateShort(it.o.deliveredAt) : "Delivered"}>
                <Line icon={I.check} tone="var(--ok)" top={door ? plural(door, "day") + " from dispatch to delivery" : "Delivered"}
                  sub={(it.o.dispatchedAt ? "Dispatched " + dateShort(it.o.dispatchedAt) : "") + (it.o.deliveredAt ? (it.o.dispatchedAt ? ", arrived " : "Arrived ") + since(it.o.deliveredAt) : "")} />
              </Tile>
            );
          })}
          {b.olderDelivered > 0 && (
            <button type="button" onClick={() => go("Orders", "fulfilment")}
              style={{ border: 0, background: "none", color: "var(--accent)", fontSize: 12.5, cursor: "pointer", textAlign: "left", padding: "2px 4px" }}>
              {plural(b.olderDelivered, "earlier delivery", "earlier deliveries")} in Orders
            </button>
          )}
        </Column>
      </Grid>

      {b.unpaid.length > 0 && (
        <Card pad="14px 18px">
          <Row gap={12} wrap>
            <Icon d={I.money} size={16} style={{ color: "var(--dim)" }} />
            <div style={{ flex: "1 1 360px", minWidth: 0, fontSize: 13, color: "var(--body)", lineHeight: 1.5 }}>
              {plural(b.unpaid.length, "more order")} {b.unpaid.length === 1 ? "is" : "are"} waiting on invoicing or payment before {b.unpaid.length === 1 ? "it" : "they"} can ship:{" "}
              {joinAnd(b.unpaid.map((it) => it.c.name + " (" + it.o.status.toLowerCase() + ")"))}.
            </div>
            <Button kind="secondary" size="sm" icon={I.arrow} onClick={() => go("Orders", "confirmed")}>View in Orders</Button>
          </Row>
        </Card>
      )}
    </Page>
  );
}
