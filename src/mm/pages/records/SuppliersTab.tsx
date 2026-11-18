import type { MMState, Supplier } from "../../types";
import { openPanel, useMM } from "../../store";
import { carrierStats, ix } from "../../select";
import { Badge, Button, Card, Grid, I, Icon, Label, MONO, Note, Page, Status } from "../../ui";
import { num, plural, since } from "../../format";
import { DAY, RecordRow, Stat } from "../../panel/kit";
import { HeadRow } from "./shared";

/* Records › Suppliers: the two carriers named on the call and the manufacturer.
   Carriers stay "to confirm" and are never shown as live integrations. */

/** "Greyhound Express <quotes@…>" reads as "Greyhound Express". */
const nameOnly = (who: string) => who.replace(/\s*<[^>]*>\s*$/, "");

function SupplierCard({ s, su }: { s: MMState; su: Supplier }) {
  const x = ix(s);
  const carrier = su.kind === "Carrier";
  const stats = carrierStats(s, su.id);
  const now = Date.now();
  const open = s.freight.filter((f) => f.carrierId === su.id && (f.status === "To request" || f.status === "Awaiting rate"))
    .sort((a, b) => (a.requestedAt ?? Infinity) - (b.requestedAt ?? Infinity));
  const mails = s.emails.filter((m) => m.supplierId === su.id).sort((a, b) => b.at - a.at).slice(0, 3);
  const units = s.shipments.reduce((n, sh) => n + sh.lines.reduce((m, l) => m + l.units, 0), 0);
  const reservedIncoming = s.reservations.filter((r) => r.source === "Incoming").reduce((n, r) => n + r.units, 0);

  return (
    <Card pad="18px 20px" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ width: 38, height: 38, flex: "none", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--dim)",
          display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={carrier ? I.truck : I.globe} size={17} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.2px", color: "var(--ink)" }}>{su.name}</span>
            <Badge tone="neutral">{su.kind}</Badge>
            {!su.confirmed && <Badge tone="warn" dot>To confirm</Badge>}
          </div>
          <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>{su.region} · {su.lanes}</div>
        </div>
        <Button size="sm" kind="secondary" icon={I.arrow} onClick={() => openPanel("supplier", su.id)} title={"Open " + su.name}>Open</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "10px 16px" }}>
        <div>
          <div style={{ ...MONO, fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" }}>Workflow</div>
          <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 4 }}>{su.workflow}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...MONO, fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" }}>Email</div>
          <div style={{ ...MONO, fontSize: 11.5, color: "var(--body)", marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={su.email}>{su.email}</div>
        </div>
      </div>

      <Note tone={carrier && !su.confirmed ? "warn" : "neutral"} icon={carrier && !su.confirmed ? I.alert : I.file}>{su.note}</Note>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14, padding: "14px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        {carrier ? (
          <>
            <Stat label="Open requests" value={open.length} sub={stats.waiting + " awaiting a rate"} />
            <Stat label="Average reply" value={stats.replied ? Math.round(stats.avgHours) + " h" : "No data"} sub={plural(stats.replied, "rate") + " on record"} />
            <Stat label="Late" value={stats.late} tone={stats.late ? "warn" : undefined} sub="Over three days" />
          </>
        ) : (
          <>
            <Stat label="Shipments" value={s.shipments.length} sub="Incoming" />
            <Stat label="Units incoming" value={units} sub={num(reservedIncoming) + " already reserved"} />
            <Stat label="Unconfirmed" value={s.shipments.filter((sh) => !sh.confirmed).length} tone={s.shipments.some((sh) => !sh.confirmed) ? "warn" : undefined} sub="Arrival dates" />
          </>
        )}
      </div>

      <div>
        <Label style={{ marginBottom: 6 }}>{carrier ? "Oldest open requests" : "Incoming stock"}</Label>
        {carrier ? (
          open.length ? open.slice(0, 4).map((f) => {
            const late = f.status === "Awaiting rate" && f.requestedAt !== null && now - f.requestedAt > 3 * DAY;
            return (
              <RecordRow key={f.id} onClick={() => openPanel("freight", f.id)} title={f.id + " · " + (x.customer[f.customerId]?.name ?? "")}
                sub={f.requestedAt !== null ? "Requested " + since(f.requestedAt) + (f.chases ? " · " + plural(f.chases, "chase") : "") : "Drafted, waiting for approval"}
                right={late ? <Badge tone="warn" dot>Late</Badge> : <Status s={f.status} />} />
            );
          }) : <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "6px 0" }}>Nothing open with this carrier.</div>
        ) : (
          s.shipments.map((sh) => (
            <RecordRow key={sh.id} onClick={() => openPanel("shipment", sh.id)} title={sh.name}
              sub={sh.eta + " · " + plural(sh.lines.reduce((n, l) => n + l.units, 0), "unit")}
              right={sh.confirmed ? <Badge tone="ok">Confirmed</Badge> : <Badge tone="warn">Not confirmed</Badge>} />
          ))
        )}
        {carrier && open.length > 4 && (
          <button onClick={() => openPanel("supplier", su.id)} style={{ border: 0, background: "none", color: "var(--accent)", fontSize: 12.5, cursor: "pointer", padding: "6px 10px 0", fontFamily: "inherit" }}>
            All {open.length} open requests
          </button>
        )}
      </div>

      <div>
        <Label style={{ marginBottom: 6 }}>Recent emails</Label>
        {mails.length ? mails.map((m) => (
          <RecordRow key={m.id} onClick={() => openPanel(m.recordKind, m.recordId)}
            lead={<span style={{ color: m.direction === "in" ? "var(--accent)" : "var(--faint)", display: "inline-flex" }}><Icon d={m.direction === "in" ? I.inbox : I.send} size={15} /></span>}
            title={m.subject} sub={(m.direction === "in" ? "From " + nameOnly(m.from) : "To " + nameOnly(m.to)) + " · " + since(m.at)} />
        )) : <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "6px 0" }}>No emails with this supplier in the demo data.</div>}
      </div>
    </Card>
  );
}

export default function SuppliersTab() {
  const s = useMM();
  const toConfirm = s.suppliers.filter((su) => !su.confirmed).length;
  return (
    <Page>
      <HeadRow title="Suppliers" count={s.suppliers.length}
        summary={num(toConfirm) + " still to confirm · rate requests and arrival notices go by email, no live integrations"} />
      <Grid cols="repeat(auto-fit,minmax(320px,1fr))" style={{ alignItems: "stretch" }}>
        {s.suppliers.map((su) => <SupplierCard key={su.id} s={s} su={su} />)}
      </Grid>
    </Page>
  );
}
