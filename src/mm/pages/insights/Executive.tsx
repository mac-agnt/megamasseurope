import { go, openPanel, useMM } from "../../store";
import { BarList, Card, Columns, Grid, I, Kpi, Note, Page, PageHead, ProductThumb } from "../../ui";
import { dateShort, money, moneyShort, num, pct, plural } from "../../format";
import { HISTORY, markets, productDemand } from "../../select";
import { executiveStats, marketName, share } from "./calc";
import { Bar, EqBadge, Flow, GoLink, Pane, RecRow, SplitBar, Stat, fill, upTo } from "./bits";

/* Insights · Executive: the one screen Niall reads instead of the inbox. */

export const dayLabel = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2) + " " + d.getDate();
};

export default function Executive() {
  const s = useMM();
  const x = executiveStats(s);
  /* "Other markets" groups several countries, so it sits last however large it is. */
  const byCountry = markets(s).filter((m) => m.won > 0).sort((a, b) => (a.key === "Other" ? 1 : 0) - (b.key === "Other" ? 1 : 0) || b.revenue - a.revenue);
  const demand = productDemand(s).filter((d) => d.units > 0).slice(0, 8);
  const topUnits = demand[0]?.units || 1;
  const peak = x.days[x.peak];
  const notDue = Math.max(0, x.owed - x.overdue);

  return (
    <Page>
      <PageHead title="Executive overview"
        sub={"Read from the records in Pulse: " + plural(x.total, "enquiry", "enquiries") + ", " + plural(s.quotes.length, "quote") + ", "
          + plural(x.orders, "order") + " and " + plural(x.invoices, "FreshBooks invoice") + "."}
        right={<EqBadge />} />

      <Grid cols={upTo(4, 210)} style={{ alignItems: "stretch" }}>
        <Kpi hero tone="accent" label="New enquiries, last 7 days" value={num(x.last7)}
          sub={num(x.last14) + " in the last 14 days, " + num(x.prior7) + " in the week before"} onClick={() => go("Enquiries", "inbox")} />
        <Kpi tone="info" label="Response rate" value={pct(share(x.replied, x.total))}
          sub={num(x.replied) + " of " + num(x.total) + " enquiries answered"} onClick={() => go("Enquiries", "inbox")} />
        <Kpi tone="info" label="Quote rate" value={pct(share(x.quoted, x.total))}
          sub={num(x.quoted) + " of " + num(x.total) + " reached a sent quote"} onClick={() => go("Insights", "funnel")} />
        <Kpi tone="ok" label="Quote acceptance" value={pct(share(x.accepted, x.decided))}
          sub={num(x.accepted) + " accepted of " + num(x.decided) + " decided quotes"} onClick={() => go("Quotes", "sent")} />
        <Kpi tone="ok" label="Confirmed sales" value={money(x.confirmed)}
          sub={plural(x.orders, "order") + ", EUR eq."} onClick={() => go("Orders", "confirmed")} />
        <Kpi tone="ok" label="Invoiced revenue" value={money(x.invoiced)}
          sub={plural(x.invoices, "FreshBooks invoice") + ", EUR eq."} onClick={() => go("Orders", "invoices")} />
        <Kpi tone="ok" label="Cash collected" value={money(x.collected)}
          sub={plural(x.payments, "payment") + " recorded, EUR eq."} onClick={() => go("Orders", "payments")} />
        <Kpi tone="bad" label="Outstanding receivables" value={money(x.owed)}
          sub={money(x.overdue) + " overdue on " + plural(x.overdueCount, "invoice")} onClick={() => go("Insights", "risk")} />
      </Grid>

      <Flow>
        <Pane grow={1.75} basis={520}>
          <Card style={fill} title="Enquiries per day" hint="Last 14 days, by the date the enquiry arrived"
            right={peak && peak.n > 0 ? <span style={{ fontSize: 12, color: "var(--dim)" }}>Busiest: {dateShort(peak.day)}, {peak.n}</span> : undefined}>
            <Columns data={x.days.map((d) => ({ label: dayLabel(d.day), value: d.n }))} highlight={x.peak} height={196} />
            <Note icon={I.clock} style={{ marginTop: 14 }}>
              {HISTORY.source}: {num(HISTORY.reported)} quotation requests, {HISTORY.window}. {HISTORY.note}
            </Note>
          </Card>
        </Pane>
        <Pane grow={1} basis={300}>
          <Card style={fill} title="Sales by country" hint="Confirmed orders, EUR eq."
            right={<GoLink onClick={() => go("Insights", "markets")}>Markets</GoLink>}>
            <BarList tone="ok" format={(n) => moneyShort(n)} onItem={() => go("Insights", "markets")}
              items={byCountry.map((m) => ({ key: m.key, label: marketName(m.key), value: m.revenue, note: plural(m.won, "order") }))} />
          </Card>
        </Pane>
      </Flow>

      <Flow>
        <Pane grow={1.35} basis={520}>
          <Card style={fill} title="Most requested machines" hint="Units asked for across every enquiry"
            right={<GoLink onClick={() => go("Insights", "sales")}>Sales performance</GoLink>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", columnGap: 30, rowGap: 4 }}>
              {demand.map((d) => (
                <RecRow key={d.product.id} onClick={() => openPanel("product", d.product.id)}
                  lead={<ProductThumb p={d.product} size={42} />}
                  title={d.product.name}
                  sub={<span style={{ display: "block", marginTop: 6 }}><Bar value={d.units} max={topUnits} /></span>}
                  value={plural(d.units, "unit")} meta={plural(d.enquiries, "enquiry", "enquiries")} />
              ))}
            </div>
          </Card>
        </Pane>
        <Pane grow={1} basis={320}>
          <Card style={fill} title="Cash position" hint="FreshBooks invoices, EUR eq."
            right={<GoLink onClick={() => go("Orders", "invoices")}>Invoices</GoLink>}>
            <Stat big label="Invoiced to date" value={money(x.invoiced)} sub={plural(x.invoices, "invoice") + ", " + num(x.openInvoices) + " still open"} />
            <div style={{ margin: "18px 0" }}>
              <SplitBar format={(n) => moneyShort(n)} parts={[
                { label: "Collected", value: x.collected, tone: "ok" },
                { label: "Not yet due", value: notDue, tone: "info" },
                { label: "Overdue", value: x.overdue, tone: "bad" },
              ]} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <Stat label="Collected" value={pct(share(x.collected, x.invoiced))} sub="of invoiced value" tone="ok" />
              <Stat label="Overdue" value={num(x.overdueCount)} sub={moneyShort(x.overdue) + " owed"} tone="bad" />
              <Stat label="Not invoiced" value={num(x.notInvoiced)} sub="accepted orders" />
            </div>
          </Card>
        </Pane>
      </Flow>
    </Page>
  );
}
