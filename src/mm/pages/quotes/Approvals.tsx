import { useState } from "react";
import type { MMState, Quote } from "../../types";
import { approveQuote, go, holdApproval, keepListPrice, openPanel, setBuilderQuote, toast, useMM } from "../../store";
import { contactOf, customerOf, ix, quoteEquipment, quoteFreight, quoteTotal, quotesForApproval } from "../../select";
import { age, money, plural, since, stamp } from "../../format";
import { Avatar, Badge, Button, Card, Cell, CountryTag, Empty, Facts, Grid, I, Kpi, MONO, Mail, Note, Page, PageHead, Row, Seg, Table, type Col } from "../../ui";
import { RATE_NOTE, eqOf, flagsOf, heldApprovalFor, machines, openApprovalFor, priceQuestions, sums } from "./lib";
import { Check, Num, QuoteFlags, RecordChip } from "./bits";

/* Approvals: the Ready for Review queue. Nothing reaches a customer until it is approved here. */

type View = "all" | "flagged" | "held";

export default function Approvals() {
  const s = useMM();
  const [sel, setSel] = useState<Set<string>>(() => new Set());
  const [view, setView] = useState<View>("all");

  const queue = quotesForApproval(s).slice().sort((a, b) => eqOf(s, b) - eqOf(s, a));
  const flagged = (q: Quote) => { const f = flagsOf(s, q); return !!f.stockTone || f.override || f.dims.length > 0; };
  const held = (q: Quote) => !!heldApprovalFor(s, q.id);
  const nFlagged = queue.filter(flagged).length;
  const nHeld = queue.filter(held).length;
  const rows = queue.filter((q) => (view === "flagged" ? flagged(q) : view === "held" ? held(q) : true));

  const live = new Set(queue.map((q) => q.id));
  const chosen = [...sel].filter((id) => live.has(id));
  const chosenQuotes = chosen.map((id) => ix(s).quote[id]);
  const allOn = rows.length > 0 && rows.every((q) => sel.has(q.id));
  const someOn = rows.some((q) => sel.has(q.id));

  const toggle = (id: string) => setSel((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const toggleAll = () => setSel((prev) => {
    const n = new Set(prev);
    if (allOn) rows.forEach((q) => n.delete(q.id)); else rows.forEach((q) => n.add(q.id));
    return n;
  });
  const approveSelected = () => {
    const ids = chosen.slice();
    ids.forEach((id) => approveQuote(id));
    setSel(new Set());
    toast(plural(ids.length, "quotation") + " approved and sent", "Simulated in this demo: nothing was sent.");
  };

  const total = sums(s, queue);
  const oldest = queue.reduce<number | null>((m, q) => (m === null || q.createdAt < m ? q.createdAt : m), null);
  const pqs = priceQuestions(s);

  const cols: Col<Quote>[] = [
    { key: "sel", width: "22px", label: <Check on={allOn} mixed={!allOn && someOn} onChange={toggleAll} title="Select every quote shown" />,
      render: (q) => <Check on={sel.has(q.id)} onChange={() => toggle(q.id)} title={"Select " + q.id} /> },
    { key: "cust", label: "Customer", width: "minmax(0,1.5fr)", render: (q) => {
      const c = customerOf(s, q.customerId);
      return <Cell top={<Row gap={6}><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span><CountryTag c={c.country} /></Row>}
        sub={<><span style={MONO}>{q.id}</span> · {c.city}</>} />;
    } },
    { key: "m", label: "Machines", width: "minmax(0,1.3fr)", render: (q) => { const m = machines(s, q); return <Cell top={m.top} sub={m.sub} />; } },
    { key: "eq", label: "Equipment", width: "82px", align: "right", render: (q) => <Num>{money(quoteEquipment(q), q.currency)}</Num> },
    { key: "fr", label: "Freight", width: "70px", align: "right", render: (q) => {
      const v = quoteFreight(s, q);
      return v === null ? <span style={{ fontSize: 12, color: "var(--faint)" }}>Pending</span> : <Num>{money(v, q.currency)}</Num>;
    } },
    { key: "tot", label: "Total", width: "86px", align: "right", render: (q) => <Num strong>{money(quoteTotal(s, q), q.currency)}</Num> },
    { key: "cur", label: "Cur", width: "36px", render: (q) => <span style={{ ...MONO, fontSize: 11, color: "var(--dim)" }}>{q.currency}</span> },
    { key: "flags", label: "Flags", width: "minmax(0,1.25fr)", render: (q) => <QuoteFlags s={s} q={q} /> },
    { key: "by", label: "By", width: "28px", render: (q) => <Avatar name={q.preparedBy} size={22} /> },
    { key: "age", label: "Age", width: "36px", align: "right", render: (q) => <Num dim>{age(q.createdAt)}</Num> },
    { key: "act", label: "", width: "196px", align: "right", render: (q) => {
      const ap = openApprovalFor(s, q.id);
      const isHeld = !!heldApprovalFor(s, q.id);
      return (
        <Row gap={5}>
          <Button size="sm" kind="ok" onClick={() => approveQuote(q.id)} title="Approve and send the quotation (simulated)">Approve</Button>
          <Button size="sm" disabled={!ap} onClick={() => ap && holdApproval(ap.id)}
            title={ap ? "Put this approval on hold" : isHeld ? "Already on hold" : "No open approval for this quote"}>{isHeld && !ap ? "Held" : "Hold"}</Button>
          <Button size="sm" kind="ghost" onClick={() => openPanel("quote", q.id)} title="Open the full record">Review</Button>
        </Row>
      );
    } },
  ];

  return (
    <Page>
      <PageHead title="Quote approvals"
        sub={<>{plural(queue.length, "quote")} ready for review, {money(Math.round(total.eq))} {RATE_NOTE}. Approving emails the quotation to the customer. In this demo the send is simulated.</>}
        right={<Button icon={I.quote} onClick={() => go("Quotes", "builder")}>Quote Builder</Button>} />

      <Grid cols="repeat(auto-fit,minmax(180px,1fr))" gap={12}>
        <Kpi hero tone="accent" label="In the queue" value={queue.length} sub="Ready for Review, prepared by the Quote Agent" />
        <Kpi tone="info" label="Queue value" value={money(Math.round(total.eq))}
          sub={<>{money(total.eur)} EUR{total.gbp > 0 && <> + {money(total.gbp, "GBP")} GBP</>}</>} />
        <Kpi tone="warn" label="Flagged" value={nFlagged} sub="Stock, price override or missing dimensions" onClick={() => setView("flagged")} />
        <Kpi tone="neutral" label="On hold" value={nHeld} sub="Held approvals stay in the queue" onClick={() => setView("held")} />
        <Kpi tone="bad" label="Oldest waiting" value={oldest === null ? "None" : age(oldest)} sub="Since the quote was prepared" />
      </Grid>

      <Card title="Pricing questions" hint="Customers asking for a better price. No discount is assumed and nothing changes until you decide."
        right={<Badge tone={pqs.length ? "accent" : "neutral"}>{pqs.length} open</Badge>}>
        {pqs.length === 0 && <Note tone="ok" icon={I.check}>No pricing questions open.</Note>}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {pqs.map((a) => <PriceQuestion key={a.id} s={s} quoteId={a.recordId} context={a.context} action={a.action} />)}
        </div>
      </Card>

      <Card title="Ready for review"
        hint={<>Tick quotes to approve in one go. Rows open the full record. {chosen.length > 0 && <>Selected: {money(Math.round(sums(s, chosenQuotes).eq))} EUR eq.</>}</>}
        right={<Row gap={8} wrap>
          <Seg<View> value={view} onChange={setView} options={[["all", "All " + queue.length], ["flagged", "Flagged " + nFlagged], ["held", "On hold " + nHeld]]} />
          <Button kind="primary" icon={I.check} disabled={chosen.length === 0} onClick={approveSelected}>
            Approve selected{chosen.length ? " (" + chosen.length + ")" : ""}
          </Button>
        </Row>}
        pad="16px 10px 12px">
        {queue.length === 0
          ? <Empty title="Queue clear" sub="Every priced quote has been approved and sent (simulated)." />
          : <Table<Quote> rows={rows} rowKey={(q) => q.id} onRow={(q) => openPanel("quote", q.id)} cols={cols}
              empty={view === "held" ? "Nothing on hold." : "No flagged quotes in the queue."} />}
      </Card>
    </Page>
  );
}

function PriceQuestion({ s, quoteId, context, action }: { s: MMState; quoteId: string; context: string; action: string }) {
  const q = ix(s).quote[quoteId];
  if (!q) return null;
  const c = customerOf(s, q.customerId);
  const ct = contactOf(s, c);
  const m = machines(s, q);
  const mail = s.emails.filter((x) => x.recordId === q.id && x.direction === "in").sort((x, y) => y.at - x.at)[0];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 18, alignItems: "start" }}>
      <div style={{ minWidth: 0 }}>
        <Row gap={8} wrap>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.2px" }}>{c.name}</span>
          <CountryTag c={c.country} />
          <Badge tone="accent">Price review</Badge>
          <RecordChip kind="quote" id={q.id} />
        </Row>
        <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>{action} · {ct.name}, {ct.role} · {c.type}</div>
        <div style={{ fontSize: 13, color: "var(--body)", marginTop: 10, lineHeight: 1.55 }}>{context}</div>
        <div style={{ marginTop: 14 }}>
          <Facts cols={4} rows={[
            ["Quote", <span key="id" style={MONO}>{q.id}</span>],
            ["Value ex VAT", money(quoteTotal(s, q), q.currency)],
            ["Sent", q.sentAt ? since(q.sentAt) : "Not sent"],
            ["Machines", m.top],
          ]} />
        </div>
        {q.overrideRequested && <Note tone="accent" icon={I.lock} style={{ marginTop: 14 }}>{q.overrideRequested} Any override needs your approval.</Note>}
        <Row gap={8} wrap style={{ marginTop: 14 }}>
          <Button kind="primary" icon={I.check} onClick={() => keepListPrice(q.id)}>Keep list price and reply</Button>
          <Button icon={I.eye} onClick={() => openPanel("quote", q.id)}>Open quote</Button>
          <Button kind="ghost" icon={I.edit} onClick={() => { setBuilderQuote(q.id); go("Quotes", "builder"); }}>View in builder</Button>
        </Row>
      </div>
      {mail
        ? <Mail kind="in" from={mail.from} to={mail.to} at={stamp(mail.at)} subject={mail.subject} body={mail.body} />
        : <Note>No customer email on file for this question.</Note>}
    </div>
  );
}
