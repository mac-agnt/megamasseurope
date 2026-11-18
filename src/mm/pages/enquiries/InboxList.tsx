import { useEffect, useRef, type CSSProperties } from "react";
import type { Enquiry, MMState } from "../../types";
import { customerOf } from "../../select";
import { age, num, plural } from "../../format";
import { Card, CountryTag, Empty, I, Icon, MONO, Row, Seg, inputStyle } from "../../ui";
import { isWaiting, machineSummary, type InboxFilter, type InboxSort } from "./data";
import { ELLIPSIS, PriorityDot, SearchBox, onKeyActivate } from "./bits";

/* Left side of the Inbox workspace: search, filter and a compact list.
   Clicking a row loads it into the processing view on the right. */

export const FILTER_LABEL: Record<InboxFilter, string> = {
  unanswered: "Unanswered", waiting: "Waiting on customer", open: "All open", high: "High priority",
};
const FILTERS: InboxFilter[] = ["unanswered", "waiting", "open", "high"];

export function FilterSeg({ value, onChange, counts }: { value: InboxFilter; onChange: (f: InboxFilter) => void; counts: Record<InboxFilter, number> }) {
  return (
    <Seg<InboxFilter> value={value} onChange={onChange}
      options={FILTERS.map((f) => [f, <span key={f}>{FILTER_LABEL[f]} <span style={{ opacity: 0.6, fontWeight: 500 }}>{num(counts[f])}</span></span>])} />
  );
}

export function InboxList({ s, rows, selectedId, onSelect, filter, onFilter, counts, sort, onSort, q, onQ, style }: {
  s: MMState; rows: Enquiry[]; selectedId?: string; onSelect: (id: string) => void;
  filter: InboxFilter; onFilter: (f: InboxFilter) => void; counts: Record<InboxFilter, number>;
  sort: InboxSort; onSort: (v: InboxSort) => void; q: string; onQ: (v: string) => void; style?: CSSProperties;
}) {
  /* Keep the selected row in view inside the list, without moving the page. */
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const b = box.current;
    const el = b?.querySelector<HTMLElement>('[data-id="' + selectedId + '"]');
    if (!b || !el) return;
    const top = el.offsetTop, bottom = top + el.offsetHeight;
    if (top < b.scrollTop || bottom > b.scrollTop + b.clientHeight) b.scrollTop = Math.max(0, top - b.clientHeight / 3);
  }, [selectedId, rows.length, filter, sort]);
  return (
    <Card pad="0" style={{ display: "flex", flexDirection: "column", minHeight: 620, overflow: "hidden", ...style }}>
      <div style={{ padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 10, borderBottom: "1px solid var(--border)" }}>
        <SearchBox value={q} onChange={onQ} placeholder="Search name, company, machine or city" />
        <FilterSeg value={filter} onChange={onFilter} counts={counts} />
        <Row gap={8}>
          <span style={{ flex: 1, fontSize: 12, color: "var(--dim)" }}>{plural(rows.length, "enquiry", "enquiries")}{q.trim() ? " match" : ""}</span>
          <select value={sort} onChange={(ev) => onSort(ev.target.value as InboxSort)} aria-label="Sort enquiries"
            style={{ ...inputStyle, height: 28, fontSize: 12, padding: "0 8px", cursor: "pointer" }}>
            <option value="newest">Newest first</option>
            <option value="priority">Priority first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </Row>
      </div>
      <div style={{ position: "relative", flex: "1 1 auto", minHeight: 0 }}>
        <div ref={box} style={{ position: "absolute", inset: 0, overflowY: "auto", padding: 6 }}>
          {rows.length === 0
            ? <Empty title={q.trim() ? "No enquiries match that search" : "Nothing here"}
                sub={filter === "unanswered" && !q.trim() ? "Every enquiry has had a reply." : "Try another filter or search."} />
            : rows.map((e) => <ListRow key={e.id} s={s} e={e} on={e.id === selectedId} onClick={() => onSelect(e.id)} />)}
        </div>
      </div>
    </Card>
  );
}

function ListRow({ s, e, on, onClick }: { s: MMState; e: Enquiry; on: boolean; onClick: () => void }) {
  const c = customerOf(s, e.customerId);
  const ct = s.contacts.find((x) => x.id === e.contactId);
  const state = isWaiting(e) ? "Waiting" : e.stage !== "New" ? e.stage : "";
  return (
    <div role="button" tabIndex={0} aria-pressed={on} data-id={e.id} onClick={onClick} onKeyDown={onKeyActivate(onClick)} className="mm-row"
      style={{ display: "grid", gridTemplateColumns: "8px minmax(0,1fr) auto", columnGap: 10, rowGap: 4, alignItems: "center",
        padding: "10px 10px", borderRadius: 12, cursor: "pointer",
        background: on ? "var(--accent-faint)" : undefined, boxShadow: on ? "inset 0 0 0 1px var(--accent-line)" : undefined }}>
      <PriorityDot p={e.priority} />
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", ...ELLIPSIS }}>{c.name}</span>
      <span style={{ ...MONO, fontSize: 10.5, color: "var(--faint)" }} title={"Received " + new Date(e.receivedAt).toLocaleString("en-GB")}>{age(e.receivedAt)}</span>
      <span />
      <span style={{ fontSize: 12, color: "var(--dim)", ...ELLIPSIS }}>
        {state && <span style={{ color: "var(--warn)" }}>{state} · </span>}
        {ct ? ct.name + " · " : ""}{machineSummary(s, e)}
      </span>
      <Row gap={6}>
        {e.missing.length > 0 && <span title={"Missing: " + e.missing.join(", ").toLowerCase()} style={{ display: "inline-flex", color: "var(--warn)" }}>
          <Icon d={I.alert} size={12} /></span>}
        <CountryTag c={c.country} />
      </Row>
    </div>
  );
}
