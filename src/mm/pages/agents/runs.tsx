import type { AgentRun, MMState } from "../../types";
import { openPanel } from "../../store";
import { Badge, Button, Who, type Col, type Tone } from "../../ui";
import { since, stamp } from "../../format";
import { agentName, fmtDuration, runStatus } from "./calc";

/* Run-history pieces shared by the Run History tab and Agent Details. */

export const RUN_TONE: Record<AgentRun["status"], Tone> = { Completed: "ok", "Waiting on Niall": "accent", Flagged: "warn", Skipped: "neutral" };
export const RUN_STATUSES: AgentRun["status"][] = ["Completed", "Waiting on Niall", "Flagged", "Skipped"];

export function RunBadge({ status }: { status: AgentRun["status"] }) {
  return <Badge tone={RUN_TONE[status]} dot>{status}</Badge>;
}

const KIND_LABEL: Record<string, string> = {
  customer: "Customer", enquiry: "Enquiry", quote: "Quote", freight: "Freight request", invoice: "Invoice", order: "Order",
  product: "Product", shipment: "Shipment", followup: "Follow-up", supplier: "Supplier",
};

export function runCols(s: MMState, opts: { agent?: boolean } = { agent: true }): Col<AgentRun>[] {
  const cols: Col<AgentRun>[] = [
    { key: "t", label: "Time", width: "128px", render: (r) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>{stamp(r.at)}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{since(r.at)}</div>
      </div>
    ) },
  ];
  if (opts.agent !== false) cols.push({ key: "a", label: "Agent", width: "minmax(150px,.85fr)", render: (r) => <Who name={agentName(r.agentId)} /> });
  cols.push(
    { key: "w", label: "What it did", width: "minmax(0,1.3fr)", render: (r) => (
      <div title={r.title} style={{ color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
    ) },
    { key: "o", label: "Outcome", width: "minmax(0,1.4fr)", render: (r) => {
      const st = runStatus(s, r);
      return (
        <div title={r.outcome} style={{ minWidth: 0 }}>
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.outcome}</div>
          {st.resolved && <div style={{ fontSize: 11.5, color: "var(--ok)", marginTop: 2 }}>Approved by Niall since</div>}
        </div>
      );
    } },
    { key: "s", label: "Status", width: "148px", render: (r) => <RunBadge status={runStatus(s, r).status} /> },
    { key: "r", label: "Record", width: "124px", render: (r) => (
      <Button size="sm" kind="secondary" title={"Open " + (KIND_LABEL[r.recordKind] || "record").toLowerCase() + " " + r.recordId}
        onClick={() => openPanel(r.recordKind, r.recordId)} style={{ maxWidth: "100%", overflow: "hidden" }}>{r.recordId}</Button>
    ) },
    { key: "d", label: "Duration", width: "70px", align: "right", render: (r) => <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--dim)" }}>{fmtDuration(r.durationSec)}</span> },
  );
  return cols;
}
