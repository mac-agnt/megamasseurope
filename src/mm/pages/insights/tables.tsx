import type { Enquiry, Invoice, MMState, Order, Quote } from "../../types";
import { Cell, CountryTag, Money, Row, Status, type Col } from "../../ui";
import { countryName, dateShort, since } from "../../format";
import { daysOverdue, enquiryCurrency, enquiryValue, invoiceStatus, ix, orderValue, outstanding, quoteTotal } from "../../select";
import { linesText } from "./calc";

/* Column sets for record tables on the Insights pages. Every row opens the
   shared record panel; the page passes `onRow`. */

function CustomerCell({ s, id }: { s: MMState; id: string }) {
  const c = ix(s).customer[id];
  if (!c) return <span style={{ color: "var(--faint)" }}>Unknown</span>;
  return (
    <Row gap={8}>
      <CountryTag c={c.country} />
      <Cell top={c.name} sub={c.city + ", " + countryName(c.country)} />
    </Row>
  );
}

export function enquiryCols(s: MMState, opts: { compact?: boolean } = {}): Col<Enquiry>[] {
  const cols: Col<Enquiry>[] = [
    { key: "id", label: "Enquiry", width: "112px", render: (e) => <Cell top={e.id} sub={dateShort(e.receivedAt)} /> },
    { key: "cust", label: "Customer", width: "minmax(0,1.3fr)", render: (e) => <CustomerCell s={s} id={e.customerId} /> },
    { key: "lines", label: "Machines", width: "minmax(0,1.4fr)", render: (e) => <Cell top={linesText(s, e.lines)} sub={e.qualification} /> },
    { key: "stage", label: "Stage", width: "150px", render: (e) => <Status s={e.stage} /> },
  ];
  if (!opts.compact) cols.push({ key: "src", label: "Source", width: "130px", render: (e) => <span style={{ color: "var(--dim)" }}>{e.source}</span> });
  cols.push({ key: "val", label: "Value", width: "104px", align: "right", render: (e) => <Money v={enquiryValue(s, e)} cur={enquiryCurrency(s, e)} /> });
  return cols;
}

export function quoteCols(s: MMState): Col<Quote>[] {
  return [
    { key: "id", label: "Quote", width: "112px", render: (q) => <Cell top={q.id} sub={q.sentAt ? "Sent " + dateShort(q.sentAt) : "Not sent"} /> },
    { key: "cust", label: "Customer", width: "minmax(0,1.3fr)", render: (q) => <CustomerCell s={s} id={q.customerId} /> },
    { key: "lines", label: "Machines", width: "minmax(0,1.4fr)", render: (q) => <Cell top={linesText(s, q.lines)} sub={"Prepared by " + q.preparedBy} /> },
    { key: "status", label: "Status", width: "150px", render: (q) => <Status s={q.status} /> },
    { key: "age", label: "Decision", width: "130px", render: (q) => <span style={{ color: "var(--dim)" }}>{q.decidedAt ? dateShort(q.decidedAt) : q.sentAt ? "Sent " + since(q.sentAt, s.now) : "Pending"}</span> },
    { key: "total", label: "Total", width: "104px", align: "right", render: (q) => <Money v={quoteTotal(s, q)} cur={q.currency} /> },
  ];
}

export function orderCols(s: MMState, opts: { compact?: boolean } = {}): Col<Order>[] {
  const cols: Col<Order>[] = [
    { key: "id", label: "Order", width: "112px", render: (o) => <Cell top={o.id} sub={"Accepted " + dateShort(o.acceptedAt)} /> },
    { key: "cust", label: "Customer", width: "minmax(0,1.3fr)", render: (o) => <CustomerCell s={s} id={o.customerId} /> },
    { key: "lines", label: "Machines", width: "minmax(0,1.4fr)", render: (o) => <span>{linesText(s, o.lines)}</span> },
    { key: "status", label: "Status", width: "160px", render: (o) => <Status s={o.status} /> },
  ];
  if (!opts.compact) cols.push({ key: "inv", label: "Invoice", width: "110px", render: (o) => <span style={{ color: "var(--dim)" }}>{o.invoiceId ?? "Not raised"}</span> });
  cols.push({ key: "val", label: "Value", width: "104px", align: "right", render: (o) => <Money v={orderValue(o)} cur={o.currency} /> });
  return cols;
}

export function invoiceCols(s: MMState): Col<Invoice>[] {
  return [
    { key: "id", label: "Invoice", width: "112px", render: (i) => <Cell top={i.id} sub={"Issued " + dateShort(i.issuedAt)} /> },
    { key: "cust", label: "Customer", width: "minmax(0,1.4fr)", render: (i) => <CustomerCell s={s} id={i.customerId} /> },
    { key: "order", label: "Order", width: "100px", render: (i) => <span style={{ color: "var(--dim)" }}>{i.orderId}</span> },
    { key: "status", label: "Status", width: "130px", render: (i) => <Status s={invoiceStatus(s, i)} /> },
    { key: "due", label: "Due", width: "140px", render: (i) => {
      const st = invoiceStatus(s, i);
      return <Cell top={dateShort(i.dueAt)} sub={st === "Overdue" ? daysOverdue(s, i) + " days overdue" : st === "Paid" ? "Settled" : "Open"} />;
    } },
    { key: "amt", label: "Amount", width: "104px", align: "right", render: (i) => <Money v={i.amount} cur={i.currency} /> },
    { key: "out", label: "Outstanding", width: "110px", align: "right", render: (i) => <Money v={outstanding(s, i)} cur={i.currency} dim={outstanding(s, i) === 0} /> },
  ];
}
