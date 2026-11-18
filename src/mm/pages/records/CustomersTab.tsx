import { useMemo, useState } from "react";
import type { Contact, Customer, CustomerType, MMState } from "../../types";
import { openPanel, useMM } from "../../store";
import { invoiceStatus, outstanding } from "../../select";
import { Cell, CountryTag, MONO, Page, Seg, Table, Who, type Col } from "../../ui";
import { countryName, money, num, since } from "../../format";
import { Count, HeadRow, NONE, SearchBox, TableFrame, matches } from "./shared";

/* Records › Customers: every customer as a record, with what is open and what is owed. */

type Row = {
  c: Customer; ct?: Contact; enquiries: number; open: number; quotes: number; orders: number; owed: number; overdue: boolean; last: number;
};
type TypeFilter = "All" | CustomerType;

const OPEN = new Set(["New", "Qualified", "Freight Requested", "Quote Ready", "Quote Sent"]);
const TYPES: CustomerType[] = ["Commercial gym", "Independent gym", "Performance facility", "Individual buyer", "Wholesale distributor", "Reseller"];
const SHORT: Record<CustomerType, string> = {
  "Commercial gym": "Commercial", "Independent gym": "Independent", "Performance facility": "Performance",
  "Individual buyer": "Individual", "Wholesale distributor": "Wholesale", Reseller: "Reseller",
};

/** One pass over the records; last activity is the latest timestamp touching the customer. */
function buildRows(s: MMState): Row[] {
  const rows = new Map<string, Row>();
  const contacts = new Map(s.contacts.map((k) => [k.id, k]));
  for (const c of s.customers) {
    rows.set(c.id, { c, ct: contacts.get(c.contactId), enquiries: 0, open: 0, quotes: 0, orders: 0, owed: 0, overdue: false, last: Date.parse(c.since) });
  }
  const touch = (cid: string | undefined, at: number) => {
    const r = cid ? rows.get(cid) : undefined;
    if (r && at > r.last) r.last = at;
  };
  for (const e of s.enquiries) {
    const r = rows.get(e.customerId);
    if (!r) continue;
    r.enquiries++;
    if (OPEN.has(e.stage)) r.open++;
    touch(e.customerId, Math.max(e.receivedAt, e.lastContactAt));
  }
  for (const q of s.quotes) {
    const r = rows.get(q.customerId);
    if (!r) continue;
    r.quotes++;
    touch(q.customerId, Math.max(q.updatedAt, q.sentAt ?? 0));
  }
  for (const o of s.orders) {
    const r = rows.get(o.customerId);
    if (!r) continue;
    r.orders++;
    touch(o.customerId, Math.max(o.acceptedAt, o.dispatchedAt ?? 0, o.deliveredAt ?? 0));
  }
  const invoiceOwner = new Map<string, string>();
  for (const i of s.invoices) {
    invoiceOwner.set(i.id, i.customerId);
    const r = rows.get(i.customerId);
    if (!r) continue;
    r.owed += outstanding(s, i);
    if (invoiceStatus(s, i) === "Overdue") r.overdue = true;
    touch(i.customerId, i.issuedAt);
  }
  for (const p of s.payments) touch(invoiceOwner.get(p.invoiceId), p.at);
  for (const a of s.activity) touch(a.customerId, a.at);
  for (const m of s.emails) touch(m.customerId, m.at);
  return [...rows.values()].sort((a, b) => b.last - a.last);
}

const cols: Col<Row>[] = [
  { key: "name", label: "Customer", width: "minmax(190px,1.6fr)", render: (r) => (
    <Who name={r.c.name} sub={r.c.returning ? "Returning customer" : "Since " + new Date(Date.parse(r.c.since)).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} />
  ) },
  { key: "type", label: "Type", width: "124px", render: (r) => <span style={{ color: "var(--dim)" }}>{r.c.type}</span> },
  { key: "country", label: "Country", width: "118px", render: (r) => (
    <span title={countryName(r.c.country)} style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0, maxWidth: "100%" }}>
      <CountryTag c={r.c.country} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--dim)" }}>{countryName(r.c.country)}</span>
    </span>
  ) },
  { key: "city", label: "City", width: "104px", render: (r) => <span style={{ whiteSpace: "nowrap" }}>{r.c.city}</span> },
  { key: "cur", label: "Currency", width: "66px", render: (r) => <span style={{ ...MONO, fontSize: 11.5, color: "var(--dim)" }}>{r.c.currency}</span> },
  { key: "contact", label: "Contact", width: "minmax(150px,1.2fr)", render: (r) => <Cell top={r.ct?.name ?? "Not recorded"} sub={r.ct?.email} /> },
  { key: "open", label: "Open enquiries", width: "100px", align: "right", render: (r) => <Count n={r.open} strong /> },
  { key: "quotes", label: "Quotes", width: "60px", align: "right", render: (r) => <Count n={r.quotes} /> },
  { key: "orders", label: "Orders", width: "60px", align: "right", render: (r) => <Count n={r.orders} /> },
  { key: "owed", label: "Outstanding", width: "100px", align: "right", render: (r) => r.owed > 0
    ? <span title={r.overdue ? "Includes an overdue invoice" : undefined} style={{ fontVariantNumeric: "tabular-nums", color: r.overdue ? "var(--bad)" : "var(--ink)", fontWeight: r.overdue ? 600 : 400 }}>{money(r.owed, r.c.currency)}</span>
    : NONE },
  { key: "last", label: "Last activity", width: "96px", align: "right", render: (r) => <span style={{ color: "var(--dim)", whiteSpace: "nowrap" }}>{since(r.last)}</span> },
];

export default function CustomersTab() {
  const s = useMM();
  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("All");
  const all = useMemo(() => buildRows(s), [s]);

  const byType = (t: TypeFilter) => (t === "All" ? all.length : all.filter((r) => r.c.type === t).length);
  const options: [TypeFilter, string][] = [["All", "All " + all.length], ...TYPES.filter((t) => byType(t) > 0).map((t): [TypeFilter, string] => [t, SHORT[t] + " " + byType(t)])];
  const rows = all.filter((r) => (type === "All" || r.c.type === type)
    && matches(q, r.c.name, r.c.city, countryName(r.c.country), r.c.type, r.ct?.name, r.ct?.email, r.c.id));

  const countries = new Set(all.map((r) => r.c.country)).size;
  const returning = all.filter((r) => r.c.returning).length;
  const owedEur = all.filter((r) => r.c.currency === "EUR").reduce((n, r) => n + r.owed, 0);
  const owedGbp = all.filter((r) => r.c.currency === "GBP").reduce((n, r) => n + r.owed, 0);

  return (
    <Page>
      <HeadRow title="Customers" count={all.length}
        summary={num(countries) + " countries · " + num(returning) + " returning · outstanding " + money(owedEur, "EUR") + (owedGbp ? " and " + money(owedGbp, "GBP") : "")}>
        <SearchBox value={q} onChange={setQ} label="Search name, contact, city" />
      </HeadRow>
      <div><Seg<TypeFilter> options={options} value={type} onChange={setType} /></div>
      <TableFrame min={1100}>
        <Table cols={cols} rows={rows} rowKey={(r) => r.c.id} limit={25} onRow={(r) => openPanel("customer", r.c.id)}
          empty={q ? "No customer matches “" + q + "”." : "No customers of this type."} />
      </TableFrame>
    </Page>
  );
}
