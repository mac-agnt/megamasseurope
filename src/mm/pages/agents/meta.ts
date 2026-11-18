import type { AgentId } from "../../types";

/* What each of the eight Mega Mass agents is for. Names and tints come from
   AGENT_META in ui.tsx; this file adds the job description, what each agent
   watches, the data it reads and the approval rules that bind it. */

export const AGENT_ORDER: AgentId[] = ["briefing", "ops", "enquiry", "quote", "freight", "followup", "receivables", "intel"];

/** Keys of controls.requireApproval, in the order the brief lists them. */
export type RuleKey = "quotes" | "emails" | "overrides" | "markups" | "stock" | "payments";
export const RULES: RuleKey[] = ["quotes", "emails", "overrides", "markups", "stock", "payments"];
export const RULE_LABEL: Record<RuleKey, string> = {
  quotes: "Customer quotations",
  emails: "Customer emails",
  overrides: "Price overrides",
  markups: "Freight markups",
  stock: "Stock commitments",
  payments: "Payment follow-ups",
};

export type Profile = {
  job: string;
  watches: string[];
  reads: string[];
  rules: RuleKey[];
  limits: string;
  /** How its waiting work is shown: approvals it prepared, or what it has flagged. */
  mode: "approvals" | "briefing" | "flags" | "insights";
};

export const PROFILE: Record<AgentId, Profile> = {
  briefing: {
    job: "Summarises daily performance and what needs Niall.",
    watches: ["New enquiries overnight", "Approvals waiting for you", "Overdue invoices and payment promises"],
    reads: ["Pulse records", "Gmail", "FreshBooks"],
    rules: [],
    limits: "Writes the briefing on Home and never contacts anyone.",
    mode: "briefing",
  },
  ops: {
    job: "Finds stalled workflows, unanswered requests and outstanding freight quotes.",
    watches: ["Enquiries without a first response", "Carrier rates older than 3 days", "Quotes with no decision after 7 days", "Website availability wording"],
    reads: ["Website quote form", "Gmail", "Carrier emails", "Product catalogue"],
    rules: [],
    limits: "Flags problems and never acts on them.",
    mode: "flags",
  },
  enquiry: {
    job: "Reads enquiries, extracts machines, quantities and delivery details, and prepares a reply.",
    watches: ["Website quote form submissions", "The sales and info inboxes", "Missing postcodes and quantities"],
    reads: ["Website quote form", "Gmail", "Product catalogue"],
    rules: ["emails"],
    limits: "Every reply waits for your approval.",
    mode: "approvals",
  },
  quote: {
    job: "Assembles quotes from the private EUR and GBP price lists, with freight added once the carrier replies.",
    watches: ["Qualified enquiries", "Carrier rates received", "Customer questions on price"],
    reads: ["Price books (EUR and GBP)", "Freight requests", "Stock levels", "Google Drive"],
    rules: ["quotes", "overrides", "stock"],
    limits: "Never discounts. Any price override comes to you.",
    mode: "approvals",
  },
  freight: {
    job: "Prepares carrier requests, reads carrier replies and applies the configured markup.",
    watches: ["Quotes that need freight", "Carrier replies in Gmail", "Rates outstanding over 3 days"],
    reads: ["Carrier emails", "Gmail", "Machine weights and dimensions"],
    rules: ["markups"],
    limits: "Never prices freight before a carrier replies and never books transport. Requests wait for your approval.",
    mode: "approvals",
  },
  followup: {
    job: "Finds inactive opportunities and drafts optional follow-ups. Auto-sending is off.",
    watches: ["Customers who went quiet", "Quotes awaiting a decision", "Payment promises"],
    reads: ["Gmail", "Pulse records"],
    rules: ["emails"],
    limits: "Drafts only. Nothing is chased automatically.",
    mode: "approvals",
  },
  receivables: {
    job: "Flags unpaid FreshBooks invoices and drafts payment follow-ups.",
    watches: ["Invoices past their due date", "Payment promises", "Payments received"],
    reads: ["FreshBooks", "Gmail"],
    rules: ["payments", "emails"],
    limits: "Reads FreshBooks and never changes it.",
    mode: "approvals",
  },
  intel: {
    job: "Analyses conversion, markets, products and lost opportunities.",
    watches: ["Conversion at each stage", "Markets and machines", "Lost deals and their reasons"],
    reads: ["Pulse records", "FreshBooks", "Website quote form"],
    rules: [],
    limits: "Reports into Insights and never contacts anyone.",
    mode: "insights",
  },
};

/** Questions for the "Ask an agent" card. Pulse routes them to the Home chat. */
export const ASK_EXAMPLES = [
  "Show me customers in France waiting on shipping",
  "Why has the Danube Strength quote not gone out?",
  "Prepare replies to my unanswered enquiries",
  "Who owes us money?",
];

/** Where an agent card's "open" link goes: page, then tab when the page has one. */
export const AGENT_HOME: Record<AgentId, [string, string?]> = {
  briefing: ["Home"],
  ops: ["Enquiries", "inbox"],
  enquiry: ["Enquiries", "inbox"],
  quote: ["Quotes", "approvals"],
  freight: ["Freight", "requests"],
  followup: ["Enquiries", "followups"],
  receivables: ["Orders", "invoices"],
  intel: ["Insights", "executive"],
};
