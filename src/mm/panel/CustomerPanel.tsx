import type { MMState } from "../types";
import { contactOf, customerGraph, freightCharge, invoiceStatus, ix, orderValue, outstanding, quoteTotal, quoteUnits } from "../select";
import { Avatar, CountryTag, Facts, Status, Who } from "../ui";
import { countryName, dateLong, dateShort, money, plural, since } from "../format";
import {
  ActivityList, Box, MailThread, Missing, Muted, OpenTasks, PanelBody, RecordRow, RowList, Section, StatBand, isOpenStage, useNav,
} from "./kit";

/* Customer record: profile, contact, every linked record, balance and history. */

export default function CustomerPanel({ s, id }: { s: MMState; id: string }) {
  const nav = useNav();
  const x = ix(s);
  const c = x.customer[id];
  if (!c) return <Missing />;
  const ct = contactOf(s, c);
  const g = customerGraph(s, c.id);
  const cur = c.currency;
  const enquiries = [...g.enquiries].sort((a, b) => b.receivedAt - a.receivedAt);
  const openEnq = enquiries.filter((e) => isOpenStage(e.stage));
  const withCustomer = g.quotes.filter((q) => q.status === "Sent");
  const owed = g.invoices.reduce((n, i) => n + outstanding(s, i), 0);
  const overdue = g.invoices.filter((i) => invoiceStatus(s, i) === "Overdue");
  const delivered = g.orders.filter((o) => o.status === "Delivered").length;
  const lineText = (lines: { productId: string; qty: number }[]) =>
    lines.map((l) => (l.qty > 1 ? l.qty + " × " : "") + (x.product[l.productId]?.name ?? l.productId)).join(", ");

  return (
    <PanelBody>
      <Section title="Profile">
        <Box pad="16px 18px">
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <Avatar name={c.name} size={42} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.2px" }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>{c.type} · {c.city}, {countryName(c.country)}</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <Facts cols={3} rows={[
              ["Type", c.type],
              ["City", c.city],
              ["Country", <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CountryTag c={c.country} />{countryName(c.country)}</span>],
              ["Currency", cur],
              ["Returning", c.returning ? "Yes" : "No"],
              ["Customer since", dateLong(Date.parse(c.since))],
            ]} />
          </div>
          {c.note && <Muted style={{ marginTop: 12 }}>{c.note}</Muted>}
        </Box>
      </Section>

      <Section title="Contact">
        <Box>
          <Who name={ct.name} sub={ct.role} />
          <div style={{ marginTop: 14 }}>
            <Facts rows={[["Email", ct.email], ["Phone", ct.phone]]} />
          </div>
        </Box>
      </Section>

      <StatBand items={[
        { label: "Enquiries", value: enquiries.length, sub: plural(openEnq.length, "open", "open") },
        { label: "Quotes", value: g.quotes.length, sub: withCustomer.length ? withCustomer.length + " with the customer" : "None waiting" },
        { label: "Orders", value: g.orders.length, sub: delivered + " delivered" },
        { label: "Outstanding", value: money(owed, cur), tone: overdue.length ? "bad" : owed > 0 ? "warn" : undefined,
          sub: overdue.length ? plural(overdue.length, "invoice") + " overdue" : "Nothing overdue" },
      ]} />

      {enquiries.length > 0 && (
        <Section title={"Enquiries · " + enquiries.length}>
          <RowList rows={enquiries} limit={5} render={(e) => (
            <RecordRow onClick={() => nav.open("enquiry", e.id)} title={e.id + " · " + lineText(e.lines)}
              sub={e.source + " · received " + since(e.receivedAt)} right={<Status s={e.stage} />} />
          )} />
        </Section>
      )}

      {g.quotes.length > 0 && (
        <Section title={"Quotes · " + g.quotes.length}>
          <RowList rows={g.quotes} limit={5} render={(q) => (
            <RecordRow onClick={() => nav.open("quote", q.id)} title={q.id + " · " + money(quoteTotal(s, q), q.currency) + " ex VAT"}
              sub={plural(quoteUnits(q), "machine") + " · updated " + since(q.updatedAt)} right={<Status s={q.status} />} />
          )} />
        </Section>
      )}

      {g.freight.length > 0 && (
        <Section title={"Freight requests · " + g.freight.length}>
          <RowList rows={g.freight} limit={5} render={(f) => {
            const charge = freightCharge(f);
            return (
              <RecordRow onClick={() => nav.open("freight", f.id)}
                title={f.id + " · " + (s.suppliers.find((su) => su.id === f.carrierId)?.name ?? "Carrier")}
                sub={f.destination + (charge !== null ? " · " + money(charge, cur) + " to customer" : " · rate pending")} right={<Status s={f.status} />} />
            );
          }} />
        </Section>
      )}

      {g.orders.length > 0 && (
        <Section title={"Orders · " + g.orders.length}>
          <RowList rows={g.orders} limit={5} render={(o) => (
            <RecordRow onClick={() => nav.open("order", o.id)} title={o.id + " · " + money(orderValue(o), o.currency)}
              sub={"Accepted " + dateShort(o.acceptedAt) + (o.eta ? " · " + o.eta : "")} right={<Status s={o.status} />} />
          )} />
        </Section>
      )}

      {g.invoices.length > 0 && (
        <Section title={"FreshBooks invoices · " + g.invoices.length}>
          <RowList rows={g.invoices} limit={5} render={(i) => {
            const left = outstanding(s, i);
            return (
              <RecordRow onClick={() => nav.open("invoice", i.id)} title={i.id + " · " + money(i.amount, i.currency)}
                sub={"Due " + dateShort(i.dueAt) + (left > 0 ? " · " + money(left, i.currency) + " outstanding" : " · paid")} right={<Status s={invoiceStatus(s, i)} />} />
            );
          }} />
        </Section>
      )}

      {g.followUps.length > 0 && (
        <Section title={"Follow-ups · " + g.followUps.length}>
          <RowList rows={g.followUps} limit={4} render={(f) => (
            <RecordRow onClick={() => nav.open("followup", f.id)} title={f.kind} sub={"Last touch " + since(f.lastTouch) + " · suggested at day " + f.dueInDays}
              right={<Status s={f.status} />} />
          )} />
        </Section>
      )}

      <Section title="Activity">
        <ActivityList events={[...g.activity].sort((a, b) => b.at - a.at)} limit={8} empty="No activity logged for this customer this week." />
      </Section>

      <Section title="Emails">
        <MailThread emails={g.emails} limit={4} empty="No emails with this customer yet." />
      </Section>

      <OpenTasks s={s} kind="customer" id={c.id} />
    </PanelBody>
  );
}
