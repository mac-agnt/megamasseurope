import type { MMState } from "../types";
import { ix } from "../select";
import { Avatar, I, MONO, Note, ProductThumb, Status } from "../ui";
import { plural } from "../format";
import { ActivityList, Box, Missing, OpenTasks, PanelBody, RecordRow, RowList, Section, StatBand, activityFor, useNav } from "./kit";

/* Incoming stock: what is on the way, what is already promised to customers,
   and what is still free. Arrival is never treated as confirmed until it is. */

function Split({ allocated, free }: { allocated: number; free: number }) {
  return (
    <span style={{ display: "flex", width: 96, height: 6, gap: 2, flex: "none" }} aria-label={allocated + " allocated, " + free + " free"}>
      {allocated > 0 && <span style={{ flex: allocated, background: "var(--accent)", borderRadius: 3 }} />}
      {free > 0 && <span style={{ flex: free, background: "var(--border-strong)", borderRadius: 3 }} />}
    </span>
  );
}

export default function ShipmentPanel({ s, id }: { s: MMState; id: string }) {
  const nav = useNav();
  const x = ix(s);
  const sh = s.shipments.find((y) => y.id === id);
  if (!sh) return <Missing />;
  const res = s.reservations.filter((r) => r.shipmentId === sh.id);
  const lines = sh.lines.map((l) => {
    const allocated = res.filter((r) => r.productId === l.productId).reduce((n, r) => n + r.units, 0);
    return { p: x.product[l.productId], units: l.units, allocated, free: l.units - allocated };
  });
  const total = lines.reduce((n, l) => n + l.units, 0);
  const allocated = lines.reduce((n, l) => n + l.allocated, 0);
  const free = total - allocated;
  const customers = new Set(res.map((r) => r.customerId)).size;

  return (
    <PanelBody>
      <Note tone={sh.confirmed ? "ok" : "warn"} icon={sh.confirmed ? I.check : I.clock}>
        {sh.confirmed ? "Arrival confirmed. " + sh.note : sh.note}
      </Note>

      <StatBand items={[
        { label: "Units incoming", value: total, sub: sh.eta },
        { label: "Allocated", value: allocated, sub: plural(customers, "customer") },
        { label: "Unallocated", value: free, tone: free < 0 ? "bad" : free > 0 ? "accent" : undefined, sub: free < 0 ? "Over-allocated" : "Free to offer" },
        { label: "Arrival", value: sh.confirmed ? "Confirmed" : "Unconfirmed", tone: sh.confirmed ? "ok" : "warn", sub: sh.eta },
      ]} />

      <Section title="Per machine">
        <Box pad="5px">
          {lines.map(({ p, units, allocated: a, free: f }) => p && (
            <RecordRow key={p.id} onClick={() => nav.open("product", p.id)} lead={<ProductThumb p={p} size={40} />}
              title={p.name} sub={plural(units, "unit") + " incoming · " + a + " allocated · " + f + " free"}
              right={<Split allocated={a} free={Math.max(0, f)} />} />
          ))}
        </Box>
      </Section>

      <Section title="Reserved for customers" right={<span style={{ ...MONO, fontSize: 10, color: "var(--faint)" }}>{plural(allocated, "unit")}</span>}>
        <RowList rows={res} limit={8} empty="Nothing reserved against this shipment yet." render={(r) => {
          const c = x.customer[r.customerId];
          const p = x.product[r.productId];
          return (
            <RecordRow onClick={() => nav.open("order", r.orderId)} lead={<Avatar name={c?.name ?? r.customerId} size={28} />}
              title={(c?.name ?? r.customerId) + " · " + r.units + " × " + (p?.name ?? r.productId)}
              sub={r.orderId + " · " + r.window} right={<Status s={r.status} />} />
          );
        }} />
      </Section>

      <OpenTasks s={s} kind="shipment" id={sh.id} />

      <Section title="Activity">
        <ActivityList events={activityFor(s, [sh.id])} />
      </Section>
    </PanelBody>
  );
}
