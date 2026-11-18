import { useState } from "react";
import { approve, holdApproval, openPanel, toast, useMM } from "../store";
import { customerOf, eurEq } from "../select";
import { age, num } from "../format";
import type { Approval, ApprovalKind } from "../types";
import {
  Avatar, Badge, Button, Card, CountryTag, Grid, I, Kpi, Money, Note, Page, PageHead, Row, Seg, Status, Table, type Col,
} from "../ui";

const KINDS: ApprovalKind[] = ["Customer quotation", "Price review", "Freight request", "Payment follow-up"];
const KIND_HINT: Record<ApprovalKind, string> = {
  "Customer quotation": "Priced quotations ready to go to the customer.",
  "Price review": "Pricing questions that need your decision. No discount is assumed.",
  "Freight request": "Rate requests and chases to carriers.",
  "Payment follow-up": "Payment status emails for overdue FreshBooks invoices.",
};

type View = "awaiting" | "hold" | "decided";

const sortOrder = (a: Approval, b: Approval) =>
  (a.pinned ?? 99) - (b.pinned ?? 99) || eurEq(b.amount ?? 0, b.currency) - eurEq(a.amount ?? 0, a.currency);

export default function WorkApprovals(_props: { tab?: string } = {}) {
  const s = useMM();
  const [view, setView] = useState<View>("awaiting");
  const [confirm, setConfirm] = useState<ApprovalKind | null>(null);

  const inView = (a: Approval) =>
    view === "awaiting" ? a.status === "Ready" || a.status === "Needs action" : view === "hold" ? a.status === "Held" : a.status === "Approved";
  const rows = s.approvals.filter(inView).sort(sortOrder);
  const count = (v: View) =>
    s.approvals.filter((a) => (v === "awaiting" ? a.status === "Ready" || a.status === "Needs action" : v === "hold" ? a.status === "Held" : a.status === "Approved")).length;
  const byKind = (k: ApprovalKind) => rows.filter((a) => a.kind === k);

  const approveAll = (k: ApprovalKind) => {
    const ids = byKind(k).map((a) => a.id);
    ids.forEach((id) => approve(id));
    setConfirm(null);
    toast(num(ids.length) + " approvals in " + k.toLowerCase() + " done", "Simulated in this demo: nothing was sent.");
  };

  const cols: Col<Approval>[] = [
    { key: "cust", label: "Customer", width: "minmax(170px,1.1fr)", render: (a) => {
      const c = customerOf(s, a.customerId);
      return (
        <Row gap={7} wrap={false}>
          <span style={{ color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{c.name}</span>
          <CountryTag c={c.country} />
        </Row>
      );
    } },
    { key: "action", label: "Action", width: "minmax(240px,2fr)", render: (a) => (
      <div style={{ minWidth: 0 }}>
        <Row gap={7} wrap={false}>
          <span style={{ color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.action}</span>
          {a.pinned !== undefined && <Badge tone="accent">Pinned</Badge>}
        </Row>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "normal", lineHeight: 1.4 }}>{a.context}</div>
      </div>
    ) },
    { key: "value", label: "Value", width: "96px", align: "right", render: (a) => <Money v={a.amount} cur={a.currency} /> },
    { key: "by", label: "Prepared by", width: "minmax(130px,.7fr)", render: (a) => (
      <Row gap={8} wrap={false}><Avatar name={a.preparedBy} size={24} />
        <span style={{ fontSize: 12, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.preparedBy}</span></Row>
    ) },
    { key: "age", label: "Age", width: "44px", render: (a) => <span style={{ color: "var(--dim)" }}>{age(a.createdAt, s.now)}</span> },
    { key: "status", label: "Status", width: "112px", render: (a) => <Status s={a.status} /> },
    { key: "act", label: "", width: "232px", align: "right", render: (a) => (
      <Row gap={6} wrap={false}>
        {(a.status === "Ready" || a.status === "Needs action" || a.status === "Held") && (
          <Button kind="primary" size="sm" icon={I.check} onClick={() => approve(a.id)}>Approve</Button>
        )}
        {(a.status === "Ready" || a.status === "Needs action") && <Button size="sm" icon={I.pause} onClick={() => holdApproval(a.id)}>Hold</Button>}
        <Button size="sm" kind="ghost" onClick={() => openPanel(a.recordKind, a.recordId)}>Review</Button>
      </Row>
    ) },
  ];

  const awaiting = s.approvals.filter((a) => a.status === "Ready" || a.status === "Needs action");
  const emptyText = view === "awaiting" ? "Nothing waiting for you." : view === "hold" ? "Nothing on hold." : "Nothing approved yet.";

  return (
    <Page style={{ padding: "0 0 34px" }}>
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontSize: 13, color: "var(--dim)" }}>Nothing reaches a customer, carrier or FreshBooks without your approval. In this demo every action is simulated.</span>
        <Seg<View> value={view} onChange={(v) => { setView(v); setConfirm(null); }}
          options={[["awaiting", "Awaiting you " + count("awaiting")], ["hold", "On hold " + count("hold")], ["decided", "Decided " + count("decided")]]} />
      </Row>

      <Grid cols="repeat(auto-fit,minmax(200px,1fr))">
        {KINDS.map((k) => (
          <Kpi key={k} label={k} value={byKind(k).length}
            tone={view === "awaiting" ? (k === "Price review" ? "warn" : "accent") : "neutral"}
            sub={view === "awaiting" ? "of " + num(awaiting.length) + " awaiting you" : view === "hold" ? "on hold" : "approved"} />
        ))}
      </Grid>

      {rows.length === 0 && <Card><Note>{emptyText}</Note></Card>}

      {KINDS.filter((k) => byKind(k).length > 0).map((k) => {
        const list = byKind(k);
        return (
          <Card key={k} title={k + " (" + num(list.length) + ")"} hint={KIND_HINT[k]} pad="18px 20px 10px"
            right={view === "awaiting" ? (
              confirm === k ? (
                <Row gap={8}>
                  <span style={{ fontSize: 12, color: "var(--warn)" }}>Approve {num(list.length)} outward-facing items? Simulated.</span>
                  <Button kind="primary" size="sm" onClick={() => approveAll(k)}>Confirm</Button>
                  <Button kind="ghost" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
                </Row>
              ) : (
                <Button size="sm" icon={I.check} onClick={() => setConfirm(k)}>Approve all in group</Button>
              )
            ) : undefined}>
            <div style={{ margin: "0 -8px" }}>
              <Table cols={cols} rows={list} rowKey={(a) => a.id} onRow={(a) => openPanel(a.recordKind, a.recordId)} empty={emptyText} />
            </div>
          </Card>
        );
      })}
    </Page>
  );
}
