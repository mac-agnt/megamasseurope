import { useEffect, useState } from "react";
import type { Currency, FreightRequest, MMState } from "../types";
import { sendFreightRequest, setMarkup, simulateCarrierReply } from "../store";
import { carrierStats, freightCharge, ix, markupAmount } from "../select";
import { Badge, Button, Facts, I, Icon, MONO, Note, ProductThumb, Who, inputStyle } from "../ui";
import { dateShort, money, num, plural, since, stamp, until } from "../format";
import {
  ActivityList, ApprovalBox, Box, DAY, Line2, MAIL_ANCHOR, MailThread, Missing, Muted, OpenTasks, PanelBody, RecLink, RecordRow, SIM_NOTE, Section, StatBand,
  activityFor, emailsFor, isOpenApproval, useNav,
} from "./kit";

/* Freight request: what goes where, what the carrier still needs,
   what the carrier quoted, and the markup that sets the customer charge. */

const MINUS = "M5 12h14";

function MarkupEditor({ f, currency, locked, defaultPct, needsApproval }: {
  f: FreightRequest; currency: Currency; locked: string | null; defaultPct: number; needsApproval: boolean;
}) {
  const id = f.id, pct = f.markupPct;
  const [txt, setTxt] = useState(String(pct));
  useEffect(() => { setTxt(String(pct)); }, [pct]);
  const type = (v: string) => {
    setTxt(v);
    const n = parseFloat(v);
    if (Number.isFinite(n)) setMarkup(id, n);
  };
  const cost = f.carrierQuote ? f.carrierQuote.cost : null;
  const charge = freightCharge(f);
  const off = !!locked;
  return (
    <Box pad="16px 18px">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "16px 26px", alignItems: "center" }}>
        <div>
          <div style={{ ...MONO, fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 9 }}>Markup on carrier cost</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Button size="sm" icon={MINUS} disabled={off} title="One point lower" onClick={() => setMarkup(id, pct - 1)} />
            <div style={{ position: "relative" }}>
              <input className="ixi" type="number" min={0} max={60} step={1} value={txt} disabled={off} aria-label="Markup percent"
                onChange={(e) => type(e.target.value)} onBlur={() => setTxt(String(pct))}
                style={{ ...inputStyle, width: 86, textAlign: "right", paddingRight: 26, fontVariantNumeric: "tabular-nums", opacity: off ? 0.55 : 1 }} />
              <span style={{ position: "absolute", right: 11, top: 9, fontSize: 13, color: "var(--faint)", pointerEvents: "none" }}>%</span>
            </div>
            <Button size="sm" icon={I.plus} disabled={off} title="One point higher" onClick={() => setMarkup(id, pct + 1)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {[10, 15, 20].map((v) => (
              <button key={v} className={off ? undefined : "ixf"} disabled={off} onClick={() => setMarkup(id, v)}
                style={{ height: 24, padding: "0 10px", borderRadius: 999, border: "1px solid " + (pct === v ? "var(--accent-line)" : "var(--border)"),
                  background: pct === v ? "var(--accent-soft)" : "var(--surface-2)", color: pct === v ? "var(--ink)" : "var(--dim)", fontSize: 11.5,
                  fontFamily: "inherit", cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.55 : 1 }}>{v}%</button>
            ))}
            <span style={{ fontSize: 11.5, color: "var(--faint)", marginLeft: 4 }}>Default {defaultPct}%</span>
          </div>
        </div>
        <div>
          <Line2 label="Carrier cost" value={cost === null ? "Pending" : money(cost, currency)} />
          <Line2 label={"Markup " + pct + "%"} value={charge === null || cost === null ? "Pending" : money(markupAmount(f), currency)} />
          <Line2 strong top label="Customer charge" value={charge === null ? "Pending" : money(charge, currency)} tone={charge === null ? "warn" : undefined} />
        </div>
      </div>
      {locked
        ? <Note style={{ marginTop: 14 }} icon={I.lock}>{locked}</Note>
        : needsApproval && <Muted style={{ marginTop: 12, fontSize: 12 }}>Markup changes need your approval before the customer sees a price.</Muted>}
    </Box>
  );
}

export default function FreightPanel({ s, id }: { s: MMState; id: string }) {
  const nav = useNav();
  const x = ix(s);
  const f = x.freight[id];
  if (!f) return <Missing />;
  const c = x.customer[f.customerId];
  const carrier = s.suppliers.find((su) => su.id === f.carrierId);
  const carrierName = carrier?.name ?? "the carrier";
  const q = f.quoteId ? x.quote[f.quoteId] : undefined;
  const order = f.orderId ? x.order[f.orderId] : s.orders.find((o) => o.freightId === f.id);
  const cq = f.carrierQuote;
  const charge = freightCharge(f);
  const waited = f.requestedAt !== null ? Date.now() - f.requestedAt : 0;
  const late = f.status === "Awaiting rate" && f.requestedAt !== null && waited > 3 * DAY;
  const stats = carrierStats(s, f.carrierId);
  const approval = s.approvals.find((a) => a.recordId === f.id && isOpenApproval(a.status));
  const rows = f.lines.map((l) => ({ l, p: x.product[l.productId] }));
  const knownKg = rows.reduce((n, r) => n + (r.p?.weightKg ? r.p.weightKg * r.l.qty : 0), 0);
  const tbcUnits = rows.filter((r) => !r.p?.weightKg).reduce((n, r) => n + r.l.qty, 0);

  const locked = order ? "Charge agreed on order " + order.id + " at " + money(order.freightCharge, order.currency) + ". The markup no longer changes it."
    : typeof f.charge === "number" ? "Customer charge fixed at " + money(f.charge, c.currency) + "."
    : q && (q.status === "Sent" || q.status === "Accepted" || q.status === "Declined" || q.status === "Expired") ? "Quote " + q.id + " already went to the customer at this charge."
    : f.status === "Booked" || f.status === "Dispatched" || f.status === "Delivered" ? "This freight is " + f.status.toLowerCase() + "." : null;

  const canSend = f.status === "To request";
  const canChase = f.status === "Awaiting rate";
  const canSimulate = f.status === "Awaiting rate" && !cq;
  const actions = canSend || canChase ? (
    <>
      {canSend && <Button kind="primary" icon={I.send} onClick={() => sendFreightRequest(f.id)}>Approve and send request</Button>}
      {canChase && <Button kind={late ? "primary" : "secondary"} icon={I.refresh} onClick={() => sendFreightRequest(f.id)}>Chase {carrierName}</Button>}
      {canSimulate && (
        <>
          <Button kind="ghost" icon={I.mail} onClick={() => simulateCarrierReply(f.id)}>Simulate carrier reply</Button>
          <Badge tone="info">Demo control</Badge>
        </>
      )}
    </>
  ) : undefined;
  const foot = SIM_NOTE + (canSimulate ? " The demo control pretends the carrier's reply has just landed in Gmail." : "");

  return (
    <PanelBody actions={actions} foot={actions ? foot : undefined}>
      <StatBand items={[
        { label: "Carrier cost", value: cq ? money(cq.cost, cq.currency) : "Pending", sub: cq ? "Ref " + cq.ref : "Never estimated", tone: cq ? undefined : "warn" },
        { label: "Markup", value: f.markupPct + "%", sub: cq ? money(markupAmount(f), c.currency) + " margin" : "Default " + s.controls.defaultMarkup + "%" },
        { label: "Customer charge", value: charge === null ? "Pending" : money(charge, c.currency), sub: charge === null ? "After the carrier replies" : "Ex VAT" },
        { label: "Requested", value: f.requestedAt !== null ? since(f.requestedAt) : "Not sent", tone: late ? "warn" : undefined,
          sub: f.chases ? plural(f.chases, "chase") + " sent" : f.requestedAt !== null ? dateShort(f.requestedAt) : "Waiting for your approval" },
      ]} />

      {approval && <ApprovalBox a={approval} />}

      <Section title="Carrier">
        <Box>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 36, height: 36, flex: "none", borderRadius: 11, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--dim)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Icon d={I.truck} size={17} />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {carrier ? <RecLink kind="supplier" id={carrier.id}>{carrier.name}</RecLink> : <span>Carrier not set</span>}
                {carrier && !carrier.confirmed && <Badge tone="warn">To confirm</Badge>}
              </div>
              {carrier && <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 3 }}>{carrier.lanes} · {carrier.workflow}, no live integration</div>}
            </div>
          </div>
          {carrier && <Muted style={{ marginTop: 12, fontSize: 12 }}>{carrier.note}</Muted>}
        </Box>
      </Section>

      <Section title="Shipment details">
        <Box>
          <Facts rows={[
            ["Collection", f.collection],
            ["Destination", f.destination],
            ["Service", f.service],
            ["Customer", <RecLink kind="customer" id={c.id}>{c.name}</RecLink>],
            ["Requested", f.requestedAt !== null ? stamp(f.requestedAt) : "Not sent yet"],
            ["Chases", num(f.chases)],
            ["For", order ? <RecLink kind="order" id={order.id}>Order {order.id}</RecLink> : q ? <RecLink kind="quote" id={q.id}>Quote {q.id}</RecLink> : "Not linked"],
            ["Typical reply", stats.replied ? Math.round(stats.avgHours) + " h from " + carrierName : "No replies on record"],
          ]} />
        </Box>
      </Section>

      <Section title={"Machines · " + plural(f.lines.reduce((n, l) => n + l.qty, 0), "unit")}>
        <Box pad="5px 5px 8px">
          {rows.map(({ l, p }, i) => p && (
            <RecordRow key={i} onClick={() => nav.open("product", p.id)} lead={<ProductThumb p={p} size={38} />}
              title={l.qty + " × " + p.name}
              sub={(p.weightKg ? p.weightKg + " kg each" : "Weight TBC") + " · " + (p.dims ?? "Dimensions TBC in catalogue")}
              right={!p.weightKg || !p.dims ? <Badge tone="warn">TBC</Badge> : undefined} />
          ))}
          <div style={{ padding: "2px 10px 0" }}>
            <Line2 top label="Known weight" value={num(knownKg) + " kg" + (tbcUnits ? ", plus " + plural(tbcUnits, "machine") + " TBC" : "")} />
          </div>
        </Box>
      </Section>

      <Section title="Missing info">
        {f.missing.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {f.missing.map((m) => <Note key={m} tone="warn">{m}</Note>)}
            <Muted style={{ fontSize: 12 }}>Pulse flags gaps for the carrier instead of guessing weights, dimensions or postcodes.</Muted>
          </div>
        ) : <Note tone="ok" icon={I.check}>Nothing missing for the carrier.</Note>}
      </Section>

      <Section title="Carrier quote">
        {cq ? (
          <Box tone="ok" pad="16px 18px">
            <Who name="Freight Agent" sub={"Read from the carrier email " + since(cq.receivedAt)} />
            <div style={{ marginTop: 14 }}>
              <Facts rows={[
                ["Cost", money(cq.cost, cq.currency) + " ex VAT"],
                ["Reference", cq.ref],
                ["Transit", cq.eta],
                ["Valid until", dateShort(Date.parse(cq.validUntil)) + ", " + until(Date.parse(cq.validUntil))],
                ["Exclusions", cq.exclusions],
                ["Received", stamp(cq.receivedAt)],
              ]} />
            </div>
          </Box>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Box>
              <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>No carrier rate yet</div>
              <Muted style={{ marginTop: 5 }}>
                {canSend ? "The request is drafted and waits for your approval before it goes to " + carrierName + "."
                  : "Requested " + (f.requestedAt !== null ? since(f.requestedAt) : "") + ". Pulse never puts a freight figure on a quote before the carrier replies."}
              </Muted>
            </Box>
            {late && !approval && <Note tone="warn" icon={I.clock}>{carrierName} has not replied in over three days. Chase from the bar below.</Note>}
          </div>
        )}
      </Section>

      <Section title="Markup">
        <MarkupEditor f={f} currency={c.currency} locked={locked}
          defaultPct={s.controls.defaultMarkup} needsApproval={!!s.controls.requireApproval.markups} />
      </Section>

      <Section title="Correspondence" id={MAIL_ANCHOR}>
        <MailThread emails={emailsFor(s, "freight", f.id)} empty="No emails yet. The request goes out once you approve it." />
      </Section>

      <Section title="Activity">
        <ActivityList events={activityFor(s, [f.id])} />
      </Section>

      <OpenTasks s={s} kind="freight" id={f.id} />
    </PanelBody>
  );
}
