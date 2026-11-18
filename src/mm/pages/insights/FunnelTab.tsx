import { useState } from "react";
import type { MMState } from "../../types";
import { go, openPanel, useMM } from "../../store";
import { Badge, Card, Empty, Funnel, Label, Note, Page, PageHead, Table } from "../../ui";
import { moneyShort, num, pct, plural } from "../../format";
import { funnelSummary, heldUp, share, stageRecords, type StageKey, type StageRecords } from "./calc";
import { EqBadge, Flow, GoLink, Key, Pane, SplitBar, Stat, fill } from "./bits";
import { enquiryCols, invoiceCols, orderCols, quoteCols } from "./tables";

/* Insights · Conversion funnel. Every stage opens the records behind it. */

const WHAT: Record<StageKey, string> = {
  enquiry: "Every enquiry on record: website quote form, email, Instagram, phone and referrals.",
  qualified: "Enquiries with complete details that moved on to freight and quoting.",
  quoted: "Enquiries where a priced quote went to the customer.",
  accepted: "Quotes the customer accepted. Each one is an order.",
  invoiced: "Orders with a FreshBooks invoice raised.",
  paid: "Invoices settled in full in FreshBooks.",
};
const KIND_LABEL: Record<StageRecords["kind"], string> = { enquiry: "Enquiries", quote: "Quotes", order: "Orders", invoice: "FreshBooks invoices" };

function StageTable({ s, rec }: { s: MMState; rec: StageRecords }) {
  if (!rec.rows.length) return <Empty title="No records at this stage yet" sub="They appear here as soon as one arrives." />;
  switch (rec.kind) {
    case "quote":
      return <Table cols={quoteCols(s)} rows={rec.rows} limit={12} rowKey={(r) => r.id} onRow={(r) => openPanel("quote", r.id)} />;
    case "order":
      return <Table cols={orderCols(s)} rows={rec.rows} limit={12} rowKey={(r) => r.id} onRow={(r) => openPanel("order", r.id)} />;
    case "invoice":
      return <Table cols={invoiceCols(s)} rows={rec.rows} limit={12} rowKey={(r) => r.id} onRow={(r) => openPanel("invoice", r.id)} />;
    default:
      return <Table cols={enquiryCols(s)} rows={rec.rows} limit={12} rowKey={(r) => r.id} onRow={(r) => openPanel("enquiry", r.id)} />;
  }
}

const statTop = { paddingTop: 14, borderTop: "1px solid var(--border)" };

export default function FunnelTab() {
  const s = useMM();
  const [active, setActive] = useState(0);
  const f = funnelSummary(s);
  const idx = Math.min(active, f.steps.length - 1);
  const step = f.steps[idx];
  const key = step.key as StageKey;
  const next = f.steps[idx + 1];
  const rec = stageRecords(s, key);
  const held = heldUp(s, key);
  const heldTotal = held.reduce((n, g) => n + g.n, 0);
  const weak = f.steps[f.weakest];
  const weakFrom = f.steps[f.weakest - 1];
  const last = f.steps[f.steps.length - 1];

  return (
    <Page>
      <PageHead title="Conversion funnel"
        sub="From first enquiry to money in the bank. Click a stage to list the records behind it, then click a record to open it."
        right={<EqBadge />} />

      <Flow>
        <Pane grow={1.6} basis={520}>
          <Card style={fill} title="Enquiry to cash" hint="Each bar counts the records that reached the stage or went past it. The figure on the right is the step conversion.">
            <Funnel steps={f.steps} onStep={setActive} active={idx} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginTop: "auto", paddingTop: 18 }}>
              <div style={statTop}>
                <Stat label="Enquiry to paid" value={pct(f.overall, 1)} sub={num(last.n) + " of " + num(f.steps[0].n) + " enquiries"} tone="ok" />
              </div>
              <div style={statTop}>
                <Stat label="Weakest step" value={pct(f.weakestRate)} sub={weakFrom && weak ? weakFrom.label + " to " + weak.label : undefined} tone="warn" />
              </div>
              <div style={statTop}>
                <Stat label="Open pipeline" value={moneyShort(f.openValue)} sub={plural(f.openCount, "open enquiry", "open enquiries") + ". Not revenue."} />
              </div>
            </div>
          </Card>
        </Pane>

        <Pane grow={1} basis={320}>
          <Card style={fill} title={next ? "Between " + step.label + " and " + next.label : step.label + ": the last stage"}
            hint={next ? num(heldTotal) + " of " + num(step.n) + " have not reached " + next.label + ". Where they sit now:" : WHAT[key]}>
            {next ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
                  <Stat label={"Reached " + next.label} value={num(next.n)} sub={pct(share(next.n, step.n)) + " of " + num(step.n)} tone="ok" />
                  <Stat label="Not there yet" value={num(heldTotal)} sub={pct(share(heldTotal, step.n)) + " of " + num(step.n)} tone={heldTotal ? "warn" : undefined} />
                </div>
                <div style={{ margin: "14px 0 8px" }}>
                  <SplitBar legend={false} height={9} parts={[{ label: "Moved on", value: next.n, tone: "ok" }, ...held.map((g) => ({ label: g.label, value: g.n, tone: g.tone }))]} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {held.map((g) => (
                    <div key={g.label} onClick={() => go(g.go[0], g.go[1])} className="mm-row"
                      style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "10px", margin: "0 -10px", borderRadius: 10, cursor: "pointer" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}><Key tone={g.tone} />{g.label}</div>
                        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>
                          {g.n ? moneyShort(g.value) + (g.money === "pipeline" ? " pipeline value, not revenue" : g.money === "owed" ? " still owed" : " order value") : "Nothing here"}
                        </div>
                      </div>
                      <span style={{ fontSize: 20, fontWeight: 600, color: g.n ? "var(--ink)" : "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{num(g.n)}</span>
                    </div>
                  ))}
                </div>
                <Label style={{ marginTop: "auto", paddingTop: 14 }}>Click a line to open the module that moves it on</Label>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Stat big label="Paid in full" value={num(step.n)} sub={pct(share(step.n, f.steps[0].n), 1) + " of all enquiries ended as cash in the bank."} tone="ok" />
                <Note tone="ok">Final stage. Every invoice listed below is settled in FreshBooks (simulated in this demo).</Note>
                <GoLink onClick={() => go("Orders", "payments")}>Payments</GoLink>
              </div>
            )}
          </Card>
        </Pane>
      </Flow>

      <Card title={step.label + ": " + plural(rec.rows.length, "record")} hint={WHAT[key]} right={<Badge tone="neutral">{KIND_LABEL[rec.kind]}</Badge>}>
        <StageTable key={key} s={s} rec={rec} />
      </Card>
    </Page>
  );
}
