import type { MMState } from "../types";
import { ix, productDemand, stockOf } from "../select";
import { Badge, Confidential, Facts, I, MONO, Note, ProductThumb, Status } from "../ui";
import { money, plural, since } from "../format";
import {
  ActivityList, Box, Missing, Muted, OpenTasks, PanelBody, RecordRow, RowList, Section, Stat, StatBand, activityFor, isOpenStage, labelOutdated, useNav,
} from "./kit";

/* Machine record: catalogue facts, private prices, stock position,
   open demand and who has units reserved. */

export default function ProductPanel({ s, id }: { s: MMState; id: string }) {
  const nav = useNav();
  const x = ix(s);
  const p = x.product[id];
  if (!p) return <Missing />;
  const st = stockOf(s, p);
  const qtyOf = (lines: { productId: string; qty: number }[]) => lines.filter((l) => l.productId === p.id).reduce((n, l) => n + l.qty, 0);
  const demand = s.enquiries.filter((e) => isOpenStage(e.stage) && e.lines.some((l) => l.productId === p.id)).sort((a, b) => b.receivedAt - a.receivedAt);
  const demandUnits = demand.reduce((n, e) => n + qtyOf(e.lines), 0);
  const allTime = productDemand(s).find((d) => d.product.id === p.id);
  const res = s.reservations.filter((r) => r.productId === p.id);
  const ships = s.shipments.filter((sh) => sh.lines.some((l) => l.productId === p.id));
  const outdated = labelOutdated(p.websiteLabel);
  const events = activityFor(s, [p.id]);

  return (
    <PanelBody>
      <Box pad="16px">
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <ProductThumb p={p} size={164} />
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <Facts rows={[
              ["SKU", <span style={{ ...MONO, fontSize: 12.5 }}>{p.id}</span>],
              ["Series", p.series],
              ["Range", p.range],
              ["Category", p.category],
              ["Weight", p.weightKg ? p.weightKg + " kg" : <span style={{ color: "var(--warn)" }}>TBC in catalogue</span>],
              ["Dimensions", p.dims ?? <span style={{ color: "var(--warn)" }}>TBC in catalogue</span>],
            ]} />
          </div>
        </div>
      </Box>

      <Section title="Website" right={outdated ? <Badge tone="warn" dot>Out of date</Badge> : undefined}>
        <Box>
          <Facts rows={[
            ["Availability label", p.websiteLabel],
            ["Requested in", allTime ? plural(allTime.enquiries, "enquiry", "enquiries") + ", " + plural(allTime.units, "unit") : "No enquiries"],
          ]} />
          {outdated && (
            <Note tone="warn" style={{ marginTop: 12 }}>
              The product page still says “{p.websiteLabel}”. {st.available > 0 ? st.available + " are available in County Derry now." : "Check stock before changing it."}
            </Note>
          )}
        </Box>
      </Section>

      <Section title="Private price book" right={<Confidential />}>
        <Box pad="16px 18px">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 18 }}>
            <Stat label="EUR price" value={money(p.eur, "EUR")} sub="Ex VAT, demo value" />
            <Stat label="GBP price" value={money(p.gbp, "GBP")} sub="Ex VAT, demo value" />
          </div>
          <Muted style={{ marginTop: 12, fontSize: 12 }}>Same for every customer apart from currency. No automatic discounts; overrides need your approval.</Muted>
        </Box>
      </Section>

      <Section title="Stock">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <StatBand items={[
            { label: "In stock", value: st.inStock, sub: "County Derry" },
            { label: "Reserved", value: st.reserved, sub: "On orders" },
            { label: "Available", value: st.available, tone: st.available < 0 ? "bad" : st.available === 0 ? "warn" : "ok", sub: "To promise now" },
            { label: "Incoming", value: st.incoming, sub: st.incoming ? st.incomingReserved + " reserved, " + st.incomingFree + " free" : "None due" },
          ]} />
          {st.available < 0 && <Note tone="bad">Available stock is negative. More units are reserved than are on the shelf; check reservations before committing more.</Note>}
          {st.available <= 0 && st.incomingFree > 0 && <Note tone="warn" icon={I.clock}>Only incoming units can be offered, and the arrival date is not confirmed.</Note>}
        </div>
      </Section>

      <Section title="Open demand" right={<span style={{ ...MONO, fontSize: 10, color: "var(--faint)" }}>{plural(demand.length, "enquiry", "enquiries")} · {plural(demandUnits, "unit")}</span>}>
        <RowList rows={demand} limit={6} empty="No open enquiries for this machine." render={(e) => {
          const c = x.customer[e.customerId];
          return (
            <RecordRow onClick={() => nav.open("enquiry", e.id)} title={c.name}
              sub={e.id + " · " + qtyOf(e.lines) + " × · received " + since(e.receivedAt)} right={<Status s={e.stage} />} />
          );
        }} />
      </Section>

      <Section title="Reservations" right={res.length ? <span style={{ ...MONO, fontSize: 10, color: "var(--faint)" }}>{plural(res.reduce((n, r) => n + r.units, 0), "unit")}</span> : undefined}>
        <RowList rows={res} empty="Nothing reserved on this machine." render={(r) => (
          <RecordRow onClick={() => nav.open("order", r.orderId)} title={(x.customer[r.customerId]?.name ?? r.customerId) + " · " + plural(r.units, "unit")}
            sub={r.orderId + " · " + (r.source === "Incoming" ? "Incoming" : "Warehouse stock") + " · " + r.window} right={<Status s={r.status} />} />
        )} />
      </Section>

      {ships.length > 0 && (
        <Section title="Incoming">
          <RowList rows={ships} render={(sh) => (
            <RecordRow onClick={() => nav.open("shipment", sh.id)} title={sh.name}
              sub={sh.eta + " · " + plural(sh.lines.filter((l) => l.productId === p.id).reduce((n, l) => n + l.units, 0), "unit") + " of this machine"}
              right={sh.confirmed ? <Badge tone="ok">Confirmed</Badge> : <Badge tone="warn">Not confirmed</Badge>} />
          )} />
        </Section>
      )}

      <OpenTasks s={s} kind="product" id={p.id} />

      {events.length > 0 && (
        <Section title="Activity">
          <ActivityList events={events} />
        </Section>
      )}
    </PanelBody>
  );
}
