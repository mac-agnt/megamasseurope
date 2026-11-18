import { useState, type ReactNode } from "react";
import type { Enquiry, MMState, Qualification as Category } from "../../types";
import { openPanel, useMM } from "../../store";
import { customerOf, enquiryCurrency, enquiryValue } from "../../select";
import { moneyShort, num, plural } from "../../format";
import { Badge, Card, CountryTag, I, Icon, Money, Page, PageHead, Row } from "../../ui";
import {
  BOARD, EUR_EQ, STAGE_SHORT, byPriorityThenValue, isExistingCustomer, linesText, machineSummary, openEnquiries, sumEur, whyChip,
} from "./data";
import { CLAMP2, ELLIPSIS, EurEqNote, MiniStat, MoreButton, PriorityDot, onKeyActivate } from "./bits";

/* Enquiries > Qualification. The Enquiry Agent's categorisation of the open
   pipeline (New to Quote Sent), one column per category, highest priority and
   value first inside each column. */

const LIMIT = 8;
const PRIORITISED: Category[] = ["Wholesale / distributor", "High-value project"];

export default function Qualification() {
  const s = useMM();
  const open = openEnquiries(s);
  const sorter = byPriorityThenValue(s);
  const cols = BOARD.map((q) => {
    const list = open.filter((e) => e.qualification === q).sort(sorter);
    return { q, list, value: sumEur(s, list) };
  });
  const col = (q: Category) => cols.find((c) => c.q === q) ?? { q, list: [] as Enquiry[], value: 0 };
  const ws = col("Wholesale / distributor"), hv = col("High-value project"), inc = col("Incomplete enquiry");
  const top = ws.list.length + hv.list.length;
  const alsoReturning = open.filter((e) => e.qualification !== "Returning customer" && isExistingCustomer(s, e.customerId)).sort(sorter);

  /* The most common gap among incomplete enquiries, from the records. */
  const gaps: Record<string, number> = {};
  for (const e of inc.list) for (const m of e.missing) gaps[m] = (gaps[m] || 0) + 1;
  const mainGap = Object.entries(gaps).sort((a, b) => b[1] - a[1])[0];

  return (
    <Page>
      <PageHead title="Qualification"
        sub="The Enquiry Agent sorts every open enquiry, New to Quote Sent, by who is asking and what it could be worth. Click a card for the full record." />

      <Card pad="18px 20px">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "18px 30px", alignItems: "center" }}>
          <div style={{ flex: "2 1 340px", minWidth: 0 }}>
            <Row gap={9}>
              <span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon d={I.spark} size={16} /></span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.2px" }}>Prioritised: wholesale and high-value first</span>
            </Row>
            <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 7, lineHeight: 1.55 }}>
              {plural(top, "enquiry", "enquiries")} worth {moneyShort(ws.value + hv.value)} {EUR_EQ} sit at the top of your list.{" "}
              {plural(inc.list.length, "incomplete one", "incomplete ones")} {inc.list.length === 1 ? "waits" : "wait"} on details before anything can be quoted.
            </div>
          </div>
          <MiniStat style={{ flex: "1 1 130px" }} label="Wholesale / distributor" value={num(ws.list.length)} sub={moneyShort(ws.value) + " " + EUR_EQ} />
          <MiniStat style={{ flex: "1 1 130px" }} label="High-value projects" value={num(hv.list.length)} sub={moneyShort(hv.value) + " " + EUR_EQ} />
          <MiniStat style={{ flex: "1 1 130px" }} label="Incomplete" value={num(inc.list.length)}
            sub={mainGap ? num(mainGap[1]) + " missing " + mainGap[0].toLowerCase() : "Nothing missing"} />
          <MiniStat style={{ flex: "1 1 130px" }} label="Open pipeline" value={num(open.length)} sub={moneyShort(sumEur(s, open)) + " " + EUR_EQ} />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))", gap: 10, alignItems: "start" }}>
        {cols.map((c) => <Column key={c.q} s={s} q={c.q} list={c.list} value={c.value} prioritised={PRIORITISED.includes(c.q)}
          extra={c.q === "Returning customer" ? <AlsoReturning s={s} list={alsoReturning} /> : undefined} />)}
      </div>
      <EurEqNote />
    </Page>
  );
}

function Column({ s, q, list, value, prioritised, extra }: {
  s: MMState; q: Category; list: Enquiry[]; value: number; prioritised: boolean; extra?: ReactNode;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, LIMIT);
  return (
    <div style={{ minWidth: 0, borderRadius: "var(--card-r,18px)", padding: 8, display: "flex", flexDirection: "column", gap: 7,
      background: prioritised ? "var(--accent-faint)" : "var(--surface-faint)", border: "1px solid " + (prioritised ? "var(--accent-line)" : "var(--border)") }}>
      <div style={{ padding: "6px 6px 4px" }}>
        <Row gap={6} style={{ alignItems: "flex-start" }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{q}</span>
          <Badge tone={prioritised ? "accent" : "neutral"}>{num(list.length)}</Badge>
        </Row>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 5 }}>{moneyShort(value)} {EUR_EQ}</div>
      </div>
      {list.length === 0
        ? <div style={{ fontSize: 12, color: "var(--faint)", padding: "10px 6px 12px" }}>Nothing open here right now.</div>
        : shown.map((e) => <BoardCard key={e.id} s={s} e={e} />)}
      {list.length > LIMIT && <MoreButton onClick={() => setAll(!all)}>{all ? "Show fewer" : "Show all " + num(list.length)}</MoreButton>}
      {extra}
    </div>
  );
}

function BoardCard({ s, e }: { s: MMState; e: Enquiry }) {
  const c = customerOf(s, e.customerId);
  const why = whyChip(s, e);
  const open = () => openPanel("enquiry", e.id);
  return (
    <div role="button" tabIndex={0} onClick={open} onKeyDown={onKeyActivate(open)} className="mm-card-click"
      style={{ minWidth: 0, cursor: "pointer", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
        padding: "10px 11px", display: "flex", flexDirection: "column", gap: 5 }}>
      <Row gap={7} style={{ alignItems: "flex-start" }}>
        <PriorityDot p={e.priority} size={7} style={{ marginTop: 5 }} />
        <span title={c.name} style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3, ...CLAMP2 }}>{c.name}</span>
      </Row>
      <Row gap={6}>
        <CountryTag c={c.country} />
        <span title={linesText(s, e)} style={{ flex: 1, fontSize: 11.5, color: "var(--dim)", ...ELLIPSIS }}>{machineSummary(s, e)}</span>
      </Row>
      <Row gap={6}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}><Money v={enquiryValue(s, e)} cur={enquiryCurrency(s, e)} /></span>
        <span style={{ flex: 1 }} />
        <span title={e.stage} style={{ fontSize: 10.5, color: "var(--faint)", ...ELLIPSIS }}>{STAGE_SHORT[e.stage]}</span>
      </Row>
      <div style={{ display: "flex", minWidth: 0 }}>
        <Badge tone={why.tone} style={{ maxWidth: "100%" }}><span style={ELLIPSIS}>{why.text}</span></Badge>
      </div>
    </div>
  );
}

/* Existing customers whose enquiry the agent sorted under another category
   (a returning distributor counts as wholesale first). Listed in the
   Returning column so none of them get missed. */
function AlsoReturning({ s, list }: { s: MMState; list: Enquiry[] }) {
  if (!list.length) return null;
  return (
    <div style={{ padding: "8px 6px 4px", borderTop: "1px solid var(--border)", marginTop: 2 }}>
      <div style={{ fontSize: 11.5, color: "var(--dim)", marginBottom: 6 }}>Also from existing customers</div>
      {list.map((e) => {
        const c = customerOf(s, e.customerId);
        const open = () => openPanel("enquiry", e.id);
        return (
          <div key={e.id} role="button" tabIndex={0} onClick={open} onKeyDown={onKeyActivate(open)} className="mm-row"
            style={{ padding: "6px 6px", borderRadius: 10, cursor: "pointer", minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--ink)", ...ELLIPSIS }}>{c.name}</div>
            <div style={{ fontSize: 11, color: "var(--faint)", ...ELLIPSIS }}>Under {e.qualification.toLowerCase()}, {machineSummary(s, e)}</div>
          </div>
        );
      })}
    </div>
  );
}
