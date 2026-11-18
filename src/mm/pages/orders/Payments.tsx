import { useState } from "react";
import { approve, decideFollowUp, go, openPanel, recordPayment, useMM } from "../../store";
import { customerOf, daysOverdue, eurEq, headline, invoiceStatus, ix, openApprovals, outstanding, overdueInvoices } from "../../select";
import { dateShort, money, plural, since, stamp } from "../../format";
import {
  Avatar, Badge, BarList, Button, Card, CountryTag, Empty, Grid, I, Label, Mail, MONO, Note, Page, PageHead, Row, Table, type Col,
} from "../../ui";
import type { Approval, Currency, MMState, Payment } from "../../types";
import { ActionRow, AGE_BUCKETS, FB_SIM, Fig, NumCell, promiseState, RATE_NOTE, Tinted } from "./shared";

const DAY = 86_400_000;

export default function Payments() {
  const s = useMM();
  const h = headline(s);
  const overdue = overdueInvoices(s);
  const openNotDue = s.invoices.filter((i) => { const st = invoiceStatus(s, i); return st === "Sent" || st === "Part paid"; });
  const owed = (cur: Currency) => openNotDue.filter((i) => i.currency === cur).reduce((n, i) => n + outstanding(s, i), 0);
  const collected30 = s.payments.filter((p) => Date.now() - p.at <= 30 * DAY).reduce((n, p) => n + eurEq(p.amount, p.currency), 0);
  const auto = s.controls.followUpAuto;

  const buckets = AGE_BUCKETS.map((b) => {
    const xs = overdue.filter((i) => { const d = daysOverdue(s, i); return d >= b.min && d <= b.max; });
    return { ...b, n: xs.length, value: xs.reduce((n, i) => n + eurEq(outstanding(s, i), i.currency), 0) };
  });
  const biggest = buckets.reduce((m, b) => (b.value > m.value ? b : m), buckets[0]);

  return (
    <Page>
      <PageHead title="Receivables"
        sub={"Who owes what, how long it has been, and what was promised. Automatic chasing is " + (auto ? "on" : "off") + ", so every payment email waits for your approval."}
        right={<Button icon={I.file} onClick={() => go("Orders", "invoices")}>All invoices</Button>} />

      <Grid cols="repeat(auto-fit,minmax(300px,1fr))" gap={14} style={{ alignItems: "stretch" }}>
        <Card tone="bad" pad="18px 20px">
          <Fig label="Overdue now" size={34} tone="bad" value={money(h.overdueValue) + (h.overdueGBP ? " + " + money(h.overdueGBP, "GBP") : "")}
            sub={"Across " + plural(h.overdueCount, "invoice") + (overdue.length ? ". Oldest " + plural(daysOverdue(s, overdue[0]), "day") + " past due" : "")} />
          <Grid cols="repeat(2,minmax(0,1fr))" gap={12} style={{ marginTop: 18 }}>
            <Fig size={17} label="Open, not yet due" value={(owed("EUR") || !owed("GBP") ? money(owed("EUR")) : "") + (owed("GBP") ? (owed("EUR") ? " + " : "") + money(owed("GBP"), "GBP") : "")}
              sub={plural(openNotDue.length, "invoice")} />
            <Fig size={17} label="Collected, 30 days" value={money(collected30)} sub="EUR eq." />
          </Grid>
          <Note icon={I.lock} style={{ marginTop: 16 }}>
            {auto ? "Automatic chasing is on in Settings." : "Automatic chasing is off. Nothing goes to a customer until you approve it."}
          </Note>
        </Card>

        <Card title="Overdue by age" hint="Days past the FreshBooks due date, outstanding value">
          <BarList tone="bad" format={(n) => money(n)}
            items={buckets.map((b) => ({ key: b.label, label: b.label, value: b.value, note: plural(b.n, "invoice") }))} />
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 16, lineHeight: 1.5 }}>
            {biggest && biggest.value > 0
              ? "Most of it sits at " + biggest.label + ": " + money(biggest.value) + " across " + plural(biggest.n, "invoice") + "."
              : "Nothing overdue."}
          </div>
        </Card>

        <Promises s={s} />
      </Grid>

      <Grid cols="minmax(0,1.55fr) minmax(0,1fr)" gap={14} style={{ alignItems: "stretch" }}>
        <NextActions s={s} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <Broken s={s} />
          <Largest s={s} />
        </div>
      </Grid>

      <RecentPayments s={s} />
    </Page>
  );
}

/* ── promises ────────────────────────────────────────────────────────────── */

function Promises({ s }: { s: MMState }) {
  const list = s.invoices.filter((i) => i.promise).sort((a, b) => a.promise!.date - b.promise!.date);
  const broken = list.filter((i) => promiseState(s, i)?.label === "Broken").length;
  return (
    <Card title="Payment promises" hint={plural(list.length, "promise") + " logged, " + broken + " broken"}>
      {list.length === 0 && <Empty title="No promises logged" />}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {list.map((inv) => {
          const p = inv.promise!;
          const ps = promiseState(s, inv)!;
          const c = customerOf(s, inv.customerId);
          return (
            <div key={inv.id} onClick={() => openPanel("invoice", inv.id)} className="mm-row"
              style={{ padding: "9px 10px", margin: "0 -10px", borderRadius: 12, cursor: "pointer" }}>
              <Row gap={8}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                <Badge tone={ps.tone}>{ps.label}</Badge>
              </Row>
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={MONO}>{inv.id}</span>, {money(p.amount, inv.currency)} promised for {dateShort(p.date)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── Receivables Agent suggestions ───────────────────────────────────────── */

function NextActions({ s }: { s: MMState }) {
  const follow = openApprovals(s).filter((a) => a.kind === "Payment follow-up");
  const done = s.approvals.filter((a) => a.kind === "Payment follow-up" && a.status === "Approved");
  const covered = new Set(s.approvals.filter((a) => a.kind === "Payment follow-up").map((a) => a.recordId));
  const bare = overdueInvoices(s).filter((i) => !covered.has(i.id) && !i.promise);
  const bareValue = bare.reduce((n, i) => n + eurEq(outstanding(s, i), i.currency), 0);

  return (
    <Card title="Suggested next actions" hint="From the Receivables Agent, read from FreshBooks this morning. Nothing is sent until you approve it."
      right={<Avatar name="Receivables Agent" size={28} />}>
      {follow.length === 0 && <Empty title="No payment emails waiting" sub="The Receivables Agent checks FreshBooks every morning and drafts the next ones here." />}
      {follow.map((a, i) => <FollowItem key={a.id} s={s} a={a} first={i === 0} />)}
      {bare.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: follow.length ? 4 : 0 }}>
          <ActionRow icon={I.alert} tone="warn" title={plural(bare.length, "overdue invoice") + " with nothing prepared yet"}
            sub={money(bareValue) + " outstanding. No promise logged and no email drafted"} onClick={() => go("Orders", "invoices")} />
        </div>
      )}
      {done.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Label>Approved in this session</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {done.map((a) => (
              <Row key={a.id} gap={8} style={{ fontSize: 12.5, color: "var(--dim)" }}>
                <Tinted tone="ok">Approved</Tinted>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{customerOf(s, a.customerId).name}, {a.recordId}. Simulated: nothing was sent.</span>
              </Row>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function FollowItem({ s, a, first }: { s: MMState; a: Approval; first: boolean }) {
  const [show, setShow] = useState(false);
  const inv = ix(s).invoice[a.recordId];
  if (!inv) return null;
  const c = customerOf(s, a.customerId);
  const out = outstanding(s, inv);
  const draft = s.emails.find((m) => m.recordId === inv.id && m.direction === "draft");
  return (
    <div style={{ padding: first ? "2px 0 14px" : "14px 0", borderTop: first ? undefined : "1px solid var(--border)" }}>
      <Row gap={12} style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Row gap={8} wrap>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{a.action}</span>
            <Badge tone={a.status === "Needs action" ? "warn" : "accent"}>{a.status === "Needs action" ? "Needs action" : "Ready for approval"}</Badge>
          </Row>
          <Row gap={7} style={{ marginTop: 5, fontSize: 12.5, color: "var(--dim)" }}>
            <span style={{ color: "var(--body)" }}>{c.name}</span><CountryTag c={c.country} />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span style={MONO}>{inv.id}</span>, {plural(daysOverdue(s, inv), "day")} overdue
            </span>
          </Row>
          <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 7, lineHeight: 1.5 }}>{a.context}</div>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(out, inv.currency)}</div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>outstanding</div>
        </div>
      </Row>
      {show && draft && (
        <div style={{ marginTop: 10 }}>
          <Mail kind="draft" from={draft.from} to={draft.to} at={stamp(draft.at)} subject={draft.subject} body={draft.body} />
        </div>
      )}
      <Row gap={8} wrap style={{ marginTop: 10 }}>
        <Button size="sm" kind="primary" icon={I.check} onClick={() => approve(a.id)}>Approve email</Button>
        {draft && <Button size="sm" kind="ghost" icon={I.mail} onClick={() => setShow(!show)}>{show ? "Hide draft" : "Preview draft"}</Button>}
        <Button size="sm" icon={I.money} title={FB_SIM} onClick={() => recordPayment(inv.id)}>Record payment</Button>
        <Button size="sm" kind="ghost" icon={I.eye} onClick={() => openPanel("invoice", inv.id)}>Invoice</Button>
      </Row>
    </div>
  );
}

/* ── broken commitments ──────────────────────────────────────────────────── */

function Broken({ s }: { s: MMState }) {
  const broken = s.invoices.filter((i) => i.promise?.broken && invoiceStatus(s, i) !== "Paid");
  return (
    <Card title="Broken commitments" hint="Promises that came and went without a payment" tone={broken.length ? "bad" : undefined}>
      {broken.length === 0 && <Empty title="No broken promises" sub="Every payment promise is on track or kept." />}
      {broken.map((inv, i) => {
        const p = inv.promise!;
        const c = customerOf(s, inv.customerId);
        const fu = s.followUps.find((f) => f.invoiceId === inv.id && f.kind === "Payment promise");
        const waiting = fu?.status === "Awaiting review";
        return (
          <div key={inv.id} style={{ paddingTop: i ? 12 : 0, marginTop: i ? 12 : 0, borderTop: i ? "1px solid var(--border)" : undefined }}>
            <Row gap={8}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--bad)", fontVariantNumeric: "tabular-nums" }}>{money(outstanding(s, inv), inv.currency)}</span>
            </Row>
            <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 3 }}>
              <span style={MONO}>{inv.id}</span>, promised for {dateShort(p.date)} ({since(p.date)}), {plural(daysOverdue(s, inv), "day")} overdue
            </div>
            <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 7, lineHeight: 1.5 }}>{p.note}</div>
            <Row gap={8} wrap style={{ marginTop: 10 }}>
              {fu && (waiting
                ? <Button size="sm" kind="primary" icon={I.send} onClick={() => decideFollowUp(fu.id, "Approved")}>Approve chase</Button>
                : <Badge tone={fu.status === "Approved" ? "ok" : "neutral"}>Chase {fu.status.toLowerCase()}</Badge>)}
              <Button size="sm" icon={I.money} title={FB_SIM} onClick={() => recordPayment(inv.id)}>Record payment</Button>
              <Button size="sm" kind="ghost" icon={I.user} onClick={() => openPanel("customer", c.id)}>Customer</Button>
            </Row>
          </div>
        );
      })}
    </Card>
  );
}

/* ── largest outstanding ─────────────────────────────────────────────────── */

function Largest({ s }: { s: MMState }) {
  const by = new Map<string, { value: number; n: number; gbp: number; overdue: number }>();
  for (const inv of s.invoices) {
    const out = outstanding(s, inv);
    if (out <= 0) continue;
    const r = by.get(inv.customerId) ?? { value: 0, n: 0, gbp: 0, overdue: 0 };
    r.value += eurEq(out, inv.currency);
    r.n += 1;
    if (inv.currency === "GBP") r.gbp += out;
    if (invoiceStatus(s, inv) === "Overdue") r.overdue = Math.max(r.overdue, daysOverdue(s, inv));
    by.set(inv.customerId, r);
  }
  const top = [...by.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, 6);
  const anyGbp = top.some(([, r]) => r.gbp > 0);
  return (
    <Card title="Largest outstanding" hint={"By customer, all unpaid invoices" + (anyGbp ? ". " + RATE_NOTE : "")} style={{ flex: 1 }}>
      {top.length === 0 ? <Empty title="Nothing outstanding" /> : (
        <BarList tone="warn" format={(n) => money(n)} onItem={(i) => openPanel("customer", top[i][0])}
          items={top.map(([id, r]) => ({
            key: id, label: customerOf(s, id).name,
            note: r.gbp ? money(r.gbp, "GBP") : r.overdue ? plural(r.overdue, "day") + " overdue" : "Not yet due",
            value: r.value,
          }))} />
      )}
    </Card>
  );
}

/* ── payments received ───────────────────────────────────────────────────── */

function RecentPayments({ s }: { s: MMState }) {
  const rows = [...s.payments].sort((a, b) => b.at - a.at);
  const cols: Col<Payment>[] = [
    { key: "at", label: "Received", width: "150px", render: (p) => <span style={{ whiteSpace: "nowrap" }}>{stamp(p.at)}</span> },
    { key: "inv", label: "Invoice", width: "92px", render: (p) => <span style={{ ...MONO, color: "var(--ink)" }}>{p.invoiceId}</span> },
    { key: "cust", label: "Customer", width: "minmax(0,1.4fr)", render: (p) => {
      const inv = ix(s).invoice[p.invoiceId];
      const c = inv ? customerOf(s, inv.customerId) : undefined;
      return c ? <Row gap={7}><span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span><CountryTag c={c.country} /></Row> : null;
    } },
    { key: "amount", label: "Amount", width: "110px", align: "right", render: (p) => <NumCell top={money(p.amount, p.currency)} sub={p.currency} /> },
    { key: "method", label: "Method", width: "minmax(0,0.8fr)", render: (p) => p.method },
    { key: "source", label: "Source", width: "minmax(0,1fr)", render: (p) => p.id.startsWith("PY-L")
      ? <Tinted tone="warn">Recorded in Pulse, simulated</Tinted> : <Tinted tone="neutral">FreshBooks</Tinted> },
  ];
  return (
    <Card title="Payments received" hint={"Newest first. " + plural(rows.length, "payment") + " on record"}>
      <Table rows={rows} limit={8} rowKey={(p) => p.id} onRow={(p) => openPanel("invoice", p.invoiceId)} cols={cols} empty="No payments yet." />
    </Card>
  );
}
