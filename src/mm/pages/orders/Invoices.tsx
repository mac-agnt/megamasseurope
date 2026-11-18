import { useState } from "react";
import { go, openPanel, recordPayment, useMM } from "../../store";
import { customerOf, daysOverdue, eurEq, headline, invoiceStatus, outstanding, paidOn } from "../../select";
import { dateShort, money, plural, until } from "../../format";
import { Button, Card, CountryTag, Grid, I, MONO, Note, Page, PageHead, Row, Seg, Status, Table, type Col, type Tone } from "../../ui";
import type { Currency, Invoice, MMState } from "../../types";
import { FB_SIM, Fig, lastPaidAt, NumCell, promiseState, RATE_NOTE, Tinted } from "./shared";

type Filter = "all" | "overdue" | "open" | "paid";
type St = ReturnType<typeof invoiceStatus>;
type IRow = { inv: Invoice; st: St };

const rank = (st: St) => (st === "Overdue" ? 0 : st === "Paid" ? 2 : 1);

export default function Invoices() {
  const s = useMM();
  const [f, setF] = useState<Filter>("all");
  const h = headline(s);

  const rows: IRow[] = s.invoices.map((inv) => ({ inv, st: invoiceStatus(s, inv) })).sort((a, b) =>
    rank(a.st) - rank(b.st)
    || (a.st === "Overdue" ? daysOverdue(s, b.inv) - daysOverdue(s, a.inv) : 0)
    || (a.st === "Paid" ? (lastPaidAt(s, b.inv.id) ?? 0) - (lastPaidAt(s, a.inv.id) ?? 0) : a.inv.dueAt - b.inv.dueAt));
  const overdue = rows.filter((r) => r.st === "Overdue");
  const open = rows.filter((r) => r.st === "Sent" || r.st === "Part paid");
  const paid = rows.filter((r) => r.st === "Paid");
  const shown = f === "overdue" ? overdue : f === "open" ? open : f === "paid" ? paid : rows;

  const owed = (rs: IRow[], cur: Currency) => rs.filter((r) => r.inv.currency === cur).reduce((n, r) => n + outstanding(s, r.inv), 0);
  const both = (eur: number, gbp: number) => (eur || !gbp ? money(eur) : "") + (gbp ? (eur ? " + " : "") + money(gbp, "GBP") : "");
  const promised = rows.filter((r) => r.inv.promise && r.st !== "Paid");
  const brokenN = promised.filter((r) => r.inv.promise!.broken).length;
  const paidTotal = paid.reduce((n, r) => n + eurEq(r.inv.amount, r.inv.currency), 0);
  const nextDue = open.length ? open[0].inv : undefined;

  const tile = (key: Filter | "promises", tone: Tone, label: string, value: string, sub: string) => (
    <Card key={key} pad="14px 16px" tone={f === key ? "accent" : undefined}
      onClick={() => (key === "promises" ? go("Orders", "payments") : setF(key))}>
      <Fig label={label} value={value} sub={sub} tone={tone === "neutral" ? undefined : tone} />
    </Card>
  );

  return (
    <Page>
      <PageHead title="FreshBooks invoices"
        sub="Invoices as they stand in FreshBooks. An invoice existing does not make a sale paid: only a recorded payment does."
        right={<Button icon={I.chart} onClick={() => go("Orders", "payments")}>Receivables</Button>} />

      <Grid cols="repeat(auto-fit,minmax(200px,1fr))" gap={12}>
        {tile("overdue", "bad", "Overdue", money(h.overdueValue) + (h.overdueGBP ? " + " + money(h.overdueGBP, "GBP") : ""),
          "Across " + plural(overdue.length, "invoice") + (overdue.length ? ", oldest " + plural(daysOverdue(s, overdue[0].inv), "day") : ""))}
        {tile("open", "warn", "Open, not yet due", both(owed(open, "EUR"), owed(open, "GBP")),
          plural(open.length, "invoice") + (nextDue ? ", next due " + until(nextDue.dueAt) : ""))}
        {tile("paid", "ok", "Paid", money(paidTotal), plural(paid.length, "invoice") + ". " + RATE_NOTE)}
        {tile("promises", "neutral", "Payment promises", String(promised.length), brokenN + " broken, " + (promised.length - brokenN) + " still due")}
      </Grid>

      <Note icon={I.money}>Record payment marks an invoice paid in Pulse so the order can move on. {FB_SIM}</Note>

      <Card pad="16px 18px" title={plural(shown.length, "invoice")}
        hint={f === "overdue" ? "Most overdue first" : f === "open" ? "Next due first" : f === "paid" ? "Most recent payment first" : "Overdue first, then open, then paid"}
        right={<Seg<Filter> value={f} onChange={setF} options={[
          ["all", "All " + rows.length], ["overdue", "Overdue " + overdue.length], ["open", "Open " + open.length], ["paid", "Paid " + paid.length],
        ]} />}>
        <Table rows={shown} rowKey={(r) => r.inv.id} onRow={(r) => openPanel("invoice", r.inv.id)} cols={cols(s)} empty="No invoices match this filter." />
      </Card>
    </Page>
  );
}

function cols(s: MMState): Col<IRow>[] {
  return [
    { key: "id", label: "Invoice", width: "92px", render: ({ inv }) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ ...MONO, color: "var(--ink)" }}>{inv.id}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>Order {inv.orderId}</div>
      </div>
    ) },
    { key: "customer", label: "Customer", width: "minmax(0,1.3fr)", render: ({ inv }) => {
      const c = customerOf(s, inv.customerId);
      return (
        <div style={{ minWidth: 0 }}>
          <Row gap={7}><span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span><CountryTag c={c.country} /></Row>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{c.city}</div>
        </div>
      );
    } },
    { key: "out", label: "Outstanding / amount", width: "128px", align: "right", render: ({ inv, st }) => {
      const part = paidOn(s, inv);
      return <NumCell top={st === "Paid" ? "Cleared" : money(outstanding(s, inv), inv.currency)} tone={st === "Overdue" ? "bad" : st === "Paid" ? "ok" : undefined}
        sub={"of " + money(inv.amount, inv.currency) + " " + inv.currency + (part > 0 && st !== "Paid" ? ", part paid" : "")} />;
    } },
    { key: "due", label: "Due", width: "92px", render: ({ inv, st }) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "var(--ink)", whiteSpace: "nowrap" }} title={st === "Sent" || st === "Part paid" ? "Due " + until(inv.dueAt) : undefined}>{dateShort(inv.dueAt)}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap" }}>Issued {dateShort(inv.issuedAt).split(" ").slice(1).join(" ")}</div>
      </div>
    ) },
    { key: "days", label: "Overdue", width: "72px", align: "right", render: ({ inv, st }) =>
      st === "Overdue" ? <Tinted tone="bad">{plural(daysOverdue(s, inv), "day")}</Tinted>
        : st === "Paid" ? <Tinted tone="neutral">Paid</Tinted> : <Tinted tone="neutral">Not due</Tinted> },
    { key: "promise", label: "Last payment promise", width: "minmax(0,1.5fr)", render: ({ inv }) => {
      const p = inv.promise;
      const ps = promiseState(s, inv);
      if (!p || !ps) return <Tinted tone="neutral">No promise logged</Tinted>;
      return (
        <div style={{ minWidth: 0 }} title={p.note}>
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ color: "var(--ink)" }}>{dateShort(p.date)}</span>{" "}
            <Tinted tone={ps.tone}>{ps.label === "Broken" ? "Broken promise" : ps.label}</Tinted>
            <span style={{ color: "var(--dim)" }}>, {money(p.amount, inv.currency)}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.note}</div>
        </div>
      );
    } },
    { key: "status", label: "Status", width: "96px", render: ({ st }) => <Status s={st} /> },
    { key: "act", label: "", width: "122px", align: "right", render: ({ inv, st }) => {
      if (st === "Paid") {
        const at = lastPaidAt(s, inv.id);
        return <Tinted tone="neutral">{at ? "Paid " + dateShort(at).split(" ").slice(1).join(" ") : "Paid"}</Tinted>;
      }
      return <Button size="sm" title={FB_SIM} onClick={() => recordPayment(inv.id)}>Record payment</Button>;
    } },
  ];
}
