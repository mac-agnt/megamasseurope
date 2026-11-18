import { useState } from "react";
import type { MMState, Quote, QuoteStatus } from "../../types";
import { approveQuote, go, openPanel, setBuilderQuote, useMM } from "../../store";
import { customerOf, quoteTotal } from "../../select";
import { age, money, moneyShort, num, pct, plural, since } from "../../format";
import { Avatar, Button, Card, Cell, CountryTag, Grid, I, Icon, Kpi, MONO, Page, PageHead, Row, Status, Table, type Col } from "../../ui";
import { DAY, OPEN, RATE_NOTE, STATUS_INK, STATUS_ORDER, byStatus, eqOf, freightOf, hoursToReady, isPriced, machines, pinnedFor, sums } from "./lib";
import { Press, QuoteFlags } from "./bits";

/* Quotes overview: where every quote sits, what needs Niall, what is stuck on freight. */

const STATUS_HINT: Partial<Record<QuoteStatus, string>> = {
  Draft: "Being assembled. Carrier request drafted, not sent.",
  "Awaiting Freight": "Carrier asked for a rate. No freight price yet.",
  "Ready for Review": "Priced and waiting for your approval.",
  Approved: "Approve & Send moves a quote straight to Sent, so this stays at zero.",
  Sent: "With the customer, awaiting a decision.",
  Accepted: "Customer said yes. Order and FreshBooks invoice created.",
  Declined: "Customer said no. Reason kept on the enquiry.",
  Expired: "Validity ran out without a decision.",
};

function openInBuilder(id: string) {
  setBuilderQuote(id);
  go("Quotes", "builder");
}

export default function Overview() {
  const s = useMM();
  const [focus, setFocus] = useState<QuoteStatus | null>(null);
  const by = byStatus(s);
  const rfr = by["Ready for Review"];
  const sent = by.Sent;
  const open = OPEN.flatMap((k) => by[k]);
  const openSum = sums(s, open);
  const rfrSum = sums(s, rfr);
  const sentSum = sums(s, sent);
  const decided = by.Accepted.length + by.Declined.length + by.Expired.length;
  const rate = decided ? (by.Accepted.length / decided) * 100 : 0;
  const priced = s.quotes.filter((q) => isPriced(s, q));
  const avg = priced.length ? sums(s, priced).eq / priced.length : 0;
  const ttr = hoursToReady(s);

  /* Top of the review queue by value, always including the quotes pinned to Home. */
  const byValue = [...rfr].sort((a, b) => eqOf(s, b) - eqOf(s, a));
  const needs = byValue.filter((q, i) => i < 5 || pinnedFor(s, q.id) !== undefined);

  const blocked = by["Awaiting Freight"]
    .map((q) => ({ q, f: freightOf(s, q) }))
    .sort((a, b) => (a.f?.requestedAt ?? Infinity) - (b.f?.requestedAt ?? Infinity));
  const late = blocked.filter((x) => x.f?.requestedAt && Date.now() - x.f.requestedAt > 3 * DAY);

  const recent = (focus ? by[focus] : s.quotes).slice().sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <Page>
      <PageHead title="Quotes"
        sub={<>{plural(openSum.n, "open quote")}, {money(Math.round(openSum.eq))} {RATE_NOTE}. {s.controls.requireApproval.quotes
          ? "Every quotation waits for your approval before it goes to a customer."
          : "Approval before sending is switched off in Settings."}</>}
        right={<>
          <Button icon={I.quote} onClick={() => go("Quotes", "builder")}>Quote Builder</Button>
          <Button kind="primary" icon={I.check} onClick={() => go("Quotes", "approvals")}>Review approvals ({rfr.length})</Button>
        </>} />

      <Grid cols="repeat(auto-fit,minmax(196px,1fr))" gap={12}>
        <Kpi hero tone="accent" label="Awaiting your approval" value={num(rfr.length)}
          sub={<>{money(Math.round(rfrSum.eq))} EUR eq. {rfrSum.gbp > 0 && <>· incl. {money(rfrSum.gbp, "GBP")}</>}</>}
          onClick={() => go("Quotes", "approvals")} />
        <Kpi tone="info" label="Sent, awaiting decision" value={num(sent.length)}
          sub={<>{money(Math.round(sentSum.eq))} EUR eq.</>} onClick={() => go("Quotes", "sent")} />
        <Kpi tone="ok" label="Acceptance rate" value={decided ? pct(rate) : "None yet"}
          sub={<>{by.Accepted.length} accepted of {decided} decided (declined {by.Declined.length}, expired {by.Expired.length})</>} />
        <Kpi tone="neutral" label="Average quote value" value={money(Math.round(avg))}
          sub={<>Across {priced.length} priced quotes, EUR eq.</>} />
        <Kpi tone="neutral" label="Enquiry to quote ready" value={ttr.median === null ? "Not enough data" : Math.round(ttr.median) + " h"}
          sub={ttr.median === null ? undefined : <>Median over {ttr.n} quotes, about {(ttr.median / 24).toFixed(1)} days incl. carrier wait</>} />
      </Grid>

      <StatusBand s={s} by={by} focus={focus} onFocus={(k) => setFocus(focus === k ? null : k)} />

      <Grid cols="minmax(0,1.45fr) minmax(0,1fr)" gap={14}>
        <Card title="Needs you now" hint="Ready for review, highest value first. Approving sends the quotation (simulated)."
          right={<Button size="sm" kind="ghost" onClick={() => go("Quotes", "approvals")}>All {rfr.length} <Icon d={I.arrow} size={12} /></Button>}
          pad="18px 14px 10px">
          {needs.length === 0 && <div style={{ padding: "22px 6px", fontSize: 13, color: "var(--dim)" }}>Nothing waiting. Every priced quote has been approved.</div>}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {needs.map((q) => <NeedRow key={q.id} s={s} q={q} />)}
          </div>
        </Card>

        <Card title="Blocked on freight" hint={<>{plural(blocked.length, "quote")} can't go out until a carrier rate lands{late.length ? <>, {late.length} waiting over 3 days</> : null}.</>}
          right={<Button size="sm" kind="ghost" onClick={() => go("Freight", "awaiting")}>Freight <Icon d={I.arrow} size={12} /></Button>}
          pad="18px 14px 10px">
          {blocked.length === 0 && <div style={{ padding: "22px 6px", fontSize: 13, color: "var(--dim)" }}>No quote is waiting on a carrier.</div>}
          {blocked.slice(0, 6).map(({ q, f }) => {
            const c = customerOf(s, q.customerId);
            const carrier = f ? s.suppliers.find((x) => x.id === f.carrierId) : undefined;
            const waited = f?.requestedAt ? Date.now() - f.requestedAt : 0;
            const isLate = waited > 3 * DAY;
            return (
              <div key={q.id} className="mm-row" onClick={() => (f ? openPanel("freight", f.id) : openPanel("quote", q.id))}
                style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "10px 8px", borderRadius: 12, cursor: "pointer" }}>
                <Cell top={<Row gap={7}><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span><CountryTag c={c.country} /></Row>}
                  sub={<>{q.id} · {carrier?.name ?? "Carrier not set"}{f && f.chases > 0 ? " · chased " + f.chases + "×" : ""}</>} />
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...MONO, fontSize: 12.5, color: isLate ? "var(--bad)" : "var(--body)" }}>{f?.requestedAt ? age(f.requestedAt) : "not sent"}</div>
                  <div style={{ fontSize: 11, color: isLate ? "var(--bad)" : "var(--faint)", marginTop: 2 }}>{isLate ? "Over 3 days" : "waiting"}</div>
                </div>
              </div>
            );
          })}
          {blocked.length > 6 && <div style={{ padding: "6px 8px 4px", fontSize: 12, color: "var(--faint)" }}>{blocked.length - 6} more in Freight, Awaiting Rates.</div>}
        </Card>
      </Grid>

      <Card title={focus ? "Quotes: " + focus : "Recent quotes"}
        hint={focus ? STATUS_HINT[focus] : "Most recently updated first. Click a status above to filter."}
        right={focus ? <Button size="sm" kind="ghost" icon={I.x} onClick={() => setFocus(null)}>Clear filter</Button> : undefined}
        pad="18px 10px 12px">
        <Table<Quote> rows={recent} limit={10} rowKey={(q) => q.id} onRow={(q) => openPanel("quote", q.id)}
          empty={focus ? "No quotes are " + focus.toLowerCase() + " right now." : "No quotes yet."} cols={recentCols(s)} />
      </Card>
    </Page>
  );
}

function NeedRow({ s, q }: { s: MMState; q: Quote }) {
  const c = customerOf(s, q.customerId);
  const m = machines(s, q);
  return (
    <div className="mm-row" onClick={() => openPanel("quote", q.id)}
      style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 12, alignItems: "center", padding: "10px 8px", borderRadius: 12, cursor: "pointer" }}>
      <div style={{ minWidth: 0 }}>
        <Row gap={7} style={{ fontSize: 13.5, color: "var(--ink)" }}>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
          <CountryTag c={c.country} />
        </Row>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <span style={MONO}>{q.id}</span> · {m.top} · prepared {since(q.createdAt)}
        </div>
        <div style={{ marginTop: 6 }}><QuoteFlags s={s} q={q} empty={false} /></div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(quoteTotal(s, q), q.currency)}</div>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>ex VAT, {q.currency}</div>
      </div>
      <Row gap={6}>
        <Button size="sm" kind="ok" icon={I.check} onClick={() => approveQuote(q.id)} title="Approve and send (simulated)">Approve & send</Button>
        <Button size="sm" icon={I.edit} onClick={() => openInBuilder(q.id)} title="Open in the Quote Builder" />
      </Row>
    </div>
  );
}

function recentCols(s: MMState): Col<Quote>[] {
  return [
    { key: "id", label: "Quote", width: "78px", render: (q) => <span style={{ ...MONO, fontSize: 12.5, color: "var(--ink)" }}>{q.id}</span> },
    { key: "cust", label: "Customer", width: "minmax(0,1.5fr)", render: (q) => {
      const c = customerOf(s, q.customerId);
      return <Cell top={c.name} sub={c.city + ", " + c.country + " · " + c.type} />;
    } },
    { key: "m", label: "Machines", width: "minmax(0,1.3fr)", render: (q) => { const m = machines(s, q); return <Cell top={m.top} sub={m.sub} />; } },
    { key: "st", label: "Status", width: "136px", render: (q) => <Status s={q.status} /> },
    { key: "total", label: "Total ex VAT", width: "104px", align: "right", render: (q) => (
      <div style={{ textAlign: "right" }}>
        <div style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(quoteTotal(s, q), q.currency)}</div>
        {!isPriced(s, q) && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>freight pending</div>}
      </div>
    ) },
    { key: "upd", label: "Updated", width: "84px", align: "right", render: (q) => (
      <Row gap={7}><Avatar name={q.preparedBy} size={22} /><span style={{ ...MONO, fontSize: 11.5, color: "var(--dim)" }}>{age(q.updatedAt)}</span></Row>
    ) },
  ];
}

/* ── status band: one bar split by value, eight counters underneath ───────── */

function StatusBand({ s, by, focus, onFocus }: { s: MMState; by: Record<QuoteStatus, Quote[]>; focus: QuoteStatus | null; onFocus: (k: QuoteStatus) => void }) {
  const rows = STATUS_ORDER.map((k) => ({ k, ...sums(s, by[k]) }));
  const totalEq = rows.reduce((n, r) => n + r.eq, 0) || 1;
  const totalN = rows.reduce((n, r) => n + r.n, 0);
  return (
    <Card title="Quotes by status" hint={<>{plural(totalN, "quote")} in the system. Values ex VAT in {RATE_NOTE}; quotes themselves never mix currencies.</>} pad="18px 20px 16px">
      <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", gap: 2 }}>
        {rows.filter((r) => r.eq > 0).map((r) => (
          <button key={r.k} onClick={() => onFocus(r.k)} title={r.k + ": " + money(Math.round(r.eq)) + " EUR eq."}
            style={{ flex: r.eq / totalEq, minWidth: 4, border: 0, padding: 0, cursor: "pointer", background: STATUS_INK[r.k],
              opacity: focus && focus !== r.k ? 0.25 : 0.9, transition: "opacity .2s var(--ease)", transformOrigin: "left", animation: "sweep .7s var(--ease) both" }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(112px,1fr))", gap: 6, marginTop: 14 }}>
        {rows.map((r) => {
          const on = focus === r.k;
          return (
            <Press key={r.k} onClick={() => onFocus(r.k)}
              title={(STATUS_HINT[r.k] ?? "") + "\n" + money(r.eur) + " EUR" + (r.gbp > 0 ? " + " + money(r.gbp, "GBP") + " GBP" : "") + " = " + money(Math.round(r.eq)) + " EUR eq."}
              style={{ padding: "10px 11px", borderRadius: 12, border: "1px solid " + (on ? "var(--border-strong)" : "transparent"),
                background: on ? "var(--surface-2)" : undefined, opacity: focus && !on ? 0.6 : 1, transition: "opacity .2s var(--ease), background .16s var(--ease)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: STATUS_INK[r.k], flex: "none" }} />
                <span style={{ fontSize: 11.5, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.k}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.6px", color: "var(--ink)", marginTop: 6, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{r.n}</div>
              <div style={{ ...MONO, fontSize: 11, color: "var(--faint)", marginTop: 6, whiteSpace: "nowrap" }}>
                {moneyShort(r.eq)}
              </div>
            </Press>
          );
        })}
      </div>
    </Card>
  );
}
