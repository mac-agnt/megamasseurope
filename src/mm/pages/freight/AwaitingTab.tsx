import type { MMState, Supplier } from "../../types";
import { go, openPanel, sendFreightRequest, simulateCarrierReply } from "../../store";
import { carrierStats, freightOutstanding, freightToRequest, ix, quoteEquipment, quoteTotal } from "../../select";
import { dateShort, money, num, plural, since, stamp } from "../../format";
import {
  Avatar, Badge, Button, Card, Cell, CountryTag, Empty, Facts, I, MONO, Mail, Money, Note, Page, PageHead, Row, Table, type Col,
} from "../../ui";
import { carriers, flagsOf, freightMails, hoursText, machinesText, mk, openApprovalFor, viewOf, waitText, type FreightView } from "./lib";
import { DemoButton, MachinesCell, MiniStat, PlaceCell, ToConfirm, WaitBadge, Wide, fits, useWidth } from "./bits";
import { showInWorkflow } from "./Workflow";
import { openInReview } from "./ReviewTab";

/* Awaiting Rates: every request still waiting on a carrier, grouped by carrier,
   with the Lyon delay up front and the drafted requests waiting for approval. */

const SPOTLIGHT = "FR-1211"; // Lyon Performance Club, the late Greyhound Express rate

/** Lyon: the Freight Agent's flag, the drafted chase and the two actions. */
function Spotlight({ s, v }: { s: MMState; v: FreightView }) {
  const carrier = v.carrier?.name ?? "the carrier";
  const mails = freightMails(s, v.f.id);
  const lastChase = mails.chases[mails.chases.length - 1];
  const flagged = openApprovalFor(s, v.f.id);
  const q = v.q;

  if (v.f.carrierQuote && v.cost !== null && v.charge !== null) {
    return (
      <Card tone="ok" style={{ flex: "1.6 1 560px" }} title={<Row gap={8}>{v.c.name}<CountryTag c={v.c.country} /></Row>}
        hint={v.f.id + (q ? " · " + q.id : "") + " · " + machinesText(v) + " to " + v.f.destination}
        right={<Badge tone="ok" dot>Rate received</Badge>}>
        <Row gap={10} style={{ alignItems: "flex-start", marginBottom: 16 }}>
          <Avatar name="Freight Agent" size={30} />
          <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.55 }}>
            {carrier} replied {since(v.f.carrierQuote.receivedAt)} with {money(v.cost, v.cur)} (ref {v.f.carrierQuote.ref}).
            {" "}{mk(v.f.markupPct)} markup gives a customer charge of {money(v.charge, v.cur)}
            {!q ? "." : q.status === "Ready for Review"
              ? ", so " + q.id + " now totals " + money(quoteTotal(s, q), q.currency) + " ex VAT and is waiting in Rate Review."
              : ". " + q.id + " is " + q.status.toLowerCase() + " at " + money(quoteTotal(s, q), q.currency) + " ex VAT."}
          </div>
        </Row>
        <Facts cols={4} rows={[
          ["Carrier cost", money(v.cost, v.cur)],
          ["Markup", mk(v.f.markupPct)],
          ["Customer charge", money(v.charge, v.cur)],
          ["Quote total", q ? money(quoteTotal(s, q), q.currency) + " ex VAT" : "No quote"],
          ["Reference", <span style={MONO}>{v.f.carrierQuote.ref}</span>],
          ["Estimated delivery", v.f.carrierQuote.eta],
          ["Valid until", dateShort(Date.parse(v.f.carrierQuote.validUntil))],
          ["Exclusions", v.f.carrierQuote.exclusions],
        ]} />
        <Row gap={8} wrap style={{ marginTop: 18 }}>
          {q && q.status !== "Ready for Review"
            ? <Button kind="secondary" icon={I.quote} onClick={() => openPanel("quote", q.id)}>Open quote</Button>
            : <Button kind="primary" icon={I.arrow} onClick={() => openInReview(v.f.id)}>Review the rate</Button>}
          <Button kind="secondary" icon={I.eye} onClick={() => showInWorkflow(v.f.id)}>Show in workflow</Button>
        </Row>
      </Card>
    );
  }

  return (
    <Card tone={v.late ? "bad" : "warn"} style={{ flex: "1.6 1 560px" }} title={<Row gap={8}>{v.c.name}<CountryTag c={v.c.country} /></Row>}
      hint={v.f.id + (q ? " · " + q.id : "") + " · " + machinesText(v) + " to " + v.f.destination}
      right={<Row gap={6}><ToConfirm sup={v.carrier} /><Badge tone={v.late ? "bad" : "warn"} dot>{v.late ? "Over 3 days" : "Waiting"}</Badge></Row>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Row gap={10} style={{ alignItems: "flex-start" }}>
          <Avatar name="Freight Agent" size={30} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Freight Agent{flagged ? " · " + since(flagged.createdAt) : ""}</div>
            <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5, marginTop: 3 }}>
              {v.late ? carrier + " has not replied in over three days; the " + v.c.city + " quote cannot go out until the rate arrives."
                : carrier + " has not replied yet; the " + v.c.city + " quote cannot go out until the rate arrives."}
            </div>
          </div>
        </Row>
        <Facts cols={4} rows={[
          ["Requested", v.f.requestedAt ? dateShort(v.f.requestedAt) : "Not sent"],
          ["Waiting", <span style={{ color: v.late ? "var(--bad)" : undefined }}>{waitText(v.waitMs)}</span>],
          ["Chases", num(v.f.chases)],
          ["Blocked quote", q ? <span>{q.id} · <Money v={quoteEquipment(q)} cur={q.currency} /> equipment</span> : "None"],
        ]} />
        {flagged && !lastChase && (
          <Mail kind="draft" from="Niall <sales@megamasseurope.com>" to={carrier} at="Drafted by the Freight Agent"
            subject={"Chasing: Freight quotation request, equipment to " + v.c.city}
            body={"Hi,\n\nFollowing up on our request " + v.f.id + " for delivery to " + v.c.city + ". Could you send the rate today if possible?\n\nThanks,\nNiall"} />
        )}
        {lastChase && (
          <Mail kind="out" from="Niall <sales@megamasseurope.com>" to={lastChase.to} at={stamp(lastChase.at)} subject={lastChase.subject} body={lastChase.body} />
        )}
        <Row gap={8} wrap>
          <Button kind="primary" icon={I.send} onClick={() => sendFreightRequest(v.f.id)}>{flagged ? "Approve and send chase" : "Chase again"}</Button>
          <DemoButton onClick={() => simulateCarrierReply(v.f.id)}>Simulate carrier reply</DemoButton>
          <Button kind="ghost" icon={I.eye} onClick={() => showInWorkflow(v.f.id)}>Show in workflow</Button>
        </Row>
        <div style={{ fontSize: 11.5, color: "var(--faint)" }}>The chase goes by email once approved. Simulated in this demo: nothing is sent.</div>
      </div>
    </Card>
  );
}

/** Requests the Freight Agent has drafted, waiting for Niall to approve sending. */
function Drafts({ s }: { s: MMState }) {
  const drafts = freightToRequest(s).map((f) => viewOf(s, f))
    .sort((a, b) => (a.e?.lastContactAt ?? 0) - (b.e?.lastContactAt ?? 0));
  return (
    <Card style={{ flex: "1 1 360px" }} title="Drafted, waiting for approval"
      hint="Prepared by the Freight Agent from qualified enquiries. Nothing goes to a carrier until approved."
      right={<Badge tone={drafts.length ? "accent" : "neutral"}>{drafts.length}</Badge>}>
      {drafts.length === 0 && <Empty title="No drafted requests" sub="Approved requests move into the carrier lists below." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {drafts.map((v) => {
          const flags = flagsOf(v);
          return (
            <div key={v.f.id} className="mm-row" onClick={() => openPanel("freight", v.f.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 12, cursor: "pointer", minWidth: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Row gap={7}>
                  <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.c.name}</span>
                  <CountryTag c={v.c.country} />
                </Row>
                <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={MONO}>{v.f.id}</span> · {machinesText(v)} · {v.carrier?.name ?? "Carrier"}
                </div>
                {flags.length > 0 && (
                  <div style={{ fontSize: 11.5, color: "var(--warn)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={flags.join("; ")}>
                    Flagged: {flags.join("; ")}
                  </div>
                )}
              </div>
              <Button kind="secondary" size="sm" icon={I.check} onClick={() => sendFreightRequest(v.f.id)}>Approve</Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* Carrier tables: every field in its own column when there is room, otherwise
   destination folds under the customer and chases under the waiting time. */
const GROUP_FULL = 1082; // column minimums, gaps and row padding
const GROUP_COMPACT = 894;

export function groupColumns(s: MMState, compact: boolean): Col<FreightView>[] {
  const request: Col<FreightView> = { key: "id", label: "Request", width: compact ? "92px" : "96px",
    render: (v) => <Cell top={<span style={{ ...MONO, fontSize: 12, color: "var(--ink)" }}>{v.f.id}</span>}
      sub={openApprovalFor(s, v.f.id) ? <span style={{ color: "var(--accent)" }}>Chase drafted</span> : v.f.requestedAt ? "Sent " + dateShort(v.f.requestedAt) : "Not sent"} /> };
  const machines: Col<FreightView> = { key: "mach", label: "Machines", width: compact ? "minmax(130px,1.3fr)" : "minmax(140px,1.3fr)", render: (v) => <MachinesCell v={v} /> };
  const quote: Col<FreightView> = { key: "quote", label: "Blocked quote", width: compact ? "116px" : "120px",
    render: (v) => v.q ? <Cell top={<span style={{ ...MONO, fontSize: 12 }}>{v.q.id}</span>} sub={<Money v={quoteEquipment(v.q)} cur={v.q.currency} />} />
      : <span style={{ color: "var(--faint)" }}>None</span> };
  const actions: Col<FreightView> = { key: "act", label: "Actions", width: "218px", align: "right",
    render: (v) => (
      <Row gap={6}>
        <Button kind={v.late ? "primary" : "secondary"} size="sm" onClick={() => sendFreightRequest(v.f.id)}>Chase</Button>
        <DemoButton icon={false} onClick={() => simulateCarrierReply(v.f.id)}>Simulate reply</DemoButton>
      </Row>
    ) };
  return compact ? [
    request,
    { key: "cust", label: "Customer, destination", width: "minmax(150px,1.5fr)",
      render: (v) => <Cell top={<Row gap={6}>{v.c.name}<CountryTag c={v.c.country} /></Row>}
        sub={v.postcodeMissing ? <span style={{ color: "var(--warn)" }}>Postcode missing</span> : v.f.destination} /> },
    machines,
    { key: "wait", label: "Waiting, chases", width: "104px",
      render: (v) => <Cell top={<WaitBadge v={v} />} sub={plural(v.f.chases, "chase")} /> },
    quote, actions,
  ] : [
    request,
    { key: "cust", label: "Customer", width: "minmax(140px,1.4fr)", render: (v) => <Cell top={v.c.name} sub={<Row gap={6}><CountryTag c={v.c.country} />{v.c.type}</Row>} /> },
    { key: "dest", label: "Destination", width: "minmax(110px,1fr)", render: (v) => <PlaceCell v={v} /> },
    machines,
    { key: "wait", label: "Waiting", width: "92px", render: (v) => <WaitBadge v={v} /> },
    { key: "chases", label: "Chases", width: "58px", align: "right", render: (v) => <span style={{ color: v.f.chases ? "var(--ink)" : "var(--faint)" }}>{v.f.chases}</span> },
    quote, actions,
  ];
}

/** One carrier: its responsiveness and every request waiting on it. */
function CarrierGroup({ s, carrier, rows }: { s: MMState; carrier: Supplier; rows: FreightView[] }) {
  const st = carrierStats(s, carrier.id);
  const { ref, w } = useWidth<HTMLDivElement>();
  const compact = !fits(w, GROUP_FULL);
  const cols = groupColumns(s, compact);
  const blocked = rows.reduce((n, v) => n + (v.q ? 1 : 0), 0);
  return (
    <Card pad="16px 18px 12px"
      title={<Row gap={8}>{carrier.name}<ToConfirm sup={carrier} /></Row>}
      hint={carrier.region + " · " + carrier.lanes + ". " + carrier.workflow + "."}
      right={
        <Row gap={6} wrap style={{ justifyContent: "flex-end" }}>
          <MiniStat label="Avg reply" value={hoursText(st.avgHours)} />
          <MiniStat label="Waiting" value={st.waiting} tone={st.waiting ? "warn" : undefined} />
          <MiniStat label="Late" value={st.late} tone={st.late ? "bad" : "ok"} />
        </Row>
      }>
      <div ref={ref}>
        <Wide min={compact ? GROUP_COMPACT : GROUP_FULL}>
          <Table cols={cols} rows={rows} rowKey={(v) => v.f.id} onRow={(v) => openPanel("freight", v.f.id)}
            empty={"Nothing waiting on " + carrier.name + "."} />
        </Wide>
      </div>
      {rows.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--faint)", padding: "10px 12px 2px" }}>
          {plural(blocked, "quote")} on hold for {carrier.name}. Averages come from {plural(st.replied, "past reply", "past replies")} on record.
        </div>
      )}
    </Card>
  );
}

export default function AwaitingTab({ s }: { s: MMState }) {
  const out = freightOutstanding(s).map((f) => viewOf(s, f)).sort((a, b) => (a.f.requestedAt ?? 0) - (b.f.requestedAt ?? 0));
  const late = out.filter((v) => v.late).length;
  const spot = ix(s).freight[SPOTLIGHT];
  return (
    <Page>
      <PageHead title="Awaiting carrier rates"
        sub={plural(out.length, "request") + " waiting on a carrier, " + num(late) + " past three days. Each blocked quote stays on hold until a real rate arrives: Pulse never estimates freight."}
        right={<Button kind="secondary" icon={I.quote} onClick={() => go("Freight", "review")}>Rate review</Button>} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "stretch" }}>
        {spot && <Spotlight s={s} v={viewOf(s, spot)} />}
        <Drafts s={s} />
      </div>

      {carriers(s).map((c) => (
        <CarrierGroup key={c.id} s={s} carrier={c} rows={out.filter((v) => v.f.carrierId === c.id)} />
      ))}

      <Note icon={I.spark}>
        Chase emails a follow-up to the carrier, simulated in this demo. Simulate reply is a demo control: it records a carrier reply as if the
        email had just arrived, so the rate moves into Rate Review. No carrier is contacted.
      </Note>
    </Page>
  );
}
