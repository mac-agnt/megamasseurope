import type { AgentId, AgentRun, Currency, MMState, RecordKind } from "../../types";
import { AGENT_META } from "../../ui";
import {
  enquiryCurrency, enquiryValue, followUpsToReview, funnel, headline, ix, lateRates, openApprovals, productDemand, stockOf, unanswered,
} from "../../select";
import { money, num, pct, plural, since } from "../../format";
import { CONTINENTAL, DAY, joinNames, leaders, marketTable, share, sum, unitsOf } from "../insights/calc";
import { AGENT_ORDER } from "./meta";

/* Live agent figures. Every count is read from the store, so approving
   something anywhere in Pulse moves these numbers too. */

export const agentName = (id: AgentId) => AGENT_META[id].name;

/** Agent the Run History tab opens filtered to, set by the overview cards just before they navigate. */
export const runsFocus: { agent: AgentId | "all" } = { agent: "all" };
export const agentTint = (id: AgentId) => AGENT_META[id].tint;
export const agentsOn = (s: MMState) => AGENT_ORDER.filter((id) => s.controls.agentsOn[id]).length;

export const runsOf = (s: MMState, id: AgentId) => s.runs.filter((r) => r.agentId === id).sort((a, b) => b.at - a.at);
export const runsSince = (s: MMState, from: number) => s.runs.filter((r) => r.at >= from);
export const runs24 = (s: MMState) => runsSince(s, s.now - DAY);

/** A run that waited on Niall reads as done once every approval it raised has been approved. Held approvals still wait. */
export function runStatus(s: MMState, r: AgentRun): { status: AgentRun["status"]; resolved: boolean } {
  if (r.status !== "Waiting on Niall") return { status: r.status, resolved: false };
  const linked = s.approvals.filter((a) => a.recordId === r.recordId);
  if (linked.length && linked.every((a) => a.status === "Approved")) return { status: "Completed", resolved: true };
  return { status: "Waiting on Niall", resolved: false };
}

export const fmtDuration = (sec: number) => (sec < 60 ? Math.round(sec) + "s" : Math.floor(sec / 60) + "m " + String(Math.round(sec % 60)).padStart(2, "0") + "s");

/* ── what each agent has waiting for Niall ───────────────────────────────── */

export type Pending = {
  key: string; title: string; sub: string; amount: number | null; currency: Currency;
  kind: RecordKind; id: string; status?: string; at: number; draft: boolean;
};

export function pendingFor(s: MMState, id: AgentId) {
  const X = ix(s);
  const cname = (cid: string) => X.customer[cid]?.name ?? cid;
  const approvals: Pending[] = openApprovals(s).filter((a) => a.preparedBy === agentName(id)).map((a) => ({
    key: a.id, title: cname(a.customerId), sub: a.action, amount: a.amount, currency: a.currency, kind: a.recordKind, id: a.recordId,
    status: a.status, at: a.createdAt, draft: false,
  }));
  let drafts: Pending[] = [];
  let draftLabel = "";
  if (id === "enquiry") {
    drafts = unanswered(s).filter((e) => e.draftReply).sort((a, b) => a.receivedAt - b.receivedAt).map((e) => ({
      key: e.id, title: cname(e.customerId), sub: "Reply drafted: " + e.aiAction.charAt(0).toLowerCase() + e.aiAction.slice(1),
      amount: enquiryValue(s, e), currency: enquiryCurrency(s, e), kind: "enquiry" as RecordKind, id: e.id, at: e.receivedAt, draft: true,
    }));
    draftLabel = "drafted replies";
  }
  if (id === "followup") {
    drafts = followUpsToReview(s).sort((a, b) => a.lastTouch - b.lastTouch).map((f) => ({
      key: f.id, title: cname(f.customerId), sub: f.kind + ", draft ready", amount: f.value, currency: f.currency,
      kind: "followup" as RecordKind, id: f.id, at: f.lastTouch, draft: true,
    }));
    draftLabel = "follow-up drafts";
  }
  return { items: approvals.concat(drafts), approvals: approvals.length, drafts: drafts.length, draftLabel };
}

/* ── what the watching agents have flagged ───────────────────────────────── */

export type Flag = { key: string; title: string; sub?: string; n: number; go: [string, string?]; open?: { kind: RecordKind; id: string } };

/** Ops Watchdog: the stall checks it runs, counted live. */
export function opsFlags(s: MMState): Flag[] {
  const X = ix(s);
  const ageing = unanswered(s).filter((e) => s.now - e.receivedAt > 2 * DAY).sort((a, b) => a.receivedAt - b.receivedAt);
  const late = lateRates(s).slice().sort((a, b) => (a.requestedAt ?? 0) - (b.requestedAt ?? 0));
  const quiet = s.quotes.filter((q) => q.status === "Sent" && q.sentAt && s.now - q.sentAt > 7 * DAY).sort((a, b) => (a.sentAt ?? 0) - (b.sentAt ?? 0));
  const website = s.products.filter((p) => /estimated arrival/i.test(p.websiteLabel) && stockOf(s, p).available > 0);
  const cname = (cid: string) => X.customer[cid]?.name ?? cid;
  return [
    { key: "ageing", title: "Enquiries with no reply past 48 hours", n: ageing.length, go: ["Enquiries", "inbox"],
      sub: ageing[0] ? "Oldest: " + cname(ageing[0].customerId) + ", received " + since(ageing[0].receivedAt, s.now) : "None waiting that long",
      open: ageing[0] ? { kind: "enquiry", id: ageing[0].id } : undefined },
    { key: "late", title: "Carrier rates outstanding over 3 days", n: late.length, go: ["Freight", "awaiting"],
      sub: late[0] ? "Longest: " + late[0].id + " to " + late[0].destination.split(",")[0] : "All carriers inside 3 days",
      open: late[0] ? { kind: "freight", id: late[0].id } : undefined },
    { key: "quiet", title: "Quotes with no decision after 7 days", n: quiet.length, go: ["Quotes", "sent"],
      sub: quiet[0] ? "Oldest: " + quiet[0].id + " for " + cname(quiet[0].customerId) : "Every sent quote is inside 7 days",
      open: quiet[0] ? { kind: "quote", id: quiet[0].id } : undefined },
    { key: "website", title: "Website availability text out of date", n: website.length, go: ["Stock", "availability"],
      sub: website.length ? website.map((p) => p.name + ": " + num(stockOf(s, p).available) + " available").join(", ") : "Website wording matches stock",
      open: website[0] ? { kind: "product", id: website[0].id } : undefined },
  ];
}

/** Briefing: the headline numbers in today's briefing. */
export function briefingItems(s: MMState): Flag[] {
  const h = headline(s);
  return [
    { key: "unanswered", title: "Enquiries waiting for a first reply", n: h.unanswered, go: ["Enquiries", "inbox"] },
    { key: "quotes", title: "Quotes ready for your approval", n: h.quotesAwaiting, go: ["Quotes", "approvals"] },
    { key: "freight", title: "Carrier rates outstanding", n: h.freightOutstanding, go: ["Freight", "awaiting"] },
    { key: "overdue", title: "Invoices overdue", n: h.overdueCount, go: ["Orders", "invoices"],
      sub: money(h.overdueValue) + (h.overdueGBP ? " and " + money(h.overdueGBP, "GBP") : "") + " outstanding" },
    { key: "promises", title: "Payment promises open", n: h.promises, go: ["Orders", "invoices"] },
  ];
}

/** Sales Intelligence: findings computed from the records, never typed in. */
export function intelInsights(s: MMState): Flag[] {
  const out: Flag[] = [];
  const top = productDemand(s)[0];
  const requested = sum(s.enquiries.map((e) => unitsOf(e.lines)));
  if (top && top.units > 0) out.push({ key: "product", title: top.product.name + " is " + pct(share(top.units, requested)) + " of machines requested",
    sub: plural(top.units, "unit") + " across " + plural(top.enquiries, "enquiry", "enquiries"), n: top.units, go: ["Insights", "sales"] });
  const rows = marketTable(s);
  const lead = leaders(rows.filter((r) => CONTINENTAL.includes(r.key)), (r) => r.enquiries);
  if (lead.length) out.push({ key: "markets", title: joinNames(lead.map((r) => r.name)) + (lead.length > 1 ? " lead" : " leads") + " continental enquiries",
    sub: lead.map((r) => r.name + " " + num(r.enquiries)).join(", "), n: sum(lead.map((r) => r.enquiries)), go: ["Insights", "markets"] });
  const f = funnel(s);
  const quoted = f.find((x) => x.key === "quoted")?.n ?? 0;
  const accepted = f.find((x) => x.key === "accepted")?.n ?? 0;
  const lost = s.enquiries.filter((e) => e.stage === "Lost");
  const reasons: Record<string, number> = {};
  for (const e of lost) reasons[e.lostReason || "No reason recorded"] = (reasons[e.lostReason || "No reason recorded"] || 0) + 1;
  const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
  out.push({ key: "lost", title: plural(lost.length, "lost deal") + ", " + pct(share(accepted, quoted)) + " of quotes sent became orders",
    sub: topReason ? "Most common reason: " + topReason[0].charAt(0).toLowerCase() + topReason[0].slice(1) + " (" + topReason[1] + ")" : undefined,
    n: lost.length, go: ["Insights", "funnel"] });
  return out;
}

export const sumFlags = (xs: Flag[]) => sum(xs.map((f) => f.n));
