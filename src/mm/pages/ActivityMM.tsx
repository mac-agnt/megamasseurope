import { useMemo, useState, type ReactNode } from "react";
import { openPanel, toast, useMM } from "../store";
import { customerOf } from "../select";
import { num, stamp } from "../format";
import type { ActivityEvent, ActivitySource, Email, RecordKind } from "../types";
import {
  Avatar, Badge, Button, Card, Empty, Grid, I, inputStyle, Kpi, Mail, Note, Page, PageHead, Row, Seg, Table, toneBg, toneInk, type Col,
} from "../ui";

const SOURCES: ActivitySource[] = ["Website", "Gmail", "FreshBooks", "Pulse", "Agent", "Drive", "Carrier"];
const KIND_LABEL: Record<RecordKind, string> = {
  customer: "Customer", enquiry: "Enquiry", quote: "Quote", freight: "Freight", invoice: "Invoice", order: "Order",
  product: "Product", shipment: "Shipment", followup: "Follow-up", supplier: "Supplier",
};

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} style={{ height: 26, padding: "0 11px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: on ? 600 : 500,
      border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)"), background: on ? toneBg("accent") : "var(--surface-2)",
      color: on ? toneInk("accent") : "var(--dim)", whiteSpace: "nowrap" }}>{children}</button>
  );
}

function RecordChip({ kind, id }: { kind: RecordKind; id: string }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); openPanel(kind, id); }}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 24, padding: "0 10px", borderRadius: 999, cursor: "pointer",
        border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--ink)", fontSize: 11.5, whiteSpace: "nowrap" }}>
      <span style={{ color: "var(--faint)" }}>{KIND_LABEL[kind]}</span>{id}
    </button>
  );
}

/* ── emails ───────────────────────────────────────────────────────────────── */

type Thread = {
  key: string; recordKind: RecordKind; recordId: string; msgs: Email[]; last: Email; party: string; carrier: boolean;
  customerName: string; hasDraft: boolean;
};

type EmailFilter = "all" | "customers" | "carriers" | "drafts";

function Emails() {
  const s = useMM();
  const [filter, setFilter] = useState<EmailFilter>("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const threads = useMemo<Thread[]>(() => {
    const map = new Map<string, Email[]>();
    for (const m of s.emails) {
      const k = m.recordKind + ":" + m.recordId;
      map.set(k, (map.get(k) || []).concat([m]));
    }
    return Array.from(map.entries()).map(([key, list]) => {
      const msgs = list.slice().sort((a, b) => a.at - b.at);
      const last = msgs[msgs.length - 1];
      const carrier = msgs.some((m) => m.supplierId);
      const sup = s.suppliers.find((x) => x.id === msgs.find((m) => m.supplierId)?.supplierId);
      const cid = msgs.find((m) => m.customerId)?.customerId;
      const cust = cid ? customerOf(s, cid) : undefined;
      const contact = cust ? s.contacts.find((c) => c.id === cust.contactId) : undefined;
      const party = carrier && sup ? sup.name : contact ? contact.name + ", " + (cust?.name ?? "") : cust?.name ?? last.from;
      return { key, recordKind: last.recordKind, recordId: last.recordId, msgs, last, party, carrier,
        customerName: cust?.name ?? "No customer linked", hasDraft: msgs.some((m) => m.direction === "draft") };
    }).sort((a, b) => b.last.at - a.last.at);
  }, [s]);

  const needle = q.trim().toLowerCase();
  const shown = threads.filter((t) => {
    if (filter === "customers" && t.carrier) return false;
    if (filter === "carriers" && !t.carrier) return false;
    if (filter === "drafts" && !t.hasDraft) return false;
    if (!needle) return true;
    return (t.party + " " + t.customerName + " " + t.recordId + " " + t.msgs.map((m) => m.subject + " " + m.body).join(" ")).toLowerCase().includes(needle);
  });
  const current = shown.find((t) => t.key === sel) ?? shown[0];
  const cnt = (f: EmailFilter) => threads.filter((t) => f === "all" || (f === "customers" ? !t.carrier : f === "carriers" ? t.carrier : t.hasDraft)).length;

  return (
    <Page>
      <PageHead title="Emails" sub="Customer and carrier correspondence, grouped by the record it belongs to."
        right={<Seg<EmailFilter> value={filter} onChange={setFilter}
          options={[["all", "All " + cnt("all")], ["customers", "Customers " + cnt("customers")], ["carriers", "Carriers " + cnt("carriers")],
            ["drafts", "Drafts awaiting approval " + cnt("drafts")]]} />} />
      <Note tone="info" icon={I.mail}>Gmail history shown from demo data. No live mailbox is connected.</Note>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 16, alignItems: "start" }}>
        <Card pad="16px 10px 10px" style={{ maxHeight: "calc(100vh - 260px)", minHeight: 420, overflow: "auto" }}
          title={<span style={{ paddingLeft: 10 }}>{num(shown.length)} threads</span>}>
          <div style={{ padding: "0 10px 10px" }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer, subject or message" style={{ ...inputStyle, width: "100%" }} />
          </div>
          {shown.length === 0 && <Empty title="No threads match" sub="Clear the search or change the filter." />}
          {shown.map((t) => {
            const on = current?.key === t.key;
            return (
              <div key={t.key} onClick={() => setSel(t.key)} className="mm-row"
                style={{ padding: "10px 12px", borderRadius: 12, cursor: "pointer", background: on ? "var(--accent-faint)" : undefined,
                  border: "1px solid " + (on ? "var(--accent-line)" : "transparent"), marginBottom: 2 }}>
                <Row gap={8} wrap={false}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ink)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.party}</span>
                  {t.hasDraft && <Badge tone="accent">draft</Badge>}
                  <span style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>{stamp(t.last.at, s.now)}</span>
                </Row>
                <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.last.subject}</div>
                <Row gap={8} style={{ marginTop: 5 }}>
                  <Badge tone={t.carrier ? "warn" : "info"}>{t.carrier ? "Carrier" : "Customer"}</Badge>
                  <span style={{ fontSize: 11, color: "var(--faint)" }}>{KIND_LABEL[t.recordKind]} {t.recordId}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: "var(--faint)" }}>{t.msgs.length} {t.msgs.length === 1 ? "message" : "messages"}</span>
                </Row>
              </div>
            );
          })}
        </Card>

        {current ? (
          <Card title={current.last.subject} pad="18px 20px"
            hint={current.customerName + (current.carrier ? " via " + current.party : "")}
            right={<RecordChip kind={current.recordKind} id={current.recordId} />}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {current.msgs.map((m) => (
                <Mail key={m.id} kind={m.direction} from={m.from} to={m.to} at={stamp(m.at, s.now)} subject={m.subject} body={m.body} />
              ))}
              {current.hasDraft && <Note tone="accent" icon={I.lock}>A draft is waiting in this thread. Approve the matching item in Work, Approvals and it is recorded as sent (simulated).</Note>}
            </div>
          </Card>
        ) : <Card><Empty title="Select a thread" /></Card>}
      </div>
    </Page>
  );
}

/* ── audit ────────────────────────────────────────────────────────────────── */

type KindFilter = "all" | "person" | "agent" | "system";

function Audit() {
  const s = useMM();
  const [src, setSrc] = useState<ActivitySource | "All">("All");
  const [kind, setKind] = useState<KindFilter>("all");
  const [attn, setAttn] = useState(false);
  const [q, setQ] = useState("");

  const events = useMemo(() => s.activity.slice().sort((a, b) => b.at - a.at), [s.activity]);
  const today = new Date(s.now).toDateString();
  const needle = q.trim().toLowerCase();
  const rows = events.filter((e) =>
    (src === "All" || e.source === src) && (kind === "all" || e.actorKind === kind) && (!attn || e.attention)
    && (!needle || (e.title + " " + e.detail + " " + e.actor + " " + e.recordId).toLowerCase().includes(needle)));
  const n = (f: (e: ActivityEvent) => boolean) => events.filter(f).length;

  const cols: Col<ActivityEvent>[] = [
    { key: "at", label: "Time", width: "128px", render: (e) => <span style={{ fontSize: 12, color: "var(--dim)" }}>{stamp(e.at, s.now)}</span> },
    { key: "actor", label: "Actor", width: "minmax(140px,.8fr)", render: (e) => (
      <Row gap={8} wrap={false}><Avatar name={e.actor} size={24} />
        <span style={{ color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.actor}</span></Row>
    ) },
    { key: "kind", label: "Kind", width: "70px", render: (e) => <span style={{ fontSize: 12, color: "var(--dim)" }}>{e.actorKind === "person" ? "Person" : e.actorKind === "agent" ? "Agent" : "System"}</span> },
    { key: "src", label: "Source", width: "92px", render: (e) => <Badge>{e.source}</Badge> },
    { key: "event", label: "Event", width: "minmax(260px,2.4fr)", render: (e) => (
      <div style={{ minWidth: 0 }}>
        <Row gap={7} wrap={false}>
          <span style={{ color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</span>
          {e.attention && <Badge tone="warn">Needs attention</Badge>}
        </Row>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "normal", lineHeight: 1.4 }}>{e.detail}</div>
      </div>
    ) },
    { key: "rec", label: "Record", width: "150px", render: (e) => <RecordChip kind={e.recordKind} id={e.recordId} /> },
    { key: "sim", label: "", width: "84px", align: "right", render: (e) => (e.simulated ? <Badge tone="info">simulated</Badge> : null) },
  ];

  return (
    <Page>
      <PageHead title="Audit log" sub="Every event from people, agents and connected systems, newest first."
        right={<Button icon={I.arrow} onClick={() => toast("Export prepared (simulated)", "No file was created in this demo.")}>Export CSV</Button>} />
      <Grid cols="repeat(auto-fit,minmax(200px,1fr))">
        <Kpi label="Events today" value={num(n((e) => new Date(e.at).toDateString() === today))} sub={num(events.length) + " in the log"} tone="accent" />
        <Kpi label="By people" value={num(n((e) => e.actorKind === "person"))} sub="Approvals and decisions" />
        <Kpi label="By agents" value={num(n((e) => e.actorKind === "agent"))} sub="Prepared for your review" />
        <Kpi label="Simulated actions" value={num(n((e) => !!e.simulated))} sub="Nothing left the demo" tone="info" />
      </Grid>
      <Card pad="16px 8px 10px" title={<span style={{ paddingLeft: 12 }}>{num(rows.length)} events</span>}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "0 12px 14px" }}>
          <Row gap={6} wrap>
            <Chip on={src === "All"} onClick={() => setSrc("All")}>All sources</Chip>
            {SOURCES.map((x) => <Chip key={x} on={src === x} onClick={() => setSrc(x)}>{x}</Chip>)}
          </Row>
          <span style={{ flex: 1 }} />
          <Seg<KindFilter> value={kind} onChange={setKind} options={[["all", "All"], ["person", "People"], ["agent", "Agents"], ["system", "Systems"]]} />
          <Chip on={attn} onClick={() => setAttn(!attn)}>Needs attention</Chip>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events" style={{ ...inputStyle, width: 220 }} />
        </div>
        <Table cols={cols} rows={rows} limit={40} rowKey={(e) => e.id} onRow={(e) => openPanel(e.recordKind, e.recordId)} empty="No events match these filters." />
      </Card>
    </Page>
  );
}

export default function ActivityMM({ tab }: { tab?: string }) {
  return tab === "audit" ? <Audit /> : <Emails />;
}
