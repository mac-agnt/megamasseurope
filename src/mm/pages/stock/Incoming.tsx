import { useState } from "react";
import { go, openPanel, useMM } from "../../store";
import { customerOf, invoiceStatus, ix, productOf, quoteTotal, stockOf } from "../../select";
import { money, plural, stamp, until } from "../../format";
import {
  Avatar, Badge, Button, Card, CountryTag, Empty, Grid, I, Label, MONO, Note, Page, PageHead, ProductThumb, Row, Seg, Status, Table, Timeline, type Col,
} from "../../ui";
import type { IncomingShipment, MMState } from "../../types";
import { Fig, Key, lineLabel, UnitBlocks, unitsHeld } from "../orders/shared";
import { CLAIM_GROUP, claimGroup, heldOnShipment, intakeClaims, type Claim, type ClaimGroup } from "./shared";

export default function Incoming() {
  const s = useMM();
  return (
    <Page>
      <PageHead title="Incoming stock"
        sub="Machines on their way to County Derry, who is already holding them, and which open quotes would like the rest."
        right={<Button icon={I.calendar} onClick={() => go("Stock", "reservations")}>Reservations</Button>} />
      {s.shipments.length === 0 && <Card><Empty title="Nothing incoming" sub="New shipments appear here once Mega Mass (US) sends an arrival notice." /></Card>}
      {s.shipments.map((sh) => <Shipment key={sh.id} s={s} sh={sh} />)}
    </Page>
  );
}

function Shipment({ s, sh }: { s: MMState; sh: IncomingShipment }) {
  const expected = sh.lines.reduce((n, l) => n + l.units, 0);
  const held = heldOnShipment(s, sh);
  const free = expected - held;
  const claims = intakeClaims(s, sh);
  const wanted = claims.reduce((n, c) => n + c.units, 0);
  const supplier = s.suppliers.find((x) => x.kind === "Manufacturer");
  const tasks = s.tasks.filter((t) => t.recordKind === "shipment" && t.recordId === sh.id);
  const events = s.activity.filter((a) => a.recordKind === "shipment" && a.recordId === sh.id).slice(0, 4);
  const short = sh.name.split(",")[0];

  return (
    <>
      <Grid cols="minmax(0,1.55fr) minmax(0,1fr)" gap={14} style={{ alignItems: "stretch" }}>
        <Card tone={sh.confirmed ? undefined : "warn"} pad="20px 22px">
          <Row gap={10} wrap>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.3px", color: "var(--ink)" }}>{sh.name}</span>
            <span style={{ ...MONO, fontSize: 11, color: "var(--faint)" }}>{sh.id}</span>
            <span style={{ flex: 1 }} />
            <Badge tone={sh.confirmed ? "ok" : "warn"} dot>{sh.confirmed ? "Arrival confirmed" : "Arrival not confirmed"}</Badge>
          </Row>
          <Grid cols="minmax(0,.8fr) minmax(0,.8fr) minmax(0,.8fr) minmax(0,1.4fr)" gap={12} style={{ marginTop: 18 }}>
            <Fig label="Expected" size={24} value={expected} sub={plural(sh.lines.length, "model")} />
            <Fig label="Allocated" size={24} value={held} tone="accent" sub="Held for customers" />
            <Fig label="Unallocated" size={24} value={free} tone={free > 0 ? "ok" : undefined} sub="Free to commit" />
            <Fig label="Arrival" size={24} value={sh.eta} sub={sh.confirmed ? "Confirmed" : "Not confirmed by " + (supplier?.name ?? "the supplier")} />
          </Grid>
          <div style={{ marginTop: 18 }}>
            <UnitBlocks size={20} parts={[{ n: held, tone: "accent", title: "Held for a customer" }, { n: Math.max(0, free), tone: "free", title: "Free" }]} />
            <Row gap={14} wrap style={{ marginTop: 9 }}>
              <Key tone="accent">Held for customers {held}</Key>
              <Key tone="free">Free {Math.max(0, free)}</Key>
              {wanted > 0 && <span style={{ fontSize: 11.5, color: "var(--warn)" }}>Wanted by {plural(claims.length, "open quote")}, {plural(wanted, "unit")}</span>}
            </Row>
          </div>
          <Note tone="warn" icon={I.clock} style={{ marginTop: 16 }}>
            {sh.note} Do not promise delivery dates to customers before arrival is confirmed.
          </Note>
          <Row gap={8} wrap style={{ marginTop: 14 }}>
            <Button icon={I.eye} onClick={() => openPanel("shipment", sh.id)}>Open shipment</Button>
            <Button kind="ghost" icon={I.calendar} onClick={() => go("Stock", "reservations")}>Who holds what</Button>
          </Row>
        </Card>

        <Card title="Before anyone promises a date"
          hint={supplier ? supplier.name + ": " + supplier.workflow.toLowerCase() + (supplier.confirmed ? "" : ". Supplier record to confirm") : undefined}>
          {tasks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tasks.map((t) => (
                <Row key={t.id} gap={10} style={{ alignItems: "flex-start" }}>
                  <Avatar name={t.owner} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>{t.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{t.owner}, due {until(t.due)}</div>
                  </div>
                  <Status s={t.status} />
                </Row>
              ))}
            </div>
          )}
          {events.length > 0 && (
            <div style={{ marginTop: tasks.length ? 18 : 0 }}>
              <Label style={{ marginBottom: 10 }}>On this shipment</Label>
              <Timeline items={events.map((e) => ({ at: stamp(e.at), title: e.title, detail: e.detail, who: e.actor }))} />
            </div>
          )}
          {tasks.length === 0 && events.length === 0 && <Empty title="Nothing logged yet" />}
        </Card>
      </Grid>

      <Grid cols="repeat(auto-fit,minmax(300px,1fr))" gap={14}>
        {sh.lines.map((l) => <SkuCard key={l.productId} s={s} sh={sh} productId={l.productId} units={l.units} claims={claims} />)}
      </Grid>

      <ClaimsTable s={s} sh={sh} short={short} free={free} claims={claims} />
    </>
  );
}

/* ── one card per machine on the shipment ────────────────────────────────── */

const ASKS_SHOWN = 3;

function SkuCard({ s, sh, productId, units, claims }: { s: MMState; sh: IncomingShipment; productId: string; units: number; claims: Claim[] }) {
  const p = productOf(s, productId);
  const rs = s.reservations.filter((r) => r.source === "Incoming" && (r.shipmentId ?? sh.id) === sh.id && r.productId === productId);
  const held = unitsHeld(rs);
  const free = units - held;
  const asks = claims.flatMap((c) => c.lines.filter((l) => l.productId === productId).map((l) => ({ q: c.quote, units: l.units })));
  const asked = asks.reduce((n, a) => n + a.units, 0);
  const rest = asks.slice(ASKS_SHOWN);
  const st = stockOf(s, p);

  return (
    <Card pad="16px 18px" onClick={() => openPanel("product", p.id)}>
      <Row gap={12}>
        <ProductThumb p={p} size={52} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
          <div style={{ ...MONO, fontSize: 10.5, color: "var(--faint)", marginTop: 3 }}>{p.id}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>{units} expected, {held} held, {free} free</div>
        </div>
      </Row>
      <div style={{ marginTop: 12 }}>
        <UnitBlocks size={18} parts={[{ n: held, tone: "accent", title: "Held for a customer" }, { n: Math.max(0, free), tone: "free", title: "Free" }]} />
      </div>
      {asked > 0 && (
        <div style={{ fontSize: 12, color: asked > free ? "var(--warn)" : "var(--dim)", marginTop: 9, lineHeight: 1.45 }}>
          {plural(asks.length, "open quote")} ask for {asked}{asked > free ? ", more than the " + free + " free. Niall decides who gets them." : "."}
        </div>
      )}

      <Label style={{ marginTop: 14, marginBottom: 6 }}>Held by</Label>
      {rs.length === 0 && <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Nobody yet</div>}
      {rs.map((r) => {
        const c = customerOf(s, r.customerId);
        const o = ix(s).order[r.orderId];
        const inv = o?.invoiceId ? ix(s).invoice[o.invoiceId] : undefined;
        return (
          <div key={r.id} onClick={(e) => { e.stopPropagation(); openPanel("order", r.orderId); }} className="mm-row"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", margin: "0 -8px", borderRadius: 10, cursor: "pointer", fontSize: 12.5 }}>
            <span style={{ color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{c.name}</span>
            <CountryTag c={c.country} />
            <span style={{ flex: 1 }} />
            {inv && <Status s={invoiceStatus(s, inv)} />}
            <span style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums", minWidth: 16, textAlign: "right" }}>{r.units}</span>
          </div>
        );
      })}

      <Label style={{ marginTop: 12, marginBottom: 6 }}>Open quotes asking</Label>
      {asks.length === 0 && <div style={{ fontSize: 12.5, color: "var(--faint)" }}>None</div>}
      {asks.slice(0, ASKS_SHOWN).map(({ q, units: n }) => (
        <div key={q.id} onClick={(e) => { e.stopPropagation(); openPanel("quote", q.id); }} className="mm-row"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", margin: "0 -8px", borderRadius: 10, cursor: "pointer", fontSize: 12.5 }}>
          <span style={{ ...MONO, fontSize: 11, color: "var(--faint)", flex: "none" }}>{q.id}</span>
          <span style={{ color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{customerOf(s, q.customerId).name}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11.5, color: "var(--faint)", whiteSpace: "nowrap" }}>{CLAIM_GROUP[claimGroup(q)].label}</span>
          <span style={{ color: "var(--warn)", fontVariantNumeric: "tabular-nums", minWidth: 16, textAlign: "right" }}>{n}</span>
        </div>
      ))}
      {rest.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>
          + {plural(rest.length, "more quote")} for {plural(rest.reduce((n, a) => n + a.units, 0), "unit")}
        </div>
      )}

      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12 }}>
        County Derry today: {st.inStock} in stock, {st.available} available.
      </div>
    </Card>
  );
}

/* ── open quotes that would claim the free units ─────────────────────────── */

type Filter = ClaimGroup | "all";

function ClaimsTable({ s, sh, short, free, claims }: { s: MMState; sh: IncomingShipment; short: string; free: number; claims: Claim[] }) {
  const needsApproval = s.controls.requireApproval.stock !== false;
  const groups: Record<ClaimGroup, Claim[]> = { approval: [], sent: [], early: [] };
  for (const c of claims) groups[claimGroup(c.quote)].push(c);
  const [g, setG] = useState<Filter>(groups.approval.length ? "approval" : "all");
  const rows = g === "all" ? claims : groups[g];
  const freeBy: Record<string, number> = {};
  for (const l of sh.lines) freeBy[l.productId] = l.units - heldOnShipment(s, sh, l.productId);
  const units = (cs: Claim[]) => cs.reduce((n, c) => n + c.units, 0);
  const lead = claims[0];

  const cols: Col<Claim>[] = [
    { key: "q", label: "Quote", width: "140px", render: (c) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ ...MONO, color: "var(--ink)" }}>{c.quote.id}</div>
        <div style={{ marginTop: 4 }}><Status s={c.quote.status} /></div>
      </div>
    ) },
    { key: "cust", label: "Customer", width: "minmax(0,1.1fr)", render: (c) => {
      const cu = customerOf(s, c.quote.customerId);
      return (
        <div style={{ minWidth: 0 }}>
          <Row gap={7}><span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cu.name}</span><CountryTag c={cu.country} /></Row>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{cu.city}</div>
        </div>
      );
    } },
    { key: "lines", label: "From the " + short + " intake", width: "minmax(0,1.5fr)", render: (c) => (
      <div style={{ minWidth: 0, whiteSpace: "normal", lineHeight: 1.45, color: "var(--body)" }}>
        {c.lines.map((l) => lineLabel(s, { productId: l.productId, qty: l.units })).join(", ")}
      </div>
    ) },
    { key: "claim", label: "Would take", width: "128px", render: (c) => {
      const short_ = c.lines.filter((l) => l.units > (freeBy[l.productId] ?? 0));
      return (
        <div style={{ minWidth: 0 }}>
          <div style={{ color: short_.length ? "var(--bad)" : "var(--warn)", fontWeight: 600 }}>{c.units} of {Math.max(0, free)} free</div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {short_.length ? "More than is free" : "Fits what is free today"}
          </div>
        </div>
      );
    } },
    { key: "value", label: "Quote value", width: "104px", align: "right", render: (c) => (
      <div style={{ textAlign: "right" }}>
        <div style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(quoteTotal(s, c.quote), c.quote.currency)}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>ex VAT</div>
      </div>
    ) },
    { key: "flag", label: "Commitment", width: "minmax(0,1.25fr)", render: (c) => (
      <div style={{ minWidth: 0, whiteSpace: "normal", lineHeight: 1.4 }}>
        {needsApproval
          ? <div style={{ color: "var(--warn)", fontSize: 12.5 }}>Stock commitment needs Niall's approval</div>
          : <div style={{ color: "var(--dim)", fontSize: 12.5 }}>Stock approval rule is off in Settings</div>}
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{CLAIM_GROUP[claimGroup(c.quote)].when}</div>
      </div>
    ) },
  ];

  return (
    <Card title="Open quotes that would claim free units"
      hint={lead
        ? customerOf(s, lead.quote.customerId).name + " (" + lead.quote.id + ") would take " + lead.units + " of the " + Math.max(0, free) + " free units. "
          + "Altogether " + plural(claims.length, "open quote") + " ask for " + plural(units(claims), "unit") + " from this intake. Nothing is allocated automatically."
        : "No open quote needs units from this intake."}
      right={<Button size="sm" kind="ghost" icon={I.arrow} onClick={() => go("Quotes", "approvals")}>Quote approvals</Button>}>
      <Row gap={12} wrap style={{ marginBottom: 12 }}>
        <Seg<Filter> value={g} onChange={setG} options={[
          ["approval", CLAIM_GROUP.approval.label + " " + groups.approval.length],
          ["sent", CLAIM_GROUP.sent.label + " " + groups.sent.length],
          ["early", CLAIM_GROUP.early.label + " " + groups.early.length],
          ["all", "All " + claims.length],
        ]} />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: units(rows) > free ? "var(--bad)" : "var(--dim)" }}>
          {plural(units(rows), "unit")} asked here against {Math.max(0, free)} free
        </span>
      </Row>
      <Table rows={rows} rowKey={(c) => c.quote.id} onRow={(c) => openPanel("quote", c.quote.id)} cols={cols} limit={8}
        empty={"Nothing in this group needs the " + short + " intake."} />
      {units(claims) > free && (
        <Note tone="bad" style={{ marginTop: 12 }}>
          Open quotes ask for {units(claims)} {short} units against {Math.max(0, free)} free on this intake. Available can never go below zero without an explicit warning and Niall's manual override.
        </Note>
      )}
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10 }}>
        Quotes using these units should say the delivery date is confirmed on receipt at County Derry.{sh.confirmed ? "" : " Arrival is not confirmed yet."}
      </div>
    </Card>
  );
}
