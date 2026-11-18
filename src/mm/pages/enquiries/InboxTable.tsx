import type { ReactNode } from "react";
import type { Enquiry, MMState } from "../../types";
import { openPanel } from "../../store";
import { customerOf } from "../../select";
import { age, plural, stamp } from "../../format";
import { Badge, Card, Cell, CountryTag, Row, Table, type Col } from "../../ui";
import { PRIORITY_TONE, SOURCE_SHORT, STAGE_SHORT, STAGE_TONE, linesText, unitsOf, type InboxFilter } from "./data";
import { SearchBox } from "./bits";
import { FILTER_LABEL, FilterSeg } from "./InboxList";

/* Table view of the inbox: every column Niall asked for, one row per enquiry.
   Sized so all thirteen columns fit a main panel of about 1100px; headers and
   long values wrap instead of hiding columns. Below that it scrolls sideways.
   Rows open the shared record panel. */

/* New splits into unanswered and waiting on the customer, as the inbox does. */
function StageCell({ e }: { e: Enquiry }) {
  if (e.stage === "New") return e.replied
    ? <span title="New, answered, waiting on the customer"><Badge tone="warn" dot>Waiting</Badge></span>
    : <span title="New, no reply yet"><Badge tone="accent" dot>Unanswered</Badge></span>;
  return <span title={e.stage}><Badge tone={STAGE_TONE[e.stage]} dot>{STAGE_SHORT[e.stage]}</Badge></span>;
}

/** Header label that may wrap onto two lines. */
const H = (t: string): ReactNode => <span style={{ whiteSpace: "normal", display: "block", lineHeight: 1.35 }}>{t}</span>;
const small = (t: ReactNode, title?: string) => <span title={title} style={{ fontSize: 12.5 }}>{t}</span>;

export function InboxTable({ s, rows, filter, onFilter, counts, q, onQ }: {
  s: MMState; rows: Enquiry[]; filter: InboxFilter; onFilter: (f: InboxFilter) => void; counts: Record<InboxFilter, number>;
  q: string; onQ: (v: string) => void;
}) {
  const contact = (e: Enquiry) => s.contacts.find((x) => x.id === e.contactId)?.name ?? "";
  const cols: Col<Enquiry>[] = [
    { key: "customer", label: H("Customer"), width: "minmax(74px,1fr)", render: (e) => <span style={{ color: "var(--ink)" }}>{contact(e)}</span> },
    { key: "company", label: H("Company"), width: "minmax(100px,1.3fr)", render: (e) => <Cell top={customerOf(s, e.customerId).name} sub={e.id} /> },
    { key: "country", label: H("Country"), width: "50px", render: (e) => <CountryTag c={customerOf(s, e.customerId).country} /> },
    { key: "type", label: H("Customer type"), width: "minmax(78px,.9fr)", render: (e) => small(e.qualification) },
    { key: "equipment", label: H("Equipment requested"), width: "minmax(104px,1.4fr)", render: (e) => small(linesText(s, e), linesText(s, e)) },
    { key: "qty", label: H("Qty"), width: "26px", align: "right", render: (e) => <span style={{ fontVariantNumeric: "tabular-nums" }}>{unitsOf(e.lines)}</span> },
    { key: "source", label: H("Source"), width: "60px", render: (e) => small(SOURCE_SHORT[e.source], e.source) },
    { key: "received", label: H("Received"), width: "56px", render: (e) => small(age(e.receivedAt), "Received " + stamp(e.receivedAt)) },
    { key: "last", label: H("Last contact"), width: "50px", render: (e) => small(age(e.lastContactAt), "Last contact " + stamp(e.lastContactAt)) },
    { key: "stage", label: H("Stage"), width: "98px", render: (e) => <StageCell e={e} /> },
    { key: "priority", label: H("Priority"), width: "62px", render: (e) => <Badge tone={PRIORITY_TONE[e.priority]}>{e.priority}</Badge> },
    { key: "owner", label: H("Owner"), width: "40px", render: (e) => small(e.owner) },
    { key: "action", label: H("AI-recommended action"), width: "minmax(118px,1.6fr)",
      render: (e) => <span title={e.aiAction} style={{ color: "var(--ink)", fontSize: 12.5 }}>{e.aiAction}</span> },
  ];
  return (
    <Card pad="16px 8px 10px" title={<span style={{ paddingLeft: 10 }}>{FILTER_LABEL[filter]}</span>}
      hint={<span style={{ paddingLeft: 10 }}>{plural(rows.length, "enquiry", "enquiries")}{q.trim() ? " match the search" : ""}. Click a row to open the full record.</span>}
      right={<Row gap={8} wrap style={{ justifyContent: "flex-end", paddingRight: 10 }}>
        <SearchBox value={q} onChange={onQ} placeholder="Search enquiries" style={{ width: 200 }} />
        <FilterSeg value={filter} onChange={onFilter} counts={counts} />
      </Row>}>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 1080 }}>
          <Table cols={cols} rows={rows} rowKey={(e) => e.id} onRow={(e) => openPanel("enquiry", e.id)} limit={30} dense
            empty={q.trim() ? "No enquiries match that search." : "Nothing in this view right now."} />
        </div>
      </div>
    </Card>
  );
}
