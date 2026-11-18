import { useState } from "react";
import type { MMState, Product, Quote } from "../../types";
import { go, openPanel, setBuilderQuote, useMM } from "../../store";
import { customerOf, hasOverride, stockOf } from "../../select";
import { money } from "../../format";
import { Badge, Button, Card, Cell, Grid, I, Icon, Kpi, MONO, Note, Page, PageHead, ProductThumb, Row, Seg, Status, Table, type Col } from "../../ui";
import { overriddenLines, seriesLabel } from "./lib";
import { ConfidentialBig, Num } from "./bits";

/* Price books: the private EUR and GBP lists. Same for every customer apart from currency. */

type Cur = "EUR" | "GBP" | "Both";

function openInBuilder(id: string) {
  setBuilderQuote(id);
  go("Quotes", "builder");
}

export default function PriceBooks() {
  const s = useMM();
  const [cur, setCur] = useState<Cur>("Both");
  const ps = s.products;
  const eur = ps.map((p) => p.eur), gbp = ps.map((p) => p.gbp);
  const stocked = ps.filter((p) => stockOf(s, p).available > 0);
  const overrides = s.quotes.filter(hasOverride).sort((a, b) => b.updatedAt - a.updatedAt);
  const openOverrides = overrides.filter((q) => q.status === "Draft" || q.status === "Awaiting Freight" || q.status === "Ready for Review");
  const questions = s.quotes.filter((q) => !!q.overrideRequested);

  const cols: Col<Product>[] = [
    { key: "img", label: "", width: "40px", render: (p) => <ProductThumb p={p} size={36} /> },
    { key: "name", label: "Machine", width: "minmax(0,1.6fr)", render: (p) => <Cell top={p.name} sub={<span style={MONO}>{p.id}</span>} /> },
    { key: "range", label: "Range / series", width: "minmax(0,1.3fr)", render: (p) => <Cell top={p.range} sub={p.series === p.range ? undefined : seriesLabel(p)} /> },
    { key: "cat", label: "Category", width: "84px", render: (p) => <span style={{ fontSize: 12.5, color: "var(--body)" }}>{p.category}</span> },
    ...(cur !== "GBP" ? [{ key: "eur", label: "EUR", width: "84px", align: "right" as const, render: (p: Product) => <Num strong>{money(p.eur, "EUR")}</Num> }] : []),
    ...(cur !== "EUR" ? [{ key: "gbp", label: "GBP", width: "84px", align: "right" as const, render: (p: Product) => <Num strong>{money(p.gbp, "GBP")}</Num> }] : []),
    { key: "label", label: "Website label", width: "minmax(0,1.5fr)", render: (p) => {
      const st = stockOf(s, p);
      const stale = /^estimated arrival/i.test(p.websiteLabel) && st.available > 0;
      return (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: /available now/i.test(p.websiteLabel) ? "var(--ok)" : "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            title={p.websiteLabel}>{p.websiteLabel}</div>
          {stale && <div style={{ fontSize: 11, color: "var(--warn)", marginTop: 2 }}>Out of date: {st.available} available now</div>}
        </div>
      );
    } },
    { key: "avail", label: "Available", width: "86px", align: "right", render: (p) => {
      const st = stockOf(s, p);
      return (
        <div style={{ textAlign: "right" }}>
          <div style={{ ...MONO, fontSize: 13, color: st.available > 0 ? "var(--ok)" : st.available < 0 ? "var(--bad)" : "var(--faint)" }}>{st.available}</div>
          {st.incomingFree > 0 && <div style={{ fontSize: 11, color: "var(--warn)", marginTop: 2 }}>+{st.incomingFree} incoming</div>}
        </div>
      );
    } },
  ];

  return (
    <Page>
      <PageHead title="Price books"
        sub="Private EUR and GBP price lists used on every quotation. The website shows no prices, only Add to Quote."
        right={<>
          <ConfidentialBig>Confidential pricing</ConfidentialBig>
          <Seg<Cur> value={cur} onChange={setCur} options={["EUR", "GBP", "Both"]} />
        </>} />

      <Grid cols="repeat(auto-fit,minmax(180px,1fr))" gap={12}>
        <Kpi tone="accent" label="Machines priced" value={ps.length} sub="Every machine on megamasseurope.com" />
        <Kpi tone="neutral" label="EUR price book" value={money(Math.min(...eur), "EUR") + " to " + money(Math.max(...eur), "EUR")} sub="Per unit, ex VAT" />
        <Kpi tone="neutral" label="GBP price book" value={money(Math.min(...gbp), "GBP") + " to " + money(Math.max(...gbp), "GBP")} sub="Per unit, ex VAT" />
        <Kpi tone="ok" label="Machines in stock" value={stocked.length} sub="With free units in County Derry now" />
        <Kpi tone={openOverrides.length ? "warn" : "neutral"} label="Overrides waiting" value={openOverrides.length} sub="Quotes not yet sent with a changed price" />
      </Grid>

      <Grid cols="repeat(auto-fit,minmax(340px,1fr))" gap={14}>
        <Card title="Pricing rules" hint="How the price books are used.">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Note tone="accent" icon={I.lock}>Same prices for every customer apart from currency. No automatic wholesale discounts. Any manual override needs Niall's approval.</Note>
            <Note icon={I.alert}>Prices are demo values.</Note>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, fontSize: 12.5, color: "var(--body)" }}>
              <Row gap={8}><Icon d={I.globe} size={14} style={{ color: "var(--dim)" }} />UK customers quoted in GBP, everyone else in EUR</Row>
              <Row gap={8}><Icon d={I.check} size={14} style={{ color: "var(--dim)" }} />Currency is fixed by the customer record</Row>
            </div>
          </div>
        </Card>

        <Card title="Quotes with price overrides" hint="Any quote where a unit price differs from the price book."
          right={<Badge tone={overrides.length ? "warn" : "neutral"}>{overrides.length}</Badge>}>
          {overrides.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.5 }}>
              No quote carries a price override. Change a unit price in the Quote Builder and it shows here with its status until approved.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {overrides.map((q) => <OverrideRow key={q.id} s={s} q={q} />)}
          </div>
          {questions.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 8 }}>Customers asking for a better price (no discount applied)</div>
              {questions.map((q) => {
                const c = customerOf(s, q.customerId);
                return (
                  <div key={q.id} className="mm-row" onClick={() => go("Quotes", "approvals")}
                    style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "8px 6px", borderRadius: 10, cursor: "pointer" }}>
                    <Cell top={<>{c.name} <span style={{ ...MONO, fontSize: 11.5, color: "var(--faint)" }}>{q.id}</span></>} sub={q.overrideRequested} />
                    <Status s={q.status} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Grid>

      <Card title={<Row gap={8}><Icon d={I.lock} size={14} style={{ color: "var(--accent)" }} />{cur === "Both" ? "EUR and GBP price books" : cur + " price book"}</Row>}
        hint="Rows open the product record. Available is County Derry stock less reservations." pad="16px 10px 12px"
        right={<Button size="sm" icon={I.quote} onClick={() => go("Quotes", "builder")}>Quote Builder</Button>}>
        <Table<Product> rows={ps} rowKey={(p) => p.id} onRow={(p) => openPanel("product", p.id)} cols={cols} />
      </Card>
    </Page>
  );
}

function OverrideRow({ s, q }: { s: MMState; q: Quote }) {
  const c = customerOf(s, q.customerId);
  const lines = overriddenLines(s, q);
  return (
    <div className="mm-row" onClick={() => openInBuilder(q.id)} title="Open in the Quote Builder"
      style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "9px 6px", borderRadius: 10, cursor: "pointer" }}>
      <Cell top={<>{c.name} <span style={{ ...MONO, fontSize: 11.5, color: "var(--faint)" }}>{q.id}</span></>}
        sub={lines.map((l) => l.name + ": " + money(l.unitPrice, q.currency) + " vs list " + money(l.listPrice, q.currency)).join("; ")} />
      <Status s={q.status} />
    </div>
  );
}
