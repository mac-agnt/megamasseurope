import { useMemo, useState } from "react";
import type { MMState, Product } from "../../types";
import { openPanel, useMM } from "../../store";
import { productDemand, stockOf } from "../../select";
import { Badge, Cell, MONO, Page, ProductThumb, Seg, Table, type Col } from "../../ui";
import { num } from "../../format";
import { labelOutdated } from "../../panel/kit";
import { Count, HeadRow, SearchBox, TableFrame, matches } from "./shared";

/* Records › Products: the 18 machines as records, with catalogue gaps,
   website wording and how often they are asked for and ordered. */

type Category = Product["category"];
type CatFilter = "All" | Category;
type Row = { p: Product; enquiries: number; requested: number; openUnits: number; allUnits: number; outdated: boolean };

const CATS: Category[] = ["Row", "Press", "Pulldown", "Squat", "Lower body"];

function buildRows(s: MMState): Row[] {
  const demand = new Map(productDemand(s).map((d) => [d.product.id, d]));
  const open = new Map<string, number>(), lifetime = new Map<string, number>();
  for (const o of s.orders) for (const l of o.lines) {
    lifetime.set(l.productId, (lifetime.get(l.productId) || 0) + l.qty);
    if (o.status !== "Delivered") open.set(l.productId, (open.get(l.productId) || 0) + l.qty);
  }
  return s.products.map((p) => ({
    p, enquiries: demand.get(p.id)?.enquiries ?? 0, requested: demand.get(p.id)?.units ?? 0,
    openUnits: open.get(p.id) ?? 0, allUnits: lifetime.get(p.id) ?? 0, outdated: labelOutdated(p.websiteLabel),
  })).sort((a, b) => b.enquiries - a.enquiries || a.p.name.localeCompare(b.p.name));
}

const tbc = <span style={{ color: "var(--warn)" }}>TBC</span>;

const cols: Col<Row>[] = [
  { key: "name", label: "Machine", width: "minmax(210px,1.7fr)", render: (r) => (
    <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
      <ProductThumb p={r.p} size={36} />
      <Cell top={r.p.name} sub={/series|&/i.test(r.p.series) ? r.p.series : r.p.series + " series"} />
    </div>
  ) },
  { key: "sku", label: "SKU", width: "108px", render: (r) => <span style={{ ...MONO, fontSize: 11.5, color: "var(--dim)" }}>{r.p.id}</span> },
  { key: "range", label: "Range", width: "minmax(130px,1fr)", render: (r) => <span style={{ color: "var(--dim)" }}>{r.p.range}</span> },
  { key: "cat", label: "Category", width: "84px", render: (r) => r.p.category },
  { key: "weight", label: "Weight", width: "74px", align: "right", render: (r) => (r.p.weightKg ? <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.p.weightKg} kg</span> : tbc) },
  { key: "dims", label: "Dimensions", width: "minmax(140px,1fr)", render: (r) => (r.p.dims ? <span style={{ color: "var(--dim)", whiteSpace: "nowrap" }}>{r.p.dims}</span> : tbc) },
  { key: "label", label: "Website label", width: "minmax(170px,1.3fr)", render: (r) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: r.outdated ? "var(--warn)" : "var(--body)" }} title={r.p.websiteLabel}>{r.p.websiteLabel}</span>
      {r.outdated && <Badge tone="warn">Out of date</Badge>}
    </div>
  ) },
  { key: "enq", label: "Enquiries", width: "80px", align: "right", render: (r) => <Count n={r.enquiries} strong /> },
  { key: "orders", label: "On orders", width: "86px", align: "right", render: (r) => (
    <div style={{ textAlign: "right" }}>
      <Count n={r.openUnits} strong />
      <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap" }}>{r.allUnits} all time</div>
    </div>
  ) },
];

export default function ProductsTab() {
  const s = useMM();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CatFilter>("All");
  const all = useMemo(() => buildRows(s), [s]);

  const options: [CatFilter, string][] = [["All", "All " + all.length], ...CATS.map((c): [CatFilter, string] => [c, c + " " + all.filter((r) => r.p.category === c).length])];
  const rows = all.filter((r) => (cat === "All" || r.p.category === cat) && matches(q, r.p.name, r.p.id, r.p.range, r.p.series, r.p.websiteLabel));

  const gaps = all.filter((r) => r.p.weightKg === null || r.p.dims === null).length;
  const availableNow = all.filter((r) => stockOf(s, r.p).available > 0).length;
  const outdated = all.filter((r) => r.outdated).length;

  return (
    <Page>
      <HeadRow title="Products" count={all.length}
        summary={num(availableNow) + " available now in County Derry · " + num(gaps) + " with weight or dimensions TBC" + (outdated ? " · " + num(outdated) + " website label out of date" : "")}>
        <SearchBox value={q} onChange={setQ} label="Search machine or SKU" />
      </HeadRow>
      <div><Seg<CatFilter> options={options} value={cat} onChange={setCat} /></div>
      <TableFrame min={1100}>
        <Table cols={cols} rows={rows} rowKey={(r) => r.p.id} onRow={(r) => openPanel("product", r.p.id)}
          empty={q ? "No machine matches “" + q + "”." : "No machines in this category."} />
      </TableFrame>
    </Page>
  );
}
