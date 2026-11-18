import { useState } from "react";
import type { AgentId } from "../types";
import { bridge, go, useMM } from "../store";
import { Badge, Button, Card, Facts, Grid, Icon, I, Kpi, Page, PageHead, inputStyle } from "../ui";
import { num, plural } from "../format";
import { followUpsToReview, openApprovals, unanswered } from "../select";
import { Flow, Pane, fill, upTo } from "./insights/bits";
import { agentsOn, opsFlags, runs24, runsFocus, sumFlags } from "./agents/calc";
import { AGENT_ORDER, ASK_EXAMPLES, RULES, RULE_LABEL } from "./agents/meta";
import { AgentCard } from "./agents/AgentCard";

/* Agents · Overview: the eight agents, what each is doing and what it has
   waiting for Niall. Nothing an agent prepares leaves Pulse without approval. */

function AskCard() {
  const [text, setText] = useState("");
  const ask = (q: string) => { const t = q.trim(); if (t) { bridge.ask(t); setText(""); } };
  return (
    <Card style={fill} title="Ask an agent" hint="Questions go to the chat on Home, where the agents answer from the records.">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {ASK_EXAMPLES.map((q) => (
          <button key={q} onClick={() => ask(q)} className="mm-row"
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 12,
              border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--ink)", fontSize: 13, cursor: "pointer" }}>
            <Icon d={I.spark} size={14} style={{ color: "var(--accent)" }} />
            <span style={{ flex: 1, minWidth: 0 }}>{q}</span>
            <Icon d={I.arrow} size={13} style={{ color: "var(--faint)" }} />
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(text); }} style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 14 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about a customer, quote or invoice"
          aria-label="Question for an agent" style={{ ...inputStyle, flex: 1, borderRadius: 999, padding: "0 14px" }} />
        {/* Submits the form; no onClick, so the question is asked once. */}
        <Button kind="primary" icon={I.send} disabled={!text.trim()}>Ask</Button>
      </form>
    </Card>
  );
}

export default function AgentsOverview({ tab }: { tab: string }) {
  void tab; /* Only the overview tab lands here; Run History has its own page and Agent Details is Pulse's own view. */
  const s = useMM();
  const day = runs24(s);
  const approvals = openApprovals(s).length;
  const replies = unanswered(s).length;
  const followUps = followUpsToReview(s).length;
  const flags = opsFlags(s);
  const flagged = sumFlags(flags);
  const on = agentsOn(s);
  const openRuns = (id: AgentId | "all") => { runsFocus.agent = id; go("Agents", "runs"); };

  return (
    <Page>
      <PageHead title="Agents"
        sub="Eight agents do the repetitive work on enquiries, quotes, freight and invoices, then hand it to you. Nothing reaches a customer, FreshBooks or a carrier without your approval."
        right={<Badge tone="neutral">Simulated in this demo: nothing was sent</Badge>} />

      <Grid cols={upTo(4, 200)} style={{ alignItems: "stretch" }}>
        <Kpi hero tone="accent" label="Runs in the last 24 hours" value={num(day.length)}
          sub={plural(new Set(day.map((r) => r.agentId)).size, "agent") + " active"} onClick={() => openRuns("all")} />
        <Kpi tone="accent" label="Waiting on Niall" value={num(approvals)}
          sub={"Approvals, plus " + num(replies) + " drafted replies and " + num(followUps) + " follow-up drafts"} />
        <Kpi tone="warn" label="Flagged by Ops Watchdog" value={num(flagged)}
          sub={plural(flags.filter((f) => f.n > 0).length, "check") + " with something stuck"} onClick={() => openRuns("ops")} />
        <Kpi tone="ok" label="Agents on" value={num(on) + " of " + AGENT_ORDER.length}
          sub={on === AGENT_ORDER.length ? "Every agent is running" : plural(AGENT_ORDER.length - on, "agent") + " paused"} />
      </Grid>

      <Flow>
        <Pane grow={1.6} basis={520}>
          <Card style={fill} title="Rules the agents work under" hint="Human approval by default. In this demo no agent sends email, changes FreshBooks or books transport.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
              {RULES.map((k) => {
                const req = s.controls.requireApproval[k] !== false;
                return (
                  <div key={k} title={req ? "Waits for your approval" : "Approval switched off"}
                    style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-faint)" }}>
                    <Icon d={I.lock} size={13} stroke={2} style={{ color: req ? "var(--accent)" : "var(--warn)" }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{RULE_LABEL[k]}</span>
                    {!req && <Badge tone="warn">Off</Badge>}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10 }}>A lock means the agent prepares the work and waits for you.</div>
            <div style={{ marginTop: "auto", paddingTop: 16 }}>
              <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <Facts cols={3} rows={[
                  ["Automatic chasing", s.controls.followUpAuto ? "On" : "Off. Follow-ups are drafted, never sent"],
                  ["Follow-up timing", s.controls.cadence.join(", ") + " days"],
                  ["Default freight markup", s.controls.defaultMarkup + "% on the carrier rate"],
                ]} />
              </div>
            </div>
          </Card>
        </Pane>
        <Pane grow={1} basis={320}>
          <AskCard />
        </Pane>
      </Flow>

      <Grid cols={upTo(2, 440)} style={{ alignItems: "stretch" }}>
        {AGENT_ORDER.map((id) => <AgentCard key={id} s={s} id={id} onRuns={() => openRuns(id)} />)}
      </Grid>
    </Page>
  );
}

