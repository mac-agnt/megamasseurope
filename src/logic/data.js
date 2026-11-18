/* Demo data and helpers for the Pulse prototype, set up for Mega Mass Europe.
   Template copy lives here. Every live figure (Helios answers, Dashboard areas,
   KPI tiles) is read from the Mega Mass store in src/mm, so it always agrees
   with the rest of the app. Every action is simulated: nothing is sent, nothing
   is written to FreshBooks and no transport is booked. */

import { mm, approveQuote, approveReplies, keepListPrice, sendFreightRequest, sendPaymentFollowUp } from "../mm/store";
import {
  ix, contactOf, headline, unanswered, awaitingCustomer, quotesForApproval, freightOutstanding, overdueInvoices,
  outstanding, daysOverdue, invoiceStatus, quoteEquipment, quoteTotal, freightCharge, hasOverride, stockOf,
  openApprovals, followUpsToReview, avgMarkup, carrierStats, eurEq, funnel, enquiriesByDay, orderValue,
  confirmedSales, cashCollected, invoicedTotal, markets, productDemand, enquiryValue, enquiryCurrency, stageCounts,
  lateRates, HISTORY
} from "../mm/select";
import { money, moneyShort, countryName } from "../mm/format";
import { COUNTRY_NAME } from "../mm/seed";

const INK="var(--ink)", BODY="var(--body)", DIM="var(--dim)", FAINT="var(--faint)";
const LIME="var(--accent)", GREEN="var(--ok)", AMBER="var(--warn)", RED="var(--bad)", NEUTRAL="var(--neutral)";
const MONO="var(--mono)";

const ICONS = {
  navHome:"M12 3.2 3.6 9.1v10a1.5 1.5 0 0 0 1.5 1.5h13.8a1.5 1.5 0 0 0 1.5-1.5v-10L12 3.2Z M8.9 13.1h2l1-2.6 1.5 5 1.1-2.4h1.6",
  navAgents:"M12 2.4v2.3 M12 2.4a.9.9 0 1 0 0-.02 M8.2 6.5h7.6A2.2 2.2 0 0 1 18 8.7v5.1a2.2 2.2 0 0 1-2.2 2.2H8.2A2.2 2.2 0 0 1 6 13.8V8.7a2.2 2.2 0 0 1 2.2-2.2Z M9.9 10.6v1.4 M14.1 10.6v1.4 M6 10h-1.9 M18 10h1.9 M9.2 18.6h5.6 M9.2 21.2h5.6",
  navDash:"M4 5.6h7.2v5.1H4V5.6Z M13.6 5.6H20v8.6h-6.4V5.6Z M4 13.1h7.2v5.3H4v-5.3Z M13.6 16.6H20v1.8h-6.4v-1.8Z",
  navWork:"M9.4 4.4h5.2a1.4 1.4 0 0 1 1.4 1.4v1.1h2.4A1.6 1.6 0 0 1 20 8.5v9.1a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.6V8.5a1.6 1.6 0 0 1 1.6-1.6H8V5.8a1.4 1.4 0 0 1 1.4-1.4Z M8 6.9h8 M9.6 13.3l1.8 1.8 3.4-3.6",
  navRecords:"M12 3.6c3.9 0 7 1.1 7 2.5S15.9 8.6 12 8.6 5 7.5 5 6.1 8.1 3.6 12 3.6Z M5 6.1v5.7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6.1 M5 11.8v5.7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5.7",
  navActivity:"M4.6 4.6h14.8A1.6 1.6 0 0 1 21 6.2v11.6a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.8V6.2a1.6 1.6 0 0 1 1.6-1.6Z M6 12.4h2.2l1.5-4.1 2.3 8 1.9-5.4 1.2 1.5H18",
  navAdmin:"M12 2.9 5 5.6v5.9c0 4 2.8 7.1 7 8.6 4.2-1.5 7-4.6 7-8.6V5.6L12 2.9Z M12 8.6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z M8.8 16.3a3.6 3.6 0 0 1 6.4 0",
  helios:"M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4-.8L3 21l1.9-4.9A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z M8 12h1.6l1.2-2.6 1.6 5 1.4-2.4H16",
  inbox:"M3 13h4l1.5 3h7l1.5-3h4 M3 13l2.4-7A2 2 0 0 1 7.3 4.6h9.4a2 2 0 0 1 1.9 1.4L21 13v4.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V13Z",
  work:"M6 4.6h12a1.6 1.6 0 0 1 1.6 1.6v12.2A1.6 1.6 0 0 1 18 20H6a1.6 1.6 0 0 1-1.6-1.6V6.2A1.6 1.6 0 0 1 6 4.6Z M8.4 10.4l1.9 1.9 3.9-3.9 M8.4 15.6h7.2",
  approvals:"M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
  insights:"M4.5 19.5V13 M9.7 19.5V7.5 M14.9 19.5v-8 M20 19.5V5",
  people:"M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9",
  orgs:"M4.5 20V6.4A1.4 1.4 0 0 1 5.9 5h6.2a1.4 1.4 0 0 1 1.4 1.4V20 M13.5 10.5h4.6A1.4 1.4 0 0 1 19.5 12v8 M3 20h18 M7.5 8.5h2.5 M7.5 12h2.5 M7.5 15.5h2.5",
  teams:"M9 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 12Z M16.5 12.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z M2.6 19.6c.8-2.8 3.2-4.4 6.4-4.4s5.6 1.6 6.4 4.4 M17 15.4c2.2.4 3.7 1.8 4.3 4.2",
  locations:"M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z M12 12.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z",
  visits:"M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z M9 13.5l1.6 1.6 3.4-3.4",
  autos:"M18.5 8.5A5 5 0 0 0 8.9 7.3 3.8 3.8 0 0 0 6 14.6 M8 17.5l3.2 3.2 M11.2 20.7l3.2-3.2 M11.2 20.7V9.6",
  health:"M3 12.5h3.4l2-5 3 10 2.2-5H21",
  modules:"M6.6 4.4h10.8a2.2 2.2 0 0 1 2.2 2.2v10.8a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2V6.6a2.2 2.2 0 0 1 2.2-2.2Z M4.4 9.6h15.2 M9.6 19.6V9.6",
  agents:"M8.5 3.6h7A2.4 2.4 0 0 1 17.9 6v5.6a2.4 2.4 0 0 1-2.4 2.4h-7A2.4 2.4 0 0 1 6.1 11.6V6a2.4 2.4 0 0 1 2.4-2.4Z M9.6 8.2h.01 M14.4 8.2h.01 M12 14v2.6 M7.6 20.4h8.8 M12 16.6c-2.4 0-4.4 1.7-4.4 3.8h8.8c0-2.1-2-3.8-4.4-3.8Z",
  dash:"M4.4 4.4h6v6h-6v-6Z M13.6 4.4h6v3.6h-6V4.4Z M13.6 11.6h6v8h-6v-8Z M4.4 14h6v5.6h-6V14Z",
  files:"M5 7.2a1.8 1.8 0 0 1 1.8-1.8h3l1.8 2.2h5.6A1.8 1.8 0 0 1 19 9.4v7.4a1.8 1.8 0 0 1-1.8 1.8H6.8A1.8 1.8 0 0 1 5 16.8V7.2Z",
  pulseLine:"M2.5 12.5h3.6l2.1-6.4 3.2 12.2 2.6-8.4 1.8 2.6h5.7",
  records:"M6.4 3.6h7.4l4.2 4.2v12.6H6.4V3.6Z M13.4 3.8v4.2h4.2 M9 12.4h6 M9 16h4",
  tree:"M4.5 6h5 M4.5 12h5 M4.5 18h5 M12.5 6h7 M12.5 12h7 M12.5 18h7",
  graph:"M7 7.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M17.6 10.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M9.4 21.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M8.6 6.4l7.6 2.6 M15.8 11.4l-5.6 5.2",
  bell:"M6 8.5a6 6 0 0 1 12 0c0 6.5 2.6 8.5 2.6 8.5H3.4S6 15 6 8.5Z M10.3 20.5a1.94 1.94 0 0 0 3.4 0",
  /* Mega Mass modules */
  mmInbox:"M3 13h4l1.5 3h7l1.5-3h4 M3 13l2.4-7A2 2 0 0 1 7.3 4.6h9.4a2 2 0 0 1 1.9 1.4L21 13v4.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V13Z",
  mmQuote:"M6.4 3.6h7.4l4.2 4.2v12.6H6.4V3.6Z M13.4 3.8v4.2h4.2 M9 12h6 M9 15.6h6 M9 8.4h2.6",
  mmTruck:"M2.8 6.4h11v9.4h-11z M13.8 9.4h3.9l2.9 3.1v3.3h-6.8 M6.6 18.4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z M16.8 18.4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z",
  mmOrder:"M4 7.5 12 3.5l8 4v9L12 20.5l-8-4v-9Z M4 7.5l8 4 8-4 M12 11.5v9",
  mmBox:"M5 9.5h14v10H5z M3.6 5.5h16.8v4H3.6z M10 13h4",
  mmChart:"M4.5 19.5V13 M9.7 19.5V7.5 M14.9 19.5v-8 M20 19.5V5"
};

/* Ontology stays first and is never removed (PulseLogic enforces this too). */
const REC_SECTIONS = [
  {id:"ontology", label:"Ontology", blurb:"How every record connects: customer, enquiry, machine, freight, quote, invoice, order and shipment."},
  {id:"files", label:"Files", blurb:"Quotes, carrier rates, price lists and catalogues, indexed so the agents can read them."},
  {id:"contacts", label:"Contacts", blurb:"Everyone Mega Mass deals with: customers, carriers and the team."},
  {id:"customers", label:"Customers", blurb:"Gyms, distributors and buyers across the UK and Europe."},
  {id:"suppliers", label:"Suppliers", blurb:"Carriers and the brand owner, with how each one is worked."},
  {id:"products", label:"Products", blurb:"The Mega Mass range as a record: specs, stock and demand."},
  {id:"orders", label:"Orders", blurb:"Every confirmed order linked to its quote, FreshBooks invoice and freight."}
];

const CONTACTS = [
  ["Niall","Owner, sales and approvals","niall@megamasseurope.com","Mega Mass Europe","staff","var(--accent)"],
  ["Natalie","Technical decisions (role to confirm)","natalie@megamasseurope.com","Mega Mass Europe","staff","#9fd6f0"],
  ["Tomáš Horváth","Owner","tomas@danubestrength.sk","Danube Strength","customer","#e6c78a"],
  ["Daan Visser","Purchasing manager","daan@rotterdamironsupply.nl","Rotterdam Iron Supply","customer","#c8b4f0"],
  ["Camille Laurent","Club manager","camille@lyonperformance.fr","Lyon Performance Club","customer","#a8e0c0"],
  ["Jonas Becker","Managing director","jonas@rheinland-performance.de","Rheinland Performance","watch","#e2a08c"],
  ["Danny Whitaker","Owner","danny@northernpowergym.co.uk","Northern Power Gym","customer","#9fd6f0"],
  ["Marco Bianchi","Owner","marco@milanoperformance.it","Milano Performance Studio","new","#e6c78a"],
  ["Greyhound Express rates desk","European freight rates","Address to confirm","Greyhound Express","to confirm","#c8b4f0"],
  ["Harbour Freight rates desk","UK and Ireland freight rates","Address to confirm","Harbour Freight","to confirm","#a8e0c0"],
  ["Mega Mass US ordering contact","Brand owner, orders and arrival notices","On file in Gmail","Mega Mass (US)","supplier","#e2a08c"]
];

const FILE_TREE = [
  {type:"folder", id:"f-price", name:"Pricing", depth:0},
  {type:"file", id:"fl-1", name:"EUR price list (confidential).xlsx", depth:1, parent:"f-price", indexed:true,
   path:"Pricing / Price lists", title:"EUR price list (confidential)",
   facts:[["TYPE","XLSX · Google Drive"],["ACCESS","Niall, Natalie, Quote Agent"],["INDEXED","For quoting only"],["OWNER","Niall"]],
   body:["The private EUR price list for every customer outside the UK. Everyone pays the same price apart from currency, and there are no automatic trade or volume discounts.",
     "The website never shows a price. The storefront only offers Add to Quote, and the Quote Agent prices from this list.",
     "Any change to a unit price on a quote is a manual override and needs Niall's approval. Prices in this demo are demo values."],
   links:[["Niall","person"],["Danube Strength","org"],["Q-2286","quote"]]},
  {type:"file", id:"fl-2", name:"GBP price list (confidential).xlsx", depth:1, parent:"f-price", indexed:true,
   path:"Pricing / Price lists", title:"GBP price list (confidential)",
   facts:[["TYPE","XLSX · Google Drive"],["ACCESS","Niall, Natalie, Quote Agent"],["INDEXED","For quoting only"],["OWNER","Niall"]],
   body:["GBP prices for customers in the UK. A UK quote is priced from this list only and is never mixed with EUR.",
     "Same rule as the EUR list: one price for everyone in that currency, no automatic discounts, and overrides only with Niall's approval."],
   links:[["Northern Power Gym","org"],["Danny Whitaker","person"],["Q-2293","quote"]]},
  {type:"file", id:"fl-3", name:"Mega Mass catalogue, May 2026.pdf", depth:1, parent:"f-price", indexed:true,
   path:"Pricing / Catalogue", title:"Mega Mass catalogue, May 2026",
   facts:[["TYPE","PDF · catalogue"],["EDITION","May 2026"],["INDEXED","Yes"],["OWNER","Mega Mass Europe"]],
   body:["The published range: 18 machines across the Leverage, Xpload and Linear, and Squat and Lower Body ranges, with weights and dimensions.",
     "Six machines are listed as TBC for dimensions, including the Leverage Chest Press, Leverage Seated Row and X Shoulder Press. The Freight Agent flags these on a rate request instead of guessing.",
     "No prices in the catalogue. Pricing lives in the two confidential price lists."],
   links:[["Mega Mass (US)","org"],["Machine","entity"]]},
  {type:"folder", id:"f-quotes", name:"Quotes and freight", depth:0},
  {type:"file", id:"fl-4", name:"Q-2286 Danube Strength.pdf", depth:1, parent:"f-quotes", indexed:true,
   path:"Quotes and freight / Quotes", title:"Q-2286 Danube Strength",
   facts:[["TYPE","PDF · draft quotation"],["VALUE","€21,915 ex VAT"],["STATUS","Ready for review"],["PREPARED BY","Quote Agent"]],
   body:["Six machines for Danube Strength's new floor in Bratislava: T-Bar Linear Row €2,850, Leverage Chest Press €3,450, Leverage Incline Pro €3,200, X Shoulder Press €3,100, Leverage Seated Row €3,000 and Swing Squat Pro €3,900. Equipment €19,500.",
     "Freight from County Derry with Greyhound Express: €2,100 (ref GX-58213) plus the 15% markup, €2,415. Total €21,915 excluding VAT. VAT treatment is pending confirmation.",
     "The Leverage Chest Press, Incline Pro and Seated Row come from the Flex Series intake due late November, not yet confirmed, so the delivery date follows on receipt. Not sent: waiting for Niall's approval."],
   links:[["Tomáš Horváth","person"],["Danube Strength","org"],["GX-58213","freight"]]},
  {type:"file", id:"fl-5", name:"Greyhound Express rate GX-58213.eml", depth:1, parent:"f-quotes", indexed:true,
   path:"Quotes and freight / Carrier rates", title:"Greyhound Express rate GX-58213",
   facts:[["TYPE","Email · Gmail"],["RATE","€2,100 ex VAT"],["FOR","FR-1206, Bratislava"],["TRANSIT","5 to 7 working days"]],
   body:["Rate for six machines from the County Derry warehouse to Bratislava 821 08: €2,100 excluding VAT, valid 14 days.",
     "Tail-lift not included. Danube Strength has a forklift on site and a ground-floor delivery.",
     "Greyhound Express is the carrier Niall named for Europe. It is not yet confirmed as a supplier record."],
   links:[["Greyhound Express","org"],["Danube Strength","org"],["Q-2286","quote"]]},
  {type:"file", id:"fl-6", name:"Harbour Freight rate HF-71520.eml", depth:1, parent:"f-quotes", indexed:true,
   path:"Quotes and freight / Carrier rates", title:"Harbour Freight rate HF-71520",
   facts:[["TYPE","Email · Gmail"],["RATE","£350 ex VAT"],["FOR","FR-1214, Manchester"],["TRANSIT","Next working day"]],
   body:["Next working day pallet service from County Derry to Manchester M4 6BF: £350 excluding VAT. Tail-lift included, kerbside only.",
     "With the 20% markup the customer charge is £420, so Q-2293 for Northern Power Gym comes to £3,515 excluding VAT, priced in GBP only.",
     "Named on the call as Harbour Freight Manchester. The relationship is still to confirm."],
   links:[["Harbour Freight","org"],["Northern Power Gym","org"],["Q-2293","quote"]]},
  {type:"folder", id:"f-fresh", name:"FreshBooks", depth:0},
  {type:"file", id:"fl-7", name:"FB-1047 Rheinland Performance.pdf", depth:1, parent:"f-fresh", indexed:true,
   path:"FreshBooks / Invoices", title:"FB-1047 Rheinland Performance",
   facts:[["TYPE","PDF · FreshBooks invoice"],["VALUE","€7,880"],["STATUS","18 days overdue"],["OWNER","Niall"]],
   body:["Two Leverage Chest Press at €3,450 each plus €980 freight to Cologne, €7,880 in all. Delivered about five weeks ago.",
     "The due date passed 18 days ago and FreshBooks shows no payment. The Receivables Agent has drafted a polite payment-status email for Niall to approve.",
     "FreshBooks stays the source of truth. Pulse reads the invoice and never changes it."],
   links:[["Jonas Becker","person"],["Rheinland Performance","org"],["FB-1047","invoice"]]},
  {type:"folder", id:"f-stock", name:"Stock", depth:0},
  {type:"file", id:"fl-8", name:"Flex Series November packing list.pdf", depth:1, parent:"f-stock", indexed:true,
   path:"Stock / Incoming", title:"Flex Series November packing list",
   facts:[["TYPE","PDF · packing list"],["UNITS","15"],["ARRIVAL","Late November, not confirmed"],["FILED BY","Natalie"]],
   body:["Five each of Leverage Chest Press, Leverage Incline Pro and Leverage Seated Row for the County Derry warehouse.",
     "9 of the 15 units are already reserved against orders and 6 are unallocated. Danube Strength's quote would take three of them.",
     "Until the date is confirmed, no customer is promised a fixed delivery date from this intake."],
   links:[["Mega Mass (US)","org"],["SH-FLEX-NOV","shipment"],["Danube Strength","org"]]},
  {type:"folder", id:"f-web", name:"Website", depth:0},
  {type:"file", id:"fl-9", name:"Quote form export, November.csv", depth:1, parent:"f-web", indexed:false,
   path:"Website / Quote form", title:"Quote form export, November",
   facts:[["TYPE","CSV · WooCommerce export"],["SOURCE","megamasseurope.com"],["INDEXED","Not indexed"],["OWNER","Natalie"]],
   body:["The fields the quote form collects: first and last name, email, phone, city, zip code, country, facility type, how they heard about Mega Mass, and a free-text note.",
     "On the 17 November call Niall reported 163 quotation requests between Sat 14 and Tue 17 Nov. That is a historical figure, separate from this demo's records.",
     "The form still carries an 'Already an Atlantis client' option. Natalie has a task to remove it."],
   links:[["Natalie","person"],["Milano Performance Studio","org"]]}
];

/* The ontology is drawn around the quote: it is where the enquiry, the price
   lists, the carrier's rate and Niall's approval meet. Positions are unchanged
   from the template so the layout still renders. */
const ONTO_NODES = [
  ["Quote","entity",500,300,1,"Where the work meets: machines at confidential price-list rates, freight with markup, and Niall's approval before anything goes out."],
  ["Enquiry","entity",300,190,1,"A quote request from the website form, Gmail or Instagram. The Enquiry Agent pulls out the machines, facility type and anything missing."],
  ["Invoice","ledger",700,190,0,"Read from FreshBooks, which stays the source of truth for invoices and payments. Mock data in this demo; nothing is written back."],
  ["Customer","entity",250,430,1,"Gyms, distributors and home buyers across the UK and Europe. EUR price list for Europe, GBP for the UK, never mixed."],
  ["Carrier","entity",690,430,0,"Greyhound Express for Europe and Harbour Freight for the UK. Rates arrive by email. Both are still to confirm as supplier records."],
  ["Freight request","entity",850,320,1,"A rate request from the County Derry warehouse. No freight cost is used until the carrier replies; missing postcodes and dimensions are flagged."],
  ["Machine","entity",390,95,0,"The 18 Mega Mass machines, with stock kept simple: in stock, reserved, available and incoming. No public prices."],
  ["Shipment","module",620,95,0,"Incoming stock and dispatches, such as the Flex Series November intake. Arrival dates are only promised once confirmed."],
  ["Contact","entity",860,470,0,"The person behind a customer or carrier record. Niall and Natalie sit here too, scoped by role."],
  ["Order","ledger",140,300,1,"A confirmed sale: the accepted quote, its FreshBooks invoice and the stock allocated to it."],
  ["quoted in","predicate",395,240,0,"Enquiry → Quote. One enquiry can grow, as Danube Strength's did from one machine to six."],
  ["invoiced as","predicate",605,240,0,"Quote → Invoice. Raised in FreshBooks once the customer accepts (simulated in this demo)."],
  ["asked for","predicate",360,370,0,"Customer → Quote. What the customer asked for, priced in their currency."],
  ["ships via","predicate",600,370,0,"Quote → Carrier. The freight line on a quote comes from this carrier's emailed rate plus the markup."],
  ["fulfils","predicate",140,372,0,"Order → Quote. A confirmed order fulfils the quote the customer accepted."]
];

const ONTO_EDGES = [
  [500,300,300,190],[500,300,700,190],[500,300,250,430],[500,300,690,430],
  [500,300,850,320],[500,300,390,95],[500,300,620,95],[500,300,140,300],
  [300,190,250,430],[700,190,860,470],[690,430,850,320],[690,430,860,470],
  [300,190,140,300],[390,95,620,95]
];

const REC_TEMPLATES = [
  ["Field sheet","Records","Labelled fields in a grid. The default for a customer, contact or machine.",
   "M5 5.5h14v13H5v-13Z M5 10h14 M12 10v8.5","grid"],
  ["Contact card","Records","A portrait, key fields and every linked record in one compact panel.",
   "M12 11.5a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z M5.5 19c.8-3 3.3-4.7 6.5-4.7s5.7 1.7 6.5 4.7","card"],
  ["Directory","Records","A sortable table of many records at once, built for lists.",
   "M4.5 6.5h15 M4.5 12h15 M4.5 17.5h15 M4.5 6.5h.01 M4.5 12h.01 M4.5 17.5h.01","rows"],
  ["Timeline","Case work","Ordered events with who did what and when. Good for an enquiry or an order.",
   "M12 3.5v17 M12 7.5h6 M12 13h-6 M12 18h6","timeline"],
  ["Kanban board","Case work","Cards in columns by status. For anything that moves through stages, like quotes.",
   "M5 5h4.5v14H5V5Z M9.75 5h4.5v9h-4.5V5Z M14.5 5H19v6h-4.5V5Z","kanban"],
  ["Checklist","Case work","Ticked steps in order, with an owner and a due date on each.",
   "M5 6.5h2l1.4 1.4L11 5.5 M5 12.5h2l1.4 1.4 2.6-2.4 M5 18.5h2l1.4 1.4 2.6-2.4 M15 6.5h4 M15 12.5h4 M15 18.5h4","checklist"],
  ["Ledger","Finance","Rows and running totals. For anything with amounts and dates.",
   "M4 6h16 M4 12h16 M4 18h16 M9 3.5v17","ledger"],
  ["Invoice","Finance","Line items, totals and a status, built to be sent and not just stored.",
   "M7 3.5h10v17H7v-17Z M9.5 8h5 M9.5 11.5h5 M9.5 15h3","invoice"],
  ["Document","Notes","Long-form text with linked records pulled out down the side.",
   "M7 3.5h7l5 5v12H7v-17Z M14 3.7v5h5 M10 13h6 M10 16.5h4","document"],
  ["Gallery","Notes","A wall of images and files with a caption on each, for a machine or a delivery.",
   "M4.5 6h6v6h-6V6Z M13.5 6h6v6h-6V6Z M4.5 14h6v4h-6v-4Z M13.5 14h6v4h-6v-4Z","gallery"],
  ["Map & locations","Ops","A pinboard of places, with the record's fields beside each pin.",
   "M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z M12 12.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z","map"],
  ["Schedule","Ops","A calendar of bookings against this record, with recurring rules.",
   "M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z","schedule"]
];
const REC_TEMPLATE_CATS = ["All","Records","Case work","Finance","Notes","Ops"];

/* ---- admin hub: six settings tabs ---- */
const PEOPLE = [
  ["Niall","Owner","niall@megamasseurope.com","Mega Mass Europe","active","Admin","Active now"],
  ["Natalie","Technical decisions (role to confirm)","natalie@megamasseurope.com","Mega Mass Europe","active","Standard","2 days ago"]
];
const ROLE_LEVELS = ["Admin","Manager","Standard","External"];
const PERM_KEYS = [["view","View records"],["edit","Edit records"],["approve","Approve quotes and emails"]];
const GRANT_DEFS = [
  ["view","View records","Read anything in scope"],
  ["edit","Edit records","Create and change records"],
  ["approve","Approve decisions","Quotes, emails, overrides, markups"],
  ["pricing","See price lists","Confidential EUR and GBP lists"],
  ["export","Export data","Download and share out"],
  ["agents","Manage agents","Switch agents on or off"],
  ["settings","Change settings","Pricing rules, integrations, roles"],
  ["audit","Read the audit log","Every action, everyone"]
];
const ROLE_SCOPES = ["All records","One market only","Assigned only"];
const DEFAULT_PERMS = {Admin:{view:true,edit:true,approve:true}, Manager:{view:true,edit:true,approve:true},
  Standard:{view:true,edit:true,approve:false}, External:{view:true,edit:false,approve:false}};
/* Nothing here is a live connection. Status labels say demo, mock, inactive,
   archived or email workflow, never connected. */
const INTEGRATIONS = [
  {name:"Mega Mass website", blurb:"The WooCommerce quote form on megamasseurope.com. No prices or checkout on the site: every Add to Quote lands here as an enquiry.", tint:"var(--accent)", status:"demo connection", statusKind:"ok",
   glyph:"M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z M3.5 12h17 M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5 M12 3.5C9.7 5.9 8.6 8.7 8.6 12s1.1 6.1 3.4 8.5",
   lastSync:"Demo snapshot", usage:"Quote requests in, nothing published", auth:"None (demo)", scopes:["Read"]},
  {name:"Google Workspace", blurb:"Accounts for Niall and Natalie, and the sign-in Pulse would use. Nobody signs in through Google in this demo.", tint:"#4285f4", status:"demo connection", statusKind:"ok",
   glyph:"M4.5 4.5h6v6h-6v-6Z M13.5 4.5h6v6h-6v-6Z M4.5 13.5h6v6h-6v-6Z M13.5 13.5h6v6h-6v-6Z",
   lastSync:"Demo snapshot", usage:"2 accounts", auth:"None (demo)", scopes:["Read"]},
  {name:"Gmail", blurb:"Threads on sales@ and info@ attach to the enquiry, quote or invoice they mention. Agents draft replies; nothing is sent from this demo.", tint:"#ea4335", status:"mock data", statusKind:"ok",
   glyph:"M4 7.2 12 13 20 7.2 M4 7.2v10.6h16V7.2 M4 7.2 8.5 4h7L20 7.2",
   lastSync:"Demo snapshot", usage:"Drafts only, never sends", auth:"None (demo)", scopes:["Read","Draft"]},
  {name:"Google Drive", blurb:"Price lists, the catalogue, quotes, carrier rates and packing lists, indexed so the agents can read them. Price lists stay confidential.", tint:"#34a853", status:"mock data", statusKind:"ok",
   glyph:"M4 7.2a1.8 1.8 0 0 1 1.8-1.8h3.5l1.8 2.2h7.1A1.8 1.8 0 0 1 20 9.4v8.4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 17.8V7.2Z",
   lastSync:"Demo snapshot", usage:"8 of 9 documents indexed", auth:"None (demo)", scopes:["Read"]},
  {name:"FreshBooks", blurb:"Invoices, payments and completed deals. FreshBooks stays the source of truth: Pulse reads it and never writes back. Mock data in this demo.", tint:"#0075dd", status:"mock data, read only", statusKind:"ok",
   glyph:"M7 3.5h10v17l-2.5-1.6-2.5 1.6-2.5-1.6L7 20.5v-17Z M9.5 8h5 M9.5 11.5h5 M9.5 15h3",
   lastSync:"Demo snapshot", usage:"29 invoices, 11 overdue", auth:"None (demo)", scopes:["Read"]},
  {name:"Gemini", blurb:"The AI Niall uses today, outside Pulse. Not connected: the agents in this demo run on mock data and never act without approval.", tint:"#8e7cf0", status:"not connected", statusKind:"off",
   glyph:"M12 3c.6 4.6 3.4 7.4 8 8-4.6.6-7.4 3.4-8 8-.6-4.6-3.4-7.4-8-8 4.6-.6 7.4-3.4 8-8Z",
   lastSync:"Not connected", usage:"Used outside Pulse", auth:"None", scopes:[]},
  {name:"HubSpot", blurb:"Trialled and dropped. Kept here so nobody reconnects it by accident; customers live in Pulse instead.", tint:"#ff7a59", status:"inactive", statusKind:"off",
   glyph:"M12 9.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z M12 4v3.4 M12 16.6V20 M4 12h3.4 M16.6 12H20 M6.5 6.5l2.4 2.4 M15.1 15.1l2.4 2.4 M17.5 6.5l-2.4 2.4 M8.9 15.1l-2.4 2.4",
   lastSync:"Trial ended", usage:"Not in use", auth:"None", scopes:[]},
  {name:"Google Sheets", blurb:"The old tracking spreadsheets. Largely retired and kept read-only for history.", tint:"#0f9d58", status:"archived", statusKind:"off",
   glyph:"M5 4.5h14v15H5v-15Z M5 9.5h14 M5 14.5h14 M10.5 4.5v15",
   lastSync:"Archived", usage:"History only", auth:"None", scopes:[]},
  {name:"European freight provider", blurb:"Greyhound Express is named for Europe, still to confirm as a supplier. Rate requests go out by email after Niall approves them and replies are read from Gmail. Nothing is booked from Pulse.", tint:"#6ad0f0", status:"email workflow", statusKind:"warn",
   glyph:"M2.8 6.4h11v9.4h-11z M13.8 9.4h3.9l2.9 3.1v3.3h-6.8 M6.6 18.4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z M16.8 18.4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z",
   lastSync:"By email", usage:"Rate requests and replies", auth:"Not an integration", scopes:["Email"]},
  {name:"UK freight provider", blurb:"Harbour Freight is named for the UK, still to confirm as a supplier. Same email workflow: a request after approval, a reply in Gmail, no booking from Pulse.", tint:"#e6c78a", status:"email workflow", statusKind:"warn",
   glyph:"M2.8 6.4h11v9.4h-11z M13.8 9.4h3.9l2.9 3.1v3.3h-6.8 M6.6 18.4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z M16.8 18.4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z",
   lastSync:"By email", usage:"Rate requests and replies", auth:"Not an integration", scopes:["Email"]}
];

/* Background catalogue. Each entry is pure CSS so a tile is the real thing at
   thumbnail size, not a picture of it. */
const BG_DEFS = [
  {id:"bloom", name:"Bloom", cat:"Signature",
   css:"background:radial-gradient(60% 48% at 50% 34%, var(--accent-faint), transparent 72%), radial-gradient(44% 38% at 16% 84%, rgba(255,255,255,.05), transparent 70%)",
   thumb:"background:radial-gradient(62% 58% at 46% 34%, var(--accent-soft), transparent 74%), radial-gradient(50% 46% at 82% 84%, rgba(255,255,255,.08), transparent 72%), var(--surface-2)"},
  {id:"mist", name:"Mist", cat:"Signature",
   css:"background:radial-gradient(52% 44% at 24% 22%, rgba(255,255,255,.07), transparent 70%), radial-gradient(56% 46% at 80% 76%, rgba(255,255,255,.05), transparent 72%)",
   thumb:"background:radial-gradient(58% 52% at 24% 22%, rgba(255,255,255,.16), transparent 72%), radial-gradient(60% 54% at 82% 78%, rgba(255,255,255,.10), transparent 74%), var(--surface-2)"},
  {id:"grid", name:"Grid", cat:"Signature",
   css:"background-image:linear-gradient(var(--border) 1px, transparent 1px),linear-gradient(90deg, var(--border) 1px, transparent 1px);background-size:56px 56px;mask-image:radial-gradient(62% 56% at 50% 46%, #000, transparent 78%);-webkit-mask-image:radial-gradient(62% 56% at 50% 46%, #000, transparent 78%)",
   thumb:"background-color:var(--surface-2);background-image:linear-gradient(var(--border-strong) 1px, transparent 1px),linear-gradient(90deg, var(--border-strong) 1px, transparent 1px);background-size:14px 14px"},
  {id:"none", name:"None", cat:"Signature", css:"", thumb:"background:var(--surface-2)"},

  {id:"aurora", name:"Aurora", cat:"Gradient",
   css:"background:radial-gradient(70% 52% at 18% 8%, var(--bloom-a), transparent 66%), radial-gradient(64% 48% at 84% 22%, var(--bloom-b), transparent 68%), radial-gradient(70% 60% at 50% 104%, var(--bloom-c), transparent 70%);filter:blur(24px)",
   thumb:"background:radial-gradient(72% 60% at 16% 6%, var(--bloom-a), transparent 68%), radial-gradient(66% 54% at 86% 24%, var(--bloom-b), transparent 70%), radial-gradient(74% 66% at 50% 108%, var(--bloom-c), transparent 72%), var(--surface-2)"},
  {id:"horizon", name:"Horizon", cat:"Gradient",
   css:"background:linear-gradient(180deg, transparent 0%, var(--accent-faint) 58%, transparent 100%), radial-gradient(90% 40% at 50% 72%, var(--accent-soft), transparent 70%)",
   thumb:"background:linear-gradient(180deg, var(--surface-2) 0%, var(--accent-faint) 58%, var(--surface-2) 100%), radial-gradient(90% 44% at 50% 74%, var(--accent-soft), transparent 70%)"},
  {id:"dusk", name:"Dusk", cat:"Gradient",
   css:"background:linear-gradient(200deg, var(--bloom-c) -10%, transparent 46%), linear-gradient(20deg, var(--bloom-b) -10%, transparent 52%);opacity:.5",
   thumb:"background:linear-gradient(200deg, var(--bloom-c) -12%, transparent 48%), linear-gradient(20deg, var(--bloom-b) -12%, transparent 54%), var(--surface-2)"},
  {id:"ember", name:"Ember", cat:"Gradient",
   css:"background:radial-gradient(60% 70% at 84% 96%, var(--bloom-a), transparent 64%), radial-gradient(50% 60% at 10% 96%, var(--bloom-c), transparent 66%)",
   thumb:"background:radial-gradient(64% 76% at 84% 100%, var(--bloom-a), transparent 66%), radial-gradient(54% 66% at 8% 100%, var(--bloom-c), transparent 68%), var(--surface-2)"},

  {id:"mesh", name:"Mesh", cat:"Abstract",
   css:"background-image:radial-gradient(var(--border-strong) 1px, transparent 1px);background-size:22px 22px;mask-image:radial-gradient(70% 62% at 50% 46%, #000, transparent 76%);-webkit-mask-image:radial-gradient(70% 62% at 50% 46%, #000, transparent 76%)",
   thumb:"background-color:var(--surface-2);background-image:radial-gradient(var(--border-strong) 1px, transparent 1px);background-size:8px 8px"},
  {id:"contour", name:"Contour", cat:"Abstract",
   css:"background:repeating-radial-gradient(circle at 30% 110%, transparent 0 22px, var(--border) 22px 23px);mask-image:radial-gradient(80% 70% at 40% 80%, #000, transparent 78%);-webkit-mask-image:radial-gradient(80% 70% at 40% 80%, #000, transparent 78%)",
   thumb:"background:repeating-radial-gradient(circle at 26% 116%, var(--surface-2) 0 9px, var(--border-strong) 9px 10px)"},
  {id:"weave", name:"Weave", cat:"Abstract",
   css:"background:repeating-linear-gradient(48deg, transparent 0 16px, var(--border) 16px 17px), repeating-linear-gradient(-48deg, transparent 0 16px, var(--border) 16px 17px);opacity:.7",
   thumb:"background-color:var(--surface-2);background-image:repeating-linear-gradient(48deg, transparent 0 7px, var(--border-strong) 7px 8px), repeating-linear-gradient(-48deg, transparent 0 7px, var(--border-strong) 7px 8px)"},
  {id:"halo", name:"Halo", cat:"Abstract",
   css:"background:repeating-radial-gradient(circle at 50% 50%, transparent 0 46px, var(--accent-line) 46px 47px);mask-image:radial-gradient(60% 60% at 50% 50%, #000, transparent 72%);-webkit-mask-image:radial-gradient(60% 60% at 50% 50%, #000, transparent 72%)",
   thumb:"background:repeating-radial-gradient(circle at 50% 50%, var(--surface-2) 0 11px, var(--accent-line) 11px 12px)"},
  {id:"drift", name:"Drift", cat:"Abstract",
   css:"background:conic-gradient(from 210deg at 32% 38%, var(--bloom-b), transparent 38%), conic-gradient(from 20deg at 76% 70%, var(--bloom-a), transparent 34%);filter:blur(30px);opacity:.6",
   thumb:"background:conic-gradient(from 210deg at 32% 38%, var(--bloom-b), transparent 38%), conic-gradient(from 20deg at 76% 70%, var(--bloom-a), transparent 34%), var(--surface-2)"},
  {id:"scan", name:"Scanlines", cat:"Abstract",
   css:"background:repeating-linear-gradient(0deg, var(--border) 0 1px, transparent 1px 7px);mask-image:linear-gradient(180deg, #000, transparent 88%);-webkit-mask-image:linear-gradient(180deg, #000, transparent 88%)",
   thumb:"background-color:var(--surface-2);background-image:repeating-linear-gradient(0deg, var(--border-strong) 0 1px, transparent 1px 5px)"}
];

const THEMES = [
  {id:"dark", label:"Dark", group:"Dark", bg:"#0b0c0b", surface:"#1a1c19", ink:"#f2f3ef", accent:"#c8f04b"},
  {id:"indigo", label:"Indigo", group:"Dark", bg:"#0a0b13", surface:"#1a1b26", ink:"#f0f1fa", accent:"#8b93ff"},
  {id:"slate", label:"Slate", group:"Dark", bg:"#100e0c", surface:"#211c17", ink:"#f4f0ea", accent:"#e8a14a"},
  {id:"plum", label:"Plum", group:"Dark", bg:"#100a10", surface:"#20151f", ink:"#f6eef4", accent:"#f077b0"},
  {id:"ember", label:"Ember", group:"Dark", bg:"#0b0b0b", surface:"#1c1714", ink:"#f7f3ef", accent:"#f4561a"},
  {id:"harbour", label:"Harbour", group:"Dark", bg:"#0b0e10", surface:"#13171a", ink:"#f3f5f4", accent:"#5ee79a"},
  {id:"cargo", label:"Cargo", group:"Dark", bg:"#0a0a0a", surface:"#1a1c1a", ink:"#f2f5f2", accent:"#4ade80"},
  {id:"ocean", label:"Ocean", group:"Dark", bg:"#080e12", surface:"#141f25", ink:"#eaf4f8", accent:"#4fd4d0"},
  {id:"graphite", label:"Graphite", group:"Dark", bg:"#111112", surface:"#212124", ink:"#f4f4f5", accent:"#f4f4f5"},
  {id:"light", label:"Cream", group:"Light", bg:"#f4f2ed", surface:"#ffffff", ink:"#16181c", accent:"#0071e3"},
  {id:"warm", label:"Warm paper", group:"Light", bg:"#faf5ec", surface:"#fffdf9", ink:"#2a2016", accent:"#c9683f"},
  {id:"mist", label:"Mist", group:"Light", bg:"#eef1f4", surface:"#ffffff", ink:"#141e20", accent:"#0e9f6e"},
  {id:"sand", label:"Sand", group:"Light", bg:"#f6f1e6", surface:"#fffdf7", ink:"#221d12", accent:"#7d5fd6"}
];

const ADMIN_ICONS = {
  people:"M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9",
  teams:"M9 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 12Z M16.5 12.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z M2.6 19.6c.8-2.8 3.2-4.4 6.4-4.4s5.6 1.6 6.4 4.4 M17 15.4c2.2.4 3.7 1.8 4.3 4.2",
  structure:"M4.5 20V6.4A1.4 1.4 0 0 1 5.9 5h6.2a1.4 1.4 0 0 1 1.4 1.4V20 M13.5 10.5h4.6A1.4 1.4 0 0 1 19.5 12v8 M3 20h18 M7.5 8.5h2.5 M7.5 12h2.5",
  shield:"M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
  agent:"M2 12h4l2.5-6 3.5 12 3-8 2 2h5",
  flow:"M18.5 8.5A5 5 0 0 0 8.9 7.3 3.8 3.8 0 0 0 6 14.6 M8 17.5l3.2 3.2 M11.2 20.7l3.2-3.2 M11.2 20.7V9.6",
  plug:"M9 3.5v5 M15 3.5v5 M6.5 8.5h11v3a5.5 5.5 0 0 1-11 0v-3Z M12 17v3.5",
  modules:"M6.6 4.4h10.8a2.2 2.2 0 0 1 2.2 2.2v10.8a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2V6.6a2.2 2.2 0 0 1 2.2-2.2Z M4.4 9.6h15.2 M9.6 19.6V9.6",
  health:"M3 12.5h3.4l2-5 3 10 2.2-5H21",
  lock:"M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5Z M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3",
  audit:"M8 3.5h8l3.5 3.5v13a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5h2Z M9 12h6 M9 16h4",
  brand:"M12 3.5 14.6 9l6.4.6-4.8 4.2 1.4 6.2-5.6-3.3-5.6 3.3 1.4-6.2L3 9.6 9.4 9 12 3.5Z",
  bell:"M6 8.5a6 6 0 0 1 12 0c0 6.5 2.6 8.5 2.6 8.5H3.4S6 15 6 8.5Z M10.3 20.5a1.94 1.94 0 0 0 3.4 0",
  data:"M4.5 7.5c0-1.7 3.4-3 7.5-3s7.5 1.3 7.5 3-3.4 3-7.5 3-7.5-1.3-7.5-3Z M4.5 7.5v9c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-9 M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3",
  price:"M3.5 12.2 11.8 3.9a1.6 1.6 0 0 1 1.1-.5h5.9a1.6 1.6 0 0 1 1.6 1.6v5.9a1.6 1.6 0 0 1-.5 1.1l-8.3 8.3a1.6 1.6 0 0 1-2.3 0l-5.8-5.8a1.6 1.6 0 0 1 0-2.3Z M16 8.2h.01"
};

/* Settings: six tabs (ADMIN_GROUPS) and the cards inside them. Card ids
   people, integrations, appearance and health open their special panels. */
const ADMIN_CARDS = [
  {id:"company", group:"ORGANISATION", title:"Company details", icon:"structure", tint:"var(--accent)",
   blurb:"Who Mega Mass Europe is, where it ships from and how customers reach it.",
   tags:["UK and EU distributor","EUR and GBP","County Derry"],
   footer:"No street address is published or stored", action:"Edit details",
   listLabel:"ON FILE",
   rows:[["Business","Mega Mass Europe"],["What it does","Official UK and EU distributor of Mega Mass"],["Trading since","Around September 2025"],
     ["Warehouse","County Derry, Northern Ireland"],["Website","megamasseurope.com, quote requests only"],
     ["Published inboxes","sales@ and info@megamasseurope.com"],["Phone","+44 7388 204997"],["Instagram","@megamasseurope"],
     ["Reply promise on the website","Within 1 to 2 business days"],["Currencies","EUR for Europe, GBP for the UK"]]},
  {id:"brand", group:"ORGANISATION", title:"Brand", icon:"brand", tint:"#f0994b",
   blurb:"How Pulse, and the emails it drafts, carry the Mega Mass look.",
   tags:["Black and orange","Geist"],
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Logo","megamass-logo.png"],["Brand colours","Black and Mega Mass orange"],["Pulse accent","Mega Mass orange"],
     ["Typography","Pulse keeps Geist"],["Email sign-off","Niall, Mega Mass Europe"],["Prices on the website","Never shown"]]},
  {id:"appearance", group:"ORGANISATION", title:"Appearance and themes", icon:"brand", tint:"#6ad0f0",
   blurb:"Pick a light or dark theme for how Pulse looks to you.",
   tags:["13 themes","9 dark","4 light"],
   listLabel:"THEMES", rows:[]},

  {id:"people", group:"TEAM", title:"People and access", icon:"people", tint:"#6ad0f0",
   blurb:"Who uses Pulse and what each person can reach.",
   tags:["2 people","8 agents","1 location"], badge:"1 role to confirm", badgeKind:"warn",
   footer:"Natalie's exact role is still to confirm", action:"Invite someone",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Invite or remove people",""],["Niall","Admin, the only approver"],["Natalie","Standard, role to confirm"],["Suspended accounts","None"]]},
  {id:"teams", group:"TEAM", title:"Teams", icon:"teams", tint:"#f0c04b",
   blurb:"How the work is split. Small on purpose: the agents prepare, Niall approves.",
   tags:["4 teams","1 approver"],
   listLabel:"TEAMS",
   rows:[["Sales and quotes","Niall"],["Systems","Natalie, role to confirm"],["Agents","8 agents, read and draft only"],
     ["Warehouse, County Derry","Stock records only"]]},

  {id:"integrations", group:"INTEGRATIONS", title:"Integrations", icon:"plug", tint:"#6ad0f0",
   blurb:"Every system Mega Mass uses today and which way data flows. All mock in this demo.",
   tags:["10 systems","Mock data","Nothing live"], badge:"Demo only", badgeKind:"warn",
   footer:"Nothing here writes to a real system", action:"View integrations",
   listLabel:"CONNECTIONS",
   rows:[["Mega Mass website","demo connection"],["Google Workspace","demo connection"],["Gmail","mock data"],["Google Drive","mock data"],
     ["FreshBooks","mock data, read only"],["Gemini","not connected"],["HubSpot","inactive"],["Google Sheets","archived"],
     ["European freight provider","email workflow"],["UK freight provider","email workflow"]]},
  {id:"health", group:"INTEGRATIONS", title:"Data health", icon:"health", tint:"#e2705c",
   blurb:"What is missing or out of date in the records, and the fix.",
   tags:["7 issue types","28 records affected"], badge:"14 missing postcodes", badgeKind:"warn",
   footer:"Checked this morning", action:"Draft postcode requests",
   listLabel:"ISSUES FOUND",
   trend:[41,38,36,33,31,30,28],
   bySeverity:[["High","17",RED],["Medium","10",AMBER],["Low","1",DIM]],
   issues:[["Unanswered enquiries with no delivery postcode","14","high","The draft reply asks for it before any freight request","Draft requests"],
     ["Unanswered enquiries with no quantity","2","medium","Confirm the quantity in the first reply","Draft requests"],
     ["Machines with dimensions TBC","6","medium","Catalogue says TBC; freight requests flag it","Review"],
     ["Carriers not confirmed as suppliers","2","medium","Greyhound Express and Harbour Freight","Confirm"],
     ["Website availability out of date","1","high","T-Bar Linear Row still says October 2026","Assign to Natalie"],
     ["VAT treatment and payment terms","2","high","Shown as pending confirmation on every quote","Review"],
     ["Old quote form option","1","low","'Already an Atlantis client' still on the form","Assign to Natalie"]],
   rows:[]},

  {id:"pricelists", group:"PRICING RULES", title:"Price lists", icon:"price", tint:"var(--accent)",
   blurb:"Two confidential price lists. The same price for every customer apart from currency.",
   tags:["EUR","GBP","Confidential"],
   heroLabel:"THE RULE", heroAction:"Open the price lists",
   heroText:"One EUR price list for Europe and one GBP price list for the UK. Every customer pays the list price in their currency. No public prices and no automatic discounts.",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["EUR price list","Confidential"],["GBP price list","Confidential"],["Who sees them","Niall, Natalie, Quote Agent"],
     ["Public prices","None, the website shows Add to Quote"],["Automatic wholesale or volume discounts","", false],
     ["Mixing EUR and GBP on one quote","Never"]]},
  {id:"overrides", group:"PRICING RULES", title:"Overrides and markups", icon:"shield", tint:"#f0c04b",
   blurb:"What can change on a quote, and who has to say yes.",
   tags:["15% default markup","Approval required"],
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Manual price overrides","Need Niall's approval"],["Default freight markup","15%, illustrative and editable"],
     ["Freight markup on a quote","Needs Niall's approval"],["Quote validity","14 days, demo setting"],
     ["Freight cost before the carrier replies","Never estimated"],["Missing postcode or dimensions","Flagged, never guessed"]]},
  {id:"terms", group:"PRICING RULES", title:"Tax, terms and stock", icon:"audit", tint:"#9d8cf5",
   blurb:"What every quote says about VAT, payment and delivery.",
   tags:["VAT pending","Terms pending"], badge:"2 to confirm", badgeKind:"warn",
   footer:"Being confirmed with the accountant", action:"Open the tasks",
   listLabel:"ON EVERY QUOTE",
   rows:[["VAT treatment","Pending confirmation"],["Payment terms","Pending confirmation"],["Quote currency","EUR for Europe, GBP for the UK"],
     ["Deposit pre-orders","Not restarted"],["Committing stock","Never below zero without a warning"],["Incoming stock","Delivery date confirmed on receipt"]]},

  {id:"approvals", group:"AI CONTROLS", title:"Approvals", icon:"agent", tint:"var(--accent)",
   blurb:"What the agents must stop and ask Niall about. All of it, by default.",
   tags:["8 agents","6 approval rules","Nothing sent automatically"],
   heroLabel:"GLOBAL CONTROL", heroAction:"Pause every agent",
   heroText:"One switch stops all eight agents. Anything mid-run finishes its current step and then holds. Agents never send, never change FreshBooks and never book transport.",
   footer:"Every rule below is on by default", action:"Review rules",
   listLabel:"NEEDS NIALL'S APPROVAL",
   rows:[["Customer quotations","", true],["Customer emails","", true],["Price overrides","", true],
     ["Freight markups","", true],["Stock commitments","", true],["Payment follow-ups","", true]]},
  {id:"followups", group:"AI CONTROLS", title:"Follow-ups", icon:"bell", tint:"#f0994b",
   blurb:"When customers get a nudge, and why nothing goes out on its own.",
   tags:["Auto-chasing off","3, 7, 14, 30 days"],
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Automatic chasing","Off by default", false],["Follow-up timing","3, 7, 14 and 30 days"],
     ["Who sends a follow-up","Niall, after review"],["Payment follow-ups","Drafted, never sent automatically"],["Tone","Polite and short, in Niall's voice"]]},
  {id:"limits", group:"AI CONTROLS", title:"Agent limits", icon:"lock", tint:"#e2705c",
   blurb:"The hard lines. These are not settings an agent can change.",
   tags:["Never sends","Never books","FreshBooks read only"],
   listLabel:"AGENTS NEVER",
   rows:[["Send an email or a quote","Drafts only"],["Change anything in FreshBooks","Read only"],["Book transport","Niall books carriers"],
     ["Invent a freight cost","Waits for the carrier"],["Restart deposit pre-orders","Off"],["Let available stock go below zero","Warns instead"]]},

  {id:"roles", group:"PERMISSIONS", title:"Roles and permissions", icon:"shield", tint:"var(--accent)",
   blurb:"Permission templates, and exactly what each person and agent can reach.",
   tags:["4 roles","3 scopes","1 approver"],
   heroLabel:"THE QUESTION THIS ANSWERS", heroAction:"Show me what someone can access",
   heroText:"Pick a person or an agent and see every record, price list and action they can reach, resolved through their grants rather than guessed from the menus.",
   footer:"Preview Pulse as another user", action:"Open preview",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Admin","Niall, and the only approver"],["Standard","Natalie, no approvals (to confirm)"],["Agents","Read and draft through granted tools"],
     ["Confidential price lists","Niall, Natalie and the Quote Agent"],["Approval threshold","Every quote, whatever the value"]]},
  {id:"security", group:"PERMISSIONS", title:"Sign-in and security", icon:"lock", tint:"#8fa6ff",
   blurb:"How people sign in, and what keeps the price lists private.",
   tags:["Google sign-in","Two-factor"],
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Sign in with Google Workspace","Not live in this demo", false],["Two-factor authentication","Required", true],
     ["Price lists","Hidden without access"],["Sessions","30 days"],["Agent access","Granted tools only"]]},
  {id:"audit", group:"PERMISSIONS", title:"Audit log", icon:"audit", tint:"#9d8cf5",
   blurb:"A locked history of who did what. Searchable, exportable, never editable.",
   tags:["Append-only","Every approval"],
   footer:"Nobody can edit or delete entries", action:"Export",
   listLabel:"WHAT IS RECORDED",
   rows:[["Approvals","Every decision, as the person who made it"],["Agent runs","Every run and its outcome"],
     ["Simulated sends","Labelled as simulated"],["Price list access","Every view"],["Settings changes","Every change"],["Retention","Demo session only"]]}
];

/* [key, grid, display label]. The key is what ADMIN_CARDS.group points at;
   the third entry is the tab label as it should read ("AI Controls"). */
const ADMIN_GROUPS = [
  ["ORGANISATION", "repeat(3,1fr)", "Organisation"],
  ["TEAM", "repeat(3,1fr)", "Team"],
  ["INTEGRATIONS", "repeat(3,1fr)", "Integrations"],
  ["PRICING RULES", "repeat(3,1fr)", "Pricing Rules"],
  ["AI CONTROLS", "repeat(3,1fr)", "AI Controls"],
  ["PERMISSIONS", "repeat(3,1fr)", "Permissions"]
];

/* ---- activity feeds ---- */
const SRC_TINT = {Website:"#ff8a4c", Gmail:"#f07a9d", FreshBooks:"#6ad0f0", Drive:"#5fe0a8", Gemini:"#9d8cf5",
  Carrier:"#e6c78a", Pulse:"var(--accent)", Agent:"var(--accent)"};
const SRC_ABBR = {Website:"WB", Gmail:"GM", FreshBooks:"FB", Drive:"DR", Gemini:"GE", Carrier:"CR", Pulse:"PL", Agent:"AI"};

const DATA_EVENTS = [
  ["Website enquiry received from Italy","Milano Performance Studio asked for a T-Bar Linear Row. No delivery postcode given.","Website quote form","Milano Performance Studio","Website","completed"],
  ["Carrier quotation recorded","Harbour Freight quoted £350 for FR-1214 to Manchester, ref HF-71520.","Harbour Freight","Northern Power Gym","Carrier","completed"],
  ["Customer reply received","Daan Visser asked about volume pricing on Q-2271.","daan@rotterdamironsupply.nl","Rotterdam Iron Supply","Gmail","completed"],
  ["Packing list filed","Flex Series November intake: 15 units, arrival not confirmed.","Natalie","SH-FLEX-NOV","Drive","completed"],
  ["FreshBooks invoice read","FB-1047 for €7,880 is 18 days past due. Mock data, read only.","FreshBooks","Rheinland Performance","FreshBooks","completed"],
  ["Carrier quotation recorded","Greyhound Express quoted €2,100 for FR-1206 to Bratislava, ref GX-58213.","Greyhound Express","Danube Strength","Carrier","completed"],
  ["Reorder request received","Nordic Strength Supply asked for another 6 × T-Bar Linear Row to Copenhagen.","Gmail","Nordic Strength Supply","Gmail","completed"],
  ["FreshBooks invoice created (simulated)","FB-1063 for £3,205 to Glasgow Barbell Club. Simulated: FreshBooks unchanged.","FreshBooks","Glasgow Barbell Club","FreshBooks","completed"],
  ["Incoming stock allocation updated","Flex Series intake: 9 of 15 units reserved, 6 unallocated.","Pulse","SH-FLEX-NOV","Pulse","completed"]
];

const PEOPLE_EVENTS = [
  ["Niall approved a customer quotation","Q-2271 to Rotterdam Iron Supply, €30,535 ex VAT. Simulated in this demo.","Niall","Rotterdam Iron Supply","Gmail","completed"],
  ["Niall approved a carrier request","FR-1211 emailed to Greyhound Express for Lyon Performance Club.","Niall","Lyon Performance Club","Gmail","completed"],
  ["Natalie uploaded the Flex Series packing list","Packing list for the November intake filed in Drive.","Natalie","SH-FLEX-NOV","Drive","completed"],
  ["Task assigned to Natalie","Update the T-Bar Linear Row availability text on the website.","Niall","T-Bar Linear Row","Pulse","completed"],
  ["Niall started on the reply drafts","Working through the drafted replies to unanswered enquiries.","Niall","Enquiries","Pulse","completed"],
  ["Danube quotation waiting on Niall","Q-2286, €21,915 ex VAT. Carrier rate received, ready for review.","Quote Agent","Danube Strength","Pulse","awaiting"],
  ["Volume pricing question waiting on Niall","Rotterdam Iron Supply asked about unit price at volume. No discount applied.","Quote Agent","Rotterdam Iron Supply","Pulse","awaiting"],
  ["Payment-status email waiting on Niall","FB-1047, €7,880, 18 days overdue. Drafted, not sent.","Receivables Agent","Rheinland Performance","Gmail","awaiting"]
];

const AI_EVENTS = [
  ["Enquiry Agent extracted the requirements","Milano Performance Studio: 1 × T-Bar Linear Row, commercial gym, no delivery postcode.","Enquiry Agent","Milano Performance Studio","Agent","working"],
  ["Freight Agent prepared a shipping request","Six machines to Bratislava via Greyhound Express, forklift on site.","Freight Agent","Danube Strength","Agent","completed"],
  ["Quote Agent calculated the freight markup","€2,100 + 15% = €2,415 on Q-2286, total €21,915 ex VAT.","Quote Agent","Danube Strength","Agent","completed"],
  ["Payment follow-up prepared","Polite payment-status email for FB-1047, €7,880. Waiting for Niall.","Receivables Agent","Rheinland Performance","Agent","awaiting"],
  ["Ops Watchdog flagged an ageing enquiry","Four enquiries have had no first reply for more than 48 hours.","Ops Watchdog","Enquiries","Agent","awaiting"],
  ["Freight Agent drafted a carrier chase","Greyhound Express has not replied on FR-1211 (Lyon) in over three days.","Freight Agent","Lyon Performance Club","Agent","awaiting"],
  ["Briefing posted the morning brief","Danube approval, Lyon freight delay, three payment promises.","Briefing","Niall","Agent","completed"],
  ["Follow-up Agent drafted follow-ups","32 to review. None sent: automatic chasing is off.","Follow-up Agent","Enquiries","Agent","completed"],
  ["Sales Intelligence Agent ran the weekly read","T-Bar Linear Row is still the most requested machine by a distance.","Sales Intelligence Agent","T-Bar Linear Row","Agent","working"],
  ["Ops Watchdog flagged website text","T-Bar Linear Row page still says 'Estimated arrival October 2026'; 14 are available.","Ops Watchdog","T-Bar Linear Row","Agent","awaiting"]
];

const STREAM_DEFS = [
  {id:"data", title:"New data", sub:"Enquiries, emails, rates and invoices arriving", pool:DATA_EVENTS, every:3200,
   tint:"#6ad0f0", icon:"M4.5 7.5c0-1.7 3.4-3 7.5-3s7.5 1.3 7.5 3-3.4 3-7.5 3-7.5-1.3-7.5-3Z M4.5 7.5v9c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-9 M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"},
  {id:"people", title:"People activity", sub:"Decisions Niall and Natalie made", pool:PEOPLE_EVENTS, every:6400,
   tint:"#f0c04b", icon:"M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9"},
  {id:"ai", title:"Agent activity", sub:"Agents at work", pool:AI_EVENTS, every:4600,
   tint:"var(--accent)", icon:"M2 12h4l2.5-6 3.5 12 3-8 2 2h5"}
];

const NAV = [
  {label:"Home", icon:"helios", page:"Home"},
  {label:"Agents", icon:"navAgents", page:"Agents"},
  {label:"Enquiries", icon:"mmInbox", page:"Enquiries", dot:true},
  {label:"Quotes", icon:"mmQuote", page:"Quotes"},
  {label:"Freight", icon:"mmTruck", page:"Freight"},
  {label:"Orders", icon:"mmOrder", page:"Orders"},
  {label:"Products & Stock", icon:"mmBox", page:"Stock"},
  {label:"Insights", icon:"mmChart", page:"Insights"},
  {label:"Work", icon:"navWork", page:"Work"},
  {label:"Records", icon:"navRecords", page:"Records"},
  {label:"Activity", icon:"pulseLine", page:"Activity", dot:true}
];

/* Inbox items follow the InboxItem shape: what happened, why it matters, what I can do. */
const ITEMS = {
  danube:{kind:"Approval", importance:"high", icon:ICONS.approvals, age:"1d",
    title:"Danube Strength quotation Q-2286, €21,915",
    why:"The carrier rate is in. The quotation is waiting for your approval before it goes to Tomáš Horváth.",
    detail:"Six machines at €19,500 from the EUR price list, plus Greyhound Express freight of €2,100 + 15% = €2,415. Three Leverage machines come from the Flex intake, arrival not confirmed. VAT treatment is pending confirmation. Approving sends the quote, simulated in this demo.",
    actionLabel:"Approve", secondaryLabel:"Hold", group:"Approvals",
    fields:[{k:"Quote",v:"Q-2286"},{k:"Customer",v:"Danube Strength, Bratislava"},{k:"Total",v:"€21,915 ex VAT"},{k:"Prepared by",v:"Quote Agent"}],
    history:[{when:"7 days ago",text:"Request grew from one machine to six"},{when:"Yesterday",text:"Greyhound Express rate GX-58213 received"},{when:"Yesterday",text:"Quote Agent prepared Q-2286"}]},
  lyon:{kind:"Alert", importance:"critical", icon:ICONS.mmTruck, age:"4d",
    title:"Lyon freight rate overdue",
    why:"Greyhound Express has not replied to FR-1211 in over three days, so Q-2290 cannot be priced.",
    detail:"Camille Laurent asked for one T-Bar Linear Row delivered to Lyon 69007. No freight cost is used until the carrier replies. The Freight Agent has drafted a chase; it needs your yes before it goes.",
    actionLabel:"Approve chase", secondaryLabel:"Snooze", group:"Alerts",
    fields:[{k:"Request",v:"FR-1211"},{k:"Carrier",v:"Greyhound Express"},{k:"Quote",v:"Q-2290, €2,850 before freight"},{k:"Chases sent",v:"None yet"}],
    history:[{when:"4 days ago",text:"Rate request approved and emailed"},{when:"Today",text:"Ops Watchdog flagged it past three days"},{when:"Today",text:"Freight Agent drafted a chase"}]},
  rheinland:{kind:"Approval", importance:"high", icon:ICONS.inbox, age:"7h",
    title:"Rheinland Performance payment follow-up",
    why:"FB-1047 for €7,880 is 18 days overdue. A polite payment-status email is drafted.",
    detail:"Two Leverage Chest Press plus freight to Cologne, delivered five weeks ago. FreshBooks shows no payment. The email asks when payment is planned, nothing more. Automatic chasing is off, so it only goes if you approve it.",
    actionLabel:"Approve email", secondaryLabel:"Edit draft", group:"Approvals",
    fields:[{k:"Invoice",v:"FB-1047"},{k:"Amount",v:"€7,880"},{k:"Overdue",v:"18 days"},{k:"Contact",v:"Jonas Becker"}],
    history:[{when:"18 days ago",text:"Due date passed"},{when:"Today",text:"Receivables Agent drafted the email"}]},
  website:{kind:"Task", importance:"normal", icon:ICONS.work, age:"1h",
    title:"Website availability text out of date",
    why:"The T-Bar Linear Row page still says 'Estimated arrival October 2026'. 14 are available in County Derry now.",
    detail:"Customers asking about the best seller are being told it is still on its way. Natalie has the task to update the page; Pulse does not edit the website.",
    actionLabel:"Assign to Natalie", secondaryLabel:"Dismiss", group:"Work",
    fields:[{k:"Machine",v:"T-Bar Linear Row"},{k:"Website says",v:"Estimated arrival October 2026"},{k:"Available",v:"14 of 24 in stock"},{k:"Owner",v:"Natalie"}],
    history:[{when:"Today",text:"Ops Watchdog compared the page with stock"}]},
  flex:{kind:"Alert", importance:"normal", icon:ICONS.mmBox, age:"1d",
    title:"Flex Series arrival unconfirmed",
    why:"15 units due late November: 9 reserved and 6 unallocated. The date is not confirmed.",
    detail:"Five each of Leverage Chest Press, Incline Pro and Seated Row. Danube Strength's quote would take three of the six free units. Nothing is promised to a customer as a fixed date until the intake lands in County Derry.",
    actionLabel:"Confirm with Mega Mass US", secondaryLabel:"Snooze", group:"Alerts",
    fields:[{k:"Shipment",v:"SH-FLEX-NOV"},{k:"Units",v:"15"},{k:"Reserved",v:"9"},{k:"Unallocated",v:"6"}],
    history:[{when:"2 days ago",text:"Natalie filed the packing list"},{when:"Yesterday",text:"Allocation updated: 9 of 15 reserved"}]}
};
const ORDER = ["danube","lyon","rheinland","website","flex"];

/* ---- live figures from the Mega Mass store ----
   Helios answers, the Dashboard areas and the KPI tiles read the same records
   as every other page (src/mm), so an approval anywhere moves them all. A
   builder that hits a missing record falls back to plain copy. */

const DAY_MS = 86400000;
const SIM_SENT = "Simulated in this demo: nothing was sent.";
const SIM_WILL = "Simulated in this demo: nothing will actually be sent.";
const NUM_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const numWord = (n) => NUM_WORDS[n] || String(n);
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const count = (n, one, many) => n + " " + (n === 1 ? one : (many || one + "s"));
const listText = (xs) => xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
const countCap = (n, one, many) => (n <= 12 ? cap(numWord(n)) : String(n)) + " " + (n === 1 ? one : (many || one + "s"));
const lowerFirst = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const pctText = (n) => Math.round(n) + "%";
const sumBy = (xs, f) => xs.reduce((n, x) => n + f(x), 0);
const custOf = (st, id) => ix(st).customer[id];
const prodOf = (st, id) => ix(st).product[id];
const carrierOf = (st, id) => (st.suppliers.find(x => x.id === id) || {name:"the carrier"}).name;
const linesText = (st, lines) => lines.map(l => l.qty + " × " + prodOf(st, l.productId).name).join(", ");
const waitText = (ms) => {
  const h = Math.max(0, ms) / 3600000;
  if (h < 1) return Math.max(1, Math.round(h * 60)) + " min";
  if (h < 48) return Math.round(h) + "h";
  return Math.floor(h / 24) + " days";
};
const daysSince = (st, t) => Math.max(0, Math.floor((st.now - t) / DAY_MS));
const whenText = (st, t) => { const d = daysSince(st, t); return d === 0 ? "today" : d === 1 ? "yesterday" : d + " days ago"; };
const isLate = (st, f) => f.requestedAt !== null && st.now - f.requestedAt > 3 * DAY_MS;
const marketName = (code) => code === "Other" ? "Rest of Europe" : (COUNTRY_NAME[code] || code);
const openApprovalFor = (st, recordId) => openApprovals(st).find(a => a.recordId === recordId);
const flexIds = (st) => new Set(st.shipments.flatMap(sh => sh.lines.map(l => l.productId)));
const AGENT_NAMES = {briefing:"Briefing", ops:"Ops Watchdog", enquiry:"Enquiry Agent", quote:"Quote Agent", freight:"Freight Agent",
  followup:"Follow-up Agent", receivables:"Receivables Agent", intel:"Sales Intelligence Agent"};

/* One result per store state, so a render that reads a value ten times
   works it out once. */
function perState(fn){
  const memo = new WeakMap();
  return (st) => {
    if (memo.has(st)) return memo.get(st);
    const v = fn(st);
    memo.set(st, v);
    return v;
  };
}

/* Counts every record Pulse holds, for the agent studio's training step. */
const RECORD_COUNT = (() => {
  try {
    const s = mm.get();
    return ["customers","contacts","enquiries","quotes","freight","invoices","payments","orders","products","reservations",
      "shipments","followUps","approvals","emails","tasks"].reduce((n, k) => n + (s[k] || []).length, 0);
  } catch (e) { return 1266; }
})();

/* ---- Helios answers ---- */

const FALLBACK = {tool:"records_search", effect:"read",
  text:"I can answer from the demo records: enquiries, quotes, freight, FreshBooks invoices, stock and what the agents have prepared. Try asking which customers in France are waiting on shipping, why the Danube Strength quote hasn't gone out, or who owes you money. Nothing I prepare is sent, written to FreshBooks or booked with a carrier without your approval.",
  actions:[["What needs my approval?", 0], ["Who owes us money?", 0]]};

const NOT_YET = {tool:"approvals_list", effect:"read",
  text:"No problem. It stays in your approvals and nothing has been sent.",
  actions:[["What needs my approval?", 0]]};

function quoteFacts(st, q){
  const c = custOf(st, q.customerId), ct = contactOf(st, c);
  const f = q.freightId ? ix(st).freight[q.freightId] : undefined;
  const short = q.lines.filter(l => stockOf(st, prodOf(st, l.productId)).available < l.qty).map(l => l.productId);
  const flex = flexIds(st);
  return {c, ct, first:ct.name.split(" ")[0], f, cq:f && f.carrierQuote, cur:q.currency,
    fc:freightCharge(f), total:quoteTotal(st, q), equip:quoteEquipment(q),
    carrier:f ? carrierOf(st, f.carrierId) : "the carrier",
    units:sumBy(q.lines, l => l.qty),
    fromFlex:short.filter(id => flex.has(id)).map(id => prodOf(st, id).name),
    notInStock:short.filter(id => !flex.has(id)).map(id => prodOf(st, id).name)};
}

function quoteRows(st, q){
  const x = quoteFacts(st, q);
  const rows = q.lines.map(l => [prodOf(st, l.productId).name, String(l.qty), money(l.unitPrice, x.cur), money(l.unitPrice * l.qty, x.cur)]);
  if (x.f) rows.push(["Freight, " + x.carrier + (x.cq ? " " + x.cq.ref : ""), "1",
    x.cq ? money(x.cq.cost, x.cur) + " + " + x.f.markupPct + "%" : "No rate yet", x.fc === null ? "Pending" : money(x.fc, x.cur)]);
  rows.push(["Total excluding VAT", "", "", money(x.total, x.cur)]);
  return rows;
}

function answerQuoteId(st, id){
  const q = ix(st).quote[id];
  if (!q) return {tool:"quote_explain", effect:"read", text:"I can't find a quote called " + id + " in the records.",
    actions:[["What needs my approval?", 0]]};
  const x = quoteFacts(st, q);
  const base = {tool:"quote_explain", effect:"read", cols:["Line", "Qty", "Price", "Total"], rows:quoteRows(st, q)};
  const machines = x.units === 1 ? "the machine" : "the " + numWord(x.units) + " machines";
  const gbp = x.cur === "GBP" ? " It's priced from the GBP price list only; nothing on a UK quote is converted from EUR." : "";
  const flex = x.fromFlex.length
    ? " " + (x.fromFlex.length === 1 ? "One of them (" : cap(numWord(x.fromFlex.length)) + " of them (") + listText(x.fromFlex) + ") come"
      + (x.fromFlex.length === 1 ? "s" : "") + " from the Flex Series intake due late November, which isn't confirmed yet, so the draft tells "
      + x.first + " the delivery date follows on receipt."
    : "";
  const later = x.notInStock.length
    ? " " + listText(x.notInStock) + (x.notInStock.length === 1 ? " isn't" : " aren't") + " in stock yet, so the quote doesn't promise a date for "
      + (x.notInStock.length === 1 ? "it." : "them.")
    : "";
  if (q.status === "Ready for Review"){
    const rate = x.cq
      ? x.carrier + " quoted " + money(x.cq.cost, x.cur) + " for " + machines + " to " + x.c.city + " (ref " + x.cq.ref + "), and with the "
        + x.f.markupPct + "% markup the freight line is " + money(x.fc, x.cur) + ". "
      : "";
    return Object.assign(base, {
      text:"The carrier rate has been received. The quotation is waiting for your approval. " + rate
        + "That makes " + q.id + " " + money(x.total, x.cur) + " excluding VAT, with " + money(x.equip, x.cur) + " of equipment at price-list rates"
        + (hasOverride(q) ? " and a manual price override for you to check." : " and no overrides.")
        + flex + later + gbp + " VAT treatment is pending confirmation.",
      actions:[["Approve " + q.id, 1]].concat(x.fromFlex.length ? [["Show the Flex intake", 0]] : [["What needs my approval?", 0]])});
  }
  if (q.status === "Sent"){
    return Object.assign(base, {
      text:"It has gone out. " + q.id + " was approved and emailed to " + x.ct.name + " at " + x.c.name + " " + whenText(st, q.sentAt || st.now)
        + ", " + money(x.total, x.cur) + " excluding VAT. " + SIM_SENT + " It now waits on " + x.first + "'s decision"
        + (q.overrideRequested ? ", and " + x.first + " has asked about the price." : "."),
      actions:[["What needs my approval?", 0]]});
  }
  if (q.status === "Awaiting Freight"){
    const lyonDraft = x.f && x.f.id === "FR-1211" && openApprovalFor(st, x.f.id);
    return Object.assign(base, {
      text:q.id + " for " + x.c.name + " is waiting on a freight rate. The request went to " + x.carrier + " "
        + (x.f && x.f.requestedAt ? whenText(st, x.f.requestedAt) : "recently") + " and there's no reply yet, so the quote has "
        + money(x.equip, x.cur) + " of equipment and no freight line. I won't estimate the freight before the carrier replies.",
      actions:lyonDraft ? [["Chase the Lyon rate", 1]] : [["Show all late carrier rates", 0]]});
  }
  if (q.status === "Accepted"){
    return Object.assign(base, {
      text:x.c.name + " accepted " + q.id + ", " + money(x.total, x.cur) + " excluding VAT. The order and its FreshBooks invoice are created, simulated in this demo.",
      actions:[["Who owes us money?", 0]]});
  }
  if (q.status === "Draft"){
    return Object.assign(base, {
      text:q.id + " for " + x.c.name + " is still a draft. "
        + (x.f && x.f.status === "To request" ? "The carrier request is prepared and waiting for your approval before it goes to " + x.carrier + "."
          : "It needs a freight rate before it can go for approval."),
      actions:[["What needs my approval?", 0]]});
  }
  return Object.assign(base, {text:q.id + " for " + x.c.name + " is " + q.status.toLowerCase() + ".", actions:[["What needs my approval?", 0]]});
}

function confirmQuote(st, id){
  const q = ix(st).quote[id];
  if (!q) return answerQuoteId(st, id);
  if (q.status !== "Ready for Review") return {tool:"quote_send", effect:"read",
    text:q.id + " isn't waiting for approval: it's " + q.status.toLowerCase() + ".", actions:[["What needs my approval?", 0]]};
  const x = quoteFacts(st, q);
  return {tool:"quote_send", effect:"write", confirm:true,
    confirmSummary:"Send quotation " + q.id + " to " + x.ct.name + " at " + x.c.name + ": " + money(x.equip, x.cur) + " equipment plus "
      + (x.fc === null ? "freight to follow" : money(x.fc, x.cur) + " freight") + ", " + money(x.total, x.cur) + " excluding VAT. " + SIM_WILL,
    text:"Sending a quotation to a customer needs your approval, so I've stopped here. Confirm and it goes out, logged against the quote and the customer.",
    actions:[["Confirm and send " + q.id, 1], ["Not yet", 0]]};
}

function doQuote(st, id){
  const q = ix(st).quote[id];
  if (!q || q.status !== "Ready for Review") return confirmQuote(st, id);
  const x = quoteFacts(st, q);
  approveQuote(id);
  const left = quotesForApproval(mm.get()).length;
  return {tool:"quote_send", effect:"write",
    text:"Done. " + q.id + " is marked as sent to " + x.c.name + ", " + money(x.total, x.cur) + " excluding VAT, and logged against the quote. "
      + SIM_SENT + " " + count(left, "quote is", "quotes are") + " still waiting for approval.",
    actions:[["What needs my approval?", 0]]};
}

function lyonFacts(st){
  const f = ix(st).freight["FR-1211"];
  if (!f) return null;
  return {f, q:f.quoteId ? ix(st).quote[f.quoteId] : undefined, c:custOf(st, f.customerId), carrier:carrierOf(st, f.carrierId),
    draft:!!openApprovalFor(st, f.id)};
}

function answerLyon(st){
  const L = lyonFacts(st);
  if (!L) return FALLBACK;
  const cols = ["Request", "Machines", "Waiting", "Status"];
  const rows = [[L.f.id + ", " + L.c.name, linesText(st, L.f.lines), L.f.requestedAt !== null ? waitText(st.now - L.f.requestedAt) : "Not sent",
    L.f.status === "Awaiting rate" ? (L.draft ? "Chase drafted" : L.f.chases ? "Chased" : "Waiting") : L.f.status]];
  if (L.f.status !== "Awaiting rate"){
    const fc = freightCharge(L.f);
    return {tool:"freight_search", effect:"read", cols, rows,
      text:"The Lyon rate is in. " + L.carrier + " replied on " + L.f.id
        + (L.f.carrierQuote && fc !== null ? ": " + money(L.f.carrierQuote.cost, L.c.currency) + ", so with the " + L.f.markupPct + "% markup the freight line is " + money(fc, L.c.currency) : "")
        + "." + (L.q ? " " + L.q.id + " is " + L.q.status.toLowerCase() + "." : ""),
      actions:L.q && L.q.status === "Ready for Review" ? [["Approve " + L.q.id, 1]] : [["What needs my approval?", 0]]};
  }
  return {tool:"freight_search", effect:"read", cols, rows,
    text:L.c.name + " asked for " + linesText(st, L.f.lines) + " delivered to " + L.f.destination + ". Rate request " + L.f.id + " went to "
      + L.carrier + " " + (L.f.requestedAt !== null ? whenText(st, L.f.requestedAt) : "recently") + " and there's been no reply"
      + (L.f.chases ? ", even after " + numWord(L.f.chases) + (L.f.chases === 1 ? " chase" : " chases") : "") + ", so "
      + (L.q ? L.q.id + " (" + money(quoteEquipment(L.q), L.q.currency) + " before freight)" : "the quote") + " can't go out. "
      + "I won't put a freight cost on it until the carrier replies." + (L.draft ? " A chase is drafted and waiting for your yes." : ""),
    actions:L.draft ? [["Chase the Lyon rate", 1], ["Show me customers in France waiting on shipping", 0]]
      : [["Show me customers in France waiting on shipping", 0]]};
}

function confirmLyon(st){
  const L = lyonFacts(st);
  if (!L || L.f.status !== "Awaiting rate") return answerLyon(st);
  return {tool:"carrier_chase", effect:"write", confirm:true,
    confirmSummary:"Email " + L.carrier + " chasing " + L.f.id + ": " + linesText(st, L.f.lines) + " from County Derry to " + L.f.destination
      + ", asking for the rate today. " + SIM_WILL,
    text:"The chase is drafted. Emailing a carrier needs your yes, so I've stopped here.",
    actions:[["Confirm the Lyon chase", 1], ["Not yet", 0]]};
}

function doLyon(st){
  const L = lyonFacts(st);
  if (!L || L.f.status !== "Awaiting rate") return answerLyon(st);
  sendFreightRequest(L.f.id);
  return {tool:"carrier_chase", effect:"write",
    text:"Done. The chase to " + L.carrier + " for " + L.f.id + " is logged against the Lyon request. " + SIM_SENT
      + (L.q ? " " + L.q.id + " still waits for the rate, and no freight cost is guessed in the meantime." : ""),
    actions:[["Show me customers in France waiting on shipping", 0]]};
}

function answerFrance(st){
  const list = freightOutstanding(st).filter(f => custOf(st, f.customerId).country === "FR")
    .sort((a, b) => a.id === "FR-1211" ? -1 : b.id === "FR-1211" ? 1 : (a.requestedAt || 0) - (b.requestedAt || 0));
  const cols = ["Customer", "Machines", "Waiting", "Status"];
  if (!list.length) return {tool:"freight_search", effect:"read",
    text:"No customers in France are waiting on a freight rate right now. Every French quote either has its rate or hasn't been sent to a carrier yet.",
    actions:[["Show all late carrier rates", 0]]};
  const rows = list.map(f => {
    const c = custOf(st, f.customerId);
    const draft = !!openApprovalFor(st, f.id);
    return [c.name, linesText(st, f.lines), f.requestedAt !== null ? waitText(st.now - f.requestedAt) : "Not sent",
      isLate(st, f) ? (draft ? "Chase drafted" : f.chases ? "Chased" : "Past 3 days") : "Within 3 days"];
  });
  const carriers = Array.from(new Set(list.map(f => carrierOf(st, f.carrierId))));
  const L = lyonFacts(st);
  const lyon = list.find(f => f.id === "FR-1211");
  const others = list.filter(f => f.id !== "FR-1211");
  const othersLate = others.filter(f => isLate(st, f)).length;
  let text = countCap(list.length, "customer in France is", "customers in France are") + " waiting on a freight rate, "
    + (carriers.length === 1 ? (list.length === 1 ? "with " : "all with ") + carriers[0] : "with " + listText(carriers)) + ". ";
  if (lyon && L){
    text += "Lyon Performance Club has waited longest: " + lyon.id + " went out " + whenText(st, lyon.requestedAt) + " with no reply, so "
      + (L.q ? L.q.id + " (" + linesText(st, L.q.lines) + ", " + money(quoteEquipment(L.q), L.q.currency) + " before freight)" : "the quote")
      + " can't go out. I won't put a freight cost on it until the carrier replies."
      + (L.draft ? " A chase is drafted and waiting for your yes." : lyon.chases ? " It has been chased " + (lyon.chases === 1 ? "once." : lyon.chases + " times.") : "");
    if (others.length) text += " The other " + others.length + (othersLate ? " include " + othersLate + " past three days."
      : (others.length === 1 ? " is" : " are") + " inside three days.");
  } else {
    const lateN = list.filter(f => isLate(st, f)).length;
    text += lateN ? lateN + (lateN === 1 ? " is" : " are") + " past three days, and none gets a freight cost until the carrier replies." : "All of them are inside three days.";
  }
  return {tool:"freight_search", effect:"read", text:text.trim(), cols, rows,
    actions:lyon && L && L.draft ? [["Chase the Lyon rate", 1], ["Show all late carrier rates", 0]] : [["Show all late carrier rates", 0]]};
}

function answerLateRates(st){
  const out = freightOutstanding(st).slice().sort((a, b) => (a.requestedAt || 0) - (b.requestedAt || 0));
  const late = out.filter(f => isLate(st, f));
  const list = late.length ? late : out.slice(0, 5);
  const rows = list.map(f => { const c = custOf(st, f.customerId);
    return [c.name + ", " + countryName(c.country), f.id, f.requestedAt !== null ? waitText(st.now - f.requestedAt) : "Not sent", carrierOf(st, f.carrierId)]; });
  const toRequest = st.freight.filter(f => f.status === "To request").length;
  const L = lyonFacts(st);
  const lyonDraft = L && L.f.status === "Awaiting rate" && L.draft;
  return {tool:"freight_search", effect:"read", cols:["Customer", "Request", "Waiting", "Carrier"], rows,
    text:count(out.length, "rate request is", "rate requests are") + " out with carriers"
      + (late.length ? " and " + numWord(late.length) + (late.length === 1 ? " is" : " are") + " past three days, oldest first below." : ", none of them past three days.")
      + " Each one holds up a quote, and none gets a freight cost until the carrier replies."
      + (toRequest ? " " + count(toRequest, "more request is", "more requests are") + " drafted and waiting for your approval before they go." : "")
      + (lyonDraft ? " The Lyon chase is drafted and needs your yes." : ""),
    actions:lyonDraft ? [["Chase the Lyon rate", 1], ["Show me customers in France waiting on shipping", 0]] : [["What needs my approval?", 0]]};
}

function answerReplies(st){
  const un = unanswered(st).slice().sort((a, b) => a.receivedAt - b.receivedAt);
  if (!un.length) return {tool:"reply_drafts", effect:"read", text:"Every enquiry has had a first reply. Nothing is waiting on a draft.",
    actions:[["What needs my approval?", 0]]};
  const complete = un.filter(e => !e.missing.length);
  const missing = un.filter(e => e.missing.length);
  const postcodes = missing.filter(e => e.missing.indexOf("Delivery postcode") > -1).length;
  const old = un.filter(e => st.now - e.receivedAt > 2 * DAY_MS);
  const sample = old.slice(0, 4);
  const milano = un.find(e => e.id === "ENQ-4562");
  if (milano && sample.indexOf(milano) < 0) sample.push(milano);
  for (const e of un){ if (sample.length >= 5) break; if (sample.indexOf(e) < 0) sample.push(e); }
  const rows = sample.map(e => [custOf(st, e.customerId).name, linesText(st, e.lines), waitText(st.now - e.receivedAt),
    e.missing.length ? "Asks for " + e.missing[0].toLowerCase() : "Price list, freight next"]);
  const text = "Done. " + (un.length === 1 ? "One reply is" : un.length + " replies are") + " drafted, one for every unanswered enquiry, and none have been sent. "
    + (complete.length ? complete.length + (complete.length === 1 ? " has" : " have") + " everything needed, so the draft attaches the price list in the customer's currency and says a freight rate is being requested. " : "")
    + (missing.length ? (missing.length === un.length && un.length > 1 ? "All of them are" : missing.length + (missing.length === 1 ? " is" : " are")) + " missing a detail" + (postcodes ? ", mostly a delivery postcode (" + postcodes + ")" : "")
      + ", so the draft asks for it first rather than guessing. " : "")
    + (old.length ? cap(numWord(old.length)) + (old.length === 1 ? " has" : " have") + " waited more than 48 hours: start with " + (old.length === 1 ? "that one. " : "those. ") : "")
    + "Nothing goes out until you approve it.";
  return {tool:"reply_drafts", effect:"draft", text, cols:["Customer", "Asked for", "Waiting", "Draft"], rows,
    actions:complete.length
      ? [[complete.length === 1 ? "Approve the complete reply" : "Approve the " + complete.length + " complete replies", 1], ["Which enquiries are missing details?", 0]]
      : [["Which enquiries are missing details?", 0]]};
}

function confirmReplies(st){
  const complete = unanswered(st).filter(e => !e.missing.length);
  if (!complete.length) return answerReplies(st);
  const left = unanswered(st).length - complete.length;
  return {tool:"reply_send", effect:"write", confirm:true,
    confirmSummary:"Send " + count(complete.length, "reply", "replies") + " to customers whose enquiries are complete. Each attaches the price list in their currency (EUR, or GBP for the UK) and says a freight rate is being requested. " + SIM_WILL,
    text:"These are customer emails, so they need your yes." + (left ? " The " + left + " that " + (left === 1 ? "is" : "are") + " missing a detail stay as drafts." : ""),
    actions:[[complete.length === 1 ? "Confirm the reply" : "Confirm the " + complete.length + " replies", 1], ["Not yet", 0]]};
}

function doReplies(st){
  const ids = unanswered(st).filter(e => !e.missing.length).map(e => e.id);
  if (!ids.length) return answerReplies(st);
  approveReplies(ids);
  const left = unanswered(mm.get()).length;
  return {tool:"reply_send", effect:"write",
    text:"Done. " + count(ids.length, "reply is", "replies are") + " approved and logged against each enquiry. " + SIM_SENT
      + " Those enquiries move to Qualified, ready for a freight request." + (left ? " " + count(left, "unanswered enquiry is", "unanswered enquiries are") + " left, each missing a detail." : ""),
    actions:left ? [["Which enquiries are missing details?", 0]] : [["What needs my approval?", 0]]};
}

function answerMissing(st){
  const list = unanswered(st).filter(e => e.missing.length).sort((a, b) => a.receivedAt - b.receivedAt);
  if (!list.length) return {tool:"enquiries_search", effect:"read", text:"No unanswered enquiry is missing a detail.", actions:[["Prepare replies to my unanswered enquiries", 0]]};
  const kinds = {};
  list.forEach(e => e.missing.forEach(m => { kinds[m] = (kinds[m] || 0) + 1; }));
  const parts = Object.keys(kinds).sort((a, b) => kinds[b] - kinds[a]).map(k => kinds[k] + " without a " + k.toLowerCase());
  return {tool:"enquiries_search", effect:"read", cols:["Customer", "Asked for", "Missing", "Waiting"],
    rows:list.slice(0, 6).map(e => [custOf(st, e.customerId).name, linesText(st, e.lines), e.missing.join(", "), waitText(st.now - e.receivedAt)]),
    text:count(list.length, "unanswered enquiry is", "unanswered enquiries are") + " missing a detail: " + listText(parts) + ". "
      + "Their drafts ask for it rather than guessing, so no freight rate is requested until the customer replies.",
    actions:[["Prepare replies to my unanswered enquiries", 0]]};
}

function answerOldest(st){
  const un = unanswered(st).slice().sort((a, b) => a.receivedAt - b.receivedAt);
  const old = un.filter(e => st.now - e.receivedAt > 2 * DAY_MS);
  const list = old.length ? old : un.slice(0, 4);
  return {tool:"enquiries_search", effect:"read", cols:["Customer", "Asked for", "Waiting", "Draft"],
    rows:list.map(e => [custOf(st, e.customerId).name, linesText(st, e.lines), waitText(st.now - e.receivedAt),
      e.missing.length ? "Asks for " + e.missing[0].toLowerCase() : "Ready to approve"]),
    text:old.length
      ? countCap(old.length, "enquiry has", "enquiries have") + " waited more than 48 hours for a first reply. The website promises a reply within 1 to 2 business days, so these go first. Each one has a draft ready."
      : "No enquiry has waited more than 48 hours. The oldest are below.",
    actions:[["Prepare replies to my unanswered enquiries", 0]]};
}

function promiseText(st, inv){
  const d = Math.round((inv.promise.date - st.now) / DAY_MS);
  if (inv.promise.broken) return "promised " + Math.abs(d) + " days ago, nothing received";
  if (/payment run/i.test(inv.promise.note)) return "their next payment run";
  return d <= 0 ? "due today" : "in " + count(d, "day");
}

function answerOwe(st){
  const od = overdueInvoices(st);
  if (!od.length) return {tool:"freshbooks_overdue", effect:"read", text:"Nothing is overdue in FreshBooks right now.", actions:[["What needs my approval?", 0]]};
  const eur = sumBy(od.filter(i => i.currency === "EUR"), i => outstanding(st, i));
  const gbp = sumBy(od.filter(i => i.currency === "GBP"), i => outstanding(st, i));
  const byValue = od.slice().sort((a, b) => eurEq(outstanding(st, b), b.currency) - eurEq(outstanding(st, a), a.currency));
  const top = byValue[0], tc = custOf(st, top.customerId);
  const draft = !!openApprovals(st).find(a => a.kind === "Payment follow-up" && a.recordId === top.id);
  const promises = st.invoices.filter(i => i.promise && invoiceStatus(st, i) !== "Paid")
    .sort((a, b) => (a.promise.broken ? 1 : 0) - (b.promise.broken ? 1 : 0));
  const promised = promises.map(i => custOf(st, i.customerId).name + " (" + promiseText(st, i) + ")");
  const rheinlandDraft = !!openApprovalFor(st, "FB-1047");
  return {tool:"freshbooks_overdue", effect:"read", cols:["Customer", "Invoice", "Outstanding", "Overdue"],
    rows:byValue.slice(0, 5).map(i => [custOf(st, i.customerId).name, i.id, money(outstanding(st, i), i.currency), daysOverdue(st, i) + " days"]),
    text:count(od.length, "invoice is", "invoices are") + " overdue in FreshBooks, " + (eur ? money(eur) : "")
      + (gbp ? (eur ? " plus " : "") + money(gbp, "GBP") + " from UK customers" : " between them, all in EUR") + ". "
      + tc.name + " is the largest: " + top.id + ", " + money(outstanding(st, top), top.currency) + ", " + daysOverdue(st, top) + " days overdue"
      + (draft ? ", and a polite payment-status email is drafted for your approval." : ".")
      + (promises.length ? " " + (promises.length === 1 ? "One customer has" : cap(numWord(promises.length)) + " customers have") + " promised payment: " + listText(promised) + "." : "")
      + " FreshBooks is read only here; nothing is changed in it.",
    actions:(rheinlandDraft ? [["Send the Rheinland payment email", 1]] : []).concat(promises.length ? [["Show the payment promises", 0]] : [])};
}

function answerPromises(st){
  const list = st.invoices.filter(i => i.promise && invoiceStatus(st, i) !== "Paid")
    .sort((a, b) => (a.promise.broken ? 1 : 0) - (b.promise.broken ? 1 : 0));
  if (!list.length) return {tool:"freshbooks_overdue", effect:"read", text:"No payment promises are open.", actions:[["Who owes us money?", 0]]};
  const broken = list.filter(i => i.promise.broken);
  return {tool:"freshbooks_overdue", effect:"read", cols:["Customer", "Invoice", "Outstanding", "Promise"],
    rows:list.map(i => [custOf(st, i.customerId).name, i.id, money(outstanding(st, i), i.currency), cap(promiseText(st, i))]),
    text:countCap(list.length, "payment promise is", "payment promises are") + " open. "
      + list.map(i => i.promise.note).join(" ")
      + (broken.length ? " " + listText(broken.map(i => custOf(st, i.customerId).name)) + (broken.length === 1 ? " is" : " are") + " the one to follow up first. A follow-up is drafted for your review; automatic chasing is off." : ""),
    actions:[["Who owes us money?", 0]]};
}

function rheinlandFacts(st){
  const inv = ix(st).invoice["FB-1047"];
  if (!inv) return null;
  const c = custOf(st, inv.customerId);
  return {inv, c, ct:contactOf(st, c), o:ix(st).order[inv.orderId], out:outstanding(st, inv), d:daysOverdue(st, inv),
    draft:!!openApprovalFor(st, inv.id)};
}

function answerRheinland(st){
  const R = rheinlandFacts(st);
  if (!R) return FALLBACK;
  const cols = ["Invoice", "Amount", "Outstanding", "Status"];
  const rows = [[R.inv.id, money(R.inv.amount, R.inv.currency), money(R.out, R.inv.currency), R.out > 0 ? R.d + " days overdue" : "Paid"]];
  if (R.out <= 0) return {tool:"freshbooks_read", effect:"read", cols, rows, text:R.inv.id + " from " + R.c.name + " is paid in full. Nothing to chase.",
    actions:[["Who owes us money?", 0]]};
  const what = R.o ? linesText(st, R.o.lines) + " plus " + money(R.o.freightCharge, R.inv.currency) + " freight to " + R.c.city : "the order";
  const weeks = R.o && R.o.deliveredAt ? Math.round((st.now - R.o.deliveredAt) / (7 * DAY_MS)) : 0;
  return {tool:"freshbooks_read", effect:"read", cols, rows,
    text:R.c.name + " owes " + money(R.out, R.inv.currency) + " on FreshBooks invoice " + R.inv.id + ": " + what
      + (weeks ? ", delivered about " + numWord(weeks) + " weeks ago" : "") + ". It's " + R.d + " days overdue with no payment recorded. "
      + (R.draft ? "The Receivables Agent has drafted a polite payment-status email to " + R.ct.name + " asking when payment is planned. It waits for your approval, because automatic chasing is off."
        : "The payment-status email has already been approved.")
      + " Nothing is changed in FreshBooks.",
    actions:R.draft ? [["Send the Rheinland payment email", 1], ["Who owes us money?", 0]] : [["Who owes us money?", 0]]};
}

function confirmRheinland(st){
  const R = rheinlandFacts(st);
  if (!R || R.out <= 0 || !R.draft) return answerRheinland(st);
  return {tool:"payment_email", effect:"write", confirm:true,
    confirmSummary:"Email " + R.ct.name + " at " + R.c.name + " about invoice " + R.inv.id + ": " + money(R.out, R.inv.currency) + ", " + R.d
      + " days overdue, asking when payment is planned. " + SIM_WILL,
    text:"A payment email to a customer needs your yes, so I've stopped here. It's polite and short, and FreshBooks stays unchanged.",
    actions:[["Confirm the Rheinland email", 1], ["Not yet", 0]]};
}

function doRheinland(st){
  const R = rheinlandFacts(st);
  if (!R || R.out <= 0 || !R.draft) return answerRheinland(st);
  sendPaymentFollowUp(R.inv.id);
  return {tool:"payment_email", effect:"write",
    text:"Done. The payment-status email to " + R.ct.name.split(" ")[0] + " at " + R.c.name + " is logged against " + R.inv.id + ". " + SIM_SENT + " FreshBooks is unchanged.",
    actions:[["Who owes us money?", 0]]};
}

function answerRotterdam(st){
  const q = ix(st).quote["Q-2271"];
  if (!q) return FALLBACK;
  const x = quoteFacts(st, q);
  const tbar = prodOf(st, "MM-LIN-TBR");
  const s = tbar ? stockOf(st, tbar) : null;
  const freight = x.fc === null ? "freight to follow"
    : money(x.fc, x.cur) + " freight" + (x.cq ? " (" + x.carrier + " " + money(x.cq.cost, x.cur) + " + " + x.f.markupPct + "%)" : "");
  return {tool:"quote_explain", effect:"read", cols:["Line", "Qty", "Price", "Total"], rows:quoteRows(st, q),
    text:q.id + (q.status === "Sent" && q.sentAt ? " went to " + x.c.name + " " + whenText(st, q.sentAt) + " at list price: " : " for " + x.c.name + ": ")
      + linesText(st, q.lines) + ", " + money(x.equip, x.cur) + ", plus " + freight + ", " + money(x.total, x.cur) + " excluding VAT. "
      + (q.overrideRequested ? x.ct.name + " has asked about flexibility on the unit price at this volume. No discount has been applied: there are no automatic wholesale discounts, and any override needs your approval. " : "")
      + (s ? s.available + " T-Bar Linear Rows are available in County Derry." : ""),
    actions:q.overrideRequested ? [["Keep the list price for Rotterdam", 1], ["How does pricing work?", 0]] : [["How does pricing work?", 0]]};
}

function confirmRotterdam(st){
  const q = ix(st).quote["Q-2271"];
  if (!q || !q.overrideRequested) return answerRotterdam(st);
  const x = quoteFacts(st, q);
  return {tool:"price_reply", effect:"write", confirm:true,
    confirmSummary:"Reply to " + x.ct.name + " at " + x.c.name + " holding the quoted list price on " + q.id + ": " + linesText(st, q.lines) + ", "
      + money(x.total, x.cur) + " excluding VAT, no discount. " + SIM_WILL,
    text:"A pricing reply to a customer needs your yes. If you'd rather offer a different unit price, set it in the quote builder and it comes back to you as an override.",
    actions:[["Confirm the Rotterdam reply", 1], ["Not yet", 0]]};
}

function doRotterdam(st){
  const q = ix(st).quote["Q-2271"];
  if (!q || !q.overrideRequested) return answerRotterdam(st);
  const total = money(quoteTotal(st, q), q.currency);
  keepListPrice(q.id);
  return {tool:"price_reply", effect:"write",
    text:"Done. The reply holding list price on " + q.id + " is logged against Rotterdam Iron Supply. " + SIM_SENT + " The quote stays at " + total + " excluding VAT.",
    actions:[["What needs my approval?", 0]]};
}

function answerMilano(st){
  const e = ix(st).enquiry["ENQ-4562"];
  if (!e) return FALLBACK;
  const c = custOf(st, e.customerId), ct = contactOf(st, c);
  const tbar = prodOf(st, "MM-LIN-TBR");
  const avail = tbar ? stockOf(st, tbar).available : 0;
  const src = e.source === "Website quote form" ? "the website quote form" : e.source.toLowerCase();
  return {tool:"enquiries_search", effect:"read", cols:["Enquiry", "Machine", "Facility", "Missing"],
    rows:[[e.id + ", " + c.name, linesText(st, e.lines), e.facility, e.missing.length ? e.missing.join(", ") : "Nothing"]],
    text:c.name + " came in through " + src + " " + waitText(st.now - e.receivedAt) + " ago. " + ct.name + " wants " + linesText(st, e.lines)
      + " for a new strength zone in " + c.city + ". " + e.qualification + ", heard about Mega Mass on " + e.heardVia.toLowerCase() + ". "
      + (e.replied ? "A reply has gone out" + (e.missing.length ? " asking for the " + e.missing[0].toLowerCase() + "." : ".")
        : (e.missing.length ? "There's no " + e.missing[0].toLowerCase() + ", so no freight rate has been requested. Recommended action: " + e.aiAction.toLowerCase() + ". The reply asking for it is drafted. " : ""))
      + (e.replied ? " " : "") + avail + " T-Bar Linear Rows are available in County Derry.",
    actions:e.replied ? [["What needs my approval?", 0]] : [["Prepare replies to my unanswered enquiries", 0]]};
}

function answerFlex(st){
  const sh = st.shipments.find(x => x.id === "SH-FLEX-NOV") || st.shipments[0];
  if (!sh) return FALLBACK;
  const res = st.reservations.filter(r => r.shipmentId === sh.id);
  const units = sumBy(sh.lines, l => l.units);
  const reserved = sumBy(res, r => r.units);
  const free = units - reserved;
  const rows = sh.lines.map(l => {
    const r = sumBy(res.filter(x => x.productId === l.productId), x => x.units);
    return [prodOf(st, l.productId).name, String(l.units), String(r), String(l.units - r)];
  }).concat([["Total", String(units), String(reserved), String(free)]]);
  const dq = ix(st).quote["Q-2286"];
  const ids = new Set(sh.lines.map(l => l.productId));
  const need = dq && (dq.status === "Ready for Review" || dq.status === "Sent") ? sumBy(dq.lines.filter(l => ids.has(l.productId)), l => l.qty) : 0;
  const tbar = prodOf(st, "MM-LIN-TBR");
  const t = tbar ? stockOf(st, tbar) : null;
  return {tool:"stock_incoming", effect:"read", cols:["Machine", "Incoming", "Reserved", "Unallocated"], rows,
    text:"The Flex Series November intake is " + units + " units: " + listText(sh.lines.map(l => l.units + " × " + prodOf(st, l.productId).name)) + ". "
      + "It's due " + lowerFirst(sh.eta) + (sh.confirmed ? ". " : " and the date isn't confirmed yet, so no customer is promised a fixed date. ")
      + cap(numWord(reserved)) + " " + (reserved === 1 ? "is" : "are") + " already reserved against orders and " + numWord(free) + " " + (free === 1 ? "is" : "are") + " unallocated."
      + (need && free ? " If Danube Strength accepts Q-2286, " + numWord(Math.min(need, free)) + " of those " + numWord(free) + " go to them." : "")
      + (t ? " In the warehouse now, the T-Bar Linear Row has " + t.inStock + " in stock, " + t.reserved + " reserved and " + t.available + " available." : ""),
    actions:[["What does the website say about the T-Bar?", 0], ["Why has the Danube Strength quote not gone out?", 0]]};
}

function answerStock(st){
  const held = st.products.filter(p => p.inStock > 0);
  const totals = held.reduce((a, p) => { const s = stockOf(st, p); return {inStock:a.inStock + s.inStock, reserved:a.reserved + s.reserved, available:a.available + s.available}; },
    {inStock:0, reserved:0, available:0});
  const sh = st.shipments[0];
  const incoming = sh ? sumBy(sh.lines, l => l.units) : 0;
  const incomingFree = sh ? incoming - sumBy(st.reservations.filter(r => r.shipmentId === sh.id), r => r.units) : 0;
  return {tool:"stock_levels", effect:"read", cols:["Machine", "In stock", "Reserved", "Available"],
    rows:held.map(p => { const s = stockOf(st, p); return [p.name, String(s.inStock), String(s.reserved), String(s.available)]; }),
    text:"Stock in County Derry is kept simple: in stock, reserved, available and incoming. " + totals.inStock + " machines are in the warehouse, "
      + totals.reserved + " of them reserved, so " + totals.available + " are available."
      + (sh ? " The Flex Series intake adds " + incoming + " more (" + incomingFree + " unallocated), due " + lowerFirst(sh.eta) + (sh.confirmed ? "." : " and not confirmed.") : "")
      + " Nothing is committed below zero without a warning.",
    actions:[["Show the Flex intake", 0], ["What does the website say about the T-Bar?", 0]]};
}

function answerWebsite(st){
  const tbar = prodOf(st, "MM-LIN-TBR");
  if (!tbar) return FALLBACK;
  const s = stockOf(st, tbar);
  const task = st.tasks.find(t => /website availability/i.test(t.title));
  const preorder = st.products.filter(p => p.id !== tbar.id && stockOf(st, p).available > 0 && /^pre-order/i.test(p.websiteLabel)).map(p => p.name);
  const held = st.products.filter(p => p.inStock > 0);
  return {tool:"website_check", effect:"read", cols:["Machine", "Website says", "Available", "Matches stock"],
    rows:held.map(p => { const a = stockOf(st, p).available; return [p.name, p.websiteLabel, String(a), /^available/i.test(p.websiteLabel) === a > 0 ? "Yes" : "No"]; }),
    text:"The T-Bar Linear Row page on megamasseurope.com still says '" + tbar.websiteLabel + "', but " + s.inStock + " are in County Derry and "
      + s.available + " are available after reservations. "
      + (task && task.status !== "Done" ? "Natalie has the task to update it; Pulse doesn't edit the website." : "The update task is marked done; Pulse doesn't edit the website itself.")
      + (preorder.length ? " " + listText(preorder) + (preorder.length === 1 ? " has" : " have") + " stock too but still show" + (preorder.length === 1 ? "s" : "") + " as pre-order on the site." : ""),
    actions:[["Show the Flex intake", 0]]};
}

function answerMarkup(st){
  const def = st.controls.defaultMarkup;
  const facts = ["Q-2286", "Q-2271", "Q-2293", "Q-2290"].map(id => ix(st).quote[id]).filter(Boolean).map(q => quoteFacts(st, q));
  const rated = st.freight.filter(f => f.carrierQuote && f.status !== "To request");
  const differ = facts.filter(x => x.f && x.fc !== null && x.f.markupPct !== def).map(x => x.c.name + " at " + x.f.markupPct + "%");
  const L = lyonFacts(st);
  return {tool:"freight_markup", effect:"read", cols:["Customer", "Carrier rate", "Markup", "Freight charged"],
    rows:facts.map(x => [x.c.name, x.cq ? money(x.cq.cost, x.cur) : "Waiting", x.f ? x.f.markupPct + "%" : "None", x.fc === null ? "Not priced yet" : money(x.fc, x.cur)]),
    text:"The default freight markup is " + def + "%, an illustrative setting you can change in Settings. It goes on top of the carrier's own rate, and a markup needs your approval before a quote goes out. "
      + "Across the " + rated.length + " carrier rates on file the average is " + avgMarkup(st).toFixed(1) + "%."
      + (differ.length ? " " + listText(differ) + (differ.length === 1 ? " differs" : " differ") + " from the default." : "")
      + (L && L.f.status === "Awaiting rate" ? " Lyon has no freight charge yet because " + L.carrier + " hasn't replied, and I won't estimate one." : ""),
    actions:[["Why has the Danube Strength quote not gone out?", 0]]};
}

function approvalPhrase(st, a){
  const c = custOf(st, a.customerId);
  if (a.kind === "Customer quotation") return c.name + "'s quote (" + money(a.amount || 0, a.currency) + ")";
  if (a.kind === "Price review") return c.name + "'s volume-pricing question";
  if (a.kind === "Freight request") return a.status === "Needs action" ? "the " + c.city + " freight chase" : "a carrier request for " + c.name;
  return c.name + "'s payment email";
}

function answerApprovals(st){
  const open = openApprovals(st);
  if (!open.length) return {tool:"approvals_list", effect:"read", text:"Nothing is waiting on you right now.", actions:[["What changed today?", 0]]};
  const by = (k) => open.filter(a => a.kind === k).length;
  const kinds = [[by("Customer quotation"), "customer quotation"], [by("Freight request"), "carrier request"],
    [by("Payment follow-up"), "payment follow-up"], [by("Price review"), "pricing question"]].filter(p => p[0]).map(p => count(p[0], p[1]));
  const first = open.find(a => a.kind === "Customer quotation" && a.status === "Ready");
  const danube = open.find(a => a.recordId === "Q-2286");
  return {tool:"approvals_list", effect:"read", cols:["Waiting on you", "Customer", "Value", "Prepared by"],
    rows:open.slice(0, 6).map(a => [a.action, custOf(st, a.customerId).name, a.amount === null ? "None" : money(a.amount, a.currency), a.preparedBy]),
    text:count(open.length, "thing is", "things are") + " waiting on you: " + listText(kinds) + ". "
      + (open.length > 1 ? "The " + numWord(Math.min(4, open.length)) + " at the top are " + listText(open.slice(0, 4).map(a => approvalPhrase(st, a))) + ". " : "")
      + "Nothing moves until you approve it.",
    actions:(first ? [["Approve " + first.recordId, 1]] : []).concat(danube ? [["Why has the Danube Strength quote not gone out?", 0]] : [["Who owes us money?", 0]])};
}

function answerBriefing(st){
  const h = headline(st);
  const un = unanswered(st);
  const old = un.filter(e => st.now - e.receivedAt > 2 * DAY_MS).length;
  const late = freightOutstanding(st).filter(f => isLate(st, f));
  const L = lyonFacts(st);
  const lyonWaiting = L && L.f.status === "Awaiting rate" && L.f.requestedAt !== null;
  const dq = ix(st).quote["Q-2286"];
  const danubeReady = dq && dq.status === "Ready for Review";
  const R = rheinlandFacts(st);
  return {tool:"briefing_summary", effect:"read", cols:["Area", "Now", "Needs you", "Next step"],
    rows:[["Enquiries", h.unanswered + " unanswered", old + " past 48h", "Review the drafted replies"],
      ["Freight", h.freightOutstanding + " rates out", late.length + " past 3 days", lyonWaiting && L.draft ? "Approve the Lyon chase" : "Watch for replies"],
      ["Quotes", h.quotesAwaiting + " ready", danubeReady ? "Danube " + money(quoteTotal(st, dq)) : "None pinned", danubeReady ? "Approve Q-2286" : "Work the list"],
      ["Money", h.overdueCount + " overdue", money(h.overdueValue), R && R.draft ? "Rheinland payment email" : "Payment promises"]],
    text:"Here's where things stand. " + count(h.unanswered, "enquiry is", "enquiries are") + " unanswered"
      + (old ? ", " + numWord(old) + " of them past 48 hours" : "") + ", and every one has a reply drafted. "
      + count(h.freightOutstanding, "freight rate is", "freight rates are") + " out with carriers"
      + (lyonWaiting ? "; Lyon Performance Club has waited " + count(daysSince(st, L.f.requestedAt), "day") : "") + ". "
      + count(h.quotesAwaiting, "quote is", "quotes are") + " ready for approval" + (danubeReady ? ", led by Danube Strength at " + money(quoteTotal(st, dq)) : "") + ". "
      + count(h.overdueCount, "invoice is", "invoices are") + " overdue in FreshBooks, " + money(h.overdueValue)
      + (h.promises ? ", and " + (h.promises === 1 ? "one customer has" : numWord(h.promises) + " customers have") + " promised payment." : "."),
    actions:(danubeReady ? [["Approve Q-2286", 1]] : []).concat(lyonWaiting && L.draft ? [["Chase the Lyon rate", 0]] : [["What needs my approval?", 0]])};
}

const FOLLOW_KINDS = [
  ["No reply", "Details we asked for", (n) => count(n, "customer who hasn't", "customers who haven't") + " sent the details we asked for"],
  ["Quote decision", "Quote decision", (n) => count(n, "quote decision")],
  ["No first response", "Late first reply", (n) => count(n, "late first reply", "late first replies")],
  ["Going cold", "Big quote going cold", (n) => count(n, "big quote", "big quotes") + " going cold"],
  ["Payment promise", "Payment promise", (n) => count(n, "payment promise")]
];

function answerFollowups(st){
  const fu = followUpsToReview(st);
  const ctl = st.controls;
  const groups = FOLLOW_KINDS.map(k => ({k, xs:fu.filter(f => f.kind === k[0])})).filter(g => g.xs.length);
  return {tool:"followups_list", effect:"read", cols:["Follow-up", "Drafts", "Timing", "Example"],
    rows:groups.map(g => [g.k[1], String(g.xs.length),
      "After " + listText(Array.from(new Set(g.xs.map(f => f.dueInDays))).sort((a, b) => a - b).map(String)) + " days",
      custOf(st, g.xs[0].customerId).name]),
    text:(fu.length ? count(fu.length, "follow-up is", "follow-ups are") + " drafted for your review and none have been sent, because automatic chasing is "
        + (ctl.followUpAuto ? "on but every draft still waits for you" : "off") + ". " : "No follow-ups are waiting for review. ")
      + "They run on a " + listText(ctl.cadence.map(String)) + " day cadence"
      + (groups.length ? ": " + listText(groups.map(g => g.k[2](g.xs.length))) + "." : "."),
    actions:[["Who owes us money?", 0], ["What needs my approval?", 0]]};
}

function answerDemand(st){
  const pd = productDemand(st).filter(x => x.units > 0);
  if (!pd.length) return FALLBACK;
  const total = sumBy(pd, x => x.units);
  const top = pd[0];
  return {tool:"demand_report", effect:"read", cols:["Machine", "Units asked for", "Enquiries", "Share"],
    rows:pd.slice(0, 5).map(x => [x.product.name, String(x.units), String(x.enquiries), pctText(100 * x.units / total)]),
    text:"The " + top.product.name + " is the best seller and the most requested machine: " + top.units + " units across " + top.enquiries
      + " enquiries, about " + pctText(100 * top.units / total) + " of every machine asked for. Next come "
      + listText(pd.slice(1, 4).map(x => "the " + x.product.name)) + ".",
    actions:[["What does the website say about the T-Bar?", 0], ["Where do enquiries come from?", 0]]};
}

function answerMarkets(st){
  const rows = markets(st).filter(r => r.enquiries > 0);
  const named = rows.filter(r => r.key !== "Other").sort((a, b) => b.enquiries - a.enquiries);
  const other = rows.find(r => r.key === "Other");
  const ordered = named.concat(other ? [other] : []);
  const top = named[0], next = named.slice(1, 3);
  return {tool:"markets_report", effect:"read", cols:["Market", "Enquiries", "Orders", "Sales, EUR eq."],
    rows:ordered.slice(0, 8).map(r => [marketName(r.key), String(r.enquiries), String(r.won), moneyShort(r.revenue)]),
    text:(top ? marketName(top.key) + " sends the most enquiries (" + top.enquiries + ")" + (top.key === "GB" ? ", all quoted in GBP" : "") + ". " : "")
      + (next.length ? listText(next.map(r => marketName(r.key) + " (" + r.enquiries + ")")) + " follow. " : "")
      + "Sales totals here are EUR equivalent at the demo rate £1 = €1.15; UK quotes themselves are never converted.",
    actions:[["What's selling best?", 0]]};
}

function answerSales(st){
  const total = confirmedSales(st), cash = cashCollected(st), n = st.orders.length;
  const delivered = st.orders.filter(o => o.status === "Delivered").length;
  const recent = st.orders.slice().sort((a, b) => b.acceptedAt - a.acceptedAt).slice(0, 5);
  return {tool:"sales_report", effect:"read", cols:["Customer", "Order", "Value", "Status"],
    rows:recent.map(o => [custOf(st, o.customerId).name, o.id, money(orderValue(o), o.currency), o.status]),
    text:"Confirmed sales in this demo come to " + money(Math.round(total)) + " EUR equivalent, at the demo rate £1 = €1.15, across " + count(n, "order") + ". "
      + delivered + " are delivered and the rest are being invoiced, paid, allocated or dispatched. " + money(Math.round(cash))
      + " has been collected in FreshBooks so far. The most recent orders are below, each in its own currency.",
    actions:[["Who owes us money?", 0]]};
}

function answerAgents(st){
  const ids = Object.keys(AGENT_NAMES);
  const on = ids.filter(id => st.controls.agentsOn[id] !== false).length;
  const rows = ids.map(id => {
    const r = st.runs.find(x => x.agentId === id);
    return [AGENT_NAMES[id], r ? waitText(st.now - r.at) + " ago" : "No runs yet", r ? r.outcome : "", st.controls.agentsOn[id] === false ? "Paused" : r ? r.status : "Idle"];
  });
  const waiting = rows.filter(r => r[3] === "Waiting on Niall").length;
  return {tool:"agents_status", effect:"read", cols:["Agent", "Last run", "Outcome", "Status"], rows,
    text:(on === ids.length ? "All " + numWord(on) + " agents are" : cap(numWord(on)) + " of the " + numWord(ids.length) + " agents are") + " switched on. They read, sort and draft; none of them sends an email, changes FreshBooks or books transport. "
      + (waiting ? cap(numWord(waiting)) + (waiting === 1 ? " of them is" : " of them are") + " waiting on you." : "None of them is waiting on you right now."),
    actions:[["What needs my approval?", 0]]};
}

function answerHistory(st){
  return {tool:"history_note", effect:"read",
    text:"On the 17 November call Niall reported " + HISTORY.reported + " quotation requests from " + HISTORY.window + ". That's a historical figure, not drawn from a connected system, and it isn't part of this demo's records. In the demo itself "
      + count(unanswered(st).length, "enquiry is", "enquiries are") + " waiting on a first reply.",
    actions:[["Prepare replies to my unanswered enquiries", 0]]};
}

function answerSystems(){
  return {tool:"systems_status", effect:"read", cols:["System", "In this demo", "Direction", "Notes"],
    rows:[["Website quote form", "Mock data", "In", "Quote requests"], ["Gmail", "Mock data", "In, drafts", "Nothing sent"],
      ["Google Drive", "Mock data", "In", "Price lists, rates"], ["FreshBooks", "Mock data", "Read only", "Never written to"],
      ["Carriers", "Email workflow", "Out by email", "After approval"]],
    text:"Nothing in this demo is connected to a live system. The website quote form, Gmail, Google Drive and FreshBooks are mock data, and every send, FreshBooks change and carrier booking is simulated. Gemini, Niall's current AI, isn't connected. HubSpot was trialled and dropped, and the old Google Sheets are archived. In a live build FreshBooks stays the source of truth and Pulse only reads it.",
    actions:[["What needs my approval?", 0]]};
}

function answerVat(st){
  const open = st.tasks.filter(t => /vat|payment terms/i.test(t.title) && t.status !== "Done");
  return {tool:"pricing_rules", effect:"read",
    text:"VAT treatment and payment terms are both pending confirmation" + (open.length ? ", with " + count(open.length, "open task") + " to settle them" : "")
      + ". Until then every quote says VAT treatment is pending confirmation rather than guessing, and no payment terms are promised.",
    actions:[["How does pricing work?", 0]]};
}

function answerPricing(st){
  const top = productDemand(st).slice(0, 4).map(x => x.product);
  const rot = ix(st).quote["Q-2271"];
  return {tool:"pricing_rules", effect:"read", cols:["Machine", "EUR price", "GBP price", "Available"],
    rows:top.map(p => [p.name, money(p.eur), money(p.gbp, "GBP"), String(stockOf(st, p).available)]),
    text:"Pricing is confidential: one EUR price list for Europe and one GBP price list for the UK, the same for every customer apart from currency. "
      + "The website never shows a price, only Add to Quote. There are no automatic discounts. A manual override is possible in the quote builder, but it needs your approval."
      + (rot && rot.overrideRequested ? " Rotterdam Iron Supply's volume question on Q-2271 is the only pricing request open." : "")
      + " The prices below are demo values.",
    actions:rot && rot.overrideRequested ? [["Keep the list price for Rotterdam", 0]] : [["What needs my approval?", 0]]};
}

function answerQuotes(st){
  const ready = quotesForApproval(st).slice().sort((a, b) => {
    const pin = (q) => q.id === "Q-2286" ? 0 : q.id === "Q-2293" ? 1 : 2;
    return pin(a) - pin(b) || eurEq(quoteTotal(st, b), b.currency) - eurEq(quoteTotal(st, a), a.currency);
  });
  const sent = st.quotes.filter(q => q.status === "Sent").length;
  const waiting = st.quotes.filter(q => q.status === "Awaiting Freight").length;
  const value = sumBy(ready, q => eurEq(quoteTotal(st, q), q.currency));
  return {tool:"quotes_list", effect:"read", cols:["Quote", "Customer", "Total", "Ready for"],
    rows:ready.slice(0, 5).map(q => [q.id, custOf(st, q.customerId).name, money(quoteTotal(st, q), q.currency), waitText(st.now - q.createdAt)]),
    text:count(ready.length, "quote is", "quotes are") + " ready for your approval, worth " + moneyShort(value) + " EUR equivalent at £1 = €1.15. "
      + sent + " more " + (sent === 1 ? "is" : "are") + " with customers waiting on a decision, and " + waiting + (waiting === 1 ? " is" : " are") + " waiting on a carrier rate."
      + (ready[0] ? " " + ready[0].id + " for " + custOf(st, ready[0].customerId).name + " is the one to start with." : ""),
    actions:ready[0] ? [["Approve " + ready[0].id, 1], ["What needs my approval?", 0]] : [["What needs my approval?", 0]]};
}

const STAGE_NEXT = {"New":"Reply", "Qualified":"Request freight", "Freight Requested":"Wait for the carrier", "Quote Ready":"Approve",
  "Quote Sent":"Customer decides", "Won":"Invoice and dispatch", "Lost":"Closed"};

function answerEnquiries(st){
  const sc = stageCounts(st);
  const un = unanswered(st);
  const fresh = un.filter(e => st.now - e.receivedAt < DAY_MS).length;
  const waiting = awaitingCustomer(st).length;
  return {tool:"enquiries_summary", effect:"read", cols:["Stage", "Enquiries", "Value, EUR eq.", "Next step"],
    rows:Object.keys(STAGE_NEXT).map(k => [k, String(sc[k] || 0),
      moneyShort(sumBy(st.enquiries.filter(e => e.stage === k), e => eurEq(enquiryValue(st, e), enquiryCurrency(st, e)))), STAGE_NEXT[k]]),
    text:count(un.length, "enquiry is", "enquiries are") + " waiting on a first reply, " + fresh + " of them from the last 24 hours. "
      + waiting + " more " + (waiting === 1 ? "has" : "have") + " been answered and " + (waiting === 1 ? "is" : "are") + " waiting on the customer. Further along: "
      + sc["Qualified"] + " qualified, " + sc["Freight Requested"] + " waiting on freight, " + sc["Quote Ready"] + " with a quote ready and "
      + sc["Quote Sent"] + " quoted. " + sc["Won"] + " won and " + sc["Lost"] + " lost so far.",
    actions:[["Prepare replies to my unanswered enquiries", 1]]};
}

function answerInvoiceId(st, id){
  if (id === "FB-1047") return answerRheinland(st);
  const inv = ix(st).invoice[id];
  if (!inv) return {tool:"freshbooks_read", effect:"read", text:"I can't find invoice " + id + " in the FreshBooks records.", actions:[["Who owes us money?", 0]]};
  const c = custOf(st, inv.customerId), out = outstanding(st, inv), status = invoiceStatus(st, inv);
  return {tool:"freshbooks_read", effect:"read", cols:["Invoice", "Amount", "Outstanding", "Status"],
    rows:[[id, money(inv.amount, inv.currency), money(out, inv.currency), status]],
    text:id + " is " + c.name + "'s FreshBooks invoice for " + money(inv.amount, inv.currency) + ". "
      + (status === "Paid" ? "It's paid in full."
        : status === "Overdue" ? money(out, inv.currency) + " is outstanding, " + daysOverdue(st, inv) + " days overdue." + (inv.promise ? " " + inv.promise.note : "")
        : money(out, inv.currency) + " is outstanding and it isn't due yet.")
      + " Read only: nothing is changed in FreshBooks.",
    actions:[["Who owes us money?", 0]]};
}

function answerFreightId(st, id){
  if (id === "FR-1211") return answerLyon(st);
  const f = ix(st).freight[id];
  if (!f) return {tool:"freight_search", effect:"read", text:"I can't find freight request " + id + ".", actions:[["Show all late carrier rates", 0]]};
  const c = custOf(st, f.customerId), cur = c.currency, fc = freightCharge(f);
  return {tool:"freight_search", effect:"read", cols:["Request", "Carrier", "Rate", "Charged"],
    rows:[[id + ", " + c.name, carrierOf(st, f.carrierId), f.carrierQuote ? money(f.carrierQuote.cost, cur) : "Waiting", fc === null ? "Not priced" : money(fc, cur)]],
    text:id + " is " + linesText(st, f.lines) + " from County Derry to " + f.destination + " with " + carrierOf(st, f.carrierId) + ". "
      + (f.status === "To request" ? "It's drafted and waiting for your approval before it goes."
        : f.status === "Awaiting rate" ? "It went " + (f.requestedAt ? whenText(st, f.requestedAt) : "out") + " and there's no reply yet."
        : f.carrierQuote ? "The carrier quoted " + money(f.carrierQuote.cost, cur) + "; with the " + f.markupPct + "% markup the customer pays " + money(fc, cur) + "."
        : "Status: " + f.status.toLowerCase() + "."),
    actions:[["Show all late carrier rates", 0]]};
}

/* Settings, Data health: the issue counts come from the records too. */
function healthNow(st){
  const un = unanswered(st);
  const missingOf = (k) => un.filter(e => e.missing.indexOf(k) > -1).length;
  const other = un.filter(e => e.missing.some(m => m !== "Delivery postcode" && m !== "Quantity")).length;
  const carriers = st.suppliers.filter(x => x.kind === "Carrier" && !x.confirmed).map(x => x.name);
  const pages = st.products.filter(p => stockOf(st, p).available > 0 && !/^available/i.test(p.websiteLabel)).map(p => p.name);
  const openTask = (re) => st.tasks.filter(t => re.test(t.title) && t.status !== "Done").length;
  const issues = [
    ["Unanswered enquiries with no delivery postcode", missingOf("Delivery postcode"), "high", "The draft reply asks for it before any freight request", "Draft requests"],
    ["Unanswered enquiries with no quantity", missingOf("Quantity"), "medium", "Confirm the quantity in the first reply", "Draft requests"],
    ["Unanswered enquiries missing another detail", other, "medium", "Delivery country or address, asked for in the draft", "Draft requests"],
    ["Machines with dimensions TBC", st.products.filter(p => p.dims === null).length, "medium", "Catalogue says TBC; freight requests flag it", "Review"],
    ["Carriers not confirmed as suppliers", carriers.length, "medium", listText(carriers), "Confirm"],
    ["Website availability out of date", pages.length, "high", listText(pages) + (pages.length === 1 ? " doesn't" : " don't") + " match stock", "Assign to Natalie"],
    ["VAT treatment and payment terms", openTask(/vat|payment terms/i), "high", "Shown as pending confirmation on every quote", "Review"],
    ["Old quote form option", openTask(/atlantis/i), "low", "'Already an Atlantis client' still on the form", "Assign to Natalie"]
  ].filter(i => i[1] > 0);
  const sev = (k) => sumBy(issues.filter(i => i[2] === k), i => i[1]);
  const total = sumBy(issues, i => i[1]);
  const postcodes = missingOf("Delivery postcode");
  return {
    tags:[count(issues.length, "issue type"), count(total, "record") + " affected"],
    badge:postcodes ? count(postcodes, "missing postcode") : "",
    trend:[13, 10, 8, 5, 3, 2, 0].map(d => total + d),
    bySeverity:[["High", String(sev("high")), RED], ["Medium", String(sev("medium")), AMBER], ["Low", String(sev("low")), DIM]],
    issues:issues.map(i => [i[0], String(i[1]), i[2], i[3], i[4]])
  };
}
const healthLive = perState(healthNow);
{
  const card = ADMIN_CARDS.find(c => c.id === "health");
  if (card) ["tags", "badge", "trend", "bySeverity", "issues"].forEach(k => {
    const fallback = card[k];
    Object.defineProperty(card, k, {enumerable:true, configurable:true,
      get:() => { try { return healthLive(mm.get())[k]; } catch (e) { return fallback; } }});
  });
}

/* Answers by topic. Each value is built from the store when it is read. */
const ANSWER_BUILDERS = {
  france:answerFrance, danube:(st) => answerQuoteId(st, "Q-2286"), replies:answerReplies, owe:answerOwe, flex:answerFlex,
  markup:answerMarkup, approvals:answerApprovals, briefing:answerBriefing, lyon:answerLyon, rotterdam:answerRotterdam,
  northern:(st) => answerQuoteId(st, "Q-2293"), milano:answerMilano, rheinland:answerRheinland, website:answerWebsite,
  stock:answerStock, followups:answerFollowups, demand:answerDemand, markets:answerMarkets, sales:answerSales,
  agents:answerAgents, history:answerHistory, systems:answerSystems, vat:answerVat, pricing:answerPricing,
  quotes:answerQuotes, enquiries:answerEnquiries, late:answerLateRates, missing:answerMissing, oldest:answerOldest,
  promises:answerPromises
};
function liveAnswer(fn){
  try { return fn(mm.get()) || FALLBACK; } catch (e) { return FALLBACK; }
}
const ANSWERS = {fallback:FALLBACK};
Object.keys(ANSWER_BUILDERS).forEach(k => Object.defineProperty(ANSWERS, k, {enumerable:true, get:() => liveAnswer(ANSWER_BUILDERS[k])}));

/* Button labels in an answer are asked back through pickAnswer, so the
   confirm-then-do routes come first. Only an explicit "Confirm ..." runs a
   store action, and every one of those is simulated. */
const ACTION_ROUTES = [
  [/^confirm and send (q-\d{3,5})/, (st, m) => doQuote(st, m[1].toUpperCase())],
  [/^approve (q-\d{3,5})\b/, (st, m) => confirmQuote(st, m[1].toUpperCase())],
  [/^confirm the lyon chase/, (st) => doLyon(st)],
  [/^(chase the lyon rate|approve the lyon chase|chase greyhound)/, (st) => confirmLyon(st)],
  [/^confirm the rheinland (payment )?email/, (st) => doRheinland(st)],
  [/^send the rheinland payment email/, (st) => confirmRheinland(st)],
  [/^confirm the rotterdam reply/, (st) => doRotterdam(st)],
  [/^keep the list price/, (st) => confirmRotterdam(st)],
  [/^confirm the (\d+ )?repl/, (st) => doReplies(st)],
  [/^approve the (\d+ )?complete repl/, (st) => confirmReplies(st)],
  [/^(not yet|no thanks|cancel|hold it|leave it)\b/, () => NOT_YET]
];
const INTENT_ROUTES = [
  [/france|french/, "france"],
  [/danube|bratislava|tom[aá][sš]/, "danube"],
  [/rotterdam|\bdaan\b|q-2271/, "rotterdam"],
  [/northern power|manchester|\bdanny\b|q-2293/, "northern"],
  [/lyon|camille|q-2290|fr-1211/, "lyon"],
  [/milan|marco|enq-4562/, "milano"],
  [/rheinland|cologne|jonas|fb-1047/, "rheinland"],
  [/\bq-\d{3,5}\b/, (st, m) => answerQuoteId(st, m[0].toUpperCase())],
  [/\bfb-\d{3,5}\b/, (st, m) => answerInvoiceId(st, m[0].toUpperCase())],
  [/\bfr-\d{3,5}\b/, (st, m) => answerFreightId(st, m[0].toUpperCase())],
  [/flex|intake|incoming|arriv|packing list/, "flex"],
  [/website|web site|site say|product page|october/, "website"],
  [/promise/, "promises"],
  [/\bowe[sd]?\b|\bowing\b|overdue|debt|unpaid|receivable|who hasn.?t paid|money/, "owe"],
  [/mark-?up|margin/, "markup"],
  [/missing|postcode|incomplete/, "missing"],
  [/oldest|ageing|aging|48 ?h|longest/, "oldest"],
  [/repl(y|ies)|respond|first response/, "replies"],
  [/chase.*(account|invoice|payment)|worst account/, "owe"],
  [/follow.?up|cadence|nudge|chas/, "followups"],
  [/approv|decision|decide|sign.?off|waiting on me|needs? me|my yes/, "approvals"],
  [/freight|carrier|shipping|\bship|\brates?\b|greyhound|harbour|transport|deliver/, "late"],
  [/stock|warehouse|available|availability|reserv|inventory/, "stock"],
  [/\bvat\b|\btax|payment terms|\bterms\b/, "vat"],
  [/discount|pric|override|confidential|how much/, "pricing"],
  [/best.?sell|selling|popular|demand|most requested|which machine|t-?bar/, "demand"],
  [/market|countr|where .*from|\buk\b|ireland|netherlands|germany|spain|italy|europe/, "markets"],
  [/quote/, "quotes"],
  [/enquir|unanswered/, "enquiries"],
  [/sales|revenue|orders?\b|\bwon\b|confirmed|cash/, "sales"],
  [/agent/, "agents"],
  [/163|weekend|saturday|last week|histor/, "history"],
  [/freshbooks|gmail|google|drive|gemini|hubspot|integrat|connect|\blive\b|\breal\b|sync|sheets/, "systems"],
  [/brief|morning|today|summar|what changed|what matters|priorit|overview|status|where (do|are) (things|we)/, "briefing"]
];

/* ---- dashboard helpers ---- */

function weekStarts(st, weeks){
  const d = new Date(st.now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const out = [];
  for (let i = weeks - 1; i >= 0; i--){ const w = new Date(d); w.setDate(d.getDate() - 7 * i); out.push(w.getTime()); }
  return out;
}
/* [label, total] per week, oldest first. */
function weekly(st, weeks, items, at, val){
  const starts = weekStarts(st, weeks);
  return starts.map((from, i) => {
    const to = i + 1 < starts.length ? starts[i + 1] : Infinity;
    const v = items.reduce((n, x) => { const t = at(x); return t >= from && t < to ? n + val(x) : n; }, 0);
    return [new Date(from).toLocaleDateString("en-GB", {day:"numeric", month:"short"}), v];
  });
}
/* The nine little bars under a metric: the last nine values, scaled 0 to 1. */
function bars(series){
  const xs = series.slice(-9).map(v => Array.isArray(v) ? v[1] : v);
  while (xs.length < 9) xs.unshift(0);
  const max = Math.max.apply(null, xs);
  return xs.map(v => max > 0 ? Math.max(0.08, Math.round(100 * v / max) / 100) : 0.08);
}
const safeChart = (chart) => chart.length >= 2 && chart.some(c => c[1] > 0) ? chart : [["", 1, ""], ["", 1, ""]];
const shareRows = (pairs, fmt) => {
  const total = sumBy(pairs, p => p[1]);
  const max = Math.max.apply(null, pairs.map(p => p[1]).concat([0]));
  let marked = false;
  return pairs.map(p => {
    const top = !marked && p[1] === max;
    if (top) marked = true;
    return [p[0], fmt(p[1]), pctText(total ? 100 * p[1] / total : 0), top ? 1 : 0];
  });
};
const SHORT_NAMES = {"MM-LIN-TBR":"T-Bar Linear", "MM-CLS-TBR":"Classic T-Bar", "MM-FLX-CHP":"Chest Press", "MM-FLX-INC":"Incline Pro",
  "MM-FLX-SRW":"Seated Row", "MM-XSR-SHP":"X Shoulder", "MM-SQT-SWG":"Swing Squat", "MM-SQT-TRU":"True Squat"};

function salesArea(st){
  const orders = st.orders;
  const total = confirmedSales(st);
  const week = weekly(st, 12, orders, o => o.acceptedAt, o => eurEq(orderValue(o), o.currency));
  const chart = safeChart(week.map(([l, v]) => [l, Math.round(v), moneyShort(v)]));
  const perWeek = weekly(st, 12, orders, o => o.acceptedAt, () => 1);
  const sent = st.quotes.filter(q => q.status === "Sent");
  const accepted = st.quotes.filter(q => q.status === "Accepted").length;
  const decided = accepted + st.quotes.filter(q => q.status === "Declined" || q.status === "Expired").length;
  const types = [["Gyms", t => t === "Commercial gym" || t === "Independent gym"], ["Performance facilities", t => t === "Performance facility"],
    ["Distributors and resellers", t => t === "Wholesale distributor" || t === "Reseller"], ["Home gym buyers", t => t === "Individual buyer"]];
  const byType = types.map(([label, test]) => [label, sumBy(orders.filter(o => test(custOf(st, o.customerId).type)), o => eurEq(orderValue(o), o.currency))])
    .filter(p => p[1] > 0);
  const byCustomer = {};
  orders.forEach(o => { byCustomer[o.customerId] = (byCustomer[o.customerId] || 0) + eurEq(orderValue(o), o.currency); });
  const top = Object.keys(byCustomer).sort((a, b) => byCustomer[b] - byCustomer[a]).slice(0, 4);
  return {
    chart,
    metrics:[
      ["Confirmed sales", money(Math.round(total)), count(orders.length, "order"), "up", "EUR eq. at £1 = €1.15", bars(week)],
      ["Quotes awaiting a reply", String(sent.length), moneyShort(sumBy(sent, q => eurEq(quoteTotal(st, q), q.currency))), "up", "sent, customer deciding",
        bars(weekly(st, 9, st.quotes.filter(q => q.sentAt), q => q.sentAt, () => 1))],
      ["Average order", money(Math.round(orders.length ? total / orders.length : 0)), "EUR eq.", "up", "per confirmed order",
        bars(week.map((w, i) => perWeek[i][1] ? w[1] / perWeek[i][1] : 0))],
      ["Win rate", pctText(decided ? 100 * accepted / decided : 0), accepted + " of " + decided, "up", "of decided quotes", bars(perWeek)]
    ],
    split:shareRows(byType.map(p => [p[0], Math.round(p[1])]), v => money(v)),
    table:top.map(id => { const c = custOf(st, id);
      return [c.name, money(Math.round(byCustomer[id])), (total ? 100 * byCustomer[id] / total : 0).toFixed(1) + "%", countryName(c.country)]; })
  };
}

function enquiriesArea(st){
  const fn = funnel(st);
  const labels = ["Enquiries", "Qualified", "Quoted", "Accepted", "Invoiced", "Paid"];
  const days = enquiriesByDay(st, 14);
  const un = unanswered(st).slice().sort((a, b) => a.receivedAt - b.receivedAt);
  const old = un.filter(e => st.now - e.receivedAt > 2 * DAY_MS).length;
  const missing = un.filter(e => e.missing.length);
  const postcodes = missing.filter(e => e.missing.indexOf("Delivery postcode") > -1).length;
  const fresh = un.filter(e => st.now - e.receivedAt < DAY_MS).length;
  const daily = days.map(d => d.n);
  const sources = ["Website quote form", "Email", "Instagram", "Phone", "Referral"]
    .map(src => [src, st.enquiries.filter(e => e.source === src).length]).filter(p => p[1] > 0);
  return {
    chart:safeChart(days.map(d => [d.label, d.n, String(d.n)])),
    funnel:fn.map((x, i) => [labels[i] || x.label, String(x.n),
      i === 0 ? "All sources" : pctText(fn[i - 1].n ? 100 * x.n / fn[i - 1].n : 0) + " of " + (labels[i - 1] || "").toLowerCase(), x.n]),
    metrics:[
      ["Unanswered", String(un.length), old + " past 48h", "down", "no reply yet", bars(daily)],
      ["Waiting on the customer", String(awaitingCustomer(st).length), "details asked for", "up", "answered", bars(daily)],
      ["Missing a detail", String(missing.length), postcodes + " postcodes", "down", "drafts ask for it", bars(daily)],
      ["New in 24 hours", String(fresh), "still to answer", "up", "website, email, Instagram", bars(daily)]
    ],
    split:shareRows(sources, v => String(v)),
    table:un.slice(0, 4).map(e => [custOf(st, e.customerId).name, linesText(st, e.lines),
      money(enquiryValue(st, e), enquiryCurrency(st, e)), waitText(st.now - e.receivedAt)])
  };
}

function freightArea(st){
  const out = freightOutstanding(st).slice().sort((a, b) => (a.requestedAt || 0) - (b.requestedAt || 0));
  const hours = out.map(f => Math.max(0, Math.round((st.now - (f.requestedAt || st.now)) / 3600000)));
  const g = carrierStats(st, "SU-GREY"), h = carrierStats(st, "SU-HARB");
  const late = out.filter(f => isLate(st, f)).length;
  return {
    chart:safeChart(out.map((f, i) => [custOf(st, f.customerId).country, hours[i], hours[i] + "h"])),
    metrics:[
      ["Rates outstanding", String(out.length), late + " past 3 days", "down", "waiting on carriers", bars(hours)],
      ["Average markup", avgMarkup(st).toFixed(1) + "%", "default " + st.controls.defaultMarkup + "%", "up", "on carrier rates", bars(hours.slice().reverse())],
      ["Greyhound Express", Math.round(g.avgHours) + "h", g.waiting + " waiting", "up", "average reply, Europe", bars(hours)],
      ["Harbour Freight", Math.round(h.avgHours) + "h", h.waiting + " waiting", "up", "average reply, UK and Ireland", bars(hours)]
    ],
    split:shareRows([["Greyhound Express", g.waiting], ["Harbour Freight", h.waiting]], v => String(v)),
    table:out.slice(0, 4).map(f => [custOf(st, f.customerId).name, f.id, "+" + f.markupPct + "%",
      f.requestedAt !== null ? waitText(st.now - f.requestedAt) : "Not sent"])
  };
}

function financeArea(st){
  const cash = weekly(st, 12, st.payments, p => p.at, p => eurEq(p.amount, p.currency));
  const od = overdueInvoices(st);
  const promises = st.invoices.filter(i => i.promise && invoiceStatus(st, i) !== "Paid");
  const buckets = [["Under 15 days", d => d < 15], ["15 to 30 days", d => d >= 15 && d <= 30], ["31 to 45 days", d => d > 30 && d <= 45], ["Over 45 days", d => d > 45]]
    .map(([label, test]) => [label, Math.round(sumBy(od.filter(i => test(daysOverdue(st, i))), i => eurEq(outstanding(st, i), i.currency)))])
    .filter(p => p[1] > 0);
  const byValue = od.slice().sort((a, b) => eurEq(outstanding(st, b), b.currency) - eurEq(outstanding(st, a), a.currency));
  const overdueEUR = sumBy(od, i => eurEq(outstanding(st, i), i.currency));
  return {
    chart:safeChart(cash.map(([l, v]) => [l, Math.round(v), moneyShort(v)])),
    metrics:[
      ["Cash collected", money(Math.round(cashCollected(st))), count(st.payments.length, "payment"), "up", "EUR eq. at £1 = €1.15", bars(cash)],
      ["Overdue", money(Math.round(overdueEUR)), count(od.length, "invoice"), "down", "FreshBooks, read only",
        bars(weekly(st, 9, od, i => i.dueAt, i => eurEq(outstanding(st, i), i.currency)))],
      ["Invoiced", money(Math.round(invoicedTotal(st))), count(st.invoices.length, "invoice"), "up", "EUR eq.",
        bars(weekly(st, 9, st.invoices, i => i.issuedAt, i => eurEq(i.amount, i.currency)))],
      ["Payment promises", String(promises.length), promises.filter(i => i.promise.broken).length + " broken", "down", "tracked by the agent",
        bars(promises.map(i => outstanding(st, i)))]
    ],
    split:shareRows(buckets, v => money(v)),
    table:byValue.slice(0, 4).map(i => [custOf(st, i.customerId).name, money(outstanding(st, i), i.currency), "−" + daysOverdue(st, i) + " days",
      i.promise ? (i.promise.broken ? "Broken" : "Promised") : "None"])
  };
}

function stockArea(st){
  const prods = st.products.filter(p => { const s = stockOf(st, p); return s.inStock > 0 || s.incoming > 0; });
  const rows = prods.map(p => ({p, s:stockOf(st, p)}));
  const name = (p) => SHORT_NAMES[p.id] || p.name;
  const sh = st.shipments[0];
  const incoming = sh ? sumBy(sh.lines, l => l.units) : 0;
  const reservedIn = sh ? sumBy(st.reservations.filter(r => r.shipmentId === sh.id), r => r.units) : 0;
  const held = rows.filter(r => r.s.inStock > 0).sort((a, b) => b.s.inStock - a.s.inStock);
  return {
    chart:safeChart(rows.map(r => [name(r.p), r.s.inStock + r.s.incoming, String(r.s.inStock + r.s.incoming)])),
    stacked:rows.map(r => [name(r.p), [r.s.reserved + r.s.incomingReserved, Math.max(0, r.s.available), r.s.incomingFree]]),
    metrics:[
      ["In stock", String(sumBy(rows, r => r.s.inStock)), "County Derry", "up", "in the warehouse now", bars(rows.map(r => r.s.inStock))],
      ["Reserved", String(sumBy(rows, r => r.s.reserved)), "against orders", "up", "from warehouse stock", bars(rows.map(r => r.s.reserved))],
      ["Available", String(sumBy(rows, r => Math.max(0, r.s.available))), "never below zero", "up", "free to quote", bars(rows.map(r => Math.max(0, r.s.available)))],
      ["Incoming", String(incoming), (incoming - reservedIn) + " unallocated", "up", sh ? sh.eta + ", not confirmed" : "nothing due", bars(rows.map(r => r.s.incoming))]
    ],
    split:shareRows([["Reserved", reservedIn], ["Unallocated", incoming - reservedIn]], v => String(v)),
    table:held.slice(0, 4).map(r => [r.p.name, String(r.s.inStock), String(r.s.available), r.p.websiteLabel])
  };
}

function marketsArea(st){
  const all = markets(st).filter(r => r.enquiries > 0);
  const named = all.filter(r => r.key !== "Other").sort((a, b) => b.enquiries - a.enquiries);
  const other = all.find(r => r.key === "Other");
  const ordered = named.concat(other ? [other] : []);
  const total = sumBy(all, r => r.enquiries);
  const gb = all.find(r => r.key === "GB") || {enquiries:0};
  const best = named.filter(r => r.quotes >= 3).sort((a, b) => b.conversion - a.conversion)[0] || named[0];
  const byRevenue = named.slice().sort((a, b) => b.revenue - a.revenue);
  const topRev = byRevenue.slice(0, 4);
  const rest = sumBy(all, r => r.revenue) - sumBy(topRev, r => r.revenue);
  const split = shareRows(topRev.map(r => [marketName(r.key), Math.round(r.revenue)]).concat(rest > 0 ? [["Everywhere else", Math.round(rest)]] : []), v => money(v))
    .map((row, i) => [row[0], row[1], row[2], i === 0 ? 1 : 0]);
  const counts = ordered.map(r => r.enquiries);
  return {
    chart:safeChart(ordered.map(r => [marketName(r.key), r.enquiries, String(r.enquiries)])),
    rows:ordered.map(r => [marketName(r.key), count(r.enquiries, "enquiry", "enquiries"), r.enquiries]),
    metrics:[
      ["UK enquiries", String(gb.enquiries), "priced in GBP", "up", "United Kingdom", bars(counts)],
      ["Europe enquiries", String(total - gb.enquiries), "priced in EUR", "up", "including Ireland", bars(counts.slice().reverse())],
      ["Top market", named[0] ? marketName(named[0].key) : "None", named[0] ? count(named[0].enquiries, "enquiry", "enquiries") : "", "up", "by enquiries", bars(counts)],
      ["Best conversion", best ? marketName(best.key) : "None", best ? pctText(best.conversion) : "", "up", "quotes to orders", bars(ordered.map(r => r.conversion))]
    ],
    split,
    table:named.slice(0, 4).map(r => [marketName(r.key), String(r.enquiries), pctText(r.conversion), money(Math.round(r.avgDeal))])
  };
}

/* A market typed into the Dashboard filter (or picked from MARKET) gets a
   live area from the records rather than made-up numbers. */
function marketCode(name){
  const n = name.trim().toLowerCase();
  const alias = {"uk":"GB", "united kingdom":"GB", "britain":"GB", "great britain":"GB", "england":"GB", "scotland":"GB", "wales":"GB",
    "northern ireland":"GB", "holland":"NL", "the netherlands":"NL", "czech republic":"CZ"};
  if (alias[n]) return alias[n];
  return Object.keys(COUNTRY_NAME).find(k => COUNTRY_NAME[k].toLowerCase() === n) || null;
}

function marketArea(st, code, id){
  const ids = new Set(st.customers.filter(c => c.country === code).map(c => c.id));
  const enq = st.enquiries.filter(e => ids.has(e.customerId));
  if (!enq.length) return null;
  const qs = st.quotes.filter(q => ids.has(q.customerId));
  const ords = st.orders.filter(o => ids.has(o.customerId));
  const cur = code === "GB" ? "GBP" : "EUR";
  const label = COUNTRY_NAME[code] || id;
  const week = weekly(st, 8, enq, e => e.receivedAt, () => 1);
  const sales = sumBy(ords, o => orderValue(o));
  const types = {};
  st.customers.filter(c => ids.has(c.id)).forEach(c => { types[c.type] = (types[c.type] || 0) + 1; });
  const top = enq.slice().sort((a, b) => enquiryValue(st, b) - enquiryValue(st, a)).slice(0, 4);
  return {
    id, label, color:"var(--accent)", owner:"MARKET",
    description:"Live from the demo records for " + label + ". " + (cur === "GBP" ? "UK customers are quoted in GBP only." : "Priced in EUR."),
    kind:"columns", chartTitle:"Enquiries by week", chartUnit:"LAST 8 WEEKS",
    chart:safeChart(week.map(([l, v]) => [l, v, String(v)])),
    splitTitle:"Customers by type",
    split:shareRows(Object.keys(types).map(k => [k, types[k]]), v => String(v)),
    tableCols:["Customer", "Value", "Stage", "City"],
    table:top.map(e => { const c = custOf(st, e.customerId); return [c.name, money(enquiryValue(st, e), cur), e.stage, c.city]; }),
    metrics:[
      ["Enquiries", String(enq.length), enq.filter(e => e.stage === "New" && !e.replied).length + " unanswered", "up", "in this demo", bars(week)],
      ["Quotes ready or sent", String(qs.filter(q => q.status === "Ready for Review" || q.status === "Sent").length), "", "up", "waiting on a decision", bars(week)],
      ["Orders won", String(ords.length), "", "up", "accepted quotes", bars(weekly(st, 9, ords, o => o.acceptedAt, () => 1))],
      ["Confirmed sales", money(sales, cur), "in " + cur, "up", "excluding VAT", bars(weekly(st, 9, ords, o => o.acceptedAt, o => orderValue(o)))]
    ],
    legend:[label]
  };
}

// Turns a plain-English filter name into a Dashboard area. A market name gets
// a live area from the records. Anything else gets an illustrative area from a
// seeded generator, so the same phrase always produces the same numbers, with
// direction and vocabulary nudged by keywords in the text.
function synthesizeCustomArea(name){
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const code = marketCode(trimmed);
  if (code){
    try { const a = marketArea(mm.get(), code, trimmed); if (a) return a; } catch (e) { /* fall through to the illustrative area */ }
  }
  let seed = 0;
  for (let i = 0; i < trimmed.length; i++) seed = (seed * 31 + trimmed.charCodeAt(i)) >>> 0;
  const rnd = (n) => (((seed >>> (n % 24)) ^ (seed << ((n * 7) % 13))) >>> 0) % 997 / 997;
  const low = trimmed.toLowerCase();
  const has = (...words) => words.some(w => low.indexOf(w) > -1);
  const growth = has("expansion","growth","launch","scale","pilot","new site","open","opening","grow");
  const risk = has("risk","issue","delay","problem","complaint","fault","incident","churn","decline");
  const dir = risk ? -1 : (growth ? 1 : (rnd(2) > 0.45 ? 1 : -1));

  let vocab = "generic";
  if (has("region","dublin","belfast","galway","london","glasgow","edinburgh","milan","paris","berlin","madrid","amsterdam"))
    vocab = "region";
  else if (has("cost","spend","budget","saving","margin")) vocab = "cost";
  else if (has("staff","hiring","team","recruit","headcount")) vocab = "people";
  else if (has("supplier","stock","inventory","warehouse","carrier","freight")) vocab = "ops";
  else if (has("customer","client","retention","account","gym")) vocab = "customer";

  const V = {
    region:   {labels:["New enquiries","Orders won","Confirmed sales","Quotes sent"], unit:"EUR · 30 DAYS"},
    cost:     {labels:["Spend","Cost per order","Savings found","Budget used"], unit:"EUR · 30 DAYS"},
    people:   {labels:["Headcount","Open roles","Time to hire","Retention"], unit:"PEOPLE"},
    ops:      {labels:["Stock cover","Lead time","Stockouts","Rate requests"], unit:"DAYS"},
    customer: {labels:["Active accounts","Repeat rate","Churn","Reorders"], unit:"ACCOUNTS"},
    generic:  {labels:["Volume","Rate","Cost","Coverage"], unit:"ACTIVITY · 30 DAYS"}
  }[vocab];

  const now = new Date();
  const months = Array.from({length:12}, (_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1).toLocaleDateString("en-GB", {month:"short"}));
  let v0 = 40 + Math.floor(rnd(1) * 220);
  const chart = months.map((m, i) => {
    v0 = Math.max(8, Math.round(v0 * (1 + dir * (0.03 + rnd(i + 3) * 0.07))));
    return [m, v0, String(v0)];
  });
  const metrics = V.labels.map((label, i) => {
    const val = 20 + Math.floor(rnd(i + 5) * 400);
    const pct = 2 + Math.round(rnd(i + 9) * 18);
    const up = dir > 0 ? rnd(i + 12) > 0.25 : rnd(i + 12) > 0.7;
    const b = [0,1,2,3,4,5,6,7,8].map(k => 0.3 + rnd(i * 3 + k) * 0.7);
    return [label, i === 1 ? pct + "%" : String(val), (up ? "+" : "−") + pct + (i === 1 ? "pt" : "%"), up ? "up" : "down", "vs last month", b];
  });
  const capName = trimmed.replace(/\b\w/g, c => c.toUpperCase());
  const split = [
    [capName + ", direct", String(Math.round(v0 * 0.5)), "48%", 1],
    ["Existing pipeline", String(Math.round(v0 * 0.3)), "31%", 0],
    ["Everything else", String(Math.round(v0 * 0.2)), "21%", 0]
  ];
  const table = [1,2,3].map(w => [capName + ", week " + w, String(20 + Math.floor(rnd(20 + w) * 200)),
    (dir > 0 ? "+" : "−") + (3 + Math.floor(rnd(23 + w) * 14)) + "%", "Tagged from records mentioning “" + low + "”"]);
  table.push(["Everything else", String(20 + Math.floor(rnd(30) * 200)), "0%", "Baseline"]);
  return {
    id: trimmed, label: capName, color: "var(--accent)", owner: "CUSTOM FILTER",
    description: "Generated from “" + trimmed + "”: a plain-English filter with illustrative numbers, not a registered metric set. Refine it and Pulse will tighten this up.",
    kind: "columns", chartTitle: capName + " over time", chartUnit: V.unit,
    chart, splitTitle: "Where “" + low + "” shows up", split,
    tableCols: ["Item","Value","Change","Note"], table,
    metrics, legend: [capName, "Pipeline", "Other"]
  };
}

function pickAnswer(q){
  const s = String(q || "").toLowerCase().trim();
  if (!s) return FALLBACK;
  try {
    const st = mm.get();
    for (const [re, fn] of ACTION_ROUTES){
      const m = s.match(re);
      if (m) return fn(st, m) || FALLBACK;
    }
    for (const [re, key] of INTENT_ROUTES){
      const m = s.match(re);
      if (m) return typeof key === "function" ? (key(st, m) || FALLBACK) : ANSWERS[key];
    }
  } catch (e) { /* any slip falls back to the plain answer */ }
  return FALLBACK;
}

const ORGS = [
  ["Rheinland Performance","Customer · Cologne","€7,880","18 days overdue","watch"],
  ["Danube Strength","Customer · Bratislava","€0","Q-2286 awaiting approval","active"],
  ["Rotterdam Iron Supply","Distributor · Rotterdam","€0","Q-2271 sent","active"],
  ["Lyon Performance Club","Customer · Lyon","€0","Waiting on freight","active"],
  ["Northern Power Gym","Customer · Manchester","£0","Q-2293 awaiting approval","active"],
  ["Milano Performance Studio","Customer · Milan","€0","New enquiry","new"],
  ["Bordeaux Strength House","Customer · Bordeaux","€6,740","27 days overdue","watch"],
  ["Antwerp Strength Club","Customer · Antwerp","€4,555","52 days overdue, promise broken","watch"]
];
const TEAMS = [
  ["Sales and quotes","1 member","Niall","approve quotes, emails and overrides"],
  ["Systems","1 member","Natalie (role to confirm)","settings and integrations"],
  ["Agents","8 agents","Niall approves","read and draft only"],
  ["Warehouse, County Derry","Stock records","Niall","in stock, reserved, incoming"]
];
const LOCATIONS = [
  ["County Derry warehouse","Northern Ireland","Stock and dispatch","active"]
];

/* Figures the agents quote in their threads, read once from the store when
   Pulse loads (the threads are a snapshot of this morning). Story numbers such
   as Danube's €21,915 are fixed by the brief and written in directly. */
const SNAP = (() => {
  const d = {unanswered:47, old:4, complete:31, missing:16, oldestName:"the oldest enquiry", oldestDays:3, freightOut:18, freightLate:5,
    quotesReady:25, overdueCount:11, overdueValue:"€46,820", promises:3, followUps:32,
    fu:{"No reply":12, "Quote decision":10, "No first response":4, "Going cold":3, "Payment promise":3},
    tbarShare:31, continental:["the netherlands", "italy"], topMarket:"the uk", sales:"€194k"};
  try {
    const s = mm.get(), h = headline(s);
    const un = unanswered(s).slice().sort((a, b) => a.receivedAt - b.receivedAt);
    const pd = productDemand(s), units = sumBy(pd, x => x.units), tbar = pd.find(x => x.product.id === "MM-LIN-TBR");
    const byCountry = {};
    s.enquiries.forEach(e => { const c = custOf(s, e.customerId); if (c.country !== "GB" && c.country !== "IE") byCountry[c.country] = (byCountry[c.country] || 0) + 1; });
    const cont = Object.keys(byCountry).sort((a, b) => byCountry[b] - byCountry[a]).slice(0, 2)
      .map(k => (k === "NL" ? "the netherlands" : (COUNTRY_NAME[k] || k).toLowerCase()));
    const top = markets(s).filter(r => r.key !== "Other").sort((a, b) => b.enquiries - a.enquiries)[0];
    const fu = {};
    followUpsToReview(s).forEach(f => { fu[f.kind] = (fu[f.kind] || 0) + 1; });
    return {unanswered:h.unanswered, old:un.filter(e => s.now - e.receivedAt > 2 * DAY_MS).length,
      complete:un.filter(e => !e.missing.length).length, missing:un.filter(e => e.missing.length).length,
      oldestName:un[0] ? custOf(s, un[0].customerId).name.toLowerCase() : d.oldestName, oldestDays:un[0] ? daysSince(s, un[0].receivedAt) : d.oldestDays,
      freightOut:h.freightOutstanding, freightLate:freightOutstanding(s).filter(f => isLate(s, f)).length, quotesReady:h.quotesAwaiting,
      overdueCount:h.overdueCount, overdueValue:money(h.overdueValue), promises:h.promises, followUps:h.followUps, fu,
      tbarShare:tbar && units ? Math.round(100 * tbar.units / units) : d.tbarShare, continental:cont.length === 2 ? cont : d.continental,
      topMarket:top ? (top.key === "GB" ? "the uk" : marketName(top.key).toLowerCase()) : d.topMarket, sales:moneyShort(confirmedSales(s))};
  } catch (e) { return d; }
})();
const fuText = (n, one, many) => n ? [count(n, one, many)] : [];

const AGENT_DEFS = [
  {id:"desk", name:"Quote desk", shape:"rim-capsule", tint:"#1b2430", state:"waiting", group:true,
   members:["enquiry","freight","quote"], role:"The Enquiry, Freight and Quote agents working the Danube Strength quote together",
   when:"Yesterday", preview:"quote agent: q-2286 is ready for niall.",
   thread:[
     {kind:"stamp", text:"7 days ago"},
     {kind:"agent", from:"enquiry", text:"danube strength came back. tomáš wants the full list quoted now, one of each: t-bar linear row, leverage chest press, leverage incline pro, x shoulder press, leverage seated row and swing squat pro. delivery to bratislava 821 08, ground floor, forklift on site."},
     {kind:"agent", from:"freight", text:"six machines from county derry to bratislava is a greyhound express job. three have no published dimensions, so i've flagged that in the request instead of guessing."},
     {kind:"stamp", text:"Yesterday"},
     {kind:"agent", from:"freight", text:"greyhound replied: €2,100 ex vat, ref GX-58213, 5 to 7 working days. tail-lift not included, which is fine with their forklift."},
     {kind:"routine", text:"Ran routine", routine:"Quote assembly"},
     {kind:"agent", from:"quote", text:"priced from the eur price list: €19,500 for the six, no overrides. freight €2,100 + 15% = €2,415. total €21,915 ex vat, vat treatment pending confirmation."},
     {kind:"agent", from:"quote", text:"the chest press, incline pro and seated row come from the flex intake, late november, not confirmed. the draft promises the delivery date on receipt, not before."},
     {kind:"agent", from:"quote", text:"q-2286 is ready for niall. nothing goes to tomáš until he approves it."}
   ]},
  {id:"briefing", name:"Briefing", shape:"crown-pebble", tint:"#191c1f", state:"complete",
   role:"Reads enquiries, freight, quotes and FreshBooks every morning and tells Niall the few things that need him",
   when:"07:00", preview:SNAP.unanswered + " enquiries, " + SNAP.quotesReady + " quotes, danube waiting on you.",
   thread:[
     {kind:"stamp", text:"Today 07:00"},
     {kind:"routine", text:"Ran routine", routine:"Morning briefing"},
     {kind:"agent", text:"morning briefing:", lines:[
       {k:"Enquiries", v:SNAP.unanswered + " unanswered · " + SNAP.old + " past 48 hours · all drafted"},
       {k:"Freight", v:SNAP.freightOut + " rates outstanding · Lyon waiting over three days"},
       {k:"Quotes", v:SNAP.quotesReady + " ready for approval · Danube Strength €21,915"},
       {k:"Money", v:SNAP.overdueCount + " overdue, " + SNAP.overdueValue + " · " + numWord(SNAP.promises) + " payment promises"}]},
     {kind:"agent", text:"three things need you today: approve the danube quote, say yes to the lyon chase, and look at the rheinland payment email. the " + SNAP.unanswered + " replies are drafted and waiting in enquiries."},
     {kind:"user", text:"what about the payment promises"},
     {kind:"agent", text:"siłownia kraków said two days, madrid fuerza club said their next payment run, and antwerp strength club promised twelve days ago and nothing has arrived. i'd follow up antwerp first."}
   ]},
  {id:"ops", name:"Ops Watchdog", shape:"shield", tint:"#2b1b1e", state:"attention",
   role:"Watches for stalled work: ageing enquiries, late carrier rates and website text that no longer matches stock",
   when:"1h", preview:"lyon rate over three days. " + SNAP.old + " enquiries past 48h.",
   thread:[
     {kind:"stamp", text:"Today"},
     {kind:"routine", text:"Ran routine", routine:"Stalled-work sweep"},
     {kind:"agent", text:"fr-1211 to lyon has been with greyhound express for over three days with no reply. the freight agent has a chase drafted for your approval."},
     {kind:"agent", text:numWord(SNAP.old) + " enquiries have had no first reply for more than 48 hours. the oldest is " + SNAP.oldestName + ", waiting over " + numWord(SNAP.oldestDays) + " days."},
     {kind:"agent", text:"the t-bar linear row page still says 'estimated arrival october 2026'. 14 are available in county derry. natalie has the task."}
   ]},
  {id:"enquiry", name:"Enquiry Agent", shape:"low-dome", tint:"#241b2e", state:"working",
   role:"Reads every website, Gmail and Instagram enquiry, pulls out the machines and drafts the first reply",
   when:"40m", preview:"milano wants a t-bar. no postcode yet.",
   thread:[
     {kind:"stamp", text:"Today"},
     {kind:"agent", text:"new one from italy: marco bianchi at milano performance studio wants a t-bar linear row for a new strength zone. commercial gym, found us on social media."},
     {kind:"agent", text:"no delivery postcode, so i haven't asked for a freight rate. the draft reply asks for the shipping address."},
     {kind:"user", text:"how many are still unanswered"},
     {kind:"agent", text:SNAP.unanswered + ". " + SNAP.complete + " have everything i need, so their drafts attach the price list and say a freight rate is on the way. " + SNAP.missing + " are missing a detail, mostly a postcode, so those drafts ask for it first. none are sent."}
   ]},
  {id:"quote", name:"Quote Agent", shape:"executive-capsule", tint:"#2a2118", state:"waiting",
   role:"Builds quotes from the confidential price lists and the carrier's rate, then waits for Niall's approval",
   when:"2h", preview:SNAP.quotesReady + " quotes ready. danube first.",
   thread:[
     {kind:"stamp", text:"Today"},
     {kind:"agent", text:SNAP.quotesReady + " quotes are ready for your approval. start with danube strength, q-2286, €21,915 ex vat, and northern power gym, q-2293, £3,515 ex vat, priced in gbp only."},
     {kind:"agent", text:"rotterdam iron supply asked about volume pricing on q-2271 (€30,535). no discount applied. any override needs your yes."}
   ]},
  {id:"freight", name:"Freight Agent", shape:"control-cube", tint:"#16241f", state:"waiting",
   role:"Drafts carrier rate requests, reads the replies and applies the markup. Never books transport",
   when:"6h", preview:"lyon chase drafted. " + SNAP.freightOut + " rates out.",
   thread:[
     {kind:"stamp", text:"Today"},
     {kind:"agent", text:SNAP.freightOut + " rate requests are out with carriers and " + numWord(SNAP.freightLate) + " are past three days. lyon is the one i've drafted a chase for."},
     {kind:"agent", text:"i won't put a freight number on q-2290 until greyhound express replies. the chase waits for your yes."},
     {kind:"user", text:"what did harbour freight say on manchester"},
     {kind:"agent", text:"£350 ex vat, next working day pallet, tail-lift included. at 20% that's £420, so northern power gym's quote comes to £3,515."}
   ]},
  {id:"followup", name:"Follow-up Agent", shape:"offset-pebble", tint:"#1b2430", state:"waiting",
   role:"Drafts follow-ups on the 3, 7, 14 and 30 day cadence. Automatic chasing is off",
   when:"09:00", preview:SNAP.followUps + " drafted. none sent: auto-chasing is off.",
   thread:[
     {kind:"stamp", text:"Today 09:00"},
     {kind:"routine", text:"Ran routine", routine:"Follow-up scan"},
     {kind:"agent", text:SNAP.followUps + " follow-ups drafted for review: " + listText([].concat(
       fuText(SNAP.fu["No reply"] || 0, "customer who hasn't sent the details we asked for", "customers who haven't sent the details we asked for"),
       fuText(SNAP.fu["Quote decision"] || 0, "quote decision"),
       fuText(SNAP.fu["No first response"] || 0, "late first reply", "late first replies"),
       fuText(SNAP.fu["Going cold"] || 0, "big quote going cold", "big quotes going cold"),
       fuText(SNAP.fu["Payment promise"] || 0, "payment promise"))) + "."},
     {kind:"agent", text:"automatic chasing is off, so nothing went out. timing is 3, 7, 14 and 30 days, and you can change it in settings."}
   ]},
  {id:"receivables", name:"Receivables Agent", shape:"precision-brow", tint:"#2a2118", state:"waiting",
   role:"Reads FreshBooks, tracks overdue invoices and payment promises, and drafts polite payment emails",
   when:"7h", preview:"rheinland €7,880, 18 days. 3 drafts waiting.",
   thread:[
     {kind:"stamp", text:"Today"},
     {kind:"routine", text:"Ran routine", routine:"FreshBooks receivables check"},
     {kind:"agent", text:SNAP.overdueCount + " invoices are overdue in freshbooks, " + SNAP.overdueValue + " between them. rheinland performance is the biggest: fb-1047, €7,880, 18 days."},
     {kind:"agent", text:"polite payment-status emails are drafted for rheinland performance, torino iron club and bordeaux strength house. they wait for you, and i never change anything in freshbooks."}
   ]},
  {id:"intel", name:"Sales Intelligence Agent", shape:"glass-visor", tint:"#16241f", state:"complete",
   role:"A weekly read on demand, markets and conversion",
   when:"2d", preview:"t-bar is " + SNAP.tbarShare + "% of demand.",
   thread:[
     {kind:"stamp", text:"2 days ago"},
     {kind:"routine", text:"Ran routine", routine:"Weekly sales intelligence"},
     {kind:"agent", text:"the t-bar linear row is still the most requested machine by a distance, " + SNAP.tbarShare + "% of every machine asked for. " + SNAP.continental.join(" and ") + " lead the continental enquiries."},
     {kind:"agent", text:(SNAP.topMarket === "the uk" ? "the uk sends the most enquiries, all quoted in gbp." : SNAP.topMarket + " sends the most enquiries.") + " confirmed sales in this demo come to about " + SNAP.sales + ", eur equivalent at £1 = €1.15."}
   ]}
];

/* Dashboard KPI tiles. Keys match src/mm/legacy.ts kpiDefs, which overrides
   the first seven; revenue, cash, margin and jobs stay because PulseLogic's
   mini KPI widget reads them. Every value is live from the store; the static
   set below is only used if a read fails. */
const KPI_STATIC = {
  unanswered:{label:"Unanswered enquiries", value:"47", delta:"23 today", dir:"down", hint:"no reply yet", hero:true},
  quotes:{label:"Quotes awaiting approval", value:"25", delta:"€278k", dir:"up", hint:"ready for you"},
  freight:{label:"Freight rates outstanding", value:"18", delta:"5 late", dir:"down", hint:"waiting on carriers"},
  overdue:{label:"Overdue invoices", value:"11", delta:"3 promised", dir:"down", hint:"FreshBooks"},
  overdueValue:{label:"Overdue value", value:"€46,820", delta:"oldest 52d", dir:"down", hint:"EUR excl. VAT"},
  followups:{label:"Follow-ups to review", value:"32", delta:"auto-send off", dir:"up", hint:"drafted, not sent"},
  sales:{label:"Confirmed sales", value:"€194k", delta:"30 orders", dir:"up", hint:"EUR eq."},
  pipeline:{label:"Open quotes", value:"€700k", delta:"21 sent", dir:"up", hint:"quoted, not won, EUR eq."},
  approvals:{label:"Open approvals", value:"36", delta:"4 pinned", dir:"down", hint:"waiting on Niall"},
  revenue:{label:"Invoiced", value:"€189,534", delta:"29 invoices", dir:"up", hint:"FreshBooks, EUR eq."},
  cash:{label:"Cash collected", value:"€127,603", delta:"15 payments", dir:"up", hint:"FreshBooks, EUR eq."},
  margin:{label:"Average freight markup", value:"14.8%", delta:"default 15%", dir:"up", hint:"on carrier rates"},
  jobs:{label:"Orders won", value:"30", delta:"19 delivered", dir:"up", hint:"accepted quotes"}
};

function kpiCompute(st){
  const h = headline(st);
  const ready = quotesForApproval(st);
  const od = overdueInvoices(st);
  const open = st.quotes.filter(q => q.status === "Ready for Review" || q.status === "Sent" || q.status === "Awaiting Freight");
  return {
    unanswered:{label:"Unanswered enquiries", value:String(h.unanswered), delta:unanswered(st).filter(e => st.now - e.receivedAt < DAY_MS).length + " today", dir:"down", hint:"no reply yet", hero:true},
    quotes:{label:"Quotes awaiting approval", value:String(h.quotesAwaiting), delta:moneyShort(sumBy(ready, q => eurEq(quoteTotal(st, q), q.currency))), dir:"up", hint:"ready for you"},
    freight:{label:"Freight rates outstanding", value:String(h.freightOutstanding), delta:lateRates(st).length + " late", dir:"down", hint:"waiting on carriers"},
    overdue:{label:"Overdue invoices", value:String(h.overdueCount), delta:h.promises + " promised", dir:"down", hint:"FreshBooks"},
    overdueValue:{label:"Overdue value", value:money(h.overdueValue), delta:"oldest " + od.reduce((m, i) => Math.max(m, daysOverdue(st, i)), 0) + "d", dir:"down", hint:"EUR excl. VAT"},
    followups:{label:"Follow-ups to review", value:String(h.followUps), delta:st.controls.followUpAuto ? "auto-send on" : "auto-send off", dir:"up", hint:"drafted, not sent"},
    sales:{label:"Confirmed sales", value:moneyShort(confirmedSales(st)), delta:count(st.orders.length, "order"), dir:"up", hint:"EUR eq."},
    pipeline:{label:"Open quotes", value:moneyShort(sumBy(open, q => eurEq(quoteTotal(st, q), q.currency))), delta:st.quotes.filter(q => q.status === "Sent").length + " sent", dir:"up", hint:"quoted, not won, EUR eq."},
    approvals:{label:"Open approvals", value:String(h.approvals), delta:openApprovals(st).filter(a => a.pinned).length + " pinned", dir:"down", hint:"waiting on Niall"},
    revenue:{label:"Invoiced", value:money(Math.round(invoicedTotal(st))), delta:count(st.invoices.length, "invoice"), dir:"up", hint:"FreshBooks, EUR eq."},
    cash:{label:"Cash collected", value:money(Math.round(cashCollected(st))), delta:count(st.payments.length, "payment"), dir:"up", hint:"FreshBooks, EUR eq."},
    margin:{label:"Average freight markup", value:avgMarkup(st).toFixed(1) + "%", delta:"default " + st.controls.defaultMarkup + "%", dir:"up", hint:"on carrier rates"},
    jobs:{label:"Orders won", value:String(st.orders.length), delta:st.orders.filter(o => o.status === "Delivered").length + " delivered", dir:"up", hint:"accepted quotes"}
  };
}
const kpiLive = perState(kpiCompute);
const KPI_DEFS = {};
Object.keys(KPI_STATIC).forEach(k => Object.defineProperty(KPI_DEFS, k, {enumerable:true,
  get:() => { try { return kpiLive(mm.get())[k] || KPI_STATIC[k]; } catch (e) { return KPI_STATIC[k]; } }}));

/* Dashboard areas. Static copy sits on each object; the figures are getters
   that read the store, so a PulseLogic render always sees today's numbers.
   The Finance area keeps the id "cash" so the command palette's Cash jump
   lands on it. */
const AREA_BUILDERS = {sales:perState(salesArea), enquiries:perState(enquiriesArea), freight:perState(freightArea),
  cash:perState(financeArea), stock:perState(stockArea), markets:perState(marketsArea)};
const EMPTY_AREA = {metrics:[], chart:[["", 1, ""], ["", 1, ""]], split:[], table:[], funnel:[], rows:[], stacked:[]};
function liveAspect(base, keys){
  const o = Object.assign({}, base);
  keys.forEach(k => Object.defineProperty(o, k, {enumerable:true, get:() => {
    try { const part = AREA_BUILDERS[base.id](mm.get()); return part[k] !== undefined ? part[k] : EMPTY_AREA[k]; }
    catch (e) { return EMPTY_AREA[k]; }
  }}));
  return o;
}

const ASPECT_DEFS = [
  liveAspect({id:"sales", label:"Sales", color:"var(--accent)", owner:"NIALL",
    description:"Confirmed orders from accepted quotes. Totals are EUR equivalent at the demo rate £1 = €1.15.",
    kind:"columns", chartTitle:"Confirmed sales by week", chartUnit:"EUR EQ. · LAST 12 WEEKS",
    splitTitle:"By customer type", tableCols:["Customer","Value, EUR eq.","Share","Market"]},
    ["metrics","chart","split","table"]),
  liveAspect({id:"enquiries", label:"Enquiries", color:"#9fd6f0", owner:"ENQUIRY AGENT",
    description:"Website, email and Instagram enquiries and how far each one gets. Counts are the records in this demo.",
    kind:"funnel", chartTitle:"From enquiry to paid", chartUnit:"RECORDS IN THIS DEMO",
    splitTitle:"Where they came from", tableCols:["Waiting longest","Asked for","Value","Waiting"]},
    ["metrics","chart","funnel","split","table"]),
  liveAspect({id:"freight", label:"Freight", color:"#e6c78a", owner:"FREIGHT AGENT",
    description:"Rate requests from the County Derry warehouse. Rates arrive by email and nothing is booked from Pulse.",
    kind:"dots", target:72, targetLabel:"Chase after 72 hours without a reply",
    chartTitle:"Hours waiting on each outstanding rate", chartUnit:"HOURS · LIMIT 72",
    splitTitle:"Waiting by carrier", tableCols:["Customer","Request","Markup","Waiting"]},
    ["metrics","chart","split","table"]),
  liveAspect({id:"cash", label:"Finance", color:"#7fd8a4", owner:"RECEIVABLES AGENT",
    description:"FreshBooks invoices and payments, read only. Mock data in this demo.",
    kind:"area", chartTitle:"Cash collected by week", chartUnit:"EUR EQ. · LAST 12 WEEKS",
    splitTitle:"Overdue by age", tableCols:["Customer","Outstanding","Due","Promise"]},
    ["metrics","chart","split","table"]),
  liveAspect({id:"stock", label:"Stock", color:"#f0994b", owner:"COUNTY DERRY",
    description:"In stock, reserved, available and incoming. No warehouse system, just the four numbers.",
    kind:"stacked", legend:["Reserved","Available now","Incoming, unallocated"],
    chartTitle:"Units by machine", chartUnit:"WAREHOUSE + FLEX INTAKE",
    splitTitle:"Flex Series intake", tableCols:["Machine","In stock","Available","Website says"]},
    ["metrics","chart","stacked","split","table"]),
  liveAspect({id:"markets", label:"Markets", color:"#c8b4f0", owner:"SALES INTELLIGENCE",
    description:"Where enquiries and orders come from. UK quotes are in GBP; sales totals are EUR equivalent at £1 = €1.15.",
    kind:"rows", chartTitle:"Enquiries by market", chartUnit:"ALL ENQUIRIES IN THIS DEMO",
    splitTitle:"Confirmed sales by market", tableCols:["Market","Enquiries","Conversion","Average deal"]},
    ["metrics","chart","rows","split","table"])
];

const FILTER_GROUPS = [
  {title:"AREA", items:["Sales","Enquiries","Freight","Finance","Stock","Markets"]},
  {title:"MARKET", items:["United Kingdom","Ireland","Netherlands","Italy","France","Germany","Spain"]}
];

const OPS_DEFS = [
  {id:"o1", name:"Weekly sales intelligence", kind:"report", owner:"Sales Intelligence Agent", ownerKind:"agent", initials:"SI",
   trigger:"Weekly, 08:00", triggerKind:"schedule", next:"In 5 days", last:"Sent to Niall", status:"healthy", rate:100, on:true,
   what:"Pulls the week's enquiries, quotes and orders and writes one page on demand, markets and conversion for Niall.",
   why:"There was no quick way to see which machines and markets were moving without building a spreadsheet.",
   saved:"3 hours a month",
   steps:[["Trigger","Once a week at 08:00"],["Find","Last week's enquiries, quotes and orders"],["Check","Flag any market or machine moving more than 10%"],["Draft","Write the one-page summary"],["Update","Post it to Home and file it in Drive"]],
   runs:[["2 days ago 08:00","41s","ok","1 report","€0.04"],["9 days ago 08:00","38s","ok","1 report","€0.04"],["16 days ago 08:00","44s","ok","1 report","€0.04"]]},
  {id:"o2", name:"Carrier rate chase", kind:"automation", owner:"Freight Agent", ownerKind:"agent", initials:"FR",
   trigger:"Daily, 09:00", triggerKind:"schedule", next:"Tomorrow", last:"1 chase drafted", status:"approval", rate:96, on:true,
   what:"Looks at every rate request still waiting on a carrier. Anything past three days gets a polite chase drafted for Niall to approve.",
   why:"Quotes were stalling because a carrier hadn't replied and nobody noticed for days.",
   saved:"6 hours a month",
   steps:[["Trigger","Every day at 09:00"],["Find","Rate requests waiting more than three days"],["Check","Skip anything chased in the last 24 hours"],["Draft","Write the chase to the carrier"],["Approval","Niall approves the email","gate"],["Send","Email the carrier","external"],["Update","Log the chase against the request"]],
   runs:[["Today 09:00","9s","ok","1 chase drafted","€0.01"],["Yesterday 09:00","8s","ok","None due","€0.00"],["2 days ago 09:00","8s","ok","None due","€0.00"]]},
  {id:"o3", name:"Daily enquiry triage", kind:"automation", owner:"Enquiry Agent", ownerKind:"agent", initials:"EN",
   trigger:"New enquiry received", triggerKind:"event", next:"Event-based", last:"47 drafts waiting", status:"healthy", rate:99, on:true,
   what:"Reads every quote request from the website form, Gmail and Instagram, pulls out the machines, quantity, facility type and delivery details, and drafts the first reply.",
   why:"Hundreds of requests were landing in one inbox, and the website promises a reply within 1 to 2 business days.",
   saved:"30 hours a month",
   steps:[["Trigger","A new enquiry arrives"],["Find","Match it to an existing customer"],["Check","Machines, quantity, country and postcode present"],["Draft","Reply with the price list, or ask for what's missing"],["Approval","Niall approves the reply","gate"],["Send","Email the customer","external"],["Update","Move the enquiry to Qualified"]],
   runs:[["40 min ago","7s","ok","Milano Performance Studio","€0.01"],["Today","6s","ok","1 enquiry","€0.01"],["Today","8s","ok","1 enquiry","€0.01"]]},
  {id:"o4", name:"Website availability check", kind:"routine", owner:"Ops Watchdog", ownerKind:"agent", initials:"OW",
   trigger:"Daily, 07:30", triggerKind:"schedule", next:"Tomorrow 07:30", last:"1 page out of date", status:"approval", rate:100, on:true,
   what:"Compares the availability wording on megamasseurope.com with stock in County Derry and flags any page that says something different.",
   why:"The best seller's page was still promising an October arrival while the machines sat in the warehouse.",
   saved:"2 hours a month",
   steps:[["Trigger","Every day at 07:30"],["Find","Availability text on each product page"],["Check","Compare with in stock, reserved and available"],["Update","Raise a task for Natalie when they differ"]],
   runs:[["Today","8s","ok","1 page flagged","€0.00"],["Yesterday 07:30","8s","ok","1 page flagged","€0.00"]]},
  {id:"o5", name:"Morning briefing", kind:"routine", owner:"Briefing", ownerKind:"agent", initials:"BR",
   trigger:"Weekdays, 07:00", triggerKind:"schedule", next:"Tomorrow 07:00", last:"Delivered 07:00", status:"healthy", rate:100, on:true,
   what:"Reads enquiries, freight, quotes and FreshBooks overnight and tells Niall the few things that need him today.",
   why:"Niall was opening Gmail, FreshBooks and the quote form before he knew where to start.",
   saved:"8 hours a month",
   steps:[["Trigger","Every weekday at 07:00"],["Find","Overnight changes across enquiries, freight, quotes and invoices"],["Check","Drop anything already handled"],["Draft","Write the briefing"],["Update","Post it to Home"]],
   runs:[["Today 07:00","24s","ok","1 briefing","€0.02"],["Yesterday 07:00","21s","ok","1 briefing","€0.02"],["2 days ago 07:00","26s","ok","1 briefing","€0.02"]]},
  {id:"o6", name:"Flex intake watch", kind:"task", owner:"Ops Watchdog", ownerKind:"agent", initials:"OW",
   trigger:"Daily, 10:00", triggerKind:"schedule", next:"Tomorrow 10:00", last:"Arrival not confirmed", status:"healthy", rate:100, on:true,
   what:"Keeps the Flex Series November intake honest: what's reserved, what's free, and whether the arrival date is confirmed.",
   why:"Pre-sold units and an unconfirmed date are how a customer gets promised a machine that hasn't landed.",
   saved:"2 hours a month",
   steps:[["Trigger","Every day at 10:00"],["Find","Reservations against the Flex Series intake"],["Check","Never let available stock go below zero"],["Approval","Niall commits any unallocated unit","gate"],["Update","Refresh the allocation and flag the date"]],
   runs:[["Yesterday 10:00","5s","ok","9 of 15 reserved","€0.00"],["2 days ago 10:00","5s","ok","Packing list read","€0.00"]]},
  {id:"o7", name:"FreshBooks receivables check", kind:"automation", owner:"Receivables Agent", ownerKind:"agent", initials:"RA",
   trigger:"Daily, 08:30", triggerKind:"schedule", next:"Tomorrow 08:30", last:"3 drafts waiting", status:"approval", rate:98, on:true,
   what:"Reads FreshBooks for overdue invoices and payment promises, and drafts a polite payment-status email where one is due. Never changes FreshBooks.",
   why:"Overdue invoices only got followed up when Niall happened to remember them.",
   saved:"5 hours a month",
   steps:[["Trigger","Every day at 08:30"],["Find","Overdue invoices and open promises in FreshBooks"],["Check","Skip anything disputed or promised in the next few days"],["Draft","Write a polite payment-status email"],["Approval","Niall approves each email","gate"],["Send","Email the customer","external"],["Update","Log the follow-up; FreshBooks stays unchanged"]],
   runs:[["Today 08:30","22s","ok","11 overdue, 3 drafts","€0.02"],["Yesterday 08:30","19s","ok","11 overdue","€0.02"],["2 days ago 08:30","21s","ok","11 overdue","€0.02"]]},
  {id:"o8", name:"Follow-up scan", kind:"routine", owner:"Follow-up Agent", ownerKind:"agent", initials:"FU",
   trigger:"Daily, 09:00", triggerKind:"schedule", next:"Tomorrow 09:00", last:"32 drafted, none sent", status:"approval", rate:100, on:true,
   what:"Finds customers who've gone quiet on the 3, 7, 14 and 30 day cadence and drafts a follow-up for each. Automatic chasing is off, so every draft waits for Niall.",
   why:"Quotes went cold because nobody followed up after the first week.",
   saved:"10 hours a month",
   steps:[["Trigger","Every day at 09:00"],["Find","Enquiries, quotes and promises with no reply on the cadence"],["Check","Skip anything already followed up or closed"],["Draft","Write each follow-up in Niall's voice"],["Approval","Niall reviews; auto-send is off","gate"],["Update","Log it against the customer"]],
   runs:[["Today 09:00","31s","ok","32 drafted, none sent","€0.03"],["Yesterday 09:00","28s","ok","Drafts updated","€0.03"]]},
  {id:"o9", name:"Quote assembly", kind:"automation", owner:"Quote Agent", ownerKind:"agent", initials:"QA",
   trigger:"Carrier rate received", triggerKind:"event", next:"Event-based", last:"Q-2293 prepared", status:"approval", rate:97, on:true,
   what:"When a carrier rate lands, prices the machines from the confidential EUR or GBP price list, adds freight with the markup and lines the quote up for Niall.",
   why:"Every quote was being typed by hand from the price list and a carrier email.",
   saved:"20 hours a month",
   steps:[["Trigger","A carrier rate is recorded"],["Find","The enquiry, the machines and the customer's currency"],["Check","Price list match, no overrides, stock or incoming"],["Draft","Build the quotation with freight and markup"],["Approval","Niall approves the quote","gate"],["Send","Email it to the customer","external"]],
   runs:[["2h ago","12s","ok","Q-2293 · £3,515","€0.02"],["Yesterday","19s","ok","Q-2286 · €21,915","€0.02"],["Yesterday","15s","ok","1 quote","€0.02"]]},
  {id:"o10", name:"Stalled-work sweep", kind:"automation", owner:"Ops Watchdog", ownerKind:"agent", initials:"OW",
   trigger:"Every 3 hours from 08:00", triggerKind:"schedule", next:"Today", last:"Lyon rate flagged", status:"healthy", rate:100, on:true,
   what:"Looks for anything stuck: enquiries with no first reply after 48 hours, carrier rates past three days, approvals sitting too long.",
   why:"Work stalls quietly when it's waiting on someone outside the business.",
   saved:"4 hours a month",
   steps:[["Trigger","Every 3 hours from 08:00"],["Find","Enquiries, rates and approvals past their limit"],["Check","Ignore anything already flagged today"],["Update","Flag it on Home and in Activity"]],
   runs:[["1h ago","6s","ok","4 enquiries past 48h","€0.00"],["Today","5s","ok","Lyon rate past 3 days","€0.00"],["Today","4s","ok","Nothing stalled","€0.00"]]},
  {id:"o11", name:"Payment promise tracker", kind:"task", owner:"Receivables Agent", ownerKind:"agent", initials:"RA",
   trigger:"Daily, 08:30", triggerKind:"schedule", next:"Tomorrow 08:30", last:"1 promise broken", status:"healthy", rate:100, on:true,
   what:"Tracks every payment promise a customer has made against the FreshBooks invoice and flags the ones that slip.",
   why:"Promises made on the phone or by email were easy to lose track of.",
   saved:"2 hours a month",
   steps:[["Trigger","Every day at 08:30"],["Find","Open promises against FreshBooks invoices"],["Check","Has the money arrived by the promised date?"],["Update","Flag broken promises for a follow-up"]],
   runs:[["Today 08:30","4s","ok","3 tracked, 1 broken","€0.00"],["Yesterday 08:30","4s","ok","3 tracked, 1 broken","€0.00"]]}
];

const OPS_FILTERS = [
  ["all","All"], ["routine","Agent routines"], ["automation","Automations"],
  ["report","Scheduled reports"], ["task","Recurring tasks"], ["approval","Needs approval"], ["failed","Failed"]
];

const WORK_SECTIONS = [
  {id:"tasks", label:"Tasks", blurb:"What's on Niall's and Natalie's plates, and what the agents are waiting on.",
   views:["All tasks","Due tasks","Review","Done"], filters:["Due date","Any status","Anyone","Any due date"]},
  {id:"approvals", label:"Approvals", blurb:"Quotes, customer emails, overrides and follow-ups. Nothing goes out until Niall says yes.",
   views:["Awaiting you","Awaiting others","Decided"], filters:["Raised date","Any value","Anyone"]},
  {id:"workflows", label:"Workflows", blurb:"What runs on its own, who owns it, and where it stops for approval.",
   views:[], filters:[]},
  {id:"schedules", label:"Schedule", blurb:"When each routine runs this week, and what it leaves for Niall.",
   views:[], filters:[]}
];

/* Mirrors the tasks in src/mm/seed.ts. */
const WORK_TASKS = [
  {id:"w1", title:"Approve Danube Strength quotation (€21,915)", status:"Review", priority:"High", who:"NI",
   due:"Due today", late:false, client:"Danube Strength", day:"Today", mins:"10 mins", view:"Review"},
  {id:"w2", title:"Review drafted replies to unanswered enquiries", status:"In progress", priority:"High", who:"NI",
   due:"Due today", late:false, client:"47 enquiries", day:"Today", mins:"45 mins", view:"Due tasks"},
  {id:"w3", title:"Chase Greyhound Express for the Lyon rate", status:"Review", priority:"High", who:"AI",
   due:"1 day overdue", late:true, client:"Lyon Performance Club", day:"Today", mins:"5 mins", view:"Due tasks"},
  {id:"w4", title:"Decide on Rotterdam Iron Supply volume pricing", status:"In progress", priority:"High", who:"NI",
   due:"Tomorrow", late:false, client:"Rotterdam Iron Supply", day:"Tomorrow", mins:"20 mins", view:"Review"},
  {id:"w5", title:"Confirm Flex Series arrival date with Mega Mass US", status:"Not started", priority:"High", who:"NI",
   due:"In 2 days", late:false, client:"Mega Mass (US)", day:"In 2 days", mins:"15 mins", view:"All tasks"},
  {id:"w6", title:"Call Rheinland Performance about FB-1047", status:"Not started", priority:"Medium", who:"NI",
   due:"Tomorrow", late:false, client:"Rheinland Performance", day:"Tomorrow", mins:"10 mins", view:"All tasks"},
  {id:"w7", title:"Book carrier collection for Wien Kraft Studio", status:"Not started", priority:"Medium", who:"NI",
   due:"Tomorrow", late:false, client:"Wien Kraft Studio", day:"Tomorrow", mins:"15 mins", view:"All tasks"},
  {id:"w8", title:"Update website availability text for T-Bar Linear Row", status:"Not started", priority:"Medium", who:"NA",
   due:"In 3 days", late:false, client:"Website", day:"In 3 days", mins:"15 mins", view:"All tasks"},
  {id:"w9", title:"Allocate the 6 unallocated Flex units", status:"Not started", priority:"Medium", who:"NI",
   due:"In 3 days", late:false, client:"Flex Series intake", day:"In 3 days", mins:"20 mins", view:"All tasks"},
  {id:"w10", title:"Send trade price list to new distributor enquiries", status:"Not started", priority:"Medium", who:"NI",
   due:"In 2 days", late:false, client:"Distributors", day:"In 2 days", mins:"20 mins", view:"All tasks"},
  {id:"w11", title:"Confirm VAT treatment for EU business quotes with the accountant", status:"Not started", priority:"Medium", who:"NI",
   due:"In 5 days", late:false, client:"Finance", day:"In 5 days", mins:"30 mins", view:"All tasks"},
  {id:"w12", title:"Confirm payment terms wording for quotations", status:"Not started", priority:"Medium", who:"NI",
   due:"In 5 days", late:false, client:"Finance", day:"In 5 days", mins:"20 mins", view:"All tasks"},
  {id:"w13", title:"Confirm dimensions for Leverage Seated Row (catalogue says TBC)", status:"Not started", priority:"Low", who:"NA",
   due:"In 4 days", late:false, client:"Catalogue", day:"In 4 days", mins:"10 mins", view:"All tasks"},
  {id:"w14", title:"Remove 'Already an Atlantis client' from the quote form", status:"Not started", priority:"Low", who:"NA",
   due:"In 7 days", late:false, client:"Website", day:"In 7 days", mins:"10 mins", view:"All tasks"},
  {id:"w15", title:"Reconcile FreshBooks payments for week 47", status:"In progress", priority:"Low", who:"AI",
   due:"Tomorrow", late:false, client:"FreshBooks", day:"Tomorrow", mins:"Agent", view:"All tasks"},
  {id:"w16", title:"Send Rotterdam Iron Supply the EUR trade price list", status:"Done", priority:"Medium", who:"NI",
   due:"Done", late:false, client:"Rotterdam Iron Supply", day:"Any day", mins:"5 mins", view:"Done", done:true}
];

const WORKFLOWS = [
  {name:"Daily enquiry triage", state:"live", trigger:"event · enquiry received",
   actions:[["gmail.draft","write"],["enquiry.update","write"]], lastRun:"40 min ago",
   result:"draft waiting for approval", resultKind:"ok", runSummary:"14 ok",
   runs:["ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok"]},
  {name:"Carrier rate chase", state:"live", trigger:"schedule · daily 09:00",
   actions:[["gmail.draft","write"],["gmail.send","external"]], lastRun:"Today 09:00",
   result:"1 chase waiting for approval", resultKind:"warn", runSummary:"13 ok · 1 waiting",
   runs:["ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","partial"]},
  {name:"FreshBooks receivables check", state:"live", trigger:"schedule · daily 08:30",
   actions:[["freshbooks.read","read"],["gmail.draft","write"]], lastRun:"Today 08:30",
   result:"3 drafts waiting", resultKind:"warn", runSummary:"14 ok",
   runs:["ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok"]},
  {name:"Quote assembly", state:"live", trigger:"event · carrier rate recorded",
   actions:[["price_list.read","read"],["quote.draft","write"]], lastRun:"2h ago",
   result:"Q-2293 ready for approval", resultKind:"ok", runSummary:"14 ok",
   runs:["ok","ok","ok","idle","ok","ok","ok","ok","idle","ok","ok","ok","ok","ok"]}
];

const SCHEDULES = [
  {id:"s1", name:"Morning briefing", cadence:"Every weekday · 07:00", next:"Tomorrow 07:00", owner:"Briefing", on:true, day:1},
  {id:"s2", name:"FreshBooks receivables check", cadence:"Daily · 08:30", next:"Tomorrow 08:30", owner:"Receivables Agent", on:true, day:1},
  {id:"s3", name:"Follow-up scan, drafts only", cadence:"Daily · 09:00", next:"Tomorrow 09:00", owner:"Follow-up Agent", on:true, day:1},
  {id:"s4", name:"Carrier rate chase", cadence:"Daily · 09:00", next:"Tomorrow 09:00", owner:"Freight Agent", on:true, day:2},
  {id:"s5", name:"Weekly sales intelligence", cadence:"Weekly · 08:00", next:"In 5 days", owner:"Sales Intelligence Agent", on:true, day:0}
];

const WIDGET_DEFS = [["inbox","Action inbox"],["work","My work"],["activity","Activity"],["kpi","Today's numbers"],["visits","Dispatch and deliveries"]];
/* Queue counts follow the store's tasks, bucketed the way src/mm/legacy.ts
   buckets them for the Home task widget. */
const workCounts = perState((st) => {
  const open = st.tasks.filter(t => t.status !== "Done");
  const dueIn = (t) => Math.floor((t.due - st.now) / DAY_MS);
  return {queue:open.filter(t => t.owner === "Niall").length, team:open.filter(t => t.owner !== "Niall").length,
    late:open.filter(t => dueIn(t) <= 0).length, week:open.filter(t => dueIn(t) > 0 && dueIn(t) <= 7).length};
});
const workCount = (k, fallback) => { try { return String(workCounts(mm.get())[k]); } catch (e) { return fallback; } };
const WORK_WIDGETS = [
  {id:"queue", label:"Niall's queue", get value(){ return workCount("queue", "10"); }, hint:"assigned to Niall", icon:"work", queue:"mine"},
  {id:"late", label:"Due today", get value(){ return workCount("late", "3"); }, hint:"due today or late", icon:"health", queue:"overdue"},
  {id:"team", label:"Natalie and agents", get value(){ return workCount("team", "5"); }, hint:"on someone else's plate", icon:"teams", queue:"team"},
  {id:"week", label:"Next 7 days", get value(){ return workCount("week", "12"); }, hint:"due this week", icon:"visits", queue:"upcoming"}
];
const PERSONALITIES = ["Straight-talking","Warm","Formal","Dry"];
const ANSWER_STYLES = ["Short answers","Show the working","Ask before acting"];
/* Every context source and every tool the agent could be granted. The builder
   shows the whole catalogue, grouped, rather than a sample. */
const CONTEXT_DEFS = [
  ["Customers","records","Gyms, distributors and home buyers, by market"],
  ["Contacts","records","Customer, carrier and team contacts"],
  ["Enquiries","records","Quote requests from the website, Gmail and Instagram"],
  ["Machines","records","The 18 machines, stock and incoming"],
  ["Files","records","Price lists, catalogue, carrier rates, packing lists"],
  ["Tasks","work","Owners, due dates, what is waiting"],
  ["Approvals","work","Quotes, emails and overrides waiting on Niall"],
  ["Freight requests","work","Rate requests and carrier replies"],
  ["Quotes","money","Drafts, ready for review, sent, accepted"],
  ["Invoices","money","FreshBooks invoices, read only"],
  ["Payments","money","FreshBooks payments and promises"],
  ["Price lists","money","Confidential EUR and GBP price lists"],
  ["Activity log","system","Every event, agent and human"],
  ["Insights","system","Markets, demand and conversion"]
];
const CONTEXT_SOURCES = CONTEXT_DEFS.map(c => c[0]);
const SKILL_DEFS = [
  ["Search records","read"],["Summarise activity","read"],["Read FreshBooks invoices","read"],
  ["Read carrier emails","read"],["Read price lists","read"],["Check stock","read"],
  ["Draft customer email","write"],["Draft carrier request","write"],["Prepare quote","write"],
  ["Create task","write"],["Raise approval","write"],
  ["Send email","external"],["Book transport","external"],["Write to FreshBooks","external"]
];
/* The training steps, then the two questions the agent asks back once it knows the job. */
const TRAIN_PHASES = [
  ["Reading the whole ontology", RECORD_COUNT.toLocaleString("en-GB") + " records"],
  ["Learning how Mega Mass words things", "Add to Quote → enquiry"],
  ["Researching commercial strength equipment", "12 sources"],
  ["Writing its own system prompt", "1,240 tokens"]
];
const BRIEF_QUESTIONS = [
  {title:"What should it cover?", sub:"Pick as many as you like. We can refine it later.",
   options:[["Enquiries","New and unanswered, oldest first"],["Quotes","Ready for review and waiting on you"],
            ["Freight","Carrier rates running late"],["Money","Overdue invoices and payment promises"],
            ["Something else","Tell me in the next reply"]]},
  {title:"When should it land?", sub:"One is enough to start.",
   options:[["Every morning 07:30","Before the inbox fills up"],["Weekdays 08:00","Monday to Friday only"],
            ["Only when something changes","Event-driven, no noise"],["On demand","When you ask for it"]]}
];
/* The words under a name, keyed to the same state the face lights with. */
const STATE_LABELS = {working:"working", thinking:"thinking", waiting:"waiting on you",
  complete:"up to date", attention:"needs you", idle:"idle"};

const FACE_SHAPES = [
  ["crown-pebble","Pebble"],["executive-capsule","Executive"],["shield","Shield"],
  ["glass-visor","Visor"],["control-cube","Control cube"],["low-dome","Low dome"],
  ["offset-pebble","Offset pebble"],["rim-capsule","Capsule"],["wide-eyed","Wide-eyed"],
  ["precision-brow","Precision brow"],["tall-unit","Tall unit"],["soft-asymmetric","Soft asymmetric"]
];
/* Shell colours only, deliberately desaturated so none of them reads as a
   state. Each is a pair: the deep shell for light themes and its pale partner
   for dark ones (the eyes take the other). The status light carries the state. */
const FACE_TINTS = [
  ["#191c1f","Graphite","#e3e6e8"],["#1b2430","Slate","#d3dde9"],["#241b2e","Aubergine","#ddd4ea"],
  ["#2a2118","Bronze","#eadccb"],["#16241f","Pine","#d1e4da"],["#2b1b1e","Oxblood","#eed5d7"]
];

/* ---- ontology graph: generation, Dijkstra traversal, canvas render ---- */
const CLUSTERS = [
  ["Customers", "#c8f04b", 0.00, 0.62, 46],
  ["Enquiries", "#6ad0f0", 0.90, 0.70, 52],
  ["Quotes",    "#b06cf0", 1.75, 0.66, 58],
  ["Freight",   "#f0c04b", 2.55, 0.72, 44],
  ["Invoices",  "#f0567f", 3.35, 0.60, 38],
  ["Machines",  "#5fe0a8", 4.15, 0.70, 40],
  ["Orders",    "#f0803a", 4.95, 0.64, 30],
  ["Approvals", "#5f7cf0", 5.65, 0.72, 34]
];

function mulberry(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* Hub-and-spoke clusters around a dense phyllotaxis core, in unit space
   (-1..1 on both axes) so the layout is resolution independent. */
const _hexCache = {};
function hexRGB(hex){
  if (_hexCache[hex]) return _hexCache[hex];
  const h = hex.replace("#", "");
  const v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  _hexCache[hex] = v;
  return v;
}

function buildGraph(){
  const rnd = mulberry(20260902);
  const nodes = [], edges = [], adj = [];
  const add = (x, y, z, r, cluster, kind) => {
    nodes.push({x, y, z, r, cluster, kind}); adj.push([]); return nodes.length - 1;
  };
  const link = (a, b) => {
    const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, dz = nodes[a].z - nodes[b].z;
    const w = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.004;
    const id = edges.length;
    edges.push({a, b, w});
    adj[a].push([b, w, id]); adj[b].push([a, w, id]);
  };

  // the core is a filled sphere on a Fibonacci lattice, not a disc
  const CORE = 880, coreIds = [];
  for (let i = 0; i < CORE; i++){
    const t = (i + 0.5) / CORE;
    const phi = Math.acos(1 - 2 * t);
    const theta = i * 2.39996;
    const shell = 0.16 + 0.28 * Math.pow(rnd(), 0.5);
    const grade = rnd();
    coreIds.push(add(
      Math.sin(phi) * Math.cos(theta) * shell * 1.04,
      Math.cos(phi) * shell * 0.96,
      Math.sin(phi) * Math.sin(theta) * shell,
      grade < 0.06 ? 3.4 + rnd() * 1.4 : grade < 0.3 ? 2.1 + rnd() * 0.7 : 1.0 + rnd() * 0.8, 0, "core"));
  }
  // lattice neighbours plus a mesh of chords, so the sphere reads as a volume
  for (let i = 1; i < coreIds.length; i++){
    link(coreIds[i], coreIds[i - 1]);
    if (i >= 13) link(coreIds[i], coreIds[i - 13]);
    if (i >= 21 && i % 2 === 0) link(coreIds[i], coreIds[i - 21]);
    if (i >= 34 && i % 3 === 0) link(coreIds[i], coreIds[i - 34]);
    if (i >= 55 && i % 4 === 0) link(coreIds[i], coreIds[i - 55]);
    if (i >= 89 && i % 5 === 0) link(coreIds[i], coreIds[i - 89]);
    if (i % 6 === 0) link(coreIds[i], coreIds[Math.floor(rnd() * coreIds.length)]);
  }

  // a mid shell between the nucleus and the lobes: the layer that makes it
  // read as a network rather than a ball with satellites
  const MID = 560, midIds = [];
  for (let i = 0; i < MID; i++){
    const t = (i + 0.5) / MID;
    const phi = Math.acos(1 - 2 * t), theta = i * 2.39996 + 0.7;
    const d = 0.52 + 0.16 * Math.pow(rnd(), 0.6);
    const g2 = rnd();
    midIds.push(add(
      Math.sin(phi) * Math.cos(theta) * d * 1.02,
      Math.cos(phi) * d * 0.96,
      Math.sin(phi) * Math.sin(theta) * d,
      g2 < 0.05 ? 2.6 + rnd() * 1.0 : g2 < 0.3 ? 1.6 + rnd() * 0.6 : 0.8 + rnd() * 0.7, 0, "core"));
  }
  for (let i = 0; i < midIds.length; i++){
    if (i >= 1) link(midIds[i], midIds[i - 1]);
    if (i >= 17) link(midIds[i], midIds[i - 17]);
    if (i >= 29 && i % 2 === 0) link(midIds[i], midIds[i - 29]);
    // radial spokes tying the shell to the nucleus
    if (i % 2 === 0) link(midIds[i], coreIds[Math.floor(rnd() * coreIds.length)]);
    if (i % 9 === 0) link(midIds[i], coreIds[Math.floor(rnd() * coreIds.length)]);
  }

  // clusters ride a sphere: each hub gets its own latitude as well as longitude
  const hubs = [], clusterLeaves = [];
  const onSphere = (lon, lat, d0) => { const d = d0 * 1.22;
    return [Math.cos(lat) * Math.cos(lon) * d * 1.02, Math.sin(lat) * d * 0.96, Math.cos(lat) * Math.sin(lon) * d]; };
  CLUSTERS.forEach((c, ci) => {
    const [, , ang, dist, leaves] = c;
    const lat = (ci % 2 ? 1 : -1) * (0.26 + rnd() * 0.5);
    const wob = 1.06 + rnd() * 0.16;
    const hp = onSphere(ang, lat, dist * wob);
    const hub = add(hp[0], hp[1], hp[2], 5.4, ci, "hub");
    hubs.push(hub);
    const mine = [];
    clusterLeaves.push(mine);
    for (let k = 0; k < 3; k++) link(hub, coreIds[Math.floor(rnd() * coreIds.length)]);
    for (let k = 0; k < 5; k++) link(hub, midIds[Math.floor(rnd() * midIds.length)]);

    const subs = 5 + Math.floor(rnd() * 4);
    const subIds = [];
    for (let s = 0; s < subs; s++){
      const sa = ang + (rnd() - 0.5) * 0.52, sl = lat + (rnd() - 0.5) * 0.3;
      const sd = dist + 0.08 + rnd() * 0.18;
      const sp = onSphere(sa, sl, sd);
      const sub = add(sp[0], sp[1], sp[2], 3.2, ci, "sub");
      subIds.push(sub);
      link(sub, hub);
      if (s > 0 && rnd() < 0.7) link(sub, subIds[s - 1]);
      const fan = Math.floor((leaves * 7.4) / subs);
      const spread = 0.17 + rnd() * 0.2;
      let prev = -1;
      for (let l = 0; l < fan; l++){
        const la = sa + (rnd() - 0.5) * spread * 2 + (rnd() - 0.5) * 0.06;
        const ll = sl + (rnd() - 0.5) * spread * 1.1;
        const ld = sd + 0.03 + Math.pow(rnd(), 0.8) * 0.17;
        const lp = onSphere(la, ll, ld);
        const lg = rnd();
        const leaf = add(lp[0], lp[1], lp[2],
          lg < 0.08 ? 2.8 + rnd() * 1.2 : lg < 0.34 ? 1.8 + rnd() * 0.6 : 1.0 + rnd() * 0.7, ci, "leaf");
        link(leaf, sub);
        mine.push(leaf);
        if (rnd() < 0.14) link(leaf, hub);
        if (prev >= 0 && rnd() < 0.34) link(leaf, prev);
        if (rnd() < 0.16) link(leaf, midIds[Math.floor(rnd() * midIds.length)]);
        prev = leaf;
      }
    }
  });
  // far satellites hanging off the outer leaves
  CLUSTERS.forEach((c, ci) => {
    const [, , ang, dist] = c;
    for (let s = 0; s < 7; s++){
      const sa = ang + (rnd() - 0.5) * 1.5, sl = (rnd() - 0.5) * 1.3;
      const sd = dist + 0.42 + rnd() * 0.22;
      const ap = onSphere(sa, sl, sd);
      const anchor = add(ap[0], ap[1], ap[2], 2.4, ci, "sub");
      link(anchor, hubs[ci]);
      const n = 14 + Math.floor(rnd() * 18);
      for (let l = 0; l < n; l++){
        const la = sa + (rnd() - 0.5) * 0.9, ll = sl + (rnd() - 0.5) * 0.7;
        const ld = sd + 0.02 + Math.pow(rnd(), 0.8) * 0.18;
        const p = onSphere(la, ll, ld);
        const leaf = add(p[0], p[1], p[2], 0.8 + rnd() * 0.9, ci, "leaf");
        link(leaf, anchor);
        clusterLeaves[ci].push(leaf);
      }
    }
  });

  // two hub rings and long chords across the sphere
  hubs.forEach((h, i) => {
    link(h, hubs[(i + 1) % hubs.length]);
    link(h, hubs[(i + 2) % hubs.length]);
    if (i % 3 === 0) link(h, hubs[(i + 4) % hubs.length]);
  });
  // neighbouring clusters share records, so their leaves cross-link
  for (let ci = 0; ci < clusterLeaves.length; ci++){
    const a = clusterLeaves[ci], b = clusterLeaves[(ci + 1) % clusterLeaves.length];
    const n = 26 + Math.floor(rnd() * 16);
    for (let k = 0; k < n; k++){
      link(a[Math.floor(rnd() * a.length)], b[Math.floor(rnd() * b.length)]);
    }
    // and a good number reach right across to the far side
    for (let k = 0; k < 12; k++){
      const far = clusterLeaves[(ci + 3) % clusterLeaves.length];
      link(a[Math.floor(rnd() * a.length)], far[Math.floor(rnd() * far.length)]);
    }
    for (let k = 0; k < 8; k++){
      const far = clusterLeaves[(ci + 4) % clusterLeaves.length];
      link(a[Math.floor(rnd() * a.length)], far[Math.floor(rnd() * far.length)]);
    }
  }

  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const n of nodes){
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
    if (n.z < minZ) minZ = n.z; if (n.z > maxZ) maxZ = n.z;
  }
  const bounds = {minX, maxX, minY, maxY, cx:(minX + maxX) / 2, cy:(minY + maxY) / 2,
    cz:(minZ + maxZ) / 2, w:maxX - minX, h:maxY - minY, d:maxZ - minZ,
    radius: Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2,
    reach: nodes.reduce((m, n) => Math.max(m, Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)), 0)};
  return {nodes, edges, adj, hubs, coreIds, bounds};
}

export {
  INK,
  BODY,
  DIM,
  FAINT,
  LIME,
  GREEN,
  AMBER,
  RED,
  NEUTRAL,
  MONO,
  ICONS,
  REC_SECTIONS,
  CONTACTS,
  FILE_TREE,
  ONTO_NODES,
  ONTO_EDGES,
  REC_TEMPLATES,
  REC_TEMPLATE_CATS,
  PEOPLE,
  ROLE_LEVELS,
  PERM_KEYS,
  GRANT_DEFS,
  ROLE_SCOPES,
  DEFAULT_PERMS,
  INTEGRATIONS,
  BG_DEFS,
  THEMES,
  ADMIN_ICONS,
  ADMIN_CARDS,
  ADMIN_GROUPS,
  SRC_TINT,
  SRC_ABBR,
  DATA_EVENTS,
  PEOPLE_EVENTS,
  AI_EVENTS,
  STREAM_DEFS,
  NAV,
  ITEMS,
  ORDER,
  ANSWERS,
  synthesizeCustomArea,
  pickAnswer,
  ORGS,
  TEAMS,
  LOCATIONS,
  AGENT_DEFS,
  KPI_DEFS,
  ASPECT_DEFS,
  FILTER_GROUPS,
  OPS_DEFS,
  OPS_FILTERS,
  WORK_SECTIONS,
  WORK_TASKS,
  WORKFLOWS,
  SCHEDULES,
  WIDGET_DEFS,
  WORK_WIDGETS,
  PERSONALITIES,
  ANSWER_STYLES,
  CONTEXT_DEFS,
  CONTEXT_SOURCES,
  SKILL_DEFS,
  TRAIN_PHASES,
  BRIEF_QUESTIONS,
  STATE_LABELS,
  FACE_SHAPES,
  FACE_TINTS,
  CLUSTERS,
  mulberry,
  _hexCache,
  hexRGB,
  buildGraph
};
