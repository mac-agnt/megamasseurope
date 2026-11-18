import { useState } from "react";
import type { MMState } from "../../types";
import { go, openPanel } from "../../store";
import { age, dateShort, money, num } from "../../format";
import { Badge, Card, Cell, CountryTag, Grid, Kpi, MONO, Money, Page, PageHead, Row, Seg, Status, Table, type Col } from "../../ui";
import { carrierShort, filterRequests, freightKpis, hoursText, mk, viewOf, type FreightView, type ReqFilter } from "./lib";
import { CarrierCell, CarrierNote, DimsCell, MachinesCell, PlaceCell, Wide, fits, useWidth } from "./bits";
import { Workflow } from "./Workflow";

/* Requests: the KPI strip, the workflow showcase and every freight request. */

/* Table widths. Every listed field gets its own column when there is room
   (FULL_MIN); below that, pairs share a two-line cell so nothing is hidden. */
const FULL_MIN = 1382; // sum of the full column minimums, gaps and row padding
const COMPACT_MIN = 1004;

export function requestColumns(s: MMState, compact: boolean): Col<FreightView>[] {
  const id: Col<FreightView> = { key: "id", label: "Request", width: "70px", render: (v) => <span style={{ ...MONO, fontSize: 12, color: "var(--ink)" }}>{v.f.id}</span> };
  const cust: Col<FreightView> = { key: "cust", label: "Customer", width: "minmax(116px,1.35fr)",
    render: (v) => <Cell top={v.c.name} sub={<Row gap={6}><CountryTag c={v.c.country} />{v.c.city}</Row>} /> };
  const dims: Col<FreightView> = { key: "dims", label: "Weight / dims", width: compact ? "minmax(92px,1fr)" : "minmax(96px,1fr)", render: (v) => <DimsCell v={v} /> };
  const carrier: Col<FreightView> = { key: "carrier", label: "Carrier", width: "120px", render: (v) => <CarrierCell sup={v.carrier} /> };
  const quote: Col<FreightView> = { key: "quote", label: "Quote", width: compact ? "78px" : "84px",
    render: (v) => v.q ? <Cell top={<span style={{ ...MONO, fontSize: 12 }}>{v.q.id}</span>} sub={v.q.status} /> : <span style={{ color: "var(--faint)" }}>None</span> };
  const sent = (v: FreightView) => v.f.requestedAt === null ? "Not sent" : age(v.f.requestedAt, s.now) + " ago";
  const markup = (v: FreightView) => (
    <span style={{ color: v.f.carrierQuote ? "var(--ink)" : "var(--faint)" }} title={v.f.carrierQuote ? "Applied" : "Planned, applied when the rate arrives"}>{mk(v.f.markupPct)}</span>
  );

  if (!compact) {
    return [
      id, cust,
      { key: "col", label: "Collection", width: "84px",
        render: (v) => <Cell top={v.f.collection.replace(/ warehouse$/i, "")} sub={/warehouse$/i.test(v.f.collection) ? "Warehouse" : undefined} /> },
      { key: "dest", label: "Destination", width: "minmax(90px,1fr)", render: (v) => <PlaceCell v={v} /> },
      { key: "mach", label: "Machines", width: "minmax(116px,1.25fr)", render: (v) => <MachinesCell v={v} thumb={false} /> },
      { key: "qty", label: "Qty", width: "32px", align: "right", render: (v) => <span style={{ color: "var(--ink)" }}>{v.units}</span> },
      dims, carrier,
      { key: "req", label: "Requested", width: "70px",
        render: (v) => v.f.requestedAt === null ? <span style={{ color: "var(--faint)" }}>Not sent</span>
          : <Cell top={<span style={{ color: v.late ? "var(--bad)" : undefined }}>{sent(v)}</span>} sub={dateShort(v.f.requestedAt)} /> },
      { key: "status", label: "Status", width: "106px", render: (v) => <Status s={v.f.status} /> },
      { key: "cost", label: "Carrier cost", width: "80px", align: "right", render: (v) => <Money v={v.cost} cur={v.cur} /> },
      { key: "charge", label: "Cust. charge", width: "84px", align: "right", render: (v) => <Money v={v.charge} cur={v.cur} /> },
      { key: "mk", label: "Markup", width: "54px", align: "right", render: markup },
      quote,
    ];
  }
  return [
    id, cust,
    { key: "dest", label: "Destination", width: "minmax(100px,1.1fr)",
      render: (v) => <Cell top={v.f.destination} sub={v.postcodeMissing ? <span style={{ color: "var(--warn)" }}>Postcode missing</span> : "From " + v.f.collection} /> },
    { key: "mach", label: "Machines, qty", width: "minmax(104px,1.1fr)",
      render: (v) => <Cell top={(v.machines[0] ? (v.machines[0].qty > 1 ? v.machines[0].qty + " × " : "") + v.machines[0].p.name : "None")
        + (v.machines.length > 1 ? " +" + (v.machines.length - 1) : "")} sub={"Qty " + v.units} /> },
    dims, carrier,
    { key: "status", label: "Status, sent", width: "106px",
      render: (v) => <Cell top={<Status s={v.f.status} />} sub={<span style={{ color: v.late ? "var(--bad)" : undefined }}>{sent(v)}</span>} /> },
    { key: "money", label: "Cost, charge", width: "98px", align: "right",
      render: (v) => (
        <div style={{ textAlign: "right", minWidth: 0 }}>
          <Money v={v.cost} cur={v.cur} />
          <div style={{ fontSize: 11.5, marginTop: 2, color: "var(--faint)", whiteSpace: "nowrap" }}>
            {v.charge !== null ? <><span style={{ color: "var(--dim)" }}>{money(v.charge, v.cur)}</span> at {markup(v)}</> : <>Markup {markup(v)}</>}
          </div>
        </div>
      ) },
    quote,
  ];
}

export default function RequestsTab({ s }: { s: MMState }) {
  const k = freightKpis(s);
  const [filter, setFilter] = useState<ReqFilter>("open");
  const { ref, w } = useWidth<HTMLDivElement>();
  const compact = !fits(w, FULL_MIN);
  const all = s.freight.map((f) => viewOf(s, f));
  const count = (f: ReqFilter) => filterRequests(all, f).length;
  const rows = filterRequests(all, filter);
  const sub = k.stats.map((x) => carrierShort(x.c) + " " + hoursText(x.st.avgHours)).join(", ");

  return (
    <Page>
      <PageHead title="Freight requests"
        sub="Every freight price in one traceable flow: prepared from the enquiry, approved, sent, chased, priced by the carrier and marked up. No carrier integration and no automated booking."
        right={<Badge tone="accent" dot>Approval before anything external</Badge>} />

      <Grid cols="repeat(auto-fit,minmax(150px,1fr))" gap={12}>
        <Kpi hero label="Rates outstanding" value={num(k.outstanding)} tone="warn" sub="Waiting on a carrier reply" onClick={() => go("Freight", "awaiting")} />
        <Kpi label="Avg carrier reply" value={hoursText(k.avgHours)} tone="info" sub={sub} onClick={() => go("Freight", "awaiting")} />
        <Kpi label="Quotations overdue" value={num(k.late)} tone={k.late ? "bad" : "ok"} sub="No carrier reply after 3 days" onClick={() => go("Freight", "awaiting")} />
        <Kpi label="Rates received today" value={num(k.today)} tone="ok" sub="Read from carrier emails" onClick={() => go("Freight", "review")} />
        <Kpi label="Average markup" value={mk(Math.round(k.markup * 10) / 10)} tone="accent" sub={"Across " + num(k.marked) + " carrier rates"} onClick={() => go("Freight", "review")} />
        <Kpi label="Awaiting dispatch" value={num(k.awaitingDispatch)} tone="info" sub="Paid or allocated orders" onClick={() => go("Freight", "dispatch")} />
      </Grid>

      <Workflow s={s} />

      <Card title="All freight requests"
        hint={rows.length + " shown. Click a row for the full record: emails, carrier reply and history."}
        right={<Seg<ReqFilter> value={filter} onChange={setFilter} options={[
          ["open", "Open " + count("open")],
          ["toreq", "To request " + count("toreq")],
          ["awaiting", "Awaiting rate " + count("awaiting")],
          ["received", "Rate received " + count("received")],
          ["all", "All " + all.length],
        ]} />}>
        <div ref={ref}>
          <Wide min={compact ? COMPACT_MIN : FULL_MIN}>
            <Table cols={requestColumns(s, compact)} rows={rows} limit={14} rowKey={(v) => v.f.id} onRow={(v) => openPanel("freight", v.f.id)}
              empty="No freight requests in this view." />
          </Wide>
        </div>
        <CarrierNote s={s} style={{ marginTop: 14 }} />
      </Card>
    </Page>
  );
}
