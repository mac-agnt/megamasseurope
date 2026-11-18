import { useState } from "react";
import { openPanel, useMM } from "../../store";
import { productDemand, stockOf } from "../../select";
import { money, plural } from "../../format";
import { Badge, Card, Confidential, Grid, I, Icon, Kpi, MONO, Note, Page, PageHead, ProductThumb, Row, Seg } from "../../ui";
import type { MMState, Product } from "../../types";
import { openDemand, saysAvailable, stockFlags } from "./shared";

export default function Catalogue() {
  const s = useMM();
  const ranges = [...new Set(s.products.map((p) => p.range))];
  const [range, setRange] = useState<string>("all");
  const shown = range === "all" ? s.products : s.products.filter((p) => p.range === range);
  const stock = s.products.map((p) => ({ p, st: stockOf(s, p) }));
  const inStockModels = stock.filter((x) => x.st.inStock > 0);
  const units = stock.reduce((n, x) => n + x.st.inStock, 0);
  const incoming = stock.reduce((n, x) => n + x.st.incoming, 0);
  const incomingModels = stock.filter((x) => x.st.incoming > 0).length;
  const top = productDemand(s)[0];
  const asked = productDemand(s).reduce((n, d) => n + d.units, 0);

  return (
    <Page>
      <PageHead title="Catalogue"
        sub={"The " + s.products.length + " machines published on megamasseurope.com, with County Derry stock and the private price books. The website itself shows no prices."}
        right={<Confidential label="Private price books, EUR and GBP" />} />

      <Grid cols="repeat(auto-fit,minmax(200px,1fr))" gap={12}>
        <Kpi label="Machines in the catalogue" value={s.products.length} tone="neutral" sub={plural(ranges.length, "range") + " as the website groups them"} />
        <Kpi label="In stock in County Derry" value={plural(units, "unit")} tone="ok" sub={plural(inStockModels.length, "model") + " on the floor"} />
        <Kpi label="Incoming" value={plural(incoming, "unit")} tone="warn" sub={plural(incomingModels, "model") + " on the " + (s.shipments[0]?.name ?? "next shipment")} />
        {top && <Kpi label="Most requested" value={<span style={{ fontSize: 19, letterSpacing: "-.4px" }}>{top.product.name}</span>} tone="accent"
          sub={plural(top.units, "unit") + " across " + plural(top.enquiries, "enquiry", "enquiries") + ", " + Math.round((top.units / Math.max(1, asked)) * 100) + "% of all machines asked for"} />}
      </Grid>

      <Row gap={12} wrap>
        <Seg<string> value={range} onChange={setRange}
          options={[["all", "All " + s.products.length] as [string, string]].concat(ranges.map((r) => [r, r + " " + s.products.filter((p) => p.range === r).length] as [string, string]))} />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--faint)" }}>Click a machine for its record, enquiries and reservations.</span>
      </Row>

      <Grid cols="repeat(auto-fill,minmax(330px,1fr))" gap={14}>
        {shown.map((p) => <ProductCard key={p.id} s={s} p={p} />)}
      </Grid>

      <Note icon={I.lock}>Prices are the private demo price book: the same for every customer apart from currency, never shown on the website. Discounts and overrides need Niall's approval.</Note>
    </Page>
  );
}

function ProductCard({ s, p }: { s: MMState; p: Product }) {
  const st = stockOf(s, p);
  const flags = stockFlags(s, p);
  const web = flags.find((f) => f.key === "web");
  const demand = openDemand(s, p.id);
  const specs = p.weightKg !== null && p.dims !== null ? p.weightKg + " kg, " + p.dims
    : p.weightKg !== null ? p.weightKg + " kg, dimensions TBC in catalogue"
    : p.dims !== null ? p.dims + ", weight TBC in catalogue" : "Weight and dimensions TBC in catalogue";
  const cells: [string, number, string][] = [
    ["In stock", st.inStock, st.inStock > 0 ? "var(--ink)" : "var(--faint)"],
    ["Reserved", st.reserved, st.reserved > 0 ? "var(--ink)" : "var(--faint)"],
    ["Available", st.available, st.available < 0 ? "var(--bad)" : st.available > 0 ? "var(--ok)" : "var(--faint)"],
    ["Incoming", st.incoming, st.incoming > 0 ? "var(--warn)" : "var(--faint)"],
  ];

  return (
    <Card pad="16px" onClick={() => openPanel("product", p.id)}>
      <div style={{ display: "grid", gridTemplateColumns: "104px minmax(0,1fr)", gap: 14, alignItems: "start" }}>
        <ProductThumb p={p} size={104} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-.2px", color: "var(--ink)", lineHeight: 1.3 }}>{p.name}</div>
          <div style={{ ...MONO, fontSize: 10.5, color: "var(--faint)", marginTop: 4 }}>{p.id}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6, lineHeight: 1.45 }}>{p.range}</div>
          <div style={{ fontSize: 12, color: "var(--faint)", lineHeight: 1.45 }}>{p.series} series, {p.category.toLowerCase()}</div>
          <div style={{ marginTop: 8 }} title={"Website: " + p.websiteLabel + (web ? ". " + web.detail : "")}>
            <Badge tone={web ? "warn" : saysAvailable(p) ? "ok" : "neutral"} style={{ maxWidth: "100%", overflow: "hidden" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{p.websiteLabel}</span>
            </Badge>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 14, padding: "10px 4px 9px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        {cells.map(([label, n, color]) => (
          <div key={label} style={{ textAlign: "center", minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{n}</div>
            <div style={{ ...MONO, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: p.weightKg === null || p.dims === null ? "var(--faint)" : "var(--dim)", marginTop: 10 }}>{specs}</div>
      <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 3 }}>
        {demand.enquiries ? "In " + plural(demand.enquiries, "open enquiry", "open enquiries") : "No open enquiries"}
        {web ? ". Website text out of date" : ""}
      </div>

      <Row gap={10} style={{ marginTop: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(p.eur, "EUR")}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--body)", fontVariantNumeric: "tabular-nums" }}>{money(p.gbp, "GBP")}</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, ...MONO, fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--accent)" }}>
          <Icon d={I.lock} size={11} stroke={2} />Confidential
        </span>
      </Row>
    </Card>
  );
}
