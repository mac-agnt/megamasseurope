import { useState, type ReactNode } from "react";
import type { Enquiry, EnquiryStage, MMState } from "../../types";
import { go, openPanel, useMM } from "../../store";
import { awaitingCustomer, customerOf, enquiryCurrency, enquiryValue, lateRates, stageCounts, unanswered } from "../../select";
import { money, moneyShort, num, pct, plural, since } from "../../format";
import {
  Badge, BarList, Button, Card, Cell, CountryTag, Facts, Grid, I, Icon, Kpi, Label, Money, Page, PageHead, Row, Table, type Col,
} from "../../ui";
import {
  DAY, EUR_EQ, FLOW, PRIORITY_TONE, byPriorityThenValue, machineSummary, openEnquiries, productName, ratio, reachedCounts, sumEur,
} from "./data";
import { ELLIPSIS, EurEqNote, onKeyActivate } from "./bits";

/* Enquiries > Pipeline. A horizontal stage band (count, value, conversion from
   the stage before), then the records in whichever stage is selected. */

const NEXT: Record<EnquiryStage, { text: string; label?: string; page?: string; tab?: string }> = {
  New: { text: "Approve the drafted replies. Incomplete ones ask for the missing details first.", label: "Open the inbox", page: "Enquiries", tab: "inbox" },
  Qualified: { text: "Approve the carrier rate requests the Freight Agent has drafted.", label: "Freight requests", page: "Freight", tab: "requests" },
  "Freight Requested": { text: "Waiting on carrier rates. Chase anything that has gone quiet.", label: "Awaiting rates", page: "Freight", tab: "awaiting" },
  "Quote Ready": { text: "Quotes are built with freight included and need your approval to go.", label: "Quote approvals", page: "Quotes", tab: "approvals" },
  "Quote Sent": { text: "With the customer. Follow-ups are drafted for you to approve.", label: "Follow-ups", page: "Enquiries", tab: "followups" },
  Won: { text: "Track payment and dispatch from the order.", label: "Confirmed orders", page: "Orders", tab: "confirmed" },
  Lost: { text: "Each lost enquiry keeps the reason it was lost." },
};

export default function Pipeline() {
  const s = useMM();
  const [sel, setSel] = useState<EnquiryStage>("New");
  const counts = stageCounts(s);
  const reached = reachedCounts(s);
  const total = s.enquiries.length;
  const inStage = (k: EnquiryStage) => s.enquiries.filter((e) => e.stage === k);
  const open = openEnquiries(s);
  const decided = counts.Won + counts.Lost;
  const late = lateRates(s).length;

  return (
    <Page>
      <PageHead title="Pipeline" sub="Every enquiry from first contact to won or lost. Click a stage to see what is sitting in it." />

      <Grid cols="repeat(auto-fit,minmax(200px,1fr))" gap={12}>
        <Kpi hero tone="accent" label="Open pipeline" value={num(open.length)} sub={moneyShort(sumEur(s, open)) + " " + EUR_EQ + ", New to Quote Sent"} />
        <Kpi tone="ok" label="Win rate on decided quotes" value={pct(ratio(counts.Won, decided))} sub={num(counts.Won) + " won, " + num(counts.Lost) + " lost"} />
        <Kpi tone="info" label="Reached a sent quote" value={pct(ratio(reached["Quote Sent"], total))}
          sub={num(reached["Quote Sent"]) + " of " + plural(total, "enquiry", "enquiries")} />
        <Kpi tone={late ? "warn" : "neutral"} label="Carrier rates over 3 days" value={num(late)} sub="Holding quotes in Freight Requested"
          onClick={() => setSel("Freight Requested")} />
      </Grid>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, alignItems: "stretch" }}>
        {FLOW.slice(0, 5).map((k, i) => (
          <StageCard key={k} label={k} n={counts[k]} value={sumEur(s, inStage(k))} on={sel === k} onClick={() => setSel(k)}
            conv={i ? { pct: ratio(reached[k], reached[FLOW[i - 1]]), from: FLOW[i - 1], to: k } : undefined}
            extra={k === "New" ? (
              <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 6, lineHeight: 1.55 }}>
                <div><b style={{ color: "var(--ink)", fontWeight: 600 }}>{num(unanswered(s).length)}</b> unanswered</div>
                <div><b style={{ color: "var(--ink)", fontWeight: 600 }}>{num(awaitingCustomer(s).length)}</b> waiting on customer</div>
              </div>
            ) : undefined} />
        ))}
        <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 8, minWidth: 0 }}>
          <Outcome label="Won" n={counts.Won} value={sumEur(s, inStage("Won"))} share={ratio(counts.Won, reached["Quote Sent"])}
            on={sel === "Won"} onClick={() => setSel("Won")} />
          <Outcome label="Lost" n={counts.Lost} value={sumEur(s, inStage("Lost"))} share={ratio(counts.Lost, reached["Quote Sent"])}
            on={sel === "Lost"} onClick={() => setSel("Lost")} />
        </div>
      </div>
      <EurEqNote style={{ marginTop: -4 }} />

      <StageDetail s={s} stage={sel} list={inStage(sel)} />
    </Page>
  );
}

function StageCard({ label, n, value, on, onClick, conv, extra }: {
  label: string; n: number; value: number; on: boolean; onClick: () => void;
  conv?: { pct: number; from: string; to: string }; extra?: ReactNode;
}) {
  return (
    <div role="button" tabIndex={0} aria-pressed={on} onClick={onClick} onKeyDown={onKeyActivate(onClick)} className="mm-card-click"
      style={{ minWidth: 0, cursor: "pointer", borderRadius: "var(--card-r,18px)", padding: "14px 15px 13px", display: "flex", flexDirection: "column",
        background: on ? "var(--accent-faint)" : "var(--surface)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)") }}>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: on ? "var(--accent)" : "var(--dim)", ...ELLIPSIS }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-.8px", color: "var(--ink)", lineHeight: 1.1, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{num(n)}</div>
      <div style={{ fontSize: 12, color: "var(--body)", marginTop: 4 }}>{moneyShort(value)} <span style={{ color: "var(--faint)" }}>{EUR_EQ}</span></div>
      {extra}
      <span style={{ flex: 1 }} />
      {conv && (
        <div title={"Of the enquiries that reached " + conv.from + ", " + pct(conv.pct) + " moved on to " + conv.to + " or further."}
          style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 11.5, color: "var(--faint)" }}>
          <Icon d={I.arrow} size={11} />
          <span><b style={{ color: "var(--ink)", fontWeight: 600 }}>{pct(conv.pct)}</b> from {conv.from}</span>
        </div>
      )}
    </div>
  );
}

function Outcome({ label, n, value, share, on, onClick }: { label: "Won" | "Lost"; n: number; value: number; share: number; on: boolean; onClick: () => void }) {
  return (
    <div role="button" tabIndex={0} aria-pressed={on} onClick={onClick} onKeyDown={onKeyActivate(onClick)} className="mm-card-click"
      title={pct(share) + " of the enquiries that reached Quote Sent are " + label.toLowerCase() + "."}
      style={{ minWidth: 0, cursor: "pointer", borderRadius: 14, padding: "9px 12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3,
        background: on ? "var(--accent-faint)" : "var(--surface)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)") }}>
      <Row gap={6}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: on ? "var(--accent)" : label === "Won" ? "var(--ok)" : "var(--dim)" }}>{label}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 19, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{num(n)}</span>
      </Row>
      <Row gap={6} wrap style={{ fontSize: 11, color: "var(--faint)" }}>
        <span>{moneyShort(value)} {EUR_EQ}</span>
        <span style={{ flex: 1 }} />
        <span><b style={{ color: "var(--body)", fontWeight: 600 }}>{pct(share)}</b> of sent</span>
      </Row>
    </div>
  );
}

function StageDetail({ s, stage, list }: { s: MMState; stage: EnquiryStage; list: Enquiry[] }) {
  const rows = list.slice().sort(byPriorityThenValue(s));
  const next = NEXT[stage];
  const nextPage = next.page;
  const eur = list.filter((e) => enquiryCurrency(s, e) === "EUR").reduce((n, e) => n + enquiryValue(s, e), 0);
  const gbp = list.filter((e) => enquiryCurrency(s, e) === "GBP").reduce((n, e) => n + enquiryValue(s, e), 0);
  const oldest = list.reduce<Enquiry | undefined>((o, e) => (!o || e.receivedAt < o.receivedAt ? e : o), undefined);
  const avgDays = list.length ? list.reduce((n, e) => n + (Date.now() - e.receivedAt), 0) / list.length / DAY : 0;

  const units: Record<string, number> = {};
  for (const e of list) for (const l of e.lines) units[l.productId] = (units[l.productId] || 0) + l.qty;
  const machines = Object.entries(units).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, n]) => ({ key: id, label: productName(s, id), value: n }));
  const reasons: Record<string, number> = {};
  for (const e of list) if (e.lostReason) reasons[e.lostReason] = (reasons[e.lostReason] || 0) + 1;
  const lost = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([r, n]) => ({ key: r, label: r, value: n }));

  const cols: Col<Enquiry>[] = [
    { key: "who", label: "Enquiry", width: "minmax(170px,1.5fr)", render: (e) => {
      const c = customerOf(s, e.customerId);
      const ct = s.contacts.find((x) => x.id === e.contactId);
      return <Cell top={c.name} sub={e.id + (ct ? ", " + ct.name : "")} />;
    } },
    { key: "country", label: "Country", width: "56px", render: (e) => <CountryTag c={customerOf(s, e.customerId).country} /> },
    { key: "machines", label: "Machines", width: "minmax(140px,1.3fr)", render: (e) => machineSummary(s, e) },
    { key: "value", label: "Value", width: "92px", align: "right", render: (e) => <Money v={enquiryValue(s, e)} cur={enquiryCurrency(s, e)} /> },
    { key: "received", label: "Received", width: "92px", render: (e) => since(e.receivedAt) },
    { key: "last", label: "Last contact", width: "92px", render: (e) => since(e.lastContactAt) },
    { key: "next", label: stage === "Lost" ? "Reason" : "Next step", width: "minmax(160px,1.4fr)",
      render: (e) => <span title={e.lostReason ?? e.aiAction} style={{ color: "var(--ink)" }}>{stage === "Lost" ? e.lostReason ?? "Not recorded" : e.aiAction}</span> },
    { key: "priority", label: "Priority", width: "74px", render: (e) => <Badge tone={PRIORITY_TONE[e.priority]}>{e.priority}</Badge> },
  ];

  return (
    <Card title={<Row gap={8}>{stage}<Badge>{num(list.length)}</Badge></Row>}
      hint={moneyShort(sumEur(s, list)) + " " + EUR_EQ + " in this stage. Click a row for the full record."}
      right={nextPage ? <Button size="sm" icon={I.arrow} onClick={() => go(nextPage, next.tab)}>{next.label}</Button> : undefined}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "16px 28px", marginBottom: 18, alignItems: "start" }}>
        <Facts rows={[
          ["In EUR", money(eur, "EUR")],
          ["In GBP", money(gbp, "GBP")],
          ["Oldest", oldest ? since(oldest.receivedAt) : "None"],
          ["Average age", list.length ? avgDays.toFixed(1) + " days" : "None"],
        ]} />
        <div style={{ minWidth: 0 }}>
          <Label style={{ marginBottom: 10 }}>{stage === "Lost" ? "Why they were lost" : "Machines asked for"}</Label>
          {(stage === "Lost" ? lost : machines).length
            ? <BarList items={stage === "Lost" ? lost : machines} tone={stage === "Lost" ? "neutral" : "accent"}
                format={(n) => (stage === "Lost" ? num(n) : plural(n, "unit"))} />
            : <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nothing in this stage.</div>}
        </div>
        <div style={{ minWidth: 0 }}>
          <Label style={{ marginBottom: 10 }}>What happens next</Label>
          <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.55 }}>{next.text}</div>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 900 }}>
          <Table key={stage} cols={cols} rows={rows} rowKey={(e) => e.id} onRow={(e) => openPanel("enquiry", e.id)} limit={12} dense
            empty="Nothing in this stage right now." />
        </div>
      </div>
    </Card>
  );
}
