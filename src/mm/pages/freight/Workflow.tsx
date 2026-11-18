import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { MMState } from "../../types";
import { freightBody } from "../../seed";
import { approveQuote, go, openPanel, sendFreightRequest, simulateCarrierReply } from "../../store";
import { freightToRequest, ix, quoteEquipment, quoteTotal } from "../../select";
import { dateShort, money, plural, since, stamp } from "../../format";
import {
  Avatar, Badge, Button, Card, CountryTag, Facts, I, Icon, Label, Mail, MONO, Note, ProductThumb, Row, Stages, Status, inputStyle, toneInk, type Tone,
} from "../../ui";
import {
  FLOW, filterRequests, flagsOf, flowStage, freightMails, isHeld, markupLocked, mk, viewOf, waitText, type FreightView,
} from "./lib";
import { Block, CalcRow, DemoButton, MarkupInput, ToConfirm } from "./bits";

/* The killer automation, shown on one request: enquiry, prepared carrier email,
   carrier reply, markup, customer quote and Niall's approval. Every figure is
   read from the record; nothing is priced before the carrier replies. */

const FEATURED = ["FR-1206", "FR-1211", "FR-1214"]; // Danube, Lyon, Northern Power Gym
let lastPick = FEATURED[0];
const pickListeners = new Set<(id: string) => void>();

/** Show a request in the workflow on the Requests tab (works from any Freight tab). */
export function showInWorkflow(id: string) {
  lastPick = id;
  pickListeners.forEach((l) => l(id));
  go("Freight", "requests");
}

const Pending = ({ text = "Pending" }: { text?: string }) => <span style={{ color: "var(--faint)", fontWeight: 400 }}>{text}</span>;

function chipState(v: FreightView): { tone: Tone; label: string } {
  if (v.f.status === "To request") return { tone: "accent", label: "Request needs approval" };
  if (!v.f.carrierQuote) return v.late ? { tone: "bad", label: "Carrier late" } : { tone: "warn", label: "Awaiting carrier" };
  if (v.q?.status === "Ready for Review") return { tone: "accent", label: "Quote needs approval" };
  if (v.q) return { tone: v.q.status === "Declined" || v.q.status === "Expired" ? "neutral" : "ok", label: "Quote " + v.q.status.toLowerCase() };
  return { tone: "neutral", label: v.f.status };
}

/** One sentence on where this request stands and what happens next. */
function lead(s: MMState, v: FreightView): { tone: Tone; text: string } {
  const carrier = v.carrier?.name ?? "the carrier";
  const q = v.q;
  if (v.f.status === "To request") {
    return { tone: "accent", text: "The Freight Agent drafted this request from " + (v.e?.id ?? "the enquiry")
      + ". Approve it and it goes to " + carrier + " by email. Nothing reaches the carrier before that." };
  }
  if (!v.f.carrierQuote || v.cost === null || v.charge === null) {
    if (v.late) return { tone: "bad", text: carrier + " has not replied in over three days; the " + v.c.city + " quote cannot go out until the rate arrives." };
    return { tone: "warn", text: "Waiting on " + carrier + " for " + waitText(v.waitMs).toLowerCase()
      + ". The quote stays on hold until a real rate arrives: Pulse never estimates freight." };
  }
  const cost = money(v.cost, v.cur), charge = money(v.charge, v.cur);
  if (!q) return { tone: "ok", text: carrier + " quoted " + cost + ". Customer freight charge " + charge + "." };
  const total = money(quoteTotal(s, q), q.currency);
  if (q.status === "Ready for Review") {
    return { tone: "accent", text: carrier + " quoted " + cost + ". With " + mk(v.f.markupPct) + " markup the customer pays " + charge
      + " for freight, bringing " + q.id + " to " + total + " ex VAT. "
      + (isHeld(s, q.id) ? "Niall put the approval on hold; approving it releases the quote." : "Waiting for Niall's approval.") };
  }
  if (q.status === "Draft" || q.status === "Awaiting Freight") return { tone: "accent", text: "Rate in: " + cost + " plus " + mk(v.f.markupPct) + " gives " + charge + ". " + q.id + " is being assembled." };
  if (q.status === "Sent" || q.status === "Approved") {
    return { tone: "ok", text: q.id + " approved and sent" + (q.sentAt ? " " + since(q.sentAt) : "") + " at " + total + " ex VAT."
      + (q.sentAt && q.sentAt > s.now ? " Simulated in this demo: nothing was sent." : "") };
  }
  if (q.status === "Accepted") return { tone: "ok", text: q.id + " accepted at " + total + (v.o ? ". Order " + v.o.id + " is on the dispatch board." : ".") };
  return { tone: "neutral", text: q.id + " " + q.status.toLowerCase() + "." };
}

function PickChip({ v, on, onClick }: { v: FreightView; on: boolean; onClick: () => void }) {
  const st = chipState(v);
  return (
    <button type="button" onClick={onClick} className="mm-btn"
      style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 44, padding: "0 14px 0 12px", borderRadius: 14, cursor: "pointer",
        textAlign: "left", fontFamily: "inherit", color: "var(--ink)", minWidth: 0, maxWidth: "100%",
        border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)"), background: on ? "var(--accent-faint)" : "var(--surface-2)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 3, background: toneInk(st.tone), flex: "none" }} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.c.name}</span>
        <span style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}><span style={MONO}>{v.f.id}</span> · {st.label}</span>
      </span>
    </button>
  );
}

/* ── stage 1 ──────────────────────────────────────────────────────────────── */

function EnquiryBlock({ s, v, stage, style }: { s: MMState; v: FreightView; stage: number; style?: CSSProperties }) {
  const e = v.e;
  const contact = e ? s.contacts.find((c) => c.id === e.contactId) : undefined;
  const first = e?.initialLines;
  const grew = !!e && !!first && (first.length !== e.lines.length || first.some((l, i) => l.productId !== e.lines[i]?.productId || l.qty !== e.lines[i]?.qty));
  const firstText = first ? first.map((l) => l.qty + " × " + (ix(s).product[l.productId]?.name ?? l.productId)).join(", ") : "";
  return (
    <Block title="New customer enquiry" steps={[1]} stage={stage} style={style}
      right={e ? <button type="button" onClick={() => openPanel("enquiry", e.id)}
        style={{ ...MONO, fontSize: 11, color: "var(--dim)", border: 0, background: "none", cursor: "pointer", padding: 0 }}>{e.id}</button> : undefined}>
      <Row gap={10}>
        <Avatar name={v.c.name} size={34} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Row gap={7}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.c.name}</span>
            <CountryTag c={v.c.country} />
          </Row>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{v.c.type} in {v.c.city}{contact ? " · " + contact.name : ""}</div>
        </div>
      </Row>
      {e && e.message && (
        <div style={{ borderRadius: 12, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--faint)" }}>{e.source}, {dateShort(e.receivedAt)}</div>
          <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.5, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical", overflow: "hidden" }}>{e.message}</div>
        </div>
      )}
      {e && (
        <Facts cols={2} rows={[
          ["Delivery postcode", e.postcode ?? <span style={{ color: "var(--warn)" }}>Missing, flagged</span>],
          ["Facility", e.facility],
          ["Qualification", e.qualification],
          ["Heard via", e.heardVia],
        ]} />
      )}
      {grew && <Note tone="info" icon={I.spark}>First asked for {firstText}. The request grew to {plural(v.units, "machine")}.</Note>}
      <div>
        <Label style={{ marginBottom: 9 }}>Machines, with catalogue data</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {v.machines.map((m, i) => {
            const tbc = m.p.dims === null || m.p.weightKg === null;
            const facts = [m.p.weightKg !== null ? m.p.weightKg + " kg" : "Weight TBC", m.p.dims ?? "size TBC"].join(" · ");
            return (
              <Row key={m.p.id + "-" + i} gap={10}>
                <ProductThumb p={m.p} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.qty} × {m.p.name}</div>
                  <div style={{ fontSize: 11.5, color: tbc ? "var(--warn)" : "var(--faint)", marginTop: 1 }}>{facts}</div>
                </div>
              </Row>
            );
          })}
        </div>
      </div>
    </Block>
  );
}

/* ── stages 2 and 3 ───────────────────────────────────────────────────────── */

function RequestBlock({ s, v, stage, style }: { s: MMState; v: FreightView; stage: number; style?: CSSProperties }) {
  const mails = freightMails(s, v.f.id);
  const draft = v.f.status === "To request";
  const flags = flagsOf(v);
  const lastChase = mails.chases[mails.chases.length - 1];
  return (
    <Block title="Carrier request" steps={[2, 3]} stage={stage} style={style}
      right={draft ? <Badge tone="accent">Needs approval</Badge> : <Badge tone="ok" dot>Sent {v.f.requestedAt ? dateShort(v.f.requestedAt) : ""}</Badge>}>
      <Facts cols={3} rows={[
        ["Collection", v.f.collection],
        ["Delivery", v.f.destination],
        ["Service", v.f.service],
        ["Carrier", <Row gap={6} wrap>{v.carrier?.name ?? "Carrier"}<ToConfirm sup={v.carrier} /></Row>],
        ["Load", plural(v.units, "machine")],
        ["Approval", draft ? "Waiting for Niall" : "Approved by Niall"],
      ]} />
      <Mail kind={draft ? "draft" : "out"} from="Niall <sales@megamasseurope.com>" to={v.carrier?.name}
        at={draft ? "Prepared by the Freight Agent" : stamp(mails.request?.at ?? v.f.requestedAt ?? s.now)}
        subject={mails.request?.subject ?? "Freight quotation request, equipment to " + v.c.city}
        body={mails.request?.body ?? freightBody(v.f)} />
      {flags.length > 0 && (
        <Note tone="warn">Flagged, not guessed: {flags.join("; ")}.{v.f.missing.length ? " The email marks these as still to confirm." : ""}</Note>
      )}
      {lastChase && (
        <Row gap={8} style={{ fontSize: 12, color: "var(--dim)" }}>
          <Icon d={I.refresh} size={14} />Chased {plural(mails.chases.length, "time")}, last {stamp(lastChase.at)}. Simulated in this demo.
        </Row>
      )}
      {draft && (
        <Row gap={10} wrap>
          <Button kind="primary" icon={I.send} onClick={() => sendFreightRequest(v.f.id)}>Approve and send request</Button>
          <span style={{ fontSize: 12, color: "var(--faint)" }}>Emails {v.carrier?.name ?? "the carrier"}. Simulated in this demo: nothing is sent.</span>
        </Row>
      )}
    </Block>
  );
}

/* ── stage 4 ──────────────────────────────────────────────────────────────── */

function ReplyBlock({ v, stage, style }: { v: FreightView; stage: number; style?: CSSProperties }) {
  const cq = v.f.carrierQuote;
  const carrier = v.carrier?.name ?? "the carrier";
  if (cq) {
    return (
      <Block title="Carrier reply received" steps={[4]} stage={stage} style={style} right={<Badge tone="ok" dot>{since(cq.receivedAt)}</Badge>}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-.9px", lineHeight: 1, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(cq.cost, cq.currency)}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6 }}>Carrier cost ex VAT, quoted by {carrier}</div>
        </div>
        <Facts cols={2} rows={[
          ["Currency", cq.currency],
          ["Reference", <span style={MONO}>{cq.ref}</span>],
          ["Estimated delivery", cq.eta],
          ["Valid until", dateShort(Date.parse(cq.validUntil))],
          ["Exclusions", cq.exclusions],
          ["Replied after", waitText(v.waitMs)],
        ]} />
        <Row gap={8} style={{ marginTop: "auto" }}>
          <Avatar name="Freight Agent" size={22} />
          <span style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.4 }}>Extracted from the carrier email, {stamp(cq.receivedAt)}.</span>
        </Row>
      </Block>
    );
  }
  if (v.f.status === "To request") {
    return (
      <Block title="Carrier reply" steps={[4]} stage={stage} style={style}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Not requested yet</div>
        <Facts cols={2} rows={[["Carrier cost", <Pending />], ["Reference", <Pending />], ["Estimated delivery", <Pending />], ["Valid until", <Pending />]]} />
        <Note>{carrier} is only emailed after Niall approves the request. No freight figure exists until it replies.</Note>
      </Block>
    );
  }
  return (
    <Block title="Carrier reply" steps={[4]} stage={stage} style={style}
      right={<Badge tone={v.late ? "bad" : "warn"} dot>{v.late ? "Late" : "Waiting"}</Badge>}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.5px", color: "var(--ink)" }}>No reply yet</div>
        <div style={{ fontSize: 12.5, color: v.late ? "var(--bad)" : "var(--dim)", marginTop: 5 }}>
          {waitText(v.waitMs)} waiting{v.f.requestedAt ? " since " + dateShort(v.f.requestedAt) : ""} · {plural(v.f.chases, "chase")}
        </div>
      </div>
      <Facts cols={2} rows={[["Carrier cost", <Pending />], ["Reference", <Pending />], ["Estimated delivery", <Pending />], ["Exclusions", <Pending />]]} />
      <Note>No freight cost is entered until {carrier} replies. Nothing is estimated.</Note>
      <Row gap={8} wrap style={{ marginTop: "auto" }}>
        <Button kind={v.late ? "primary" : "secondary"} size="sm" icon={I.send} onClick={() => sendFreightRequest(v.f.id)}>Chase carrier</Button>
        <DemoButton onClick={() => simulateCarrierReply(v.f.id)}>Simulate carrier reply</DemoButton>
      </Row>
    </Block>
  );
}

/* ── stage 5 ──────────────────────────────────────────────────────────────── */

function MarkupBlock({ s, v, stage, style }: { s: MMState; v: FreightView; stage: number; style?: CSSProperties }) {
  const locked = markupLocked(v);
  const def = s.controls.defaultMarkup;
  const isDefault = v.f.markupPct === def;
  return (
    <Block title="Markup applied" steps={[5]} stage={stage} style={style}
      right={v.f.carrierQuote ? <Badge tone="ok">Applied</Badge> : <Badge tone="neutral">Planned</Badge>}>
      <div>
        <CalcRow label="Carrier cost" value={v.cost !== null ? money(v.cost, v.cur) : <Pending />} sub={v.f.carrierQuote ? "Ref " + v.f.carrierQuote.ref : "Waiting on the carrier"} />
        <CalcRow label="Markup" value={<MarkupInput v={v} compact />} sub={mk(v.f.markupPct) + (isDefault ? ", the default" : ", set on this request")} />
        <CalcRow label="Markup amount" value={v.markupAmt !== null ? money(v.markupAmt, v.cur) : <Pending />}
          sub={v.cost !== null ? mk(v.f.markupPct) + " of " + money(v.cost, v.cur) : undefined} />
        <CalcRow strong label="Customer freight charge" value={v.charge !== null ? money(v.charge, v.cur) : <Pending />} />
      </div>
      <Note icon={locked ? I.lock : I.alert} style={{ marginTop: "auto" }}>
        {isDefault ? mk(def) + " is illustrative, not a confirmed Mega Mass rule."
          : mk(v.f.markupPct) + " is set on this request. The " + mk(def) + " default is illustrative, not a confirmed Mega Mass rule."}
        {" "}{locked ? "Locked: " + locked.toLowerCase() + "." : "Markup changes need Niall's approval before the quote is sent."}
      </Note>
    </Block>
  );
}

/* ── stages 6 and 7 ───────────────────────────────────────────────────────── */

function QuoteBlock({ s, v, stage, style }: { s: MMState; v: FreightView; stage: number; style?: CSSProperties }) {
  const q = v.q;
  if (!q) {
    return (
      <Block title="Quote and approval" steps={[6, 7]} stage={stage} style={style}>
        <Note>No customer quote is linked to this request.</Note>
      </Block>
    );
  }
  const x = ix(s);
  const total = v.charge !== null ? quoteTotal(s, q) : null;
  const units = q.lines.reduce((n, l) => n + l.qty, 0);
  const contact = s.contacts.find((c) => c.id === v.c.contactId);
  const sessionSend = q.sentAt !== undefined && q.sentAt > s.now;
  let approval: ReactNode;
  if (q.status === "Ready for Review") {
    approval = (
      <>
        <Row gap={8}>
          <Avatar name="Niall" size={24} />
          <span style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 500 }}>{isHeld(s, q.id) ? "On hold by Niall" : "Waiting for Niall's approval"}</span>
        </Row>
        <Row gap={8} wrap>
          <Button kind="primary" icon={I.check} onClick={() => approveQuote(q.id)}>Approve & send quote</Button>
          <Button kind="secondary" icon={I.quote} onClick={() => openPanel("quote", q.id)}>Open quote</Button>
        </Row>
        <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Emails the quote to {contact ? contact.name : v.c.name}. Simulated in this demo: nothing is sent.</div>
      </>
    );
  } else if (q.status === "Sent" || q.status === "Approved" || q.status === "Accepted") {
    approval = (
      <>
        <Row gap={8} wrap>
          <Badge tone="ok" dot>{q.status === "Accepted" ? "Accepted by the customer" : "Approved and sent"}{q.sentAt ? " " + stamp(q.sentAt) : ""}</Badge>
        </Row>
        {sessionSend && <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Simulated in this demo: nothing was sent.</div>}
        <Row gap={8} wrap>
          <Button kind="secondary" size="sm" icon={I.quote} onClick={() => openPanel("quote", q.id)}>Open quote</Button>
          {v.o && <Button kind="ghost" size="sm" icon={I.order} onClick={() => openPanel("order", v.o!.id)}>Order {v.o.id}</Button>}
        </Row>
      </>
    );
  } else {
    approval = (
      <>
        <Badge tone={v.f.carrierQuote ? "neutral" : "warn"} dot>
          {v.f.status === "To request" ? "Carrier request needs approval first" : !v.f.carrierQuote ? "On hold until the carrier rate arrives" : "Quote " + q.status.toLowerCase()}
        </Badge>
        <Row gap={8}><Button kind="secondary" size="sm" icon={I.quote} onClick={() => openPanel("quote", q.id)}>Open quote</Button></Row>
      </>
    );
  }
  return (
    <Block title="Quote and approval" steps={[6, 7]} stage={stage} style={style} right={<Status s={q.status} />}>
      <Row gap={8}>
        <span style={{ ...MONO, fontSize: 12, color: "var(--ink)" }}>{q.id}</span>
        <span style={{ fontSize: 12, color: "var(--faint)" }}>Prepared by {q.preparedBy} · {q.currency}</span>
      </Row>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {q.lines.map((l, i) => (
          <Row key={i} gap={8} style={{ fontSize: 12.5 }}>
            <span style={{ flex: 1, minWidth: 0, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {l.qty} × {x.product[l.productId]?.name ?? l.productId}
            </span>
            {l.unitPrice !== l.listPrice && <Badge tone="warn" style={{ height: 18, fontSize: 10.5 }}>Override</Badge>}
            <span style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(l.unitPrice * l.qty, q.currency)}</span>
          </Row>
        ))}
      </div>
      <div>
        <CalcRow label="Equipment" value={money(quoteEquipment(q), q.currency)} sub={plural(units, "machine")} />
        <CalcRow label="Freight" value={v.charge !== null ? money(v.charge, q.currency) : <Pending />}
          sub={v.cost !== null ? (v.carrier?.name ?? "Carrier") + ": " + money(v.cost, v.cur) + " plus " + mk(v.f.markupPct) : "Added when the carrier replies"} />
        <CalcRow strong label="Quote total ex VAT" value={total !== null ? money(total, q.currency) : <Pending text="Not final" />}
          sub={total !== null ? "VAT treatment pending confirmation" : "No total until freight is priced"} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: "auto" }}>{approval}</div>
    </Block>
  );
}

/* ── the card ─────────────────────────────────────────────────────────────── */

export function Workflow({ s }: { s: MMState }) {
  const x = ix(s);
  const [pick, setPick] = useState<string>(() => (x.freight[lastPick] ? lastPick : FEATURED[0]));
  useEffect(() => {
    const l = (id: string) => setPick(id);
    pickListeners.add(l);
    return () => { pickListeners.delete(l); };
  }, []);
  const choose = (id: string) => { lastPick = id; setPick(id); };

  const f = x.freight[pick] ?? x.freight[FEATURED[0]] ?? s.freight[0];
  if (!f) return null;
  const v = viewOf(s, f);
  const stage = flowStage(v);
  const ld = lead(s, v);

  const ids = FEATURED.filter((id) => x.freight[id]);
  const toReq = freightToRequest(s)[0];
  if (toReq && !ids.includes(toReq.id)) ids.push(toReq.id);
  if (!ids.includes(f.id)) ids.push(f.id);
  const others = filterRequests(s.freight.map((r) => viewOf(s, r)), "open").filter((o) => !ids.includes(o.f.id));

  return (
    <Card pad="20px 22px 22px" title="Freight workflow"
      hint="One freight price, start to finish. Each step is on the record, and nothing reaches a carrier or customer without approval."
      right={<Button kind="secondary" size="sm" icon={I.eye} onClick={() => openPanel("freight", f.id)}>Open {f.id}</Button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {ids.map((id) => <PickChip key={id} v={viewOf(s, x.freight[id])} on={id === f.id} onClick={() => choose(id)} />)}
          {others.length > 0 && (
            <select aria-label="Show another open request" value="" onChange={(e) => { if (e.target.value) choose(e.target.value); }}
              style={{ ...inputStyle, height: 44, borderRadius: 14, maxWidth: 280, cursor: "pointer", color: "var(--dim)" }}>
              <option value="">More open requests ({others.length})</option>
              {others.map((o) => <option key={o.f.id} value={o.f.id}>{o.f.id} · {o.c.name} · {o.f.status}</option>)}
            </select>
          )}
        </div>

        <div style={{ padding: "4px 0 0" }}><Stages steps={FLOW} current={stage} /></div>

        <Note tone={ld.tone} icon={ld.tone === "ok" ? I.check : ld.tone === "bad" ? I.alert : I.spark}>
          <span style={{ color: "var(--ink)" }}>{ld.text}</span>
        </Note>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "stretch" }}>
          <EnquiryBlock s={s} v={v} stage={stage} style={{ flex: "1 1 300px" }} />
          <RequestBlock s={s} v={v} stage={stage} style={{ flex: "1.9 1 460px" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "stretch" }}>
          <ReplyBlock v={v} stage={stage} style={{ flex: "1 1 270px" }} />
          <MarkupBlock s={s} v={v} stage={stage} style={{ flex: "1 1 270px" }} />
          <QuoteBlock s={s} v={v} stage={stage} style={{ flex: "1.15 1 300px" }} />
        </div>
      </div>
    </Card>
  );
}
