import { useState } from "react";
import { go, openPanel, useMM } from "../../store";
import { Badge, BarList, Card, Cell, Columns, Empty, Grid, I, Kpi, Money, Note, Page, PageHead, ProductThumb, Seg, Status, Table, type Col } from "../../ui";
import { dateShort, money, moneyShort, num, pct, plural } from "../../format";
import { enquiryCurrency, enquiryValue, ix } from "../../select";
import type { Enquiry } from "../../types";
import { fmtDays, linesText, salesStats, share, unitsOf } from "./calc";
import { EqBadge, Flow, GoLink, Pane, SplitBar, Stat, fill, upTo } from "./bits";

/* Insights · Sales performance: what sells, how orders are shaped, and how
   fast quotes go out. All figures from orders, quotes and enquiries. */

type Clock = "sent" | "ready";

export default function Sales() {
  const s = useMM();
  const x = salesStats(s);
  const [clock, setClock] = useState<Clock>("sent");
  const rt = x.response[clock];
  const peakBucket = rt.buckets.reduce((best, b, i) => (b.value > rt.buckets[best].value ? i : best), 0);
  const tb = x.tbar;
  const st = x.tbarStock;
  const staleWebsite = !!tb && !!st && /estimated arrival/i.test(tb.websiteLabel) && st.available > 0;

  const tradeCols: Col<Enquiry>[] = [
    { key: "c", label: "Distributor", width: "minmax(0,1.2fr)", render: (e) => {
      const c = ix(s).customer[e.customerId];
      return <Cell top={c?.name ?? e.customerId} sub={e.id + ", " + dateShort(e.receivedAt) + (c ? ", " + c.city : "")} />;
    } },
    { key: "l", label: "Machines", width: "minmax(0,1.3fr)", render: (e) => <Cell top={linesText(s, e.lines)} sub={plural(unitsOf(e.lines), "machine")} /> },
    { key: "st", label: "Stage", width: "140px", render: (e) => <Status s={e.stage} /> },
    { key: "v", label: "Value", width: "100px", align: "right", render: (e) => <Money v={enquiryValue(s, e)} cur={enquiryCurrency(s, e)} /> },
  ];

  return (
    <Page>
      <PageHead title="Sales performance" sub="What sells, how orders are made up and how quickly quotes go out. Built from orders, quotes and enquiries."
        right={<EqBadge />} />

      <Grid cols={upTo(5, 190)} style={{ alignItems: "stretch" }}>
        <Kpi hero tone="accent" label="Average order value" value={money(x.aov)} sub={plural(x.orders, "confirmed order") + ", EUR eq."} onClick={() => go("Orders", "confirmed")} />
        <Kpi tone="ok" label="Machines sold" value={num(x.unitsSold)} sub={"Units on " + plural(x.orders, "order")} />
        <Kpi tone="info" label="Multi-machine orders" value={num(x.multi.n)} sub={pct(share(x.multi.n, x.orders)) + " of orders, " + num(x.single.n) + " single"} />
        <Kpi tone="info" label="Wholesale enquiries" value={num(x.trade.enquiries)} sub={plural(x.trade.units, "machine") + " requested"} />
        <Kpi tone="warn" label="Median days to quote" value={x.response.sent.n ? x.response.sent.median.toFixed(1) : "None"} sub={"Enquiry to quote sent, " + plural(x.response.sent.n, "quote")} />
      </Grid>

      <Flow>
        <Pane grow={1.3} basis={440}>
          <Card style={fill} title="Best-selling machines" hint="Units on confirmed orders"
            right={<GoLink onClick={() => go("Stock", "catalogue")}>Catalogue</GoLink>}>
            {x.best.length ? (
              <BarList tone="ok" format={(n) => plural(n, "unit")} onItem={(i) => openPanel("product", x.best[i].product.id)}
                items={x.best.slice(0, 9).map((b) => ({ key: b.product.id, label: b.product.name, value: b.units, note: plural(b.orders, "order") }))} />
            ) : <Empty title="No orders yet" />}
          </Card>
        </Pane>

        <Pane grow={1} basis={340}>
          <Card style={fill} tone="accent" title="T-Bar Linear Row" hint="The machine most customers ask for"
            right={tb ? <GoLink onClick={() => openPanel("product", tb.id)}>Product</GoLink> : undefined}>
            {tb && (
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <ProductThumb p={tb} size={84} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, flex: 1, minWidth: 0 }}>
                  <Stat label="Enquiries asking for it" value={num(x.tbarEnquiries)} sub={pct(share(x.tbarEnquiries, x.totalEnquiries)) + " of all enquiries"} tone="accent" />
                  <Stat label="Machines requested" value={num(x.tbarUnits)} sub={pct(share(x.tbarUnits, x.requestedUnits)) + " of " + num(x.requestedUnits) + " requested"} />
                </div>
              </div>
            )}
            <SplitBar height={9} parts={[
              { label: "T-Bar Linear Row", value: x.tbarUnits, tone: "accent" },
              { label: "Every other machine", value: Math.max(0, x.requestedUnits - x.tbarUnits), tone: "neutral" },
            ]} format={(n) => plural(n, "unit")} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <Stat label="Sold" value={num(x.tbarSold)} sub="units on orders" tone="ok" />
              <Stat label="Only machine asked for" value={num(x.tbarOnly)} sub="enquiries" />
              <Stat label="Available now" value={st ? num(st.available) : "None"} sub={st ? num(st.inStock) + " in stock, " + num(st.reserved) + " reserved" : undefined} />
            </div>
            {tb && staleWebsite && st && (
              <div style={{ marginTop: "auto", paddingTop: 14 }}>
              <Note tone="warn">
                The website still says "{tb.websiteLabel}" while {num(st.available)} are available in County Derry.
              </Note>
              </div>
            )}
          </Card>
        </Pane>
      </Flow>

      <Flow>
        <Pane grow={1.5} basis={480}>
          <Card style={fill} title="Quote response times"
            hint={(clock === "sent" ? "Days from the enquiry arriving to the quote going to the customer" : "Days from the enquiry arriving to the quote being prepared") + ", across " + plural(rt.n, "quote") + "."}
            right={<Seg options={[["sent", "To quote sent"], ["ready", "To quote ready"]] as [Clock, string][]} value={clock} onChange={setClock} />}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 170px", gap: 22, alignItems: "end" }}>
              <Columns data={rt.buckets} highlight={peakBucket} height={130} format={(n) => num(n)} />
              <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 30 }}>
                <Stat label="Median" value={rt.n ? fmtDays(rt.median) : "None"} tone="warn" />
                <Stat label="Average" value={rt.n ? fmtDays(rt.mean) : "None"} />
                {clock === "sent" && <Stat label="Sent within 2 days" value={num(x.response.sent.within2)} sub={pct(share(x.response.sent.within2, x.response.sent.n)) + " of quotes sent"} />}
              </div>
            </div>
            {x.response.carrier.n > 0 && (
              <div style={{ marginTop: "auto", paddingTop: 14 }}>
              <Note icon={I.truck}>
                Carrier rates took {fmtDays(x.response.carrier.avgWait)} on average, {pct(x.response.carrier.share)} of the time from enquiry to quote sent
                (across {plural(x.response.carrier.n, "sent quote")}). A quote cannot go out until freight is priced.
              </Note>
              </div>
            )}
          </Card>
        </Pane>

        <Pane grow={1} basis={320}>
          <Card style={fill} title="Order mix" hint="Machines per order, values in EUR eq.">
            <SplitBar parts={[
              { label: "One machine", value: x.single.n, tone: "info" },
              { label: "Two or more", value: x.multi.n, tone: "accent" },
            ]} format={(n) => plural(n, "order")} />
            <div style={{ marginTop: 18 }}>
              <Columns data={x.perOrder.map((b) => ({ label: b.label + (b.label === "1" ? " machine" : ""), value: b.value }))} height={70}
                highlight={x.perOrder.reduce((best, b, i) => (b.value > x.perOrder[best].value ? i : best), 0)} tone="info" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, marginTop: 10, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <Stat label="Avg single-machine order" value={x.single.n ? moneyShort(x.single.avg) : "None"} sub={plural(x.single.n, "order")} />
              <Stat label="Avg multi-machine order" value={x.multi.n ? moneyShort(x.multi.avg) : "None"} sub={plural(x.multi.units, "machine") + " across " + plural(x.multi.n, "order")} />
            </div>
            <div style={{ marginTop: "auto", paddingTop: 16 }}>
              <Badge tone="neutral">Average order value {money(x.aov)}</Badge>
            </div>
          </Card>
        </Pane>
      </Flow>

      <Card title="Wholesale demand" hint="Distributors and resellers. No automatic wholesale discount: any price override waits for Niall."
        right={<GoLink onClick={() => go("Enquiries", "qualification")}>Qualification</GoLink>}>
        <Flow gap={24}>
          <Pane grow={1} basis={300}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 18 }}>
              <Stat label="Trade enquiries" value={num(x.trade.enquiries)} sub={pct(share(x.trade.enquiries, x.totalEnquiries)) + " of all enquiries"} />
              <Stat label="Machines requested" value={num(x.trade.units)} sub={pct(share(x.trade.units, x.requestedUnits)) + " of all units asked for"} />
              <Stat label="Still open" value={num(x.trade.open)} sub={moneyShort(x.trade.openValue) + " pipeline, not revenue"} />
              <Stat label="Wholesale orders" value={num(x.trade.orders)} sub={plural(x.trade.orderUnits, "machine") + ", " + moneyShort(x.trade.revenue) + " EUR eq."} tone="ok" />
            </div>
          </Pane>
          <Pane grow={2.2} basis={520}>
            {x.trade.list.length ? <Table dense cols={tradeCols} rows={x.trade.list} limit={5} rowKey={(e) => e.id} onRow={(e) => openPanel("enquiry", e.id)} />
              : <Empty title="No open trade enquiries" />}
          </Pane>
        </Flow>
      </Card>
    </Page>
  );
}
