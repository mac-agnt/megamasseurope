import { useState } from "react";
import type { Currency, MMState } from "../types";
import { recordPayment, sendPaymentFollowUp } from "../store";
import { daysOverdue, invoiceStatus, ix, outstanding, paidOn } from "../select";
import { Badge, Button, Facts, I, Icon, MONO, Mail, Status, inputStyle } from "../ui";
import { dateShort, money, plural, stamp, sym, until } from "../format";
import {
  ActivityList, ApprovalBox, Box, MAIL_ANCHOR, MailThread, Missing, Muted, OpenTasks, PanelBody, RecLink, RecordRow, Section, StatBand,
  activityFor, isOpenApproval,
} from "./kit";

/* FreshBooks invoice: what is owed, what was promised, what came in,
   and the payment-status email waiting for approval. */

function PartPayment({ invoiceId, max, currency }: { invoiceId: string; max: number; currency: Currency }) {
  const [txt, setTxt] = useState("");
  const n = parseFloat(txt);
  const ok = Number.isFinite(n) && n > 0;
  return (
    <div style={{ marginTop: 14 }}>
      <label htmlFor={"part-" + invoiceId} style={{ display: "block", fontSize: 11.5, color: "var(--dim)", fontWeight: 500, marginBottom: 6 }}>Part payment received</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 11, top: 9, fontSize: 13, color: "var(--faint)", pointerEvents: "none" }}>{sym(currency)}</span>
          <input id={"part-" + invoiceId} className="ixi" type="number" min={0} step={10} value={txt} onChange={(e) => setTxt(e.target.value)}
            style={{ ...inputStyle, width: 150, paddingLeft: 24, fontVariantNumeric: "tabular-nums" }} />
        </div>
        <Button kind="secondary" disabled={!ok} onClick={() => { recordPayment(invoiceId, Math.min(n, max)); setTxt(""); }}>Record part payment</Button>
      </div>
      <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 7 }}>Up to {money(max, currency)}. Simulated, FreshBooks unchanged.</div>
    </div>
  );
}

export default function InvoicePanel({ s, id }: { s: MMState; id: string }) {
  const x = ix(s);
  const inv = x.invoice[id];
  if (!inv) return <Missing />;
  const c = x.customer[inv.customerId];
  const ct = s.contacts.find((k) => k.id === c.contactId);
  const order = x.order[inv.orderId];
  const st = invoiceStatus(s, inv);
  const out = outstanding(s, inv);
  const paid = paidOn(s, inv);
  const od = daysOverdue(s, inv);
  const cur = inv.currency;
  const pays = s.payments.filter((p) => p.invoiceId === inv.id).sort((a, b) => a.at - b.at);
  const ask = s.approvals.find((a) => a.recordId === inv.id && a.kind === "Payment follow-up" && isOpenApproval(a.status));
  const mails = s.emails.filter((m) => m.recordKind === "invoice" && m.recordId === inv.id).sort((a, b) => a.at - b.at);
  const drafts = mails.filter((m) => m.direction === "draft");
  const sent = mails.filter((m) => m.direction !== "draft");
  const fu = s.followUps.find((f) => f.invoiceId === inv.id && f.status === "Awaiting review");
  const promise = inv.promise;

  const actions = ask || out > 0 ? (
    <>
      {ask && <Button kind="primary" icon={I.send} onClick={() => sendPaymentFollowUp(inv.id)}>Approve payment email</Button>}
      {out > 0 && <Button kind={ask ? "secondary" : "primary"} icon={I.money} title="Records the full outstanding balance" onClick={() => recordPayment(inv.id)}>Record payment</Button>}
    </>
  ) : undefined;

  return (
    <PanelBody actions={actions} foot={actions ? "Simulated in this demo: nothing is emailed and FreshBooks is unchanged." : undefined}>
      <StatBand items={[
        { label: "Amount", value: money(inv.amount, cur), sub: "Issued " + dateShort(inv.issuedAt) },
        { label: "Outstanding", value: money(out, cur), tone: st === "Overdue" ? "bad" : out > 0 ? "warn" : "ok", sub: paid ? money(paid, cur) + " paid so far" : "Nothing paid yet" },
        { label: "Due", value: dateShort(inv.dueAt), sub: until(inv.dueAt) },
        { label: "Days overdue", value: od, tone: od > 0 && out > 0 ? "bad" : undefined, sub: od > 0 && out > 0 ? "Since " + dateShort(inv.dueAt) : "Not overdue" },
      ]} />

      <Section title="FreshBooks record">
        <Box>
          <Facts rows={[
            ["FreshBooks number", <span style={{ ...MONO, fontSize: 12.5 }}>{inv.id}</span>],
            ["Status", <Status s={st} />],
            ["Customer", <RecLink kind="customer" id={c.id}>{c.name}</RecLink>],
            ["Contact", ct ? ct.name + ", " + ct.email : "Not recorded"],
            ["Order", order ? <RecLink kind="order" id={order.id}>{order.id}</RecLink> : "Not linked"],
            ["Payment terms", "Pending confirmation"],
            ["Issued", dateShort(inv.issuedAt)],
            ["Due date", dateShort(inv.dueAt)],
          ]} />
        </Box>
      </Section>

      {promise && (
        <Section title="Payment promise">
          <Box tone={promise.broken ? "bad" : "warn"}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {promise.broken ? <Badge tone="bad" dot>Broken promise</Badge> : <Badge tone="warn" dot>Promise open</Badge>}
              <span style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>
                {money(promise.amount, cur)} promised for {dateShort(promise.date)}, {until(promise.date)}
              </span>
            </div>
            <Muted style={{ marginTop: 8 }}>{promise.note}</Muted>
            {fu && <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--dim)" }}>Follow-up drafted: <RecLink kind="followup" id={fu.id}>{fu.kind}, {fu.id}</RecLink></div>}
          </Box>
        </Section>
      )}

      <Section title="Payments" right={<span style={{ ...MONO, fontSize: 10, color: "var(--faint)" }}>{money(paid, cur)} of {money(inv.amount, cur)}</span>}>
        <Box pad={pays.length ? "5px 5px 12px" : "15px 16px"}>
          {pays.length === 0 && <Muted>No payments recorded in FreshBooks yet.</Muted>}
          {pays.map((p) => (
            <RecordRow key={p.id}
              lead={<span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ok-soft)", color: "var(--ok)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon d={I.money} size={15} /></span>}
              title={money(p.amount, p.currency)} sub={stamp(p.at) + " · " + p.method} right={<Badge tone="ok">Received</Badge>} />
          ))}
          {out > 0 && <div style={{ padding: pays.length ? "0 10px" : 0 }}><PartPayment invoiceId={inv.id} max={out} currency={cur} /></div>}
        </Box>
      </Section>

      {(ask || drafts.length > 0) && (
        <Section title="Payment-status email">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ask && <ApprovalBox a={ask} />}
            {drafts.map((m) => <Mail key={m.id} from={m.from} to={m.to} at={stamp(m.at)} subject={m.subject} body={m.body} kind="draft" />)}
          </div>
        </Section>
      )}

      <Section title="Correspondence" id={MAIL_ANCHOR}>
        <MailThread emails={sent} empty="No payment emails sent on this invoice yet." />
      </Section>

      <Section title="Activity" right={od > 0 && out > 0 ? <span style={{ fontSize: 11.5, color: "var(--bad)" }}>{plural(od, "day")} overdue</span> : undefined}>
        <ActivityList events={activityFor(s, [inv.id])} />
      </Section>

      <OpenTasks s={s} kind="invoice" id={inv.id} />
    </PanelBody>
  );
}
