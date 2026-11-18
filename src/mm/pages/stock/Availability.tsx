import { useState } from "react";
import { go, openPanel, useMM } from "../../store";
import { stockOf } from "../../select";
import { plural, until } from "../../format";
import { Avatar, BarList, Button, Card, Empty, Grid, I, Kpi, MONO, Note, Page, PageHead, ProductThumb, Row, Seg, Status, Table, toneInk, type Col } from "../../ui";
import type { MMState, Product } from "../../types";
import { openDemand, saysAvailable, shipmentFor, stockFlags, type Flag } from "./shared";

type Filter = "all" | "stock" | "incoming" | "flagged";
type ARow = { p: Product; st: ReturnType<typeof stockOf>; flags: Flag[] };

export default function Availability() {
  const s = useMM();
  const [f, setF] = useState<Filter>("all");
  const rows: ARow[] = s.products.map((p) => ({ p, st: stockOf(s, p), flags: stockFlags(s, p) }));
  const inStock = rows.filter((r) => r.st.inStock > 0);
  const incoming = rows.filter((r) => r.st.incoming > 0);
  const flagged = rows.filter((r) => r.flags.length > 0);
  const shown = f === "stock" ? inStock : f === "incoming" ? incoming : f === "flagged" ? flagged : rows;
  const tot = (k: "inStock" | "reserved" | "available" | "incoming" | "incomingReserved") => rows.reduce((n, r) => n + r.st[k], 0);
  const webFlags = rows.filter((r) => r.flags.some((x) => x.key === "web"));
  const negative = rows.filter((r) => r.st.available < 0);
  const demandRows = rows.filter((r) => r.flags.some((x) => x.key === "demand"));

  return (
    <Page>
      <PageHead title="Availability"
        sub="Four numbers per machine: in stock, reserved, available and incoming. No warehouse system, just what the orders and reservations say."
        right={<Button icon={I.calendar} onClick={() => go("Stock", "reservations")}>Reservations</Button>} />

      <Grid cols="repeat(auto-fit,minmax(150px,1fr))" gap={12}>
        <Kpi label="In stock" value={tot("inStock")} tone="neutral" sub={plural(inStock.length, "model") + " in County Derry"} />
        <Kpi label="Reserved" value={tot("reserved")} tone="accent" sub="Held for orders from stock" onClick={() => go("Stock", "reservations")} />
        <Kpi label="Available" value={tot("available")} tone={negative.length ? "bad" : "ok"} sub={negative.length ? plural(negative.length, "machine") + " below zero" : "Never below zero"} />
        <Kpi label="Incoming" value={tot("incoming")} tone="warn" sub={tot("incomingReserved") + " already held"} onClick={() => go("Stock", "incoming")} />
        <Kpi label="Website out of date" value={webFlags.length} tone="warn" sub="Labels that no longer match stock" onClick={() => setF("flagged")} />
        <Kpi label="Demand, none in stock" value={demandRows.length} tone="info" sub={plural(demandRows.reduce((n, r) => n + openDemand(s, r.p.id).enquiries, 0), "open enquiry", "open enquiries")} onClick={() => setF("flagged")} />
      </Grid>

      <Card pad="16px 18px" title={plural(shown.length, "machine")} hint="Available is in stock minus reserved. Incoming units only count once they land."
        right={<Seg<Filter> value={f} onChange={setF} options={[
          ["all", "All " + rows.length], ["stock", "In stock " + inStock.length], ["incoming", "Incoming " + incoming.length], ["flagged", "Flagged " + flagged.length],
        ]} />}>
        <Table rows={shown} rowKey={(r) => r.p.id} onRow={(r) => openPanel("product", r.p.id)} cols={cols()} empty="Nothing matches this filter." />
      </Card>

      <Grid cols="minmax(0,1.2fr) minmax(0,1fr)" gap={14} style={{ alignItems: "stretch" }}>
        <WebsiteText s={s} rows={webFlags} />
        <ZeroStockDemand s={s} rows={rows} />
      </Grid>

      <Note icon={I.alert} tone="warn">Available stock can never go below zero without an explicit warning and a manual override by Niall. Reserving more than is in stock shows as a red flag here first.</Note>
    </Page>
  );
}

function num(n: number, tone?: string) {
  return <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: tone ?? (n === 0 ? "var(--faint)" : "var(--ink)") }}>{n}</span>;
}

function cols(): Col<ARow>[] {
  return [
    { key: "product", label: "Product", width: "minmax(0,1.5fr)", render: ({ p }) => (
      <Row gap={10}>
        <ProductThumb p={p} size={34} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
          <div style={{ ...MONO, fontSize: 10.5, color: "var(--faint)", marginTop: 2 }}>{p.id}</div>
        </div>
      </Row>
    ) },
    { key: "in", label: "In stock", width: "70px", align: "right", render: ({ st }) => num(st.inStock) },
    { key: "res", label: "Reserved", width: "70px", align: "right", render: ({ st }) => num(st.reserved) },
    { key: "avail", label: "Available", width: "76px", align: "right", render: ({ st }) =>
      num(st.available, st.available < 0 ? "var(--bad)" : st.available > 0 ? "var(--ok)" : undefined) },
    { key: "inc", label: "Incoming", width: "72px", align: "right", render: ({ st }) => num(st.incoming, st.incoming > 0 ? "var(--warn)" : undefined) },
    { key: "incres", label: "Incoming reserved", width: "118px", align: "right", render: ({ st }) => num(st.incomingReserved) },
    { key: "web", label: "Website label", width: "minmax(0,1.1fr)", render: ({ p, flags }) => {
      const stale = flags.some((x) => x.key === "web");
      return (
        <div style={{ minWidth: 0 }} title={p.websiteLabel}>
          <div style={{ color: stale ? "var(--warn)" : saysAvailable(p) ? "var(--body)" : "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.websiteLabel}</div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{stale ? "Out of date" : "Matches stock"}</div>
        </div>
      );
    } },
    { key: "flags", label: "Flags", width: "minmax(0,1.6fr)", render: ({ flags }) => flags.length === 0
      ? <span style={{ color: "var(--faint)" }}>None</span>
      : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, whiteSpace: "normal" }}>
          {flags.map((x) => (
            <div key={x.key} style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: toneInk(x.tone) }}>{x.title}</div>
              <div style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.4, marginTop: 1 }}>{x.detail}</div>
            </div>
          ))}
        </div>
      ) },
  ];
}

/* ── website wording to fix ──────────────────────────────────────────────── */

function WebsiteText({ s, rows }: { s: MMState; rows: ARow[] }) {
  return (
    <Card title="Website text to update" hint="megamasseurope.com availability labels that no longer match County Derry">
      {rows.length === 0 && <Empty title="Website labels match stock" />}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.map(({ p, st }, i) => {
          const sh = shipmentFor(s, p.id);
          const task = s.tasks.find((t) => t.recordKind === "product" && t.recordId === p.id && /website/i.test(t.title) && t.status !== "Done");
          const suggestion = st.available > 0
            ? "Change to “Available now”: " + st.available + " available in County Derry."
            : sh && !sh.confirmed
              ? "Once the " + sh.name.split(",")[0] + " arrival is confirmed, show the confirmed date. Until then, no delivery date on the page."
              : "Change to the confirmed arrival window.";
          return (
            <div key={p.id} onClick={() => openPanel("product", p.id)} className="mm-row"
              style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr)", gap: 12, padding: "11px 10px", margin: "0 -10px", borderRadius: 12, cursor: "pointer",
                borderTop: i ? "1px solid var(--border)" : undefined }}>
              <ProductThumb p={p} size={38} />
              <div style={{ minWidth: 0 }}>
                <Row gap={8}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flexShrink: 0, maxWidth: "60%" }}>{p.name}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11.5, color: "var(--warn)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flexShrink: 1 }}>Says “{p.websiteLabel}”</span>
                </Row>
                <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 4, lineHeight: 1.45 }}>{suggestion}</div>
                {task && (
                  <Row gap={7} style={{ marginTop: 6, fontSize: 11.5, color: "var(--faint)" }}>
                    <Avatar name={task.owner} size={18} />
                    <span>{task.owner}, due {until(task.due)}</span>
                    <Status s={task.status} />
                  </Row>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── demand on machines with nothing to sell ─────────────────────────────── */

function ZeroStockDemand({ s, rows }: { s: MMState; rows: ARow[] }) {
  const all = rows.filter((r) => r.st.available <= 0).map((r) => ({ r, d: openDemand(s, r.p.id) }))
    .filter((x) => x.d.enquiries > 0).sort((a, b) => b.d.enquiries - a.d.enquiries || b.d.units - a.d.units);
  const items = all.slice(0, 8);
  return (
    <Card title="Open demand on zero-stock machines" hint="Open enquiries asking for machines with nothing available today">
      {items.length === 0 ? <Empty title="No open demand on zero-stock machines" /> : (
        <BarList tone="accent" onItem={(i) => openPanel("product", items[i].r.p.id)} format={(n) => plural(n, "enquiry", "enquiries")}
          items={items.map(({ r, d }) => ({
            key: r.p.id, label: r.p.name, value: d.enquiries,
            note: r.st.incomingFree > 0 ? r.st.incomingFree + " free incoming" : r.st.incoming > 0 ? "Incoming all held" : "Nothing incoming",
          }))} />
      )}
      {all.length > items.length && (
        <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 14 }}>
          {plural(all.length - items.length, "more machine")} with open demand and nothing available. Filter the table by Flagged to see them all.
        </div>
      )}
    </Card>
  );
}
