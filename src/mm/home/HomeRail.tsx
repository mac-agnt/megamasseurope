import { useState } from "react";
import { approve, go, holdApproval, openPanel, setBuilderQuote, useMM } from "../store";
import { HISTORY, customerOf, headline, openApprovals } from "../select";
import type { Approval, MMState } from "../types";
import { money } from "../format";
import { Avatar, Badge, Button, I, Icon, MONO, Status } from "../ui";

/* Right-rail widgets on Home: the morning briefing and the approval queue.
   The centre column stays clean; these carry the numbers. */

const shell = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)",
  boxShadow: "var(--card-shadow)", padding: "16px 16px 14px",
} as const;

export function HomeBriefing() {
  const s = useMM();
  const h = headline(s);
  const [open, setOpen] = useState(true);
  return (
    <div style={{ ...shell, background: "linear-gradient(180deg, var(--accent-faint), transparent 70%), var(--surface)", borderColor: "var(--accent-line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name="Briefing" size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Morning briefing</div>
          <div style={{ ...MONO, fontSize: 9.5, color: "var(--faint)", letterSpacing: ".1em", marginTop: 2 }}>BRIEFING AGENT · 07:00</div>
        </div>
        <button onClick={() => setOpen(!open)} title={open ? "Collapse" : "Expand"}
          style={{ width: 26, height: 26, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", color: "var(--dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={I.chevron} size={12} stroke={2.2} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .2s var(--ease)" }} />
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "var(--body)", display: "flex", flexDirection: "column", gap: 9, animation: "expandIn .28s var(--ease) both" }}>
          <p style={{ margin: 0 }}>
            Niall, <b style={{ color: "var(--ink)" }}>{h.unanswered} enquiries</b> need responses, and <b style={{ color: "var(--ink)" }}>{h.freightOutstanding} shipments</b> are waiting on carrier prices.
          </p>
          <p style={{ margin: 0 }}>
            I've prepared <b style={{ color: "var(--ink)" }}>{h.quotesAwaiting} customer quotations</b> for your approval. {h.promises === 3 ? "Three" : h.promises} customers have outstanding payment commitments.
          </p>
          <p style={{ margin: 0 }}>
            A Dutch reseller wants ten T-Bar Linear Rows, and a Slovakian customer has grown a one-machine enquiry into a full equipment order.
          </p>
          <p style={{ margin: 0 }}>
            I've also found <b style={{ color: "var(--ink)" }}>{h.followUps} possible follow-ups</b>. None will be sent without your approval.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "9px 10px", borderRadius: 10, background: "var(--surface-2)", fontSize: 11.5, color: "var(--dim)", lineHeight: 1.45 }}>
            <Icon d={I.inbox} size={13} style={{ marginTop: 2 }} />
            <span>You counted <b style={{ color: "var(--body)" }}>{HISTORY.reported} quotation requests</b> between Sat 14 and Tue 17 Nov. A historical figure, not from a connected system.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function edit(s: MMState, a: Approval) {
  if (a.recordKind === "quote") { setBuilderQuote(a.recordId); go("Quotes", "builder"); return; }
  if (a.recordKind === "freight") { go("Freight", "requests"); return; }
  if (a.recordKind === "invoice") { go("Orders", "invoices"); return; }
  openPanel(a.recordKind, a.recordId);
  void s;
}

function ApprovalRow({ a, s, i }: { a: Approval; s: MMState; i: number }) {
  const c = customerOf(s, a.customerId);
  const value = a.amount === null ? "Pending" : money(a.amount, a.currency);
  return (
    <div onClick={() => openPanel(a.recordKind, a.recordId)} className="mm-row"
      style={{ padding: "11px 6px 11px", margin: "0 -6px", borderTop: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", animation: "rowIn .34s var(--ease) both", animationDelay: i * 40 + "ms" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: a.amount === null ? "var(--faint)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.action}</span>
        <Status s={a.status} />
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 9 }}>
        <Button kind="primary" size="sm" icon={I.check} onClick={() => approve(a.id)}>{a.kind === "Freight request" ? "Send" : a.kind === "Price review" ? "Hold price" : "Approve"}</Button>
        <Button size="sm" onClick={() => openPanel(a.recordKind, a.recordId)}>Review</Button>
        <Button size="sm" onClick={() => edit(s, a)}>Edit</Button>
        <Button size="sm" kind="ghost" onClick={() => holdApproval(a.id)}>Hold</Button>
        <Button size="sm" kind="ghost" icon={I.mail} title="View correspondence" onClick={() => openPanel(a.recordKind, a.recordId)} />
      </div>
    </div>
  );
}

export function HomeApprovals() {
  const s = useMM();
  const open = openApprovals(s);
  const top = open.slice(0, 4);
  return (
    <div style={shell}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>Requires your approval</div>
        <Badge tone="accent">{open.length} waiting</Badge>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginBottom: 6 }}>Prepared by the agents. Nothing goes out until you say yes.</div>
      {top.map((a, i) => <ApprovalRow key={a.id} a={a} s={s} i={i} />)}
      {open.length === 0 && <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12.5, color: "var(--dim)", borderTop: "1px solid var(--border)" }}>Nothing needs you right now.</div>}
      {open.length > 4 && (
        <button onClick={() => go("Work", "approvals")} style={{ marginTop: 10, width: "100%", height: 34, border: "1px solid var(--border)", borderRadius: 999,
          background: "var(--surface-2)", color: "var(--body)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {open.length - 4} more in the approval queue <Icon d={I.arrow} size={13} stroke={2} />
        </button>
      )}
    </div>
  );
}
