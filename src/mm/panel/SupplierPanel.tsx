import type { MMState } from "../types";
import { carrierStats, ix } from "../select";
import { Badge, Facts, I, MONO, Note, Status } from "../ui";
import { plural, since } from "../format";
import { Box, DAY, MailThread, Missing, PanelBody, RecordRow, RowList, Section, StatBand, useNav } from "./kit";

/* Supplier record: carriers and the manufacturer. Carriers named on the call
   are shown with a "to confirm" note and never as live integrations. */

export default function SupplierPanel({ s, id }: { s: MMState; id: string }) {
  const nav = useNav();
  const x = ix(s);
  const su = s.suppliers.find((y) => y.id === id);
  if (!su) return <Missing />;
  const carrier = su.kind === "Carrier";
  const stats = carrierStats(s, su.id);
  const open = s.freight.filter((f) => f.carrierId === su.id && (f.status === "To request" || f.status === "Awaiting rate"))
    .sort((a, b) => (a.requestedAt ?? Infinity) - (b.requestedAt ?? Infinity));
  const drafted = open.filter((f) => f.status === "To request").length;
  const mails = s.emails.filter((m) => m.supplierId === su.id).sort((a, b) => a.at - b.at);
  const incomingUnits = s.shipments.reduce((n, sh) => n + sh.lines.reduce((m, l) => m + l.units, 0), 0);
  const now = Date.now();

  return (
    <PanelBody>
      <Note tone={carrier && !su.confirmed ? "warn" : "neutral"} icon={carrier && !su.confirmed ? I.alert : I.file}>
        {carrier && !su.confirmed ? "To confirm. " + su.note : su.note}
      </Note>

      <Section title="Profile">
        <Box>
          <Facts rows={[
            ["Kind", su.kind],
            ["Region", su.region],
            ["Lanes", su.lanes],
            ["Workflow", su.workflow],
            ["Email", <span style={{ ...MONO, fontSize: 12 }}>{su.email}</span>],
            ["Integration", "None. Everything goes by email."],
          ]} />
        </Box>
      </Section>

      {carrier ? (
        <StatBand items={[
          { label: "Average reply", value: stats.replied ? Math.round(stats.avgHours) + " h" : "No data", sub: plural(stats.replied, "rate") + " on record" },
          { label: "Waiting", value: stats.waiting, sub: "Requests awaiting a rate" },
          { label: "Late", value: stats.late, tone: stats.late ? "warn" : undefined, sub: "Over three days" },
          { label: "To approve", value: drafted, tone: drafted ? "accent" : undefined, sub: "Drafted requests" },
        ]} />
      ) : (
        <StatBand items={[
          { label: "Incoming shipments", value: s.shipments.length, sub: "Into County Derry" },
          { label: "Units incoming", value: incomingUnits, sub: "Across all shipments" },
          { label: "Unconfirmed", value: s.shipments.filter((sh) => !sh.confirmed).length, tone: s.shipments.some((sh) => !sh.confirmed) ? "warn" : undefined, sub: "Arrival dates" },
        ]} />
      )}

      {carrier && (
        <Section title="Open requests" right={<span style={{ ...MONO, fontSize: 10, color: "var(--faint)" }}>{open.length}</span>}>
          <RowList rows={open} limit={8} empty="Nothing open with this carrier." render={(f) => {
            const c = x.customer[f.customerId];
            const late = f.status === "Awaiting rate" && f.requestedAt !== null && now - f.requestedAt > 3 * DAY;
            return (
              <RecordRow onClick={() => nav.open("freight", f.id)} title={f.id + " · " + c.name}
                sub={(f.requestedAt !== null ? "Requested " + since(f.requestedAt) : "Drafted, waiting for your approval") + (f.chases ? " · " + plural(f.chases, "chase") : "") + " · " + f.destination}
                right={late ? <Badge tone="warn" dot>Late</Badge> : <Status s={f.status} />} />
            );
          }} />
        </Section>
      )}

      {!carrier && (
        <Section title="Incoming shipments">
          <RowList rows={s.shipments} render={(sh) => (
            <RecordRow onClick={() => nav.open("shipment", sh.id)} title={sh.name}
              sub={sh.eta + " · " + plural(sh.lines.reduce((n, l) => n + l.units, 0), "unit")}
              right={sh.confirmed ? <Badge tone="ok">Confirmed</Badge> : <Badge tone="warn">Not confirmed</Badge>} />
          )} />
        </Section>
      )}

      <Section title="Recent emails">
        <MailThread emails={mails} limit={4} empty="No emails with this supplier in the demo data." />
      </Section>
    </PanelBody>
  );
}
