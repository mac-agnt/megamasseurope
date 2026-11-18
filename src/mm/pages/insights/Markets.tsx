import { useState } from "react";
import type { Enquiry, MMState, Order } from "../../types";
import { go, openPanel, useMM } from "../../store";
import { BarList, Card, Cell, CountryTag, Empty, Money, Page, PageHead, Row, Seg, Status, Table, type Col } from "../../ui";
import { countryName, dateShort, money, moneyShort, num, pct, plural } from "../../format";
import { enquiryCurrency, enquiryValue, ix, orderValue } from "../../select";
import { CONTINENTAL, joinNames, leaders, marketDetail, marketTable, share, type MarketKey, type MarketRow } from "./calc";
import { EqBadge, Flow, GoLink, Pane, SplitBar, Stat, fill, upTo } from "./bits";

/* Insights · Markets: UK, Ireland and the European markets side by side.
   The highlights are computed from the records, never asserted. */

type Metric = "enquiries" | "won" | "revenue" | "conversion";
const METRICS: [Metric, string][] = [["enquiries", "Enquiries"], ["won", "Orders"], ["revenue", "Revenue"], ["conversion", "Conversion"]];
const METRIC_HINT: Record<Metric, string> = {
  enquiries: "Enquiries per market",
  won: "Confirmed orders per market",
  revenue: "Confirmed orders, EUR eq.",
  conversion: "Orders as a share of quotes sent",
};
const fmtMetric = (m: Metric, v: number) => (m === "revenue" ? moneyShort(v) : m === "conversion" ? pct(v) : num(v));
const MIN_QUOTES = 5;

function MarketTags({ r }: { r: MarketRow }) {
  if (r.key !== "Other") return <CountryTag c={r.key} />;
  return <span style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>{plural(r.countries.length, "country", "countries")}</span>;
}

function highlights(rows: MarketRow[], totalEnquiries: number) {
  const named = rows.filter((r) => r.key !== "Other");
  const cont = rows.filter((r) => CONTINENTAL.includes(r.key));
  const out: { label: string; value: string; sub: string }[] = [];
  const most = leaders(named, (r) => r.enquiries);
  if (most.length) out.push({ label: "Most enquiries", value: joinNames(most.map((r) => r.name)),
    sub: most.length === 1 ? num(most[0].enquiries) + " of " + num(totalEnquiries) + " enquiries" : most.map((r) => num(r.enquiries)).join(" and ") + " enquiries" });
  const contLead = leaders(cont, (r) => r.enquiries);
  if (contLead.length) {
    const same = contLead.every((r) => r.enquiries === contLead[0].enquiries);
    out.push({ label: contLead.length > 1 ? "Strongest continental markets" : "Strongest continental market", value: joinNames(contLead.map((r) => r.name)),
      sub: "By enquiries: " + (same && contLead.length > 1 ? num(contLead[0].enquiries) + " each" : contLead.map((r) => num(r.enquiries)).join(" and ")) });
  }
  const rev = leaders(cont, (r) => r.revenue).slice(0, 1);
  if (rev.length) out.push({ label: "Highest continental revenue", value: rev[0].name,
    sub: money(rev[0].revenue) + " from " + plural(rev[0].won, "order") + (rev[0].wholesale ? ", " + num(rev[0].wholesale) + " wholesale" : "") });
  const conv = leaders(named.filter((r) => r.quotes >= MIN_QUOTES), (r) => r.conversion);
  if (conv.length) out.push({ label: "Best quote to order rate", value: joinNames(conv.map((r) => r.name)),
    sub: conv.map((r) => num(r.won) + " of " + num(r.quotes)).join(", ") + " quotes became orders (" + pct(conv[0].conversion) + "). Markets with " + MIN_QUOTES + " or more quotes." });
  return out;
}

function customerCell(s: MMState, customerId: string, id: string, at: number) {
  const c = ix(s).customer[customerId];
  return <Cell top={c?.name ?? customerId} sub={id + ", " + dateShort(at) + (c ? ", " + c.city : "")} />;
}
function marketOrderCols(s: MMState): Col<Order>[] {
  return [
    { key: "c", label: "Customer", width: "minmax(0,1fr)", render: (o) => customerCell(s, o.customerId, o.id, o.acceptedAt) },
    { key: "st", label: "Status", width: "150px", render: (o) => <Status s={o.status} /> },
    { key: "v", label: "Value", width: "92px", align: "right", render: (o) => <Money v={orderValue(o)} cur={o.currency} /> },
  ];
}
function marketEnquiryCols(s: MMState): Col<Enquiry>[] {
  return [
    { key: "c", label: "Customer", width: "minmax(0,1fr)", render: (e) => customerCell(s, e.customerId, e.id, e.receivedAt) },
    { key: "st", label: "Stage", width: "140px", render: (e) => <Status s={e.stage} /> },
    { key: "v", label: "Value", width: "92px", align: "right", render: (e) => <Money v={enquiryValue(s, e)} cur={enquiryCurrency(s, e)} /> },
  ];
}

export default function Markets() {
  const s = useMM();
  const rows = marketTable(s);
  const cont = rows.filter((r) => CONTINENTAL.includes(r.key));
  const [metric, setMetric] = useState<Metric>("enquiries");
  const [sel, setSel] = useState<MarketKey>(() => leaders(cont, (r) => r.enquiries)[0]?.key ?? "GB");
  const picked = rows.find((r) => r.key === sel) ?? rows[0];
  const d = marketDetail(s, picked.key);
  /* "Other markets" groups several countries, so it always sits at the end of the ranking. */
  const ranked = rows.slice().sort((a, b) => (a.key === "Other" ? 1 : 0) - (b.key === "Other" ? 1 : 0) || b[metric] - a[metric]);
  const hl = highlights(rows, s.enquiries.length);

  const cols: Col<MarketRow>[] = [
    { key: "m", label: "Market", width: "minmax(170px,1.4fr)", render: (r) => (
      <Row gap={9}>
        <span style={{ width: 6, height: 6, borderRadius: 2, flex: "none", background: r.key === picked.key ? "var(--accent)" : "transparent" }} />
        <span style={{ color: r.key === picked.key ? "var(--ink)" : "var(--body)", fontWeight: r.key === picked.key ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
        <MarketTags r={r} />
      </Row>
    ) },
    { key: "e", label: "Enquiries", width: "80px", align: "right", render: (r) => num(r.enquiries) },
    { key: "q", label: "Quotes sent", width: "88px", align: "right", render: (r) => num(r.quotes) },
    { key: "o", label: "Orders", width: "64px", align: "right", render: (r) => num(r.won) },
    { key: "c", label: "Quote to order", width: "104px", align: "right", render: (r) => (r.quotes ? pct(r.conversion) : <span style={{ color: "var(--faint)" }}>No quotes</span>) },
    { key: "r", label: "Revenue", width: "96px", align: "right", render: (r) => <span style={{ color: "var(--ink)" }}>{money(r.revenue)}</span> },
    { key: "a", label: "Avg deal", width: "90px", align: "right", render: (r) => (r.won ? money(r.avgDeal) : <span style={{ color: "var(--faint)" }}>None</span>) },
    { key: "w", label: "Wholesale", width: "82px", align: "right", render: (r) => num(r.wholesale) },
    { key: "i", label: "Individual", width: "82px", align: "right", render: (r) => num(r.individual) },
  ];

  return (
    <Page>
      <PageHead title="Markets" sub="The UK, Ireland and the main European markets side by side. Revenue counts confirmed orders only, never open quotes."
        right={<EqBadge />} />

      <Card pad="16px 20px">
        <div style={{ display: "grid", gridTemplateColumns: upTo(4, 220, 24), gap: 24 }}>
          {hl.map((h) => <Stat key={h.label} label={h.label} value={h.value} sub={h.sub} />)}
        </div>
      </Card>

      <Card title="All markets" hint="Click a market to see its orders and open enquiries. Orders split by customer type; individual means gyms, facilities and private buyers. Revenue and average deal in EUR eq.">
        <Table cols={cols} rows={rows} rowKey={(r) => r.key} onRow={(r) => setSel(r.key)} />
      </Card>

      <Flow>
        <Pane grow={1} basis={330}>
          <Card style={fill} title="Compare" hint={METRIC_HINT[metric]}>
            <div style={{ marginBottom: 16 }}><Seg options={METRICS} value={metric} onChange={setMetric} /></div>
            <BarList tone={metric === "revenue" ? "ok" : "accent"} format={(v) => fmtMetric(metric, v)}
              onItem={(i) => setSel(ranked[i].key)}
              items={ranked.map((r) => ({ key: r.key, label: r.name, value: r[metric],
                note: r.key === "Other" ? plural(r.countries.length, "country", "countries")
                  : metric === "conversion" ? num(r.won) + " of " + num(r.quotes) : metric === "revenue" ? plural(r.won, "order") : undefined }))} />
          </Card>
        </Pane>

        <Pane grow={1.9} basis={540}>
          <Card style={fill} title={<Row gap={9}><span>{picked.name}</span><MarketTags r={picked} /></Row>}
            hint={picked.key === "Other" ? "Grouped here: " + picked.countries.map(countryName).join(", ") : "Click another market in the table or the chart to switch."}
            right={<GoLink onClick={() => go("Enquiries", "pipeline")}>Pipeline</GoLink>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(112px,1fr))", gap: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
              <Stat label="Enquiries" value={num(picked.enquiries)} sub={pct(share(picked.enquiries, s.enquiries.length)) + " of all"} />
              <Stat label="Quotes sent" value={num(picked.quotes)} sub={picked.quotes ? pct(picked.conversion) + " became orders" : "None yet"} />
              <Stat label="Revenue" value={moneyShort(picked.revenue)} sub={plural(picked.won, "order") + ", EUR eq."} tone={picked.revenue ? "ok" : undefined} />
              <Stat label="Avg deal" value={picked.won ? moneyShort(picked.avgDeal) : "None"} sub={plural(d.lost, "lost deal")} />
              <Stat label="Trade enquiries" value={num(picked.tradeEnquiries)} sub="Distributors and resellers" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 26, paddingTop: 16 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 12 }}>Orders by customer type</div>
                <SplitBar height={9} parts={[{ label: "Wholesale", value: picked.wholesale, tone: "info" }, { label: "Individual", value: picked.individual, tone: "accent" }]} />
                <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 14, lineHeight: 1.5 }}>
                  {plural(picked.units, "machine")} requested across {plural(picked.enquiries, "enquiry", "enquiries")}, {num(d.open.length)} still open.
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 12 }}>Most requested here</div>
                {d.demand.length ? (
                  <BarList format={(n) => plural(n, "unit")} onItem={(i) => openPanel("product", d.demand[i].product.id)}
                    items={d.demand.slice(0, 4).map((x) => ({ key: x.product.id, label: x.product.name, value: x.units }))} />
                ) : <Empty title="No machines requested yet" />}
              </div>
            </div>
          </Card>
        </Pane>
      </Flow>

      <Flow>
        <Pane grow={1} basis={420}>
          <Card style={fill} title={"Orders in " + picked.name} hint={plural(d.orders.length, "order") + ", newest first"}>
            {d.orders.length ? <Table key={"o" + picked.key} dense cols={marketOrderCols(s)} rows={d.orders} limit={6} rowKey={(o) => o.id} onRow={(o) => openPanel("order", o.id)} />
              : <Empty title="No orders yet" sub="Accepted quotes from this market will appear here." />}
          </Card>
        </Pane>
        <Pane grow={1} basis={420}>
          <Card style={fill} title={"Open enquiries in " + picked.name} hint={plural(d.open.length, "open enquiry", "open enquiries") + ", largest first. Pipeline, not revenue."}>
            {d.open.length ? <Table key={"e" + picked.key} dense cols={marketEnquiryCols(s)} rows={d.open} limit={6} rowKey={(e) => e.id} onRow={(e) => openPanel("enquiry", e.id)} />
              : <Empty title="No open enquiries" />}
          </Card>
        </Pane>
      </Flow>
    </Page>
  );
}
