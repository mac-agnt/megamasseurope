import type { ReactNode } from "react";
import { go, openPanel, useMM } from "../../store";
import { Badge, BarList, Button, Card, Cell, CountryTag, Empty, Grid, I, Label, Money, Note, Page, PageHead, Status, Table, type Col } from "../../ui";
import { dateShort, money, moneyShort, num, plural, since } from "../../format";
import { daysOverdue, enquiryCurrency, enquiryValue, headline, ix, outstanding, quoteEquipment, quoteTotal } from "../../select";
import type { Invoice, MMState } from "../../types";
import { DAY, fmtDays, linesText, riskLists } from "./calc";
import { Bar, EqBadge, Flow, Pane, RecRow, Stat, fill, upTo } from "./bits";

/* Insights · Revenue at Risk. One card per risk, the records behind it, and
   the module that fixes it. Pipeline value is never presented as revenue. */

function RiskCard({ title, hint, value, n, unit, extra, children, action }: {
  title: string; hint: string; value: number; n: number; unit: [string, string]; extra?: ReactNode; children: ReactNode;
  action: { label: string; page: string; tab: string };
}) {
  return (
    <Card style={fill} title={title} hint={hint}
      right={<Button size="sm" kind="secondary" icon={I.arrow} onClick={() => go(action.page, action.tab)}>{action.label}</Button>}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap", paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
        <Stat big label="Pipeline value, not revenue" value={money(value)} />
        <Stat label="Records" value={num(n)} sub={n === 1 ? unit[0] : unit[1]} />
        {extra && <div style={{ marginLeft: "auto", alignSelf: "center" }}>{extra}</div>}
      </div>
      <div style={{ paddingTop: 8, display: "flex", flexDirection: "column" }}>{children}</div>
    </Card>
  );
}

function overdueCols(s: MMState, maxDays: number): Col<Invoice>[] {
  return [
    { key: "id", label: "Invoice", width: "96px", render: (i) => <Cell top={i.id} sub={"Due " + dateShort(i.dueAt)} /> },
    { key: "c", label: "Customer", width: "minmax(0,1.2fr)", render: (i) => {
      const c = ix(s).customer[i.customerId];
      return <Cell top={c?.name ?? i.customerId} sub={i.promise ? (i.promise.broken ? "Promise broken" : "Promised " + dateShort(i.promise.date)) : c ? c.city : undefined} />;
    } },
    { key: "d", label: "Days overdue", width: "minmax(110px,1fr)", render: (i) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 26, textAlign: "right", color: "var(--ink)", fontVariantNumeric: "tabular-nums", flex: "none" }}>{daysOverdue(s, i)}</span>
        <div style={{ flex: 1, minWidth: 0 }}><Bar value={daysOverdue(s, i)} max={maxDays} tone="bad" /></div>
      </div>
    ) },
    { key: "o", label: "Outstanding", width: "100px", align: "right", render: (i) => <Money v={outstanding(s, i)} cur={i.currency} /> },
  ];
}

export default function Risk() {
  const s = useMM();
  const r = riskLists(s);
  const t = r.totals;
  const h = headline(s);
  const X = ix(s);
  const maxDays = Math.max(1, ...r.overdue.map((i) => daysOverdue(s, i)));
  const broken = r.overdue.filter((i) => i.promise?.broken).length;
  const oldestCold = r.cold.reduce((m, q) => Math.max(m, q.sentAt ? s.now - q.sentAt : 0), 0) / DAY;
  const name = (id: string) => X.customer[id]?.name ?? id;
  const tag = (id: string) => (X.customer[id] ? <CountryTag c={X.customer[id].country} /> : undefined);
  const carrier = (fid?: string) => {
    const f = fid ? X.freight[fid] : undefined;
    return f ? s.suppliers.find((x) => x.id === f.carrierId)?.name ?? f.carrierId : "Carrier";
  };

  const cats = [
    { key: "overdue", label: "Unpaid invoices", value: t.overdue.value, note: plural(t.overdue.n, "invoice"), page: "Orders", tab: "invoices" },
    { key: "leads", label: "Unanswered leads", value: t.unanswered.value, note: plural(t.unanswered.n, "enquiry", "enquiries"), page: "Enquiries", tab: "inbox" },
    { key: "cold", label: "Quotes going cold", value: t.cold.value, note: plural(t.cold.n, "quote"), page: "Quotes", tab: "sent" },
    { key: "freight", label: "Freight delaying conversion", value: t.freightBlocked.value, note: plural(t.freightBlocked.n, "quote"), page: "Freight", tab: "awaiting" },
    { key: "big", label: "High-value opportunities", value: t.highValue.value, note: plural(t.highValue.n, "deal"), page: "Enquiries", tab: "pipeline" },
  ];

  return (
    <Page>
      <PageHead title="Revenue at risk" sub="Money that slips if nobody acts. Each card lists the records behind it and opens the module that fixes it."
        right={<EqBadge />} />

      <Flow>
        <Pane grow={1.3} basis={480}>
          <Card style={fill} tone="bad" title="Unpaid invoices" hint="Revenue already earned and invoiced in FreshBooks, past its due date."
            right={<Button size="sm" kind="secondary" icon={I.arrow} onClick={() => go("Orders", "invoices")}>Open invoices</Button>}>
            <div style={{ display: "grid", gridTemplateColumns: upTo(4, 120, 16), gap: 16, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
              <Stat big label="Overdue" value={money(t.overdue.value)} tone="bad" />
              <Stat label="Invoices" value={num(t.overdue.n)} sub="past due" />
              <Stat label="Oldest" value={r.overdue.length ? daysOverdue(s, r.overdue[0]) + " days" : "None"} sub={r.overdue[0] ? name(r.overdue[0].customerId) : undefined} />
              <Stat label="Payment promises" value={num(h.promises)} sub={broken ? num(broken) + " already broken" : "none broken"} tone={broken ? "warn" : undefined} />
            </div>
            {r.overdue.length ? (
              <Table dense cols={overdueCols(s, maxDays)} rows={r.overdue} limit={8} rowKey={(i) => i.id} onRow={(i) => openPanel("invoice", i.id)} />
            ) : <Empty title="Nothing overdue" sub="Every FreshBooks invoice is paid or not yet due." />}
          </Card>
        </Pane>

        <Pane grow={1} basis={340}>
          <Card style={fill} title="Where the risk sits" hint="EUR eq. per category">
            <BarList tone="warn" format={(v) => moneyShort(v)} onItem={(i) => go(cats[i].page, cats[i].tab)}
              items={cats.map((c) => ({ key: c.key, label: c.label, value: c.value, note: c.note }))} />
            {r.firstMoves.length > 0 && (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <Label>Start here</Label>
                <div style={{ marginTop: 6 }}>
                  {r.firstMoves.map((m) => (
                    <RecRow key={m.key} wrap title={m.title} sub={moneyShort(m.value) + ". " + m.sub} onClick={() => go(m.go[0], m.go[1])}
                      value={<span style={{ fontWeight: 600 }}>{num(m.n)}</span>} />
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: "auto", paddingTop: 14 }}>
            <Note tone="warn" icon={I.alert}>
              <b style={{ fontWeight: 600 }}>Pipeline value is not recognised revenue.</b> Only unpaid invoices are money already earned.
              The categories overlap (a large quote can be both cold and high value), so they are not added together.
            </Note>
            </div>
          </Card>
        </Pane>
      </Flow>

      <Grid cols={upTo(2, 420)} style={{ alignItems: "stretch" }}>
        <RiskCard title="Unanswered leads" hint="Enquiries with no reply yet. The website promises an answer within 1 to 2 business days."
          value={t.unanswered.value} n={t.unanswered.n} unit={["enquiry", "enquiries"]}
          extra={r.leadsOver48h ? <Badge tone="bad" dot>{num(r.leadsOver48h)} past 48 hours</Badge> : <Badge tone="ok" dot>None past 48 hours</Badge>}
          action={{ label: "Reply in Enquiries", page: "Enquiries", tab: "inbox" }}>
          {r.leads.slice(0, 5).map((e) => (
            <RecRow key={e.id} onClick={() => openPanel("enquiry", e.id)} lead={tag(e.customerId)}
              title={name(e.customerId)} sub={e.id + ", " + linesText(s, e.lines)}
              value={<Money v={enquiryValue(s, e)} cur={enquiryCurrency(s, e)} />} meta={"Received " + since(e.receivedAt, s.now)} />
          ))}
          {!r.leads.length && <Empty title="Every enquiry has a reply" />}
        </RiskCard>

        <RiskCard title="Quotes going cold" hint="Quotes sent more than 7 days ago with no decision from the customer."
          value={t.cold.value} n={t.cold.n} unit={["quote", "quotes"]}
          extra={r.cold.length ? <Badge tone="warn" dot>Oldest sent {Math.floor(oldestCold)} days ago</Badge> : undefined}
          action={{ label: "Chase in Quotes", page: "Quotes", tab: "sent" }}>
          {r.cold.slice(0, 5).map((q) => (
            <RecRow key={q.id} onClick={() => openPanel("quote", q.id)} lead={tag(q.customerId)}
              title={name(q.customerId)} sub={q.id + ", " + linesText(s, q.lines)}
              value={<Money v={quoteTotal(s, q)} cur={q.currency} />} meta={q.sentAt ? "Sent " + since(q.sentAt, s.now) : undefined} />
          ))}
          {!r.cold.length && <Empty title="No quotes waiting longer than 7 days" />}
        </RiskCard>

        <RiskCard title="Freight delaying conversion" hint="Quotes that cannot go out until a carrier sends a rate. Value is equipment only; freight is not priced yet."
          value={t.freightBlocked.value} n={t.freightBlocked.n} unit={["quote", "quotes"]}
          extra={r.blockedLate ? <Badge tone="warn" dot>{num(r.blockedLate)} waiting over 3 days</Badge> : undefined}
          action={{ label: "Open Freight", page: "Freight", tab: "awaiting" }}>
          {r.blocked.slice(0, 5).map((q) => (
            <RecRow key={q.id} onClick={() => openPanel(q.freightId ? "freight" : "quote", q.freightId ?? q.id)} lead={tag(q.customerId)}
              title={name(q.customerId)} sub={q.id + (q.freightId ? ", " + q.freightId : "") + ", " + carrier(q.freightId)}
              value={<Money v={quoteEquipment(q)} cur={q.currency} />} meta={"Waiting " + fmtDays(r.waitingDays(q))} />
          ))}
          {!r.blocked.length && <Empty title="No quotes waiting on freight" />}
        </RiskCard>

        <RiskCard title="High-value opportunities" hint="Open deals worth €10,000 or more (EUR eq.) that need a decision or a push."
          value={t.highValue.value} n={t.highValue.n} unit={["deal", "deals"]}
          action={{ label: "Open pipeline", page: "Enquiries", tab: "pipeline" }}>
          {r.big.slice(0, 5).map((e) => (
            <RecRow key={e.id} onClick={() => openPanel("enquiry", e.id)} lead={tag(e.customerId)}
              title={name(e.customerId)} sub={e.id + ", " + linesText(s, e.lines)}
              value={<Money v={enquiryValue(s, e)} cur={enquiryCurrency(s, e)} />} meta={<Status s={e.stage} />} />
          ))}
          {!r.big.length && <Empty title="No open deals above €10,000" />}
        </RiskCard>
      </Grid>
    </Page>
  );
}
