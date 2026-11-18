/* Mega Mass Europe: the typed business model every Pulse module reads.
   One shared store (store.ts) holds these records; every count, KPI and badge
   is derived from them (select.ts), never typed in by hand. */

export type Currency = "EUR" | "GBP";
export type Country =
  | "IT" | "NL" | "FR" | "DE" | "ES" | "SK" | "IE" | "GB"
  | "BE" | "PL" | "AT" | "PT" | "DK" | "CZ" | "SE";

export type CustomerType =
  | "Commercial gym"
  | "Independent gym"
  | "Performance facility"
  | "Individual buyer"
  | "Wholesale distributor"
  | "Reseller";

export type Qualification =
  | "Retail"
  | "Commercial gym"
  | "Wholesale / distributor"
  | "Returning customer"
  | "High-value project"
  | "Incomplete enquiry";

export interface Customer {
  id: string;
  name: string;
  city: string;
  country: Country;
  type: CustomerType;
  currency: Currency;
  contactId: string;
  since: string; // ISO date the record was created
  returning: boolean;
  note?: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  customerId?: string;
  supplierId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  kind: "Carrier" | "Manufacturer";
  region: string;
  lanes: string;
  email: string;
  workflow: string;
  confirmed: boolean;
  note: string;
}

export type Series = "Linear" | "Xpload" | "Flex" | "X-Series" | "Squat & Lower Body" | "Classic";

export interface Product {
  id: string; // SKU
  slug: string;
  name: string;
  series: Series;
  range: string; // range as the website groups it
  category: "Row" | "Press" | "Pulldown" | "Squat" | "Lower body";
  image: string;
  weightKg: number | null; // from the published catalogue, null where TBC
  dims: string | null; // H x W x L as published, null where TBC
  websiteLabel: string; // availability wording on megamasseurope.com
  eur: number; // private price book, demo values
  gbp: number;
  inStock: number; // physically in the County Derry warehouse (demo assumption)
}

export type EnquiryStage =
  | "New"
  | "Qualified"
  | "Freight Requested"
  | "Quote Ready"
  | "Quote Sent"
  | "Won"
  | "Lost";

export type EnquirySource = "Website quote form" | "Email" | "Instagram" | "Phone" | "Referral";
export type Priority = "High" | "Medium" | "Low";

export interface Line {
  productId: string;
  qty: number;
}

export interface Enquiry {
  id: string;
  customerId: string;
  contactId: string;
  source: EnquirySource;
  heardVia: string;
  facility: string; // facility type as chosen on the website form
  receivedAt: number;
  lastContactAt: number;
  stage: EnquiryStage;
  replied: boolean; // has Mega Mass answered at all
  awaitingCustomer: boolean; // answered, waiting on the customer
  priority: Priority;
  owner: string;
  lines: Line[];
  initialLines?: Line[]; // what was first asked for, when the request grew
  qualification: Qualification;
  missing: string[];
  aiAction: string;
  message: string;
  postcode: string | null;
  draftReply: string;
  quoteId?: string;
  lostReason?: string;
}

export type QuoteStatus =
  | "Draft"
  | "Awaiting Freight"
  | "Ready for Review"
  | "Approved"
  | "Sent"
  | "Accepted"
  | "Declined"
  | "Expired";

export interface QuoteLine {
  productId: string;
  qty: number;
  unitPrice: number; // in the quote currency
  listPrice: number; // price-book value at the time of quoting
}

export interface Quote {
  id: string;
  enquiryId: string;
  customerId: string;
  currency: Currency;
  lines: QuoteLine[];
  freightId?: string;
  status: QuoteStatus;
  createdAt: number;
  updatedAt: number;
  validDays: number;
  sentAt?: number;
  decidedAt?: number;
  preparedBy: string;
  notes: string[];
  overrideRequested?: string; // why a price override is pending review
}

export type FreightStatus =
  | "To request" // drafted, waiting for approval to send
  | "Awaiting rate"
  | "Rate received"
  | "Booked"
  | "Dispatched"
  | "Delivered";

export interface CarrierQuote {
  cost: number;
  currency: Currency;
  ref: string;
  eta: string;
  validUntil: string;
  exclusions: string;
  receivedAt: number;
}

export interface FreightRequest {
  id: string;
  quoteId?: string;
  orderId?: string;
  enquiryId?: string;
  customerId: string;
  carrierId: string;
  collection: string;
  destination: string; // city + country, as known
  lines: Line[];
  requestedAt: number | null;
  status: FreightStatus;
  carrierQuote?: CarrierQuote;
  markupPct: number;
  charge?: number; // agreed customer charge, when fixed on an order
  missing: string[];
  service: string;
  chases: number;
}

export type InvoiceStatus = "Draft" | "Sent" | "Overdue" | "Part paid" | "Paid";

export interface PaymentPromise {
  date: number;
  amount: number;
  note: string;
  broken: boolean;
}

export interface Invoice {
  id: string; // FreshBooks number
  customerId: string;
  orderId: string;
  currency: Currency;
  amount: number;
  issuedAt: number;
  dueAt: number;
  promise?: PaymentPromise;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: Currency;
  at: number;
  method: string;
}

export type OrderStatus =
  | "Quote accepted"
  | "Invoice created"
  | "Payment pending"
  | "Payment confirmed"
  | "Equipment allocated"
  | "Dispatched"
  | "Delivered";

export interface Order {
  id: string;
  quoteId: string;
  customerId: string;
  invoiceId?: string;
  freightId?: string;
  currency: Currency;
  lines: QuoteLine[];
  freightCharge: number;
  status: OrderStatus;
  acceptedAt: number;
  dispatchedAt?: number;
  deliveredAt?: number;
  eta?: string;
}

export interface Reservation {
  id: string;
  productId: string;
  customerId: string;
  orderId: string;
  units: number;
  source: "Warehouse stock" | "Incoming";
  shipmentId?: string;
  allocatedAt: number;
  window: string;
  status: "Reserved" | "Awaiting arrival" | "Released to dispatch";
}

export interface IncomingShipment {
  id: string;
  name: string;
  eta: string;
  confirmed: boolean;
  lines: { productId: string; units: number }[];
  note: string;
}

export type FollowUpKind =
  | "No reply"
  | "Quote decision"
  | "Payment promise"
  | "No first response"
  | "Going cold";

export interface FollowUp {
  id: string;
  kind: FollowUpKind;
  customerId: string;
  enquiryId?: string;
  quoteId?: string;
  invoiceId?: string;
  dueInDays: 3 | 7 | 14 | 30;
  lastTouch: number;
  value: number | null;
  currency: Currency;
  draft: string;
  status: "Awaiting review" | "Approved" | "Snoozed" | "Dismissed";
}

export type ApprovalKind =
  | "Customer quotation"
  | "Price review"
  | "Freight request"
  | "Payment follow-up";

export interface Approval {
  id: string;
  kind: ApprovalKind;
  action: string;
  customerId: string;
  recordKind: RecordKind;
  recordId: string;
  amount: number | null;
  currency: Currency;
  status: "Ready" | "Needs action" | "Approved" | "Held";
  preparedBy: string;
  createdAt: number;
  pinned?: number; // order on Home
  context: string;
}

export type RecordKind =
  | "customer"
  | "enquiry"
  | "quote"
  | "freight"
  | "invoice"
  | "order"
  | "product"
  | "shipment"
  | "followup"
  | "supplier";

export interface Email {
  id: string;
  recordKind: RecordKind;
  recordId: string;
  customerId?: string;
  supplierId?: string;
  direction: "in" | "out" | "draft";
  from: string;
  to: string;
  at: number;
  subject: string;
  body: string;
}

export type ActivitySource = "Website" | "Gmail" | "FreshBooks" | "Pulse" | "Agent" | "Drive" | "Carrier";

export interface ActivityEvent {
  id: string;
  at: number;
  actor: string;
  actorKind: "person" | "agent" | "system";
  source: ActivitySource;
  title: string;
  detail: string;
  recordKind: RecordKind;
  recordId: string;
  customerId?: string;
  attention?: boolean;
  simulated?: boolean;
}

export type AgentId =
  | "briefing"
  | "ops"
  | "enquiry"
  | "quote"
  | "freight"
  | "followup"
  | "receivables"
  | "intel";

export interface AgentRun {
  id: string;
  agentId: AgentId;
  at: number;
  title: string;
  outcome: string;
  status: "Completed" | "Waiting on Niall" | "Flagged" | "Skipped";
  recordKind: RecordKind;
  recordId: string;
  durationSec: number;
}

export interface Task {
  id: string;
  title: string;
  owner: string;
  due: number;
  priority: Priority;
  dept: "Sales" | "Freight" | "Finance" | "Stock" | "Systems";
  status: "Not started" | "In progress" | "Waiting" | "Done";
  recordKind: RecordKind;
  recordId: string;
}

export interface Toast {
  id: number;
  text: string;
  sub?: string;
}

export interface Controls {
  followUpAuto: boolean; // automatic chasing: off by default, Niall asked for it
  cadence: number[]; // follow-up timing in days
  defaultMarkup: number;
  requireApproval: Record<string, boolean>;
  agentsOn: Record<AgentId, boolean>;
}

export interface PanelRef {
  kind: RecordKind;
  id: string;
}

export interface MMState {
  now: number;
  customers: Customer[];
  contacts: Contact[];
  suppliers: Supplier[];
  products: Product[];
  enquiries: Enquiry[];
  quotes: Quote[];
  freight: FreightRequest[];
  invoices: Invoice[];
  payments: Payment[];
  orders: Order[];
  reservations: Reservation[];
  shipments: IncomingShipment[];
  followUps: FollowUp[];
  approvals: Approval[];
  emails: Email[];
  activity: ActivityEvent[];
  runs: AgentRun[];
  tasks: Task[];
  controls: Controls;
  panel: PanelRef | null;
  toasts: Toast[];
  builderQuoteId: string;
  seq: number;
}
