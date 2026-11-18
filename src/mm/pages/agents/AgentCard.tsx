import type { ReactNode } from "react";
import type { AgentId, MMState } from "../../types";
import { go, openPanel, toast, toggleAgent } from "../../store";
import { Avatar, Badge, Card, Icon, I, Label, Money, Toggle } from "../../ui";
import { num, plural, since } from "../../format";
import { DAY } from "../insights/calc";
import { GoLink, RecRow } from "../insights/bits";
import { agentName, briefingItems, intelInsights, opsFlags, pendingFor, runStatus, runsOf, sumFlags, type Flag } from "./calc";
import { AGENT_HOME, PROFILE, RULE_LABEL } from "./meta";
import { RunBadge } from "./runs";

/* One agent on the overview: its job, what it watches, what it reads, what is
   waiting for Niall, its latest runs and the rules it works under. */

export function setAgentOn(s: MMState, id: AgentId) {
  const on = s.controls.agentsOn[id];
  toggleAgent(id);
  toast(agentName(id) + (on ? " paused" : " switched on"), on ? "It will not prepare anything until you switch it back on." : "Back on its routine. Approval rules unchanged.");
}

export function waitingSection(s: MMState, id: AgentId): { label: string; count: number; summary: string; flags?: Flag[]; } {
  const p = PROFILE[id];
  if (p.mode === "flags") {
    const f = opsFlags(s);
    return { label: "Flagged now", count: sumFlags(f), summary: plural(f.filter((x) => x.n > 0).length, "check") + " with something stuck", flags: f };
  }
  if (p.mode === "briefing") {
    const f = briefingItems(s);
    return { label: "In today's briefing", count: f.length, summary: "Live headline numbers", flags: f };
  }
  if (p.mode === "insights") {
    const f = intelInsights(s);
    return { label: "Latest findings", count: f.length, summary: "Computed from the records", flags: f };
  }
  const pend = pendingFor(s, id);
  const parts = [pend.approvals ? plural(pend.approvals, "approval") : "", pend.drafts ? num(pend.drafts) + " " + pend.draftLabel : ""].filter(Boolean);
  return { label: "Waiting for you", count: pend.items.length, summary: parts.length ? parts.join(" and ") : "Nothing waiting" };
}

export function FlagRow({ f }: { f: Flag }) {
  return (
    <RecRow wrap title={f.title} sub={f.sub} onClick={() => (f.open ? openPanel(f.open.kind, f.open.id) : go(f.go[0], f.go[1]))}
      value={<span style={{ fontWeight: 600, color: f.n ? "var(--ink)" : "var(--faint)" }}>{num(f.n)}</span>} />
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
      {items.map((t) => (
        <div key={t} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--body)", lineHeight: 1.4 }}>
          <Icon d={I.check} size={12} stroke={2.2} style={{ marginTop: 3, color: "var(--faint)" }} />
          <span>{t}</span>
        </div>
      ))}
    </div>
  );
}

export function RuleChips({ s, id }: { s: MMState; id: AgentId }) {
  const p = PROFILE[id];
  if (!p.rules.length) return <Badge tone="neutral"><Icon d={I.eye} size={12} stroke={2} />Read only</Badge>;
  return (
    <>
      {p.rules.map((k) => {
        const on = s.controls.requireApproval[k] !== false;
        return (
          <Badge key={k} tone={on ? "neutral" : "warn"} style={{ gap: 5 }}>
            <Icon d={I.lock} size={11} stroke={2.2} />{RULE_LABEL[k]}{on ? "" : ": approval off"}
          </Badge>
        );
      })}
    </>
  );
}

export function AgentCard({ s, id, onRuns }: { s: MMState; id: AgentId; onRuns: () => void }) {
  const p = PROFILE[id];
  const name = agentName(id);
  const on = s.controls.agentsOn[id];
  const runs = runsOf(s, id);
  const today = runs.filter((r) => r.at >= s.now - DAY).length;
  const w = waitingSection(s, id);
  const pend = p.mode === "approvals" ? pendingFor(s, id).items.slice(0, 2) : [];
  const cadence = id === "followup" ? "Follow-up timing: " + s.controls.cadence.join(", ") + " days" : null;
  const home = AGENT_HOME[id];

  let waitingRows: ReactNode;
  if (w.flags) {
    waitingRows = w.flags.filter((f) => f.n > 0).slice(0, 3).map((f) => <FlagRow key={f.key} f={f} />);
  } else if (pend.length) {
    waitingRows = pend.map((x) => (
      <RecRow key={x.key} title={x.title} sub={x.sub} onClick={() => openPanel(x.kind, x.id)}
        value={x.amount !== null ? <Money v={x.amount} cur={x.currency} /> : undefined}
        meta={x.draft ? "Draft" : x.status === "Needs action" ? "Needs action" : "Ready"} />
    ));
  } else {
    waitingRows = <div style={{ fontSize: 12.5, color: "var(--faint)", padding: "8px 0" }}>Nothing waiting for you.</div>;
  }

  return (
    <Card pad="18px 20px 16px" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar name={name} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.2px", color: "var(--ink)" }}>{name}</span>
            {!on && <Badge tone="warn">Paused</Badge>}
            <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{plural(today, "run")} today</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.45 }}>{p.job}</div>
        </div>
        <Toggle on={on} onChange={() => setAgentOn(s, id)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 20, opacity: on ? 1 : 0.5, transition: "opacity .2s var(--ease)" }}>
        <div style={{ minWidth: 0 }}>
          <Label>Watches</Label>
          <Bullets items={cadence ? p.watches.concat([cadence]) : p.watches} />
          <Label style={{ marginTop: 14 }}>Reads from</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {p.reads.map((r) => <Badge key={r} tone="neutral">{r}</Badge>)}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <Label right={<span style={{ fontSize: 12, fontWeight: 600, color: w.count ? "var(--ink)" : "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{num(w.count)}</span>}>{w.label}</Label>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 4 }}>{w.summary}</div>
          <div style={{ marginTop: 4 }}>{waitingRows}</div>
        </div>
      </div>

      <div style={{ opacity: on ? 1 : 0.5, transition: "opacity .2s var(--ease)" }}>
        <Label>Latest runs</Label>
        <div style={{ marginTop: 4 }}>
          {runs.slice(0, 3).map((r) => {
            const st = runStatus(s, r).status;
            return (
              <RecRow key={r.id} title={<span style={{ fontSize: 12.5 }}>{r.title}</span>} sub={r.outcome} onClick={() => openPanel(r.recordKind, r.recordId)}
                value={st !== "Completed" ? <RunBadge status={st} /> : undefined}
                meta={since(r.at)} />
            );
          })}
          {!runs.length && <div style={{ fontSize: 12.5, color: "var(--faint)", padding: "8px 0" }}>No runs in the log yet.</div>}
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <RuleChips s={s} id={id} />
        <span style={{ fontSize: 11.5, color: "var(--faint)", flex: "1 1 180px", minWidth: 0 }}>{p.limits}</span>
        <span style={{ display: "inline-flex", gap: 14 }}>
          <GoLink onClick={onRuns}>Runs</GoLink>
          <GoLink onClick={() => go(home[0], home[1])}>{home[0]}</GoLink>
        </span>
      </div>
    </Card>
  );
}
