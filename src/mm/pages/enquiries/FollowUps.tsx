import { useState } from "react";
import type { FollowUp, FollowUpKind, MMState } from "../../types";
import { decideFollowUp, openPanel, setControl, setFollowUpDraft, useMM } from "../../store";
import { customerOf, eurEq, followUpsToReview, ix } from "../../select";
import { money, moneyShort, num, plural, since, stamp, until } from "../../format";
import { Badge, BarList, Button, Card, CountryTag, I, Icon, MONO, Note, Page, PageHead, Row, Status, TextArea, Toggle } from "../../ui";
import { CADENCE_OPTIONS, EUR_EQ, FOLLOW_HINT, FOLLOW_KINDS, followContext, followDue } from "./data";
import { Chip, ELLIPSIS, EurEqNote, MiniStat, onKeyActivate } from "./bits";

/* Enquiries > Follow-ups. Approval-based chasing: the Follow-up Agent drafts,
   Niall approves, snoozes or dismisses. Automatic chasing is off by default. */

export default function FollowUps() {
  const s = useMM();
  const queue = followUpsToReview(s);
  const decided = s.followUps.filter((f) => f.status !== "Awaiting review");
  const auto = s.controls.followUpAuto;
  const cadence = s.controls.cadence;
  const valueOf = (f: FollowUp) => { const cx = followContext(s, f); return cx.value === null ? 0 : eurEq(cx.value, cx.currency); };
  const groups = FOLLOW_KINDS.map((k) => {
    const list = queue.filter((f) => f.kind === k).sort((a, b) => followDue(a) - followDue(b));
    return { k, list, value: list.reduce((n, f) => n + valueOf(f), 0) };
  });
  const atStake = groups.reduce((n, g) => n + g.value, 0);
  const pastDue = queue.filter((f) => followDue(f) < Date.now()).length;
  const lastScan = s.runs.filter((r) => r.agentId === "followup" && r.at <= Date.now()).sort((a, b) => b.at - a.at)[0];
  const toggleCadence = (d: number) =>
    setControl({ cadence: cadence.includes(d) ? cadence.filter((x) => x !== d) : [...cadence, d].sort((a, b) => a - b) });

  return (
    <Page>
      <PageHead title="Follow-ups"
        sub="Chases for quiet customers, open quotes and payment promises. Each one is drafted and waits here for your decision." />

      <Card pad="18px 20px" tone={auto ? "warn" : undefined}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "18px 30px", alignItems: "center" }}>
          <div style={{ flex: "2 1 400px", minWidth: 0 }}>
            <Row gap={9}>
              <span style={{ color: auto ? "var(--warn)" : "var(--accent)", display: "inline-flex" }}><Icon d={auto ? I.alert : I.lock} size={16} /></span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.2px" }}>
                {auto ? "Automatic chasing is on." : "Automatic chasing is off. Nothing is sent without your approval."}
              </span>
            </Row>
            <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 7, lineHeight: 1.55 }}>
              The Follow-up Agent drafts each chase and parks it here. Approve it, snooze it or dismiss it.
            </div>
            <Row wrap gap={18} style={{ marginTop: 14 }}>
              <Toggle on={auto} onChange={() => setControl({ followUpAuto: !auto })} label="Automatic chasing" />
              <Row gap={6} wrap>
                <span style={{ fontSize: 12, color: "var(--dim)", marginRight: 2 }}>Follow-up timing</span>
                {CADENCE_OPTIONS.map((d) => (
                  <Chip key={d} on={cadence.includes(d)} onClick={() => toggleCadence(d)}
                    title={(cadence.includes(d) ? "Stop suggesting " : "Suggest ") + d + "-day follow-ups"}>{d} days</Chip>
                ))}
              </Row>
            </Row>
          </div>
          <MiniStat style={{ flex: "1 1 120px" }} label="To review" value={num(queue.length)} sub={num(pastDue) + " past their suggested date"} />
          <MiniStat style={{ flex: "1 1 120px" }} label="Value waiting" value={moneyShort(atStake)} sub={EUR_EQ + " on the records behind them"} />
          <MiniStat style={{ flex: "1 1 160px" }} label="Last agent scan" value={lastScan ? stamp(lastScan.at) : "Not yet"}
            sub={lastScan ? lastScan.outcome : "The Follow-up Agent has not run yet."} />
        </div>
        {auto && (
          <Note tone="warn" style={{ marginTop: 16 }}>
            Niall asked for approval before any follow-up goes out. With this on, the Follow-up Agent would send chases on their timing
            without asking first. In this demo nothing is sent either way.
          </Note>
        )}
      </Card>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: "3 1 620px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {groups.map((g) => <Group key={g.k} s={s} kind={g.k} list={g.list} value={g.value} cadence={cadence} />)}
        </div>
        <div style={{ flex: "1 1 270px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 8 }}>
          <Card title="Waiting by kind" hint={"Value of the record behind each follow-up, " + EUR_EQ}>
            <BarList items={groups.map((g) => ({ key: g.k, label: g.k, value: Math.round(g.value), note: plural(g.list.length, "draft") }))}
              format={(n) => moneyShort(n)} />
          </Card>
          <Decided s={s} list={decided} />
          <EurEqNote />
        </div>
      </div>
    </Page>
  );
}

function Group({ s, kind, list, value, cadence }: { s: MMState; kind: FollowUpKind; list: FollowUp[]; value: number; cadence: number[] }) {
  const broken = kind === "Payment promise"
    ? list.filter((f) => !!f.invoiceId && !!ix(s).invoice[f.invoiceId]?.promise?.broken).length : 0;
  const hint = FOLLOW_HINT[kind] + (broken ? " " + plural(broken, "promise") + " already broken." : "");
  return (
    <Card pad="16px 12px 6px"
      title={<Row gap={8} style={{ paddingLeft: 8 }}>{kind}<Badge tone={list.length ? "warn" : "neutral"}>{num(list.length)}</Badge></Row>}
      hint={<span style={{ display: "block", paddingLeft: 8 }}>{hint}</span>}
      right={<span style={{ fontSize: 12, color: "var(--dim)", paddingRight: 8, whiteSpace: "nowrap" }}>{moneyShort(value)} {EUR_EQ}</span>}>
      {list.length === 0
        ? <div style={{ fontSize: 12.5, color: "var(--faint)", padding: "4px 10px 12px" }}>Nothing waiting here.</div>
        : list.map((f) => <Item key={f.id} s={s} f={f} cadence={cadence} />)}
    </Card>
  );
}

function Item({ s, f, cadence }: { s: MMState; f: FollowUp; cadence: number[] }) {
  const [open, setOpen] = useState(false);
  const c = customerOf(s, f.customerId);
  const ct = s.contacts.find((x) => x.id === c.contactId);
  const cx = followContext(s, f);
  const due = followDue(f);
  const late = due < Date.now();
  const timingOn = cadence.includes(f.dueInDays);
  const promise = f.invoiceId ? ix(s).invoice[f.invoiceId]?.promise : undefined;
  const openRecord = () => openPanel("followup", f.id);
  const who = [ct?.name, promise ? (promise.broken ? "promise broken " : "promised to pay ") + until(promise.date) : ""].filter(Boolean).join(", ");

  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      <div role="button" tabIndex={0} onClick={openRecord} onKeyDown={onKeyActivate(openRecord)} className="mm-row"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px", padding: "11px 10px", borderRadius: 12, cursor: "pointer" }}>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <Row gap={7}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", ...ELLIPSIS }}>{c.name}</span>
            <CountryTag c={c.country} />
            {!timingOn && (
              <span title={f.dueInDays + "-day follow-ups are switched off in your timing. This one stays here until you decide."}
                style={{ display: "inline-flex" }}><Badge>Timing off</Badge></span>
            )}
          </Row>
          <div style={{ fontSize: 11.5, color: promise?.broken ? "var(--bad)" : "var(--faint)", marginTop: 3, ...ELLIPSIS }}>{who}</div>
          <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3, ...ELLIPSIS }}>
            Last touch {since(f.lastTouch)} · <span style={{ color: late ? "var(--warn)" : "var(--body)" }}>{f.dueInDays}-day timing, due {until(due)}</span>
          </div>
        </div>
        <button onClick={(ev) => { ev.stopPropagation(); openPanel(cx.kind, cx.id); }} title={"Open " + cx.id} className="mm-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 28, padding: "0 11px", borderRadius: 999, cursor: "pointer",
            border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--body)", fontSize: 12, fontFamily: "inherit", flex: "none" }}>
          <span style={{ ...MONO, fontSize: 11, color: "var(--dim)" }}>{cx.id}</span>
          {cx.value !== null && <span style={{ color: "var(--ink)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(cx.value, cx.currency)}</span>}
        </button>
        <Row gap={6} wrap>
          <Button size="sm" kind="ghost" icon={I.edit} onClick={() => setOpen(!open)}>{open ? "Hide draft" : "Draft"}</Button>
          <Button size="sm" kind="ok" icon={I.check} onClick={() => decideFollowUp(f.id, "Approved")}>Approve</Button>
          <Button size="sm" icon={I.clock} onClick={() => decideFollowUp(f.id, "Snoozed")}>Snooze</Button>
          <Button size="sm" kind="ghost" icon={I.x} onClick={() => decideFollowUp(f.id, "Dismissed")}>Dismiss</Button>
        </Row>
      </div>
      {open && (
        <div style={{ padding: "2px 10px 14px" }}>
          <TextArea value={f.draft} onChange={(v) => setFollowUpDraft(f.id, v)} rows={6} />
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>
            Edits stay with this follow-up. Approving sends it as written. Simulated in this demo: nothing is sent.
          </div>
        </div>
      )}
    </div>
  );
}

function Decided({ s, list }: { s: MMState; list: FollowUp[] }) {
  const [open, setOpen] = useState(false);
  const by = (st: FollowUp["status"]) => list.filter((f) => f.status === st).length;
  return (
    <Card title="Decided today"
      hint={list.length ? num(by("Approved")) + " approved, " + num(by("Snoozed")) + " snoozed, " + num(by("Dismissed")) + " dismissed"
        : "Nothing decided yet. Approved, snoozed and dismissed follow-ups land here."}
      right={list.length ? <Button size="sm" kind="ghost" onClick={() => setOpen(!open)}>{open ? "Hide" : "Show " + num(list.length)}</Button> : undefined}>
      {open && list.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {list.map((f) => {
            const c = customerOf(s, f.customerId);
            const openIt = () => openPanel("followup", f.id);
            return (
              <div key={f.id} role="button" tabIndex={0} onClick={openIt} onKeyDown={onKeyActivate(openIt)} className="mm-row"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 6px", borderRadius: 10, cursor: "pointer", borderTop: "1px solid var(--border)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--ink)", ...ELLIPSIS }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--faint)" }}>{f.kind}</div>
                </div>
                <Status s={f.status} />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
