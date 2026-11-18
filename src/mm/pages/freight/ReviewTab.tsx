import { useState } from "react";
import type { MMState } from "../../types";
import { approveQuote, go, openPanel, setMarkup } from "../../store";
import { GBP_TO_EUR, eurEq, quoteEquipment, quoteTotal } from "../../select";
import { dateShort, money, num, plural, stamp } from "../../format";
import {
  Badge, Button, Card, CountryTag, Empty, Facts, Grid, I, Kpi, Label, MONO, Note, Page, PageHead, Row, Seg, Status,
} from "../../ui";
import { flagsOf, isHeld, machinesText, markupLocked, mk, reviewList, waitText, type FreightView } from "./lib";
import { CalcRow, MarkupInput, ToConfirm } from "./bits";
import { showInWorkflow } from "./Workflow";

/* Rate Review: carrier rates on open quotes. Check the reply, set the markup,
   watch the customer charge and quote total move, then approve. */

type View = "review" | "done";
const PRESETS = ["10", "12", "15", "18", "20"] as const;
let lastSel = "FR-1206";

/** Open Rate Review with this rate selected. */
export function openInReview(id: string) {
  lastSel = id;
  go("Freight", "review");
}

function RateRow({ s, v, on, onPick }: { s: MMState; v: FreightView; on: boolean; onPick: () => void }) {
  const q = v.q!;
  const pending = q.status === "Ready for Review";
  const flags = v.tbc.length + (v.postcodeMissing ? 1 : 0);
  return (
    <div className="mm-row" onClick={onPick}
      style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "4px 14px", alignItems: "center", padding: "12px 12px", borderRadius: 12,
        cursor: "pointer", background: on ? "var(--surface-2)" : undefined, boxShadow: on ? "inset 0 0 0 1px var(--accent-line)" : undefined }}>
      <div style={{ minWidth: 0 }}>
        <Row gap={7}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.c.name}</span>
          <CountryTag c={v.c.country} />
          <span style={{ ...MONO, fontSize: 11, color: "var(--faint)", flex: "none" }}>{q.id}</span>
        </Row>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {v.carrier?.name ?? "Carrier"} · {money(v.cost ?? 0, v.cur)} + {mk(v.f.markupPct)} = <span style={{ color: "var(--ink)" }}>{money(v.charge ?? 0, v.cur)}</span> freight
          {flags > 0 && <span style={{ color: "var(--warn)" }}> · {v.tbc.length ? v.tbc.length + " TBC in catalogue" : "postcode missing"}</span>}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums", letterSpacing: "-.2px" }}>{money(quoteTotal(s, q), q.currency)}</div>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {machinesText(v)} · received {dateShort(v.f.carrierQuote!.receivedAt)}
      </div>
      <Row gap={6} style={{ justifyContent: "flex-end" }}>
        {pending && isHeld(s, q.id) && <Badge tone="neutral">On hold</Badge>}
        {pending ? (
          <>
            <MarkupInput v={v} compact />
            <Button kind="secondary" size="sm" icon={I.check} onClick={() => approveQuote(q.id)}>Approve</Button>
          </>
        ) : <Badge tone="ok" dot>Approved and sent</Badge>}
      </Row>
    </div>
  );
}

function RateDetail({ s, v }: { s: MMState; v: FreightView }) {
  const q = v.q!;
  const cq = v.f.carrierQuote!;
  const pending = q.status === "Ready for Review";
  const locked = markupLocked(v);
  const def = s.controls.defaultMarkup;
  const flags = flagsOf(v);
  const units = q.lines.reduce((n, l) => n + l.qty, 0);
  const preset = PRESETS.find((p) => Number(p) === v.f.markupPct) ?? "";
  return (
    <Card tone={pending ? "accent" : "ok"} pad="18px 20px 20px" title={<Row gap={8}>{v.c.name}<CountryTag c={v.c.country} /></Row>}
      hint={q.id + " · " + v.f.id + " · " + machinesText(v) + " to " + v.f.destination}
      right={<Row gap={6}>
        {pending && isHeld(s, q.id) && <Badge tone="neutral">On hold</Badge>}
        <Status s={q.status} />
        <Button kind="ghost" size="sm" icon={I.eye} title={"Open " + v.f.id} onClick={() => openPanel("freight", v.f.id)}>Record</Button>
      </Row>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <Label style={{ marginBottom: 10 }} right={<Row gap={6}><span style={{ fontSize: 12, color: "var(--dim)" }}>{v.carrier?.name}</span><ToConfirm sup={v.carrier} /></Row>}>
            Carrier reply
          </Label>
          <Facts cols={3} rows={[
            ["Cost", money(cq.cost, cq.currency)],
            ["Currency", cq.currency],
            ["Reference", <span style={MONO}>{cq.ref}</span>],
            ["Estimated delivery", cq.eta],
            ["Valid until", dateShort(Date.parse(cq.validUntil))],
            ["Exclusions", cq.exclusions],
          ]} />
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10 }}>
            Received {stamp(cq.receivedAt)}, {waitText(v.waitMs).toLowerCase()} after the request. Extracted from the carrier email by the Freight Agent.
          </div>
        </div>

        <div>
          <Label style={{ marginBottom: 10 }}>Markup</Label>
          <Row gap={10} wrap style={{ marginBottom: 6 }}>
            <MarkupInput v={v} />
            {!locked && (
              <Seg<string> value={preset} onChange={(k) => setMarkup(v.f.id, Number(k))} options={PRESETS.map((p) => [p, p + "%"] as [string, string])} />
            )}
          </Row>
          <CalcRow label="Carrier cost" value={money(cq.cost, v.cur)} />
          <CalcRow label="Markup amount" value={money(v.markupAmt ?? 0, v.cur)} sub={mk(v.f.markupPct) + " of " + money(cq.cost, v.cur)} />
          <CalcRow strong label="Customer freight charge" value={money(v.charge ?? 0, v.cur)} />
        </div>

        <div>
          <Label style={{ marginBottom: 4 }}>Customer quote</Label>
          <CalcRow label="Equipment" value={money(quoteEquipment(q), q.currency)} sub={plural(units, "machine")} />
          <CalcRow label="Freight" value={money(v.charge ?? 0, q.currency)} sub={(v.carrier?.name ?? "Carrier") + " plus " + mk(v.f.markupPct)} />
          <CalcRow strong label="Quote total ex VAT" value={money(quoteTotal(s, q), q.currency)} sub="VAT treatment pending confirmation" />
        </div>

        {flags.length > 0 && <Note tone="warn">Flagged, not guessed: {flags.join("; ")}. Confirm with the carrier before booking.</Note>}
        <Note icon={I.lock}>
          {v.f.markupPct === def ? mk(def) + " is illustrative, not a confirmed Mega Mass rule."
            : mk(v.f.markupPct) + " on this rate. The " + mk(def) + " default is illustrative, not a confirmed Mega Mass rule."}
          {" "}{locked ? "Locked: " + locked.toLowerCase() + "." : "Markup changes need Niall's approval before a quote is sent."}
        </Note>

        <div>
          <Row gap={8} wrap>
            {pending
              ? <Button kind="primary" icon={I.check} onClick={() => approveQuote(q.id)}>Approve quote</Button>
              : <Badge tone="ok" dot>Approved and sent{q.sentAt ? " " + stamp(q.sentAt) : ""}</Badge>}
            <Button kind="secondary" icon={I.quote} onClick={() => openPanel("quote", q.id)}>Open quote</Button>
            <Button kind="ghost" icon={I.eye} onClick={() => showInWorkflow(v.f.id)}>Show in workflow</Button>
          </Row>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 9 }}>
            {pending ? "Approving emails the quote to the customer at the total above. Simulated in this demo: nothing is sent."
              : "Simulated in this demo: nothing was sent."}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ReviewTab({ s }: { s: MMState }) {
  const list = reviewList(s);
  const pending = list.filter((v) => v.q?.status === "Ready for Review");
  const done = list.filter((v) => v.q?.status !== "Ready for Review");
  const [view, setView] = useState<View>("review");
  const [sel, setSelState] = useState<string>(() => (list.some((v) => v.f.id === lastSel) ? lastSel : list[0]?.f.id ?? ""));
  const pick = (id: string) => { lastSel = id; setSelState(id); };
  const rows = view === "review" ? pending : done;
  const cur = list.find((v) => v.f.id === sel) ?? rows[0] ?? list[0];

  const held = pending.filter((v) => isHeld(s, v.q!.id)).length;
  const avg = list.length ? list.reduce((n, v) => n + v.f.markupPct, 0) / list.length : 0;
  const flagged = list.filter((v) => v.tbc.length > 0 || v.postcodeMissing).length;
  const value = pending.reduce((n, v) => n + eurEq(quoteTotal(s, v.q!), v.q!.currency), 0);
  const mixed = pending.some((v) => v.q!.currency === "GBP");

  return (
    <Page>
      <PageHead title="Rate review"
        sub="Carrier rates on open quotes. Check what the carrier said, set the markup and approve the quote. Markup changes need Niall's approval before any quote is sent." />

      <Grid cols="repeat(auto-fit,minmax(170px,1fr))" gap={12}>
        <Kpi hero label="Rates to review" value={num(pending.length - held)} tone="accent" sub={held ? "Waiting for approval, " + held + " more on hold" : "Quotes waiting for approval"} />
        <Kpi label="Average markup" value={mk(Math.round(avg * 10) / 10)} tone="info" sub={"Across " + plural(list.length, "reviewed rate")} />
        <Kpi label="Missing data flagged" value={num(flagged)} tone={flagged ? "warn" : "ok"} sub="Dimensions or postcode TBC" />
        <Kpi label="Quote value waiting" value={money(Math.round(value))} tone="neutral"
          sub={mixed ? "EUR equivalent at demo rate £1 = €" + GBP_TO_EUR.toFixed(2) : "Ex VAT"} />
        <Kpi label="Approved this session" value={num(done.length)} tone="ok" sub="Simulated: nothing was sent" />
      </Grid>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <Card style={{ flex: "1.25 1 520px" }} pad="16px 14px 12px"
          title="Rates on open quotes" hint="Newest replies first, then the largest quotes. Adjust a markup inline, or pick a row for the full carrier reply."
          right={<Seg<View> value={view} onChange={setView} options={[["review", "To review " + pending.length], ["done", "Approved " + done.length]]} />}>
          {rows.length === 0 ? (
            <Empty title={view === "review" ? "Nothing waiting for review" : "Nothing approved yet this session"}
              sub={view === "review" ? "New carrier rates land here as soon as they are read from the carrier email." : "Approved quotes stay listed here so you can check what went out."} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {rows.map((v) => <RateRow key={v.f.id} s={s} v={v} on={cur?.f.id === v.f.id} onPick={() => pick(v.f.id)} />)}
            </div>
          )}
        </Card>
        <div style={{ flex: "1 1 400px", minWidth: 0, position: "sticky", top: 12 }}>
          {cur ? <RateDetail s={s} v={cur} /> : <Card><Empty title="No carrier rates to review" /></Card>}
        </div>
      </div>
    </Page>
  );
}
