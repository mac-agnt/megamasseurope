import { approve, go, holdApproval, openPanel, setBuilderQuote, useMM } from "../store";
import {
  HISTORY, customerOf, daysOverdue, enquiriesByDay, freightOutstanding, markets, openApprovals, orderValue,
  outstanding, overdueInvoices, productDemand,
} from "../select";
import { countryName, money, moneyShort, since } from "../format";
import { AGENT_META, Avatar, BarList, Button, Card, Cell, Columns, CountryTag, Grid, I, Icon, MONO, Money, Note, Status, Table } from "../ui";
import type { Approval } from "../types";

/* The top of the Dashboard: what needs Niall now, then the operating picture.
   Every figure is computed from the shared store. */

export default function DashboardToday() {
  const s = useMM();
  const open = openApprovals(s);
  const days = enquiriesByDay(s, 14);
  const mk = markets(s).filter((m) => m.revenue > 0).sort((a, b) => b.revenue - a.revenue);
  const waiting = freightOutstanding(s).slice().sort((a, b) => (a.requestedAt ?? 0) - (b.requestedAt ?? 0));
  const overdue = overdueInvoices(s);
  const demand = productDemand(s).slice(0, 5);
  const deliveries = s.orders.filter((o) => o.status === "Dispatched" || o.status === "Equipment allocated" || o.status === "Payment confirmed").slice(0, 5);

  const edit = (a: Approval) => {
    if (a.recordKind === "quote") { setBuilderQuote(a.recordId); go("Quotes", "builder"); }
    else if (a.recordKind === "freight") go("Freight", "requests");
    else go("Orders", "invoices");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "6px 0 26px" }}>
      <Card title="Requires your approval" hint={open.length + " items prepared by the agents. Approving one updates the quote, the enquiry, the activity log and every counter."}
        right={<Button size="sm" onClick={() => go("Work", "approvals")} icon={I.arrow}>Full queue</Button>} tone="accent">
        <Table<Approval>
          rows={open.slice(0, 6)}
          rowKey={(a) => a.id}
          onRow={(a) => openPanel(a.recordKind, a.recordId)}
          cols={[
            { key: "c", label: "Customer", width: "minmax(170px,1.3fr)", render: (a) => { const c = customerOf(s, a.customerId); return <Cell top={<span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><CountryTag c={c.country} />{c.name}</span>} sub={c.type} />; } },
            { key: "a", label: "Action", width: "minmax(190px,1.5fr)", render: (a) => <Cell top={a.action} sub={a.context} /> },
            { key: "v", label: "Value", width: "110px", align: "right", render: (a) => <Money v={a.amount} cur={a.currency} /> },
            { key: "s", label: "Status", width: "120px", render: (a) => <Status s={a.status} /> },
            { key: "x", label: "", width: "minmax(330px,auto)", align: "right", render: (a) => (
              <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                <Button size="sm" onClick={() => openPanel(a.recordKind, a.recordId)}>Review</Button>
                <Button size="sm" kind="primary" icon={I.check} onClick={() => approve(a.id)}>{a.kind === "Freight request" ? "Send" : "Approve"}</Button>
                <Button size="sm" onClick={() => edit(a)}>Edit</Button>
                <Button size="sm" kind="ghost" onClick={() => holdApproval(a.id)}>Hold</Button>
                <Button size="sm" kind="ghost" icon={I.mail} title="View correspondence" onClick={() => openPanel(a.recordKind, a.recordId)} />
              </div>
            ) },
          ]}
        />
      </Card>

      <Grid cols="repeat(auto-fit,minmax(300px,1fr))">
        <Card title="Enquiries per day" hint="Last 14 days, from the enquiry records" right={<Button size="sm" kind="ghost" onClick={() => go("Enquiries", "inbox")} icon={I.arrow} />}>
          <Columns data={days.map((d) => ({ label: d.label, value: d.n }))} height={96} />
          <Note style={{ marginTop: 12 }} icon={I.clock}>{HISTORY.source}: {HISTORY.reported} quotation requests, {HISTORY.window}. Historical, not live data.</Note>
        </Card>
        <Card title="Sales by country" hint="Confirmed orders, EUR eq. at demo rate £1 = €1.15" right={<Button size="sm" kind="ghost" onClick={() => go("Insights", "markets")} icon={I.arrow} />}>
          <BarList items={mk.slice(0, 6).map((m) => ({ label: m.key === "Other" ? "Other Europe" : countryName(m.key), value: Math.round(m.revenue), note: m.won + " orders", key: m.key }))} format={(n) => moneyShort(n)} />
        </Card>
        <Card title="Pending freight replies" hint={waiting.length + " carrier rates outstanding, oldest first"} right={<Button size="sm" kind="ghost" onClick={() => go("Freight", "awaiting")} icon={I.arrow} />}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {waiting.slice(0, 5).map((f) => {
              const c = customerOf(s, f.customerId);
              const d = f.requestedAt ? Math.floor((s.now - f.requestedAt) / 86_400_000) : 0;
              return (
                <div key={f.id} className="mm-row" onClick={() => openPanel("freight", f.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", margin: "0 -6px", borderRadius: 8, cursor: "pointer" }}>
                  <CountryTag c={c.country} />
                  <Cell top={c.name} sub={f.id + " · " + s.suppliers.find((x) => x.id === f.carrierId)!.name} />
                  <span style={{ marginLeft: "auto", ...MONO, fontSize: 11.5, color: d >= 3 ? "var(--bad)" : "var(--dim)", whiteSpace: "nowrap" }}>{d}d waiting</span>
                </div>
              );
            })}
          </div>
        </Card>
      </Grid>

      <Grid cols="repeat(auto-fit,minmax(260px,1fr))">
        <Card title="Unpaid invoice alerts" hint={overdue.length + " overdue in FreshBooks"} right={<Button size="sm" kind="ghost" onClick={() => go("Orders", "payments")} icon={I.arrow} />}>
          {overdue.slice(0, 5).map((inv) => (
            <div key={inv.id} className="mm-row" onClick={() => openPanel("invoice", inv.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", margin: "0 -6px", borderRadius: 8, cursor: "pointer" }}>
              <Cell top={customerOf(s, inv.customerId).name} sub={inv.id + " · " + daysOverdue(s, inv) + " days overdue" + (inv.promise ? (inv.promise.broken ? " · promise broken" : " · promised") : "")} />
              <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600 }}>{money(outstanding(s, inv), inv.currency)}</span>
            </div>
          ))}
        </Card>
        <Card title="Recent AI activity" hint="What the agents did, newest first" right={<Button size="sm" kind="ghost" onClick={() => go("Agents", "runs")} icon={I.arrow} />}>
          {s.runs.slice(0, 5).map((r) => {
            const name = AGENT_META[r.agentId].name;
            return (
              <div key={r.id} className="mm-row" onClick={() => openPanel(r.recordKind, r.recordId)} style={{ display: "flex", gap: 10, padding: "8px 6px", margin: "0 -6px", borderRadius: 8, cursor: "pointer" }}>
                <Avatar name={name} size={24} />
                <Cell top={r.title} sub={r.outcome + " · " + since(r.at, s.now)} />
              </div>
            );
          })}
        </Card>
        <Card title="Product demand" hint="Machines asked for across all enquiries" right={<Button size="sm" kind="ghost" onClick={() => go("Insights", "sales")} icon={I.arrow} />}>
          <BarList items={demand.map((d) => ({ label: d.product.name, value: d.units, note: d.enquiries + " enquiries", key: d.product.id }))} format={(n) => n + " units"} />
        </Card>
        <Card title="Upcoming deliveries" hint="Paid, allocated or on the road" right={<Button size="sm" kind="ghost" onClick={() => go("Freight", "dispatch")} icon={I.arrow} />}>
          {deliveries.map((o) => {
            const c = customerOf(s, o.customerId);
            return (
              <div key={o.id} className="mm-row" onClick={() => openPanel("order", o.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", margin: "0 -6px", borderRadius: 8, cursor: "pointer" }}>
                <Icon d={o.status === "Dispatched" ? I.truck : I.box} size={15} style={{ color: o.status === "Dispatched" ? "var(--accent)" : "var(--dim)" }} />
                <Cell top={c.name} sub={o.id + " · " + (o.eta || o.status) + " · " + money(orderValue(o), o.currency)} />
                <span style={{ marginLeft: "auto" }}><Status s={o.status} /></span>
              </div>
            );
          })}
          {deliveries.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Nothing on the road.</div>}
        </Card>
      </Grid>
    </div>
  );
}
