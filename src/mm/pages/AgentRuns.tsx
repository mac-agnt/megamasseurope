import { useEffect, useState, type ReactNode } from "react";
import type { AgentId, AgentRun } from "../types";
import { openPanel, useMM } from "../store";
import { Avatar, Badge, BarList, Card, Columns, Empty, Grid, Kpi, Page, PageHead, Row, Seg, Table } from "../ui";
import { num, plural } from "../format";
import { DAY, mean } from "./insights/calc";
import { Chip, Flow, Pane, fill, upTo } from "./insights/bits";
import { dayLabel } from "./insights/Executive";
import { agentName, fmtDuration, runStatus, runs24, runsFocus } from "./agents/calc";
import { AGENT_ORDER } from "./agents/meta";
import { RUN_STATUSES, runCols } from "./agents/runs";

/* Agents · Run History: every routine the agents ran, newest first, live from
   the store. A run that waited on Niall reads as completed once he approves. */

type StatusFilter = "all" | AgentRun["status"];

export default function AgentRuns({ tab }: { tab: string }) {
  void tab;
  const s = useMM();
  /* Opened from an agent card: start filtered to that agent, then forget it so the tab opens on everything next time. */
  const [agent, setAgent] = useState<AgentId | "all">(() => runsFocus.agent);
  useEffect(() => { runsFocus.agent = "all"; }, []);
  const [status, setStatus] = useState<StatusFilter>("all");

  const all = s.runs.slice().sort((a, b) => b.at - a.at);
  const eff = (r: AgentRun) => runStatus(s, r).status;
  const day = runs24(s);
  const waiting = all.filter((r) => eff(r) === "Waiting on Niall");
  const flagged = all.filter((r) => eff(r) === "Flagged");
  const flagged24 = day.filter((r) => eff(r) === "Flagged").length;
  const avg = mean(all.map((r) => r.durationSec));
  const oldest = all.length ? all[all.length - 1].at : s.now;
  const spanDays = Math.max(1, Math.ceil((s.now - oldest) / DAY));

  const byAgent = all.filter((r) => status === "all" || eff(r) === status);
  const rows = byAgent.filter((r) => agent === "all" || r.agentId === agent);
  const countFor = (id: AgentId) => byAgent.filter((r) => r.agentId === id).length;
  const statusCount = (st: StatusFilter) => all.filter((r) => (agent === "all" || r.agentId === agent) && (st === "all" || eff(r) === st)).length;

  const start = new Date(s.now); start.setHours(0, 0, 0, 0);
  const perDay = Array.from({ length: 7 }, (_, i) => {
    const from = start.getTime() - (6 - i) * DAY;
    return { label: dayLabel(from), value: all.filter((r) => r.at >= from && r.at < from + DAY && (agent === "all" || r.agentId === agent)).length };
  });
  const perAgent = AGENT_ORDER.map((id) => ({ id, n: all.filter((r) => r.agentId === id).length })).sort((a, b) => b.n - a.n);

  return (
    <Page>
      <PageHead title="Run history"
        sub={"Every routine the agents ran over the last " + plural(spanDays, "day") + ", newest first. Click a row or its record to open it."}
        right={<Badge tone="neutral">Simulated in this demo: nothing was sent</Badge>} />

      <Grid cols={upTo(4, 200)} style={{ alignItems: "stretch" }}>
        <Kpi hero tone="accent" label="Runs in the last 24 hours" value={num(day.length)}
          sub={plural(new Set(day.map((r) => r.agentId)).size, "agent") + " active"} />
        <Kpi tone="accent" label="Runs waiting on Niall" value={num(waiting.length)} sub="Clears as you approve the work"
          onClick={() => { setStatus("Waiting on Niall"); setAgent("all"); }} />
        <Kpi tone="warn" label="Flagged runs" value={num(flagged.length)} sub={num(flagged24) + " in the last 24 hours"}
          onClick={() => { setStatus("Flagged"); setAgent("all"); }} />
        <Kpi tone="neutral" label="Average duration" value={avg.toFixed(1) + "s"} sub={"Across " + plural(all.length, "run")} />
      </Grid>

      <Flow>
        <Pane grow={1.5} basis={440}>
          <Card style={fill} title="Runs per day" hint={agent === "all" ? "All agents, last 7 days" : agentName(agent) + ", last 7 days"}>
            <div style={{ marginTop: "auto" }}><Columns data={perDay} height={200} /></div>
          </Card>
        </Pane>
        <Pane grow={1} basis={300}>
          <Card style={fill} title="By agent" hint="Runs in the log. Click to filter.">
            <BarList format={(n) => num(n)} onItem={(i) => setAgent(perAgent[i].id)}
              items={perAgent.map((p) => ({ key: p.id, label: agentName(p.id), value: p.n }))} />
          </Card>
        </Pane>
      </Flow>

      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "var(--dim)" }}>Showing {plural(rows.length, "run")}{agent === "all" ? "" : " by " + agentName(agent)}{status === "all" ? "" : ", " + status.toLowerCase()}</span>
          <Seg<StatusFilter> value={status} onChange={setStatus}
            options={(["all", ...RUN_STATUSES] as StatusFilter[]).map((st) => [st,
              <span key={st}>{st === "all" ? "All" : st} <span style={{ opacity: 0.55, fontWeight: 500 }}>{statusCount(st)}</span></span>] as [StatusFilter, ReactNode])} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <Row gap={6} wrap style={{ flex: "1 1 520px" }}>
            <Chip on={agent === "all"} onClick={() => setAgent("all")} count={byAgent.length}>
              <span style={{ paddingLeft: 6 }}>All agents</span>
            </Chip>
            {AGENT_ORDER.map((id) => (
              <Chip key={id} on={agent === id} onClick={() => setAgent(agent === id ? "all" : id)} count={countFor(id)}>
                <Avatar name={agentName(id)} size={20} />{agentName(id).replace(" Agent", "")}
              </Chip>
            ))}
          </Row>
        </div>
        {rows.length ? (
          <Table key={agent + "|" + status} cols={runCols(s)} rows={rows} limit={25} rowKey={(r) => r.id}
            onRow={(r) => openPanel(r.recordKind, r.recordId)} />
        ) : (
          <Empty title="No runs match these filters" sub={status === "Skipped" ? "No agent has skipped a run. A paused agent simply does not run." : "Try another agent or status."} />
        )}
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--faint)", lineHeight: 1.5 }}>
          A run that waited on you reads as completed once you approve the work it prepared. Average run time {fmtDuration(avg)}.
        </div>
      </Card>
    </Page>
  );
}
