import { useState } from "react";
import type { MMState, Quote } from "../../types";
import { go, markAccepted, openPanel, useMM } from "../../store";
import { customerOf, ix, quoteTotal } from "../../select";
import { dateShort, days, money, num, pct, plural } from "../../format";
import { Badge, BarList, Button, Card, Cell, Columns, CountryTag, Grid, I, Kpi, MONO, Page, PageHead, Row, Seg, Status, Table, type Col } from "../../ui";
import { DAY, RATE_NOTE, byStatus, followUpFor, machines, openApprovalFor, orderFor, sums } from "./lib";
import { Num, RecordChip } from "./bits";

/* Sent quotes: what is with customers, how long it has been, and what happened to the rest. */

type Hist = "All" | "Accepted" | "Declined" | "Expired";

/** Exact days since sent, for thresholds. Display uses whole days. */
const sinceSent = (q: Quote) => (q.sentAt ? (Date.now() - q.sentAt) / DAY : 0);
const hasQuestion = (s: MMState, q: Quote) => !!q.overrideRequested || !!openApprovalFor(s, q.id, "Price review");

export default function Sent() {
  const s = useMM();
  const [hist, setHist] = useState<Hist>("All");
  const by = byStatus(s);
  const cad = s.controls.cadence;
  const [c0, c1, c2] = [cad[0] ?? 3, cad[1] ?? 7, cad[2] ?? 14];

  const sent = by.Sent.slice().sort((a, b) => Number(hasQuestion(s, b)) - Number(hasQuestion(s, a)) || (a.sentAt ?? 0) - (b.sentAt ?? 0));
  const sentSum = sums(s, sent);
  const pastC1 = sent.filter((q) => sinceSent(q) > c1);
  const cold = sent.filter((q) => sinceSent(q) > c2);
  const coldSum = sums(s, cold);
  const fuOpen = sent.map((q) => followUpFor(s, q.id)).filter((f) => f && f.status === "Awaiting review").length;
  const questions = sent.filter((q) => hasQuestion(s, q)).length;
  const buckets = [
    { label: "0-" + c0 + " d", value: sent.filter((q) => sinceSent(q) <= c0).length },
    { label: c0 + "-" + c1 + " d", value: sent.filter((q) => sinceSent(q) > c0 && sinceSent(q) <= c1).length },
    { label: c1 + "-" + c2 + " d", value: sent.filter((q) => sinceSent(q) > c1 && sinceSent(q) <= c2).length },
    { label: c2 + "+ d", value: cold.length },
  ];

  const decided = [...by.Accepted, ...by.Declined, ...by.Expired].sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0));
  const histRows = hist === "All" ? decided : decided.filter((q) => q.status === hist);
  const won = sums(s, by.Accepted);
  const nDecided = decided.length;
  const reasons: Record<string, number> = {};
  for (const q of [...by.Declined, ...by.Expired]) {
    const r = ix(s).enquiry[q.enquiryId]?.lostReason || "No reason recorded";
    reasons[r] = (reasons[r] || 0) + 1;
  }
  const reasonItems = Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, key: label }));

  const sentCols: Col<Quote>[] = [
    { key: "cust", label: "Customer", width: "minmax(0,1.5fr)", render: (q) => {
      const c = customerOf(s, q.customerId);
      return <Cell top={<Row gap={6}><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span><CountryTag c={c.country} /></Row>}
        sub={<><span style={MONO}>{q.id}</span> · {c.type}</>} />;
    } },
    { key: "m", label: "Machines", width: "minmax(0,1.2fr)", render: (q) => { const m = machines(s, q); return <Cell top={m.top} sub={m.sub} />; } },
    { key: "sent", label: "Sent", width: "84px", render: (q) => {
      const d = sinceSent(q);
      const whole = q.sentAt ? days(q.sentAt) : 0;
      return <Cell top={<span style={{ color: d > c2 ? "var(--bad)" : d > c1 ? "var(--warn)" : "var(--ink)" }}>{whole === 0 ? "Today" : plural(whole, "day")}</span>}
        sub={q.sentAt ? dateShort(q.sentAt) : undefined} />;
    } },
    { key: "val", label: "Value ex VAT", width: "98px", align: "right", render: (q) => <Num strong>{money(quoteTotal(s, q), q.currency)}</Num> },
    { key: "fu", label: "Follow-up", width: "minmax(0,1.2fr)", render: (q) => {
      const fu = followUpFor(s, q.id);
      if (!fu) return <span style={{ fontSize: 12, color: "var(--faint)" }}>None scheduled</span>;
      return <Cell top={<Status s={fu.status} />} sub={fu.kind + ", " + fu.dueInDays + "-day step"} />;
    } },
    { key: "flag", label: "Flags", width: "128px", render: (q) => {
      const d = sinceSent(q);
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {hasQuestion(s, q) && (
            <button onClick={(e) => { e.stopPropagation(); go("Quotes", "approvals"); }} title={q.overrideRequested || "Open pricing question"}
              style={{ border: 0, padding: 0, background: "none", cursor: "pointer" }}><Badge tone="accent">Pricing question</Badge></button>
          )}
          {d > c2 && <Badge tone="bad">Going cold</Badge>}
          {d > c1 && d <= c2 && <Badge tone="warn">Past {c1} days</Badge>}
          {!hasQuestion(s, q) && d <= c1 && <span style={{ fontSize: 12, color: "var(--faint)" }}>None</span>}
        </div>
      );
    } },
    { key: "act", label: "", width: "252px", align: "right", render: (q) => {
      const fu = followUpFor(s, q.id);
      return (
        <Row gap={6}>
          <Button size="sm" kind="ok" icon={I.check} onClick={() => markAccepted(q.id)} title="Customer said yes: create the order and FreshBooks invoice (simulated)">Mark accepted</Button>
          <Button size="sm" disabled={!fu} onClick={() => fu && openPanel("followup", fu.id)} title={fu ? "Open the follow-up draft" : "No follow-up for this quote"}>Open follow-up</Button>
        </Row>
      );
    } },
  ];

  const histCols: Col<Quote>[] = [
    { key: "id", label: "Quote", width: "74px", render: (q) => <span style={{ ...MONO, fontSize: 12.5, color: "var(--ink)" }}>{q.id}</span> },
    { key: "cust", label: "Customer", width: "minmax(0,1.3fr)", render: (q) => {
      const c = customerOf(s, q.customerId);
      return <Cell top={c.name} sub={c.city + ", " + c.country} />;
    } },
    { key: "st", label: "Outcome", width: "112px", render: (q) => <Cell top={<Status s={q.status} />} sub={q.decidedAt ? dateShort(q.decidedAt) : undefined} /> },
    { key: "val", label: "Value", width: "92px", align: "right", render: (q) => <Num>{money(quoteTotal(s, q), q.currency)}</Num> },
    { key: "why", label: "Detail", width: "minmax(0,1.5fr)", render: (q) => {
      if (q.status === "Accepted") {
        const o = orderFor(s, q.id);
        if (!o) return <span style={{ fontSize: 12, color: "var(--faint)" }}>No order on file</span>;
        return (
          <Row gap={5}>
            <RecordChip kind="order" id={o.id} compact />
            {o.invoiceId && <RecordChip kind="invoice" id={o.invoiceId} compact />}
          </Row>
        );
      }
      const reason = ix(s).enquiry[q.enquiryId]?.lostReason;
      return <span style={{ fontSize: 12.5, color: reason ? "var(--body)" : "var(--faint)" }} title={reason}>{reason || "No reason recorded"}</span>;
    } },
  ];

  return (
    <Page>
      <PageHead title="Sent quotes"
        sub={<>{plural(sent.length, "quote")} with customers, {money(Math.round(sentSum.eq))} {RATE_NOTE}. {s.controls.followUpAuto
          ? "Automatic chasing is on."
          : "Automatic chasing is off, so every follow-up waits for your approval."}</>}
        right={<Button icon={I.clock} onClick={() => go("Enquiries", "followups")}>Follow-ups</Button>} />

      <Grid cols="minmax(0,1.6fr) minmax(0,1fr)" gap={14}>
        <Grid cols="repeat(auto-fit,minmax(170px,1fr))" gap={12}>
          <Kpi hero tone="info" label="Awaiting a decision" value={sent.length} sub={<>{money(Math.round(sentSum.eq))} EUR eq.</>} />
          <Kpi tone="warn" label={"Sent over " + c1 + " days ago"} value={pastC1.length} sub="Due a decision follow-up" />
          <Kpi tone="bad" label={"Going cold, over " + c2 + " days"} value={cold.length} sub={<>{money(Math.round(coldSum.eq))} EUR eq. at risk</>} />
          <Kpi tone="accent" label="Follow-ups to review" value={fuOpen} sub="Drafted by the Follow-up Agent, not sent" onClick={() => go("Enquiries", "followups")} />
          <Kpi tone="accent" label="Pricing questions" value={questions} sub="No discount assumed" onClick={() => go("Quotes", "approvals")} />
          <Kpi tone="ok" label="Acceptance rate" value={nDecided ? pct((by.Accepted.length / nDecided) * 100) : "None yet"}
            sub={<>{by.Accepted.length} of {nDecided} decided quotes</>} />
        </Grid>
        <Card title="Days since sent" hint={"Follow-up timing " + cad.join(", ") + " days. The oldest bucket is highlighted."}>
          <Columns data={buckets} height={128} format={(n) => num(n)} tone="warn" />
        </Card>
      </Grid>

      <Card title="Awaiting a decision" hint="Pricing questions first, then oldest sent. Marking accepted creates the order and a FreshBooks invoice record (simulated)."
        pad="16px 10px 12px">
        <Table<Quote> rows={sent} rowKey={(q) => q.id} onRow={(q) => openPanel("quote", q.id)} cols={sentCols}
          empty="No quotes are waiting on a customer." />
      </Card>

      <Grid cols="minmax(0,2.2fr) minmax(250px,1fr)" gap={14}>
        <Card title="History" hint={<>{by.Accepted.length} accepted worth {money(Math.round(won.eq))} EUR eq., {by.Declined.length} declined, {by.Expired.length} expired.</>}
          right={<Seg<Hist> value={hist} onChange={setHist} options={[
            ["All", "All " + decided.length], ["Accepted", "Accepted " + by.Accepted.length], ["Declined", "Declined " + by.Declined.length], ["Expired", "Expired " + by.Expired.length],
          ]} />}
          pad="16px 10px 12px">
          <Table<Quote> rows={histRows} limit={10} rowKey={(q) => q.id} onRow={(q) => openPanel("quote", q.id)} cols={histCols}
            empty={"No " + hist.toLowerCase() + " quotes."} />
        </Card>
        <Card title="Why quotes were lost" hint="From the enquiry record on each declined or expired quote.">
          {reasonItems.length
            ? <BarList items={reasonItems} tone="neutral" format={(n) => num(n)} />
            : <div style={{ fontSize: 13, color: "var(--dim)" }}>No lost quotes yet.</div>}
        </Card>
      </Grid>
    </Page>
  );
}
