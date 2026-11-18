import { useState } from "react";
import { go, openPanel, recordPayment, sendPaymentFollowUp, useMM } from "../../store";
import {
  cashCollected, confirmedSales, contactOf, customerOf, daysOverdue, eurEq, headline, invoicedTotal, invoiceStatus, ix,
  openApprovals, orderValue, outstanding, overdueInvoices,
} from "../../select";
import { countryName, dateShort, money, moneyShort, plural, since, stamp } from "../../format";
import {
  Avatar, Badge, Button, Card, CountryTag, Grid, I, Kpi, Mail, MONO, Page, PageHead, Row, Status, Table, toneInk, type Col,
} from "../../ui";
import type { MMState, Order, OrderStatus } from "../../types";
import {
  ActionRow, allocation, Fig, FB_SIM, invoiceOf, isShipped, LIFECYCLE, linesText, MachinesCell, NumCell, payState, RATE_NOTE, readiness, Tinted,
} from "./shared";

/* Story thread D: the Rheinland Performance invoice the Receivables Agent is working on. */
const SPOTLIGHT_INVOICE = "FB-1047";

const STAGE_TAB: Record<OrderStatus, string> = {
  "Quote accepted": "confirmed", "Invoice created": "invoices", "Payment pending": "invoices", "Payment confirmed": "fulfilment",
  "Equipment allocated": "fulfilment", Dispatched: "fulfilment", Delivered: "fulfilment",
};

export default function OrdersOverview() {
  const s = useMM();
  const h = headline(s);
  const unpaidPromises = s.invoices.filter((i) => i.promise && invoiceStatus(s, i) !== "Paid");
  const broken = unpaidPromises.filter((i) => i.promise!.broken).length;
  const recent = [...s.orders].sort((a, b) => b.acceptedAt - a.acceptedAt);

  return (
    <Page>
      <PageHead title="Orders"
        sub="Pulse runs the work around FreshBooks: invoices, payments, stock allocation and dispatch. FreshBooks stays the record for invoices, payments and completed deals."
        right={<>
          <Badge tone="neutral" dot>FreshBooks snapshot, writes simulated</Badge>
          <Button icon={I.truck} onClick={() => go("Orders", "fulfilment")}>Fulfilment board</Button>
        </>} />

      <Grid cols="repeat(auto-fit,minmax(190px,1fr))" gap={12}>
        <Kpi label="Confirmed sales" value={money(confirmedSales(s))} tone="accent" onClick={() => go("Orders", "confirmed")}
          sub={plural(s.orders.length, "order") + ". " + RATE_NOTE} />
        <Kpi label="Invoiced in FreshBooks" value={money(invoicedTotal(s))} tone="info" onClick={() => go("Orders", "invoices")}
          sub={plural(s.invoices.length, "invoice") + ", EUR eq."} />
        <Kpi label="Cash collected" value={money(cashCollected(s))} tone="ok" onClick={() => go("Orders", "payments")}
          sub={plural(s.payments.length, "payment") + " received, EUR eq."} />
        <Kpi hero label="Overdue" value={money(h.overdueValue)} tone="bad" onClick={() => go("Orders", "invoices")}
          sub={"Across " + plural(h.overdueCount, "invoice") + (h.overdueGBP ? ", plus " + money(h.overdueGBP, "GBP") : "")} />
        <Kpi label="Payment promises" value={h.promises} tone="warn" onClick={() => go("Orders", "payments")}
          sub={broken + " broken, " + (unpaidPromises.length - broken) + " still due"} />
      </Grid>

      <Lifecycle s={s} />

      <Grid cols="minmax(0,1.3fr) minmax(0,1fr)" gap={14}>
        <Spotlight s={s} />
        <NextOnOrders s={s} />
      </Grid>

      <Card title="Recent orders" hint="Newest first. Payment comes from the FreshBooks invoice, never from the order stage."
        right={<Button size="sm" kind="ghost" icon={I.arrow} onClick={() => go("Orders", "confirmed")}>All confirmed orders</Button>}>
        <Table rows={recent} limit={8} rowKey={(o) => o.id} onRow={(o) => openPanel("order", o.id)} cols={recentCols(s)} />
      </Card>
    </Page>
  );
}

/* ── lifecycle band ──────────────────────────────────────────────────────── */

function Lifecycle({ s }: { s: MMState }) {
  const stages = LIFECYCLE.map((st, i) => {
    const os = s.orders.filter((o) => o.status === st);
    const value = os.reduce((n, o) => n + eurEq(orderValue(o), o.currency), 0);
    const unpaid = i >= 3 ? os.filter((o) => !payState(s, o).paid).length : 0;
    return { st, n: os.length, value, unpaid };
  });
  const total = stages.reduce((n, x) => n + x.n, 0);
  return (
    <Card title="Order lifecycle" hint={"Live across " + plural(total, "order") + ". Payment confirmed means the money is in FreshBooks, not just that an invoice exists."}
      right={<span style={{ ...MONO, fontSize: 10.5, color: "var(--faint)" }}>{RATE_NOTE}</span>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(122px,1fr))", gap: 8 }}>
        {stages.map((x, i) => {
          const live = x.n > 0;
          return (
            <div key={x.st} onClick={() => go("Orders", STAGE_TAB[x.st])} className="mm-card-click"
              style={{ position: "relative", padding: "13px 13px 12px", borderRadius: 14, cursor: "pointer", minWidth: 0,
                background: live ? "var(--surface-2)" : "var(--surface-faint)", border: "1px solid var(--border)" }}>
              <div style={{ position: "absolute", left: 13, right: 13, top: 0, height: 2, borderRadius: 2,
                background: live ? (i === LIFECYCLE.length - 1 ? toneInk("ok") : "var(--accent)") : "var(--track)", opacity: live ? 0.85 : 1 }} />
              <Row gap={6}>
                <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.8px", lineHeight: 1, color: live ? "var(--ink)" : "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{x.n}</span>
                <span style={{ flex: 1 }} />
                <span style={{ ...MONO, fontSize: 10, color: "var(--faint)" }}>{i + 1}</span>
              </Row>
              <div style={{ fontSize: 12, color: live ? "var(--body)" : "var(--dim)", marginTop: 8, lineHeight: 1.3 }}>{x.st}</div>
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{live ? moneyShort(x.value) + " EUR eq." : "None"}</div>
              {x.unpaid > 0 && <Badge tone="bad" style={{ marginTop: 8, height: 20, fontSize: 11 }}>{x.unpaid} unpaid</Badge>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── Rheinland spotlight ─────────────────────────────────────────────────── */

function Spotlight({ s }: { s: MMState }) {
  const [showMail, setShowMail] = useState(false);
  const inv = ix(s).invoice[SPOTLIGHT_INVOICE] ?? overdueInvoices(s)[0];
  if (!inv) return <Card title="Receivables">Nothing overdue.</Card>;
  const c = customerOf(s, inv.customerId);
  const ct = contactOf(s, c);
  const o = ix(s).order[inv.orderId];
  const st = invoiceStatus(s, inv);
  const out = outstanding(s, inv);
  const paid = st === "Paid";
  const appr = s.approvals.find((a) => a.recordId === inv.id && a.kind === "Payment follow-up");
  const waiting = !!appr && (appr.status === "Ready" || appr.status === "Needs action");
  const approvedAt = s.activity.find((a) => a.recordId === inv.id && a.title === "Payment follow-up approved")?.at;
  const mail = s.emails.filter((m) => m.recordId === inv.id && m.direction !== "in").sort((a, b) => b.at - a.at)[0];
  const first = ct.name.split(" ")[0];
  const excerpt = mail ? (mail.body.split("\n\n")[1] ?? mail.body) : "";

  return (
    <Card tone={paid ? "ok" : "bad"} pad="20px 22px">
      <Row gap={12} style={{ alignItems: "flex-start" }}>
        <Avatar name={c.name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Row gap={8}>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.3px", color: "var(--ink)" }}>{c.name}</span>
            <CountryTag c={c.country} />
          </Row>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>{c.city}, {countryName(c.country)} · {ct.name}, {ct.role}</div>
        </div>
        <Status s={st} />
      </Row>

      <Grid cols="repeat(3,minmax(0,1fr))" gap={12} style={{ marginTop: 18 }}>
        <Fig label="FreshBooks invoice" value={<span style={MONO}>{inv.id}</span>} sub={"Issued " + dateShort(inv.issuedAt)} />
        <Fig label="Outstanding" value={money(out, inv.currency)} sub={"Of " + money(inv.amount, inv.currency) + " invoiced"} tone={paid ? "ok" : undefined} />
        {paid
          ? <Fig label="Status" value="Paid" tone="ok" sub="Cleared in Pulse" />
          : <Fig label="Overdue" value={plural(daysOverdue(s, inv), "day")} tone="bad" sub={"Due " + dateShort(inv.dueAt)} />}
      </Grid>

      {o && (
        <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 14, lineHeight: 1.5 }}>
          Order <span style={{ ...MONO, color: "var(--body)" }}>{o.id}</span>: {linesText(s, o.lines)} plus {money(o.freightCharge, o.currency)} freight.
          {o.deliveredAt ? " Delivered " + dateShort(o.deliveredAt) + "." : ""}
        </div>
      )}

      <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 14, border: "1px solid var(--accent-line)", background: "var(--accent-faint)" }}>
        <Row gap={9}>
          <Avatar name="Receivables Agent" size={24} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", flex: 1 }}>Receivables Agent</span>
          {paid ? <Badge tone="ok">Closed</Badge> : waiting ? <Badge tone="accent">Needs your approval</Badge> : <Badge tone="ok">Email approved</Badge>}
        </Row>
        <div style={{ fontSize: 13, color: "var(--body)", marginTop: 8, lineHeight: 1.55 }}>
          {paid
            ? "Payment recorded against " + inv.id + ". Nothing left to chase."
            : waiting
              ? "Recommend a polite payment-status email to " + first + ". " + (appr?.context ?? "")
              : "Payment-status email approved" + (approvedAt ? " " + since(approvedAt) : "") + ". Next step: watch FreshBooks for the payment or a reply from " + first + "."}
        </div>
        {mail && !paid && !showMail && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--dim)" }}>{mail.direction === "draft" ? "Draft" : "Sent, simulated"}: {mail.subject}</div>
            <div style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 4, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              “{excerpt}”
            </div>
          </div>
        )}
      </div>

      {mail && !paid && showMail && (
        <div style={{ marginTop: 12 }}>
          <Mail kind={mail.direction === "draft" ? "draft" : "out"} from={mail.from} to={mail.to} at={stamp(mail.at)} subject={mail.subject} body={mail.body} />
        </div>
      )}

      <Row gap={8} wrap style={{ marginTop: 14 }}>
        <Button kind="primary" icon={waiting ? I.send : I.check} disabled={!waiting || paid} onClick={() => sendPaymentFollowUp(inv.id)}>
          {waiting ? "Approve email" : "Email approved"}
        </Button>
        <Button icon={I.money} disabled={out <= 0} title={FB_SIM} onClick={() => recordPayment(inv.id)}>Record payment</Button>
        {mail && !paid && <Button kind="ghost" icon={I.mail} onClick={() => setShowMail(!showMail)}>{showMail ? "Hide email" : "Read email"}</Button>}
        <Button kind="ghost" icon={I.user} onClick={() => openPanel("customer", c.id)}>Open customer</Button>
      </Row>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10 }}>Simulated in this demo: nothing is sent and FreshBooks is not changed.</div>
    </Card>
  );
}

/* ── what needs doing ────────────────────────────────────────────────────── */

function NextOnOrders({ s }: { s: MMState }) {
  const open = s.orders.filter((o) => !isShipped(o));
  const ready = open.filter((o) => readiness(s, o).ready);
  const intake = open.filter((o) => allocation(s, o).incoming > 0);
  const held = open.filter((o) => !payState(s, o).paid && allocation(s, o).stock > 0);
  const heldUnits = held.reduce((n, o) => n + allocation(s, o).stock, 0);
  const noInvoice = s.orders.filter((o) => !o.invoiceId);
  const overdue = overdueInvoices(s);
  const h = headline(s);
  const follow = openApprovals(s).filter((a) => a.kind === "Payment follow-up");
  const sh = s.shipments[0];
  const names = (os: Order[]) => os.slice(0, 2).map((o) => customerOf(s, o.customerId).name).join(", ") + (os.length > 2 ? " and " + (os.length - 2) + " more" : "");
  const sumEur = (os: Order[]) => os.reduce((n, o) => n + eurEq(orderValue(o), o.currency), 0);

  return (
    <Card title="Next on orders" hint="Worked out from orders, reservations and FreshBooks. Click through to act.">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ActionRow icon={I.truck} tone="ok" title={plural(ready.length, "order") + " ready to dispatch"}
          sub={ready.length ? names(ready) : "Nothing paid and fully in stock yet"} right={ready.length ? moneyShort(sumEur(ready)) : null}
          onClick={() => go("Orders", "fulfilment")} />
        <ActionRow icon={I.box} tone="warn" title={plural(intake.length, "order") + " waiting on the " + (sh ? sh.name.split(",")[0] : "incoming stock")}
          sub={sh ? sh.eta + ", " + (sh.confirmed ? "arrival confirmed" : "arrival not confirmed") : "No shipment due"} right={intake.length ? moneyShort(sumEur(intake)) : null}
          onClick={() => go("Stock", "incoming")} />
        <ActionRow icon={I.lock} tone="warn" title={"Stock held for " + plural(held.length, "unpaid order")}
          sub={plural(heldUnits, "machine") + " reserved until FreshBooks shows the payment"} onClick={() => go("Orders", "fulfilment")} />
        <ActionRow icon={I.file} tone="neutral" title={plural(noInvoice.length, "accepted quote") + " without a FreshBooks invoice"}
          sub={noInvoice.length ? names(noInvoice) + ". Raise it in FreshBooks" : "Every order is invoiced"} onClick={() => go("Orders", "confirmed")} />
        <ActionRow icon={I.alert} tone="bad" title={plural(overdue.length, "overdue invoice")}
          sub={overdue.length ? "Oldest " + plural(daysOverdue(s, overdue[0]), "day") + " overdue" : "Nothing overdue"} right={money(h.overdueValue)}
          onClick={() => go("Orders", "payments")} />
        <ActionRow icon={I.mail} tone="accent" title={plural(follow.length, "payment email") + " to approve"}
          sub="Prepared by the Receivables Agent. Automatic chasing is off" onClick={() => go("Orders", "payments")} />
      </div>
    </Card>
  );
}

/* ── recent orders ───────────────────────────────────────────────────────── */

function recentCols(s: MMState): Col<Order>[] {
  return [
    { key: "id", label: "Order", width: "96px", render: (o) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ ...MONO, color: "var(--ink)" }}>{o.id}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{since(o.acceptedAt)}</div>
      </div>
    ) },
    { key: "customer", label: "Customer", width: "minmax(0,1.3fr)", render: (o) => {
      const c = customerOf(s, o.customerId);
      return (
        <div style={{ minWidth: 0 }}>
          <Row gap={7}><span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span><CountryTag c={c.country} /></Row>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{c.city}</div>
        </div>
      );
    } },
    { key: "machines", label: "Machines", width: "minmax(0,1.5fr)", render: (o) => <MachinesCell s={s} lines={o.lines} /> },
    { key: "value", label: "Value", width: "96px", align: "right", render: (o) => <NumCell top={money(orderValue(o), o.currency)} sub={o.currency} /> },
    { key: "invoice", label: "FreshBooks", width: "150px", render: (o) => {
      const inv = invoiceOf(s, o);
      return inv ? <Row gap={7}><span style={{ ...MONO, fontSize: 12 }}>{inv.id}</span><Status s={invoiceStatus(s, inv)} /></Row> : <Tinted tone="neutral">Not raised yet</Tinted>;
    } },
    { key: "payment", label: "Payment", width: "minmax(0,0.9fr)", render: (o) => {
      const p = payState(s, o);
      return (
        <div style={{ minWidth: 0 }}>
          <Tinted tone={p.tone}>{p.label}</Tinted>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.detail}</div>
        </div>
      );
    } },
    { key: "stage", label: "Stage", width: "158px", render: (o) => <Status s={o.status} /> },
  ];
}

