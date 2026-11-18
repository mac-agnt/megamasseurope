import type { MMState } from "./types";
import { followUpsToReview, freightOutstanding, freightToRequest, openApprovals, overdueInvoices, quotesForApproval, unanswered } from "./select";

/* The Mega Mass modules that sit in the side rail beside Pulse's own pages.
   Top-bar tabs for each come from here (PulseLogic reads this for contextNav).
   Counts are live from the store. */

export type Tab = { id: string; label: string; count?: (s: MMState) => number };
export type Module = { page: string; label: string; icon: string; hint: string; search: string; tabs: Tab[] };

export const MODULES: Module[] = [
  { page: "Enquiries", label: "Enquiries", icon: "mmInbox", hint: "ENQUIRIES", search: "Search enquiries, customers, machines",
    tabs: [
      { id: "inbox", label: "Inbox", count: (s) => unanswered(s).length },
      { id: "qualification", label: "Qualification" },
      { id: "pipeline", label: "Pipeline" },
      { id: "followups", label: "Follow-ups", count: (s) => followUpsToReview(s).length },
    ] },
  { page: "Quotes", label: "Quotes", icon: "mmQuote", hint: "QUOTES", search: "Search quotes",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "builder", label: "Quote Builder" },
      { id: "approvals", label: "Approvals", count: (s) => quotesForApproval(s).length },
      { id: "sent", label: "Sent Quotes" },
      { id: "pricebooks", label: "Price Books" },
    ] },
  { page: "Freight", label: "Freight", icon: "mmTruck", hint: "FREIGHT", search: "Search freight requests and carriers",
    tabs: [
      { id: "requests", label: "Requests", count: (s) => freightToRequest(s).length },
      { id: "awaiting", label: "Awaiting Rates", count: (s) => freightOutstanding(s).length },
      { id: "review", label: "Rate Review" },
      { id: "dispatch", label: "Dispatch" },
    ] },
  { page: "Orders", label: "Orders", icon: "mmOrder", hint: "ORDERS · FRESHBOOKS", search: "Search orders and invoices",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "confirmed", label: "Confirmed Orders" },
      { id: "invoices", label: "Invoices", count: (s) => overdueInvoices(s).length },
      { id: "payments", label: "Payments" },
      { id: "fulfilment", label: "Fulfilment" },
    ] },
  { page: "Stock", label: "Products & Stock", icon: "mmBox", hint: "PRODUCTS & STOCK", search: "Search machines",
    tabs: [
      { id: "catalogue", label: "Catalogue" },
      { id: "availability", label: "Availability" },
      { id: "incoming", label: "Incoming Stock" },
      { id: "reservations", label: "Reservations" },
    ] },
  { page: "Insights", label: "Insights", icon: "mmChart", hint: "INSIGHTS", search: "Search metrics",
    tabs: [
      { id: "executive", label: "Executive" },
      { id: "funnel", label: "Conversion Funnel" },
      { id: "markets", label: "Markets" },
      { id: "sales", label: "Sales Performance" },
      { id: "risk", label: "Revenue at Risk" },
    ] },
];

export const MODULE_BY_PAGE: Record<string, Module> = Object.fromEntries(MODULES.map((m) => [m.page, m]));

/* Tabs added to Pulse's own pages. */
export const AGENT_TABS: Tab[] = [
  { id: "details", label: "Agent Details" },
  { id: "runs", label: "Run History" },
];

export const approvalsOpen = (s: MMState) => openApprovals(s).length;
