import { PRODUCTS, PRODUCT_BY_ID, SKU } from "./catalog";
import type {
  ActivityEvent, AgentRun, Approval, Contact, Country, Currency, Customer, CustomerType, Email, Enquiry,
  EnquirySource, FollowUp, FreightRequest, IncomingShipment, Invoice, Line, MMState, Order, OrderStatus,
  Payment, Priority, Qualification, Quote, QuoteLine, QuoteStatus, Reservation, Supplier, Task,
} from "./types";

/* ─────────────────────────────────────────────────────────────────────────────
   Demo snapshot for Mega Mass Europe. Synthetic, but shaped so the headline
   numbers fall out of the records rather than being typed in:
     47 unanswered enquiries · 25 quotes awaiting approval · 18 freight rates
     outstanding · 11 overdue invoices worth €46,820 · 32 follow-ups to review.
   The 163 requests Niall reported for 14–17 Nov is a separate historical note
   (see HISTORY in select.ts), not part of this dataset.
   Timestamps are offsets from page load, so the snapshot always reads as "now".
   ───────────────────────────────────────────────────────────────────────────── */

export const NOW = Date.now();
const HOUR = 3600_000;
const DAY = 86_400_000;
const ago = (days: number, hours = 0) => NOW - days * DAY - hours * HOUR;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(20261120);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(R() * a.length)];
const between = (lo: number, hi: number) => lo + R() * (hi - lo);
const int = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
function weighted<T>(pairs: [T, number][]): T {
  const total = pairs.reduce((s, p) => s + p[1], 0);
  let x = R() * total;
  for (const [v, w] of pairs) { x -= w; if (x <= 0) return v; }
  return pairs[pairs.length - 1][0];
}

/* ── places and people ────────────────────────────────────────────────────── */

const COUNTRY_NAME: Record<Country, string> = {
  IT: "Italy", NL: "Netherlands", FR: "France", DE: "Germany", ES: "Spain", SK: "Slovakia", IE: "Ireland",
  GB: "United Kingdom", BE: "Belgium", PL: "Poland", AT: "Austria", PT: "Portugal", DK: "Denmark",
  CZ: "Czechia", SE: "Sweden",
};
export { COUNTRY_NAME };

const TLD: Record<Country, string> = {
  IT: "it", NL: "nl", FR: "fr", DE: "de", ES: "es", SK: "sk", IE: "ie", GB: "co.uk", BE: "be", PL: "pl",
  AT: "at", PT: "pt", DK: "dk", CZ: "cz", SE: "se",
};
const DIAL: Record<Country, string> = {
  IT: "+39", NL: "+31", FR: "+33", DE: "+49", ES: "+34", SK: "+421", IE: "+353", GB: "+44", BE: "+32",
  PL: "+48", AT: "+43", PT: "+351", DK: "+45", CZ: "+420", SE: "+46",
};

const CITIES: Record<Country, [string, string][]> = {
  GB: [["Leeds", "LS"], ["Glasgow", "G"], ["Birmingham", "B"], ["Bristol", "BS"], ["London", "E"], ["Belfast", "BT"],
    ["Newcastle", "NE"], ["Liverpool", "L"], ["Edinburgh", "EH"], ["Cardiff", "CF"], ["Sheffield", "S"],
    ["Nottingham", "NG"], ["Leicester", "LE"], ["Brighton", "BN"], ["Southampton", "SO"], ["Aberdeen", "AB"]],
  IT: [["Rome", "00"], ["Turin", "10"], ["Bologna", "40"], ["Naples", "80"], ["Florence", "50"], ["Verona", "37"],
    ["Padua", "35"], ["Bergamo", "24"], ["Genoa", "16"], ["Palermo", "90"], ["Bari", "70"], ["Brescia", "25"],
    ["Modena", "41"], ["Parma", "43"]],
  NL: [["Amsterdam", "10"], ["Utrecht", "35"], ["Eindhoven", "56"], ["The Hague", "25"], ["Groningen", "97"],
    ["Breda", "48"], ["Tilburg", "50"], ["Haarlem", "20"], ["Nijmegen", "65"], ["Arnhem", "68"], ["Zwolle", "80"],
    ["Leiden", "23"]],
  IE: [["Dublin", "D"], ["Cork", "T12"], ["Galway", "H91"], ["Limerick", "V94"], ["Waterford", "X91"],
    ["Kilkenny", "R95"], ["Sligo", "F91"], ["Athlone", "N37"]],
  DE: [["Berlin", "10"], ["Munich", "80"], ["Hamburg", "20"], ["Frankfurt", "60"], ["Stuttgart", "70"],
    ["Düsseldorf", "40"], ["Leipzig", "04"], ["Dortmund", "44"], ["Bremen", "28"]],
  FR: [["Paris", "75"], ["Marseille", "13"], ["Bordeaux", "33"], ["Lille", "59"], ["Toulouse", "31"],
    ["Nantes", "44"], ["Nice", "06"], ["Strasbourg", "67"], ["Rennes", "35"]],
  ES: [["Madrid", "28"], ["Barcelona", "08"], ["Valencia", "46"], ["Seville", "41"], ["Málaga", "29"],
    ["Bilbao", "48"], ["Zaragoza", "50"], ["Alicante", "03"]],
  BE: [["Antwerp", "20"], ["Ghent", "90"], ["Brussels", "10"], ["Liège", "40"], ["Bruges", "80"]],
  PL: [["Kraków", "30"], ["Warsaw", "00"], ["Wrocław", "50"], ["Gdańsk", "80"], ["Poznań", "60"]],
  AT: [["Vienna", "10"], ["Salzburg", "50"], ["Graz", "80"], ["Linz", "40"], ["Innsbruck", "60"]],
  SK: [["Bratislava", "8"], ["Košice", "04"], ["Žilina", "01"]],
  PT: [["Lisbon", "1"], ["Porto", "4"]],
  DK: [["Copenhagen", "2"], ["Aarhus", "8"]],
  CZ: [["Prague", "1"], ["Brno", "6"]],
  SE: [["Stockholm", "11"], ["Gothenburg", "41"]],
};

const FIRST: Record<string, string[]> = {
  GB: ["Hannah", "Callum", "Rebecca", "Owen", "Priya", "Ryan", "Lewis", "Jack", "Sophie", "Ethan", "Chloe", "Harry", "Megan", "Josh", "Amy", "Kieran"],
  IE: ["Ciarán", "Orla", "Eoin", "Siobhán", "Cathal", "Gráinne", "Darragh", "Sinéad", "Fionn", "Clodagh"],
  IT: ["Giulia", "Alessandro", "Chiara", "Matteo", "Francesca", "Davide", "Sara", "Lorenzo", "Elena", "Luca", "Federico", "Valentina"],
  NL: ["Sanne", "Thijs", "Femke", "Ruben", "Lotte", "Jesse", "Bram", "Iris", "Daan", "Noor", "Milan", "Eva"],
  FR: ["Hugo", "Léa", "Julien", "Manon", "Antoine", "Claire", "Mathis", "Chloé", "Lucas", "Inès"],
  DE: ["Lena", "Felix", "Anna", "Tobias", "Miriam", "Jonas", "Lukas", "Sophie", "Niklas", "Hannah"],
  ES: ["Javier", "Lucía", "Pablo", "Marta", "Diego", "Carmen", "Álvaro", "Elena", "Sergio", "Paula"],
  BE: ["Wout", "Lien", "Jens", "Elke", "Pieter", "Sofie"],
  PL: ["Piotr", "Kasia", "Tomasz", "Agnieszka", "Michał"],
  AT: ["Stefan", "Katrin", "Florian", "Julia", "Markus"],
  SK: ["Tomáš", "Martina", "Peter", "Zuzana", "Marek"],
  PT: ["Rui", "Inês", "João", "Marta"],
  DK: ["Mads", "Freja", "Rasmus", "Ida"],
  CZ: ["Jakub", "Tereza", "Ondřej", "Lucie"],
  SE: ["Erik", "Linnea", "Oskar", "Maja"],
};
const LAST: Record<string, string[]> = {
  GB: ["Pryce", "Fraser", "Holt", "Davies", "Nair", "McCann", "Ashworth", "Ellison", "Hughes", "Turner", "Bennett", "Shaw", "Doherty", "Kaur"],
  IE: ["Doyle", "Brennan", "Gallagher", "Kenny", "Byrne", "Moran", "Keane", "Lynch", "Duggan", "Farrell"],
  IT: ["Romano", "Ferri", "Galli", "Conti", "Moretti", "Ricci", "Lombardi", "Greco", "Marino", "Costa", "Fontana", "Rinaldi"],
  NL: ["de Jong", "Bakker", "Jansen", "Smit", "Mulder", "van Dijk", "Willems", "Meijer", "de Boer", "Vos"],
  FR: ["Moreau", "Dubois", "Lefèvre", "Girard", "Mercier", "Rousseau", "Bernard", "Fournier", "Lambert", "Faure"],
  DE: ["Hoffmann", "Wagner", "Schulz", "Keller", "Vogel", "Fischer", "Weber", "Neumann", "Krüger", "Braun"],
  ES: ["Ortega", "Navarro", "Herrera", "Castillo", "Romero", "Molina", "Delgado", "Ruiz", "Vidal", "Serrano"],
  BE: ["Peeters", "Maes", "Janssens", "Claes", "Wouters"],
  PL: ["Nowak", "Wiśniewska", "Kowalski", "Zielińska", "Lewandowski"],
  AT: ["Gruber", "Huber", "Bauer", "Wagner", "Pichler"],
  SK: ["Horváth", "Kováčová", "Varga", "Tóth", "Baláž"],
  PT: ["Carvalho", "Ferreira", "Santos", "Almeida"],
  DK: ["Christensen", "Jensen", "Nielsen", "Larsen"],
  CZ: ["Dvořák", "Novotná", "Svoboda", "Černá"],
  SE: ["Lindqvist", "Johansson", "Berg", "Nyström"],
};

const GYM_PATTERNS: Record<string, string[]> = {
  default: ["{c} Strength Club", "{c} Iron Gym", "{c} Performance Centre", "{c} Barbell Club", "{c} Athletic Club",
    "{c} Training Lab", "{c} Power Gym", "Forge Gym {c}", "Iron Temple {c}", "{c} Strength & Conditioning"],
  IT: ["Palestra Forza {c}", "{c} Fitness Club", "Iron Club {c}", "{c} Strength Lab", "Centro Atletico {c}"],
  NL: ["Krachtsport {c}", "{c} Barbell Collective", "Gym {c} Noord", "{c} Strength Studio", "Sportschool {c}"],
  DE: ["Kraftwerk {c}", "{c} Athletik Studio", "Fitnessstudio {c} Mitte", "{c} Iron Athletics"],
  FR: ["Salle Force {c}", "{c} Athlétique Club", "Club Fitness {c}", "{c} Strength House"],
  ES: ["Gimnasio Fuerza {c}", "{c} Fitness Club", "{c} Iron Lab", "Centro Deportivo {c}"],
  PL: ["Siłownia {c}", "{c} Iron Club"],
  CZ: ["{c} Iron Gym", "Posilovna {c}"],
};
const TRADE_PATTERNS = ["{n} Fitness Supply", "{n} Gym Distribution", "{n} Equipment Trading", "{n} Strength Supply"];

/* ── records being built ──────────────────────────────────────────────────── */

const customers: Customer[] = [];
const contacts: Contact[] = [];
const enquiries: Enquiry[] = [];
const quotes: Quote[] = [];
const freight: FreightRequest[] = [];
const invoices: Invoice[] = [];
const payments: Payment[] = [];
const orders: Order[] = [];
const reservations: Reservation[] = [];
const followUps: FollowUp[] = [];
const approvals: Approval[] = [];
const emails: Email[] = [];
const activity: ActivityEvent[] = [];
const runs: AgentRun[] = [];
const tasks: Task[] = [];

let nCust = 0, nContact = 0, nMail = 0, nAct = 0, nRun = 0, nFollow = 0, nAppr = 0, nPay = 0, nRes = 0;
/* Names written by hand further down, kept out of the generated pool. */
const usedNames = new Set<string>([
  "Palestra Forza Bologna", "Kraftwerk Berlin", "Iron Club Firenze", "Siłownia Kraków", "Amsterdam Barbell Collective",
  "Dublin Strength Collective", "Leeds Iron House", "Glasgow Barbell Club", "Iberia Fitness Supply", "Stockholm Kraft Studio",
  "Birmingham Strength Co", "Wien Kraft Studio", "Alpen Gym Distribution", "Paris Force Athlétique", "Valencia Strength Factory",
  "Cork Performance Centre", "Košice Power Gym", "Torino Iron Club", "Antwerp Strength Club", "Bordeaux Strength House",
  "Madrid Fuerza Club", "Utrecht Krachtcentrum", "Hamburg Strength Union", "Napoli Athletic Centre", "London Strength Republic",
  "Eindhoven Performance Hall", "Galway Iron Gym", "Lisboa Força Gym", "Nordic Strength Supply",
]);
const usedPeople = new Set<string>([
  "Marco Bianchi", "Tomáš Horváth", "Daan Visser", "Camille Laurent", "Jonas Becker", "Danny Whitaker", "Sanne de Jong",
  "Ciarán Doyle", "Hannah Pryce", "Chiara Galli", "Callum Fraser", "Diego Romero", "Erik Lindqvist", "Rebecca Holt",
  "Stefan Gruber", "Katrin Huber", "Hugo Moreau", "Pablo Herrera", "Orla Brennan", "Martina Kováčová", "Alessandro Ferri",
  "Wout Peeters", "Piotr Nowak", "Julien Lefèvre", "Javier Ortega", "Thijs Bakker", "Anna Schulz", "Matteo Conti",
  "Priya Nair", "Lena Hoffmann", "Femke Jansen", "Francesca Moretti", "Eoin Gallagher", "Rui Carvalho", "Mads Christensen",
]);

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/&/g, "and").replace(/[^a-z0-9]+/g, "").slice(0, 22);
const phoneFor = (c: Country) => DIAL[c] + " " + int(200, 799) + " " + int(100, 999) + " " + int(1000, 9999);

function addCustomer(o: {
  name: string; city: string; country: Country; type: CustomerType; contact: string; role: string;
  domain?: string; email?: string; since: number; returning?: boolean; note?: string;
}): Customer {
  const id = "CU-" + String(++nCust).padStart(4, "0");
  const cid = "CT-" + String(++nContact).padStart(4, "0");
  const first = o.contact.split(" ")[0];
  const email = o.email || (slug(first) + "@" + (o.domain || slug(o.name) + "." + TLD[o.country]));
  contacts.push({ id: cid, name: o.contact, role: o.role, email, phone: phoneFor(o.country), customerId: id });
  const cust: Customer = { id, name: o.name, city: o.city, country: o.country, type: o.type,
    currency: o.country === "GB" ? "GBP" : "EUR", contactId: cid, since: new Date(o.since).toISOString(),
    returning: !!o.returning, note: o.note };
  customers.push(cust);
  usedNames.add(o.name);
  return cust;
}

function genCustomer(country: Country, type: CustomerType, since: number): Customer {
  const [city] = pick(CITIES[country]);
  let first = "", last = "", person = "";
  for (let tries = 0; tries < 20; tries++) {
    first = pick(FIRST[country] || FIRST.GB);
    last = pick(LAST[country] || LAST.GB);
    person = first + " " + last;
    if (!usedPeople.has(person)) break;
  }
  usedPeople.add(person);
  let name = "";
  for (let tries = 0; tries < 12; tries++) {
    if (type === "Individual buyer") name = person;
    else if (type === "Wholesale distributor" || type === "Reseller") {
      const region = pick([COUNTRY_NAME[country], city, city + " " + COUNTRY_NAME[country]]);
      name = pick(TRADE_PATTERNS).replace("{n}", region);
    } else name = pick(GYM_PATTERNS[country] || GYM_PATTERNS.default).replace("{c}", city);
    if (!usedNames.has(name)) break;
    name = "";
  }
  if (!name) name = city + " Strength " + int(2, 9);
  const role = type === "Individual buyer" ? "Home gym"
    : type === "Wholesale distributor" || type === "Reseller" ? pick(["Purchasing", "Buyer", "Commercial director"])
    : pick(["Owner", "Owner", "Manager", "Head coach", "Founder", "Operations manager"]);
  const email = type === "Individual buyer"
    ? slug(first) + "." + slug(last) + "@" + pick(["gmail.com", "outlook.com", "icloud.com"])
    : undefined;
  return addCustomer({ name, city, country, type, contact: person, role, email, since });
}

/* ── carriers ─────────────────────────────────────────────────────────────── */

export const SUPPLIERS: Supplier[] = [
  { id: "SU-GREY", name: "Greyhound Express", kind: "Carrier", region: "European shipments",
    lanes: "County Derry to mainland Europe", email: "quotes@greyhound-express.example",
    workflow: "Rate requests by email", confirmed: false,
    note: "Named by Niall on the 17 Nov call as the European carrier. Company record not yet confirmed." },
  { id: "SU-HARB", name: "Harbour Freight", kind: "Carrier", region: "UK and Ireland shipments",
    lanes: "County Derry to Great Britain and Ireland", email: "quotes@harbourfreight.example",
    workflow: "Rate requests by email", confirmed: false,
    note: "Named on the call as 'Harbour Freight Manchester'. A Harbour Freight trades from Trafford Park, Manchester; relationship to confirm." },
  { id: "SU-MMUS", name: "Mega Mass (US)", kind: "Manufacturer", region: "Brand owner",
    lanes: "Container intake to County Derry", email: "orders@megamass.example",
    workflow: "Purchase orders and arrival notices", confirmed: false,
    note: "Mega Mass Europe is the official UK and EU distributor of the Mega Mass brand." },
];
const carrierFor = (c: Country) => (c === "GB" || c === "IE" ? "SU-HARB" : "SU-GREY");
const carrierName = (id: string) => SUPPLIERS.find((s) => s.id === id)!.name;

/* Carrier pricing model for the generic records (stories use their own figures). */
function carrierCost(c: Country, units: number): number {
  const zone: [number, number] =
    c === "GB" ? [220, 130] : c === "IE" ? [200, 120] : c === "NL" || c === "BE" ? [280, 160]
    : c === "FR" ? [320, 170] : c === "DE" || c === "AT" || c === "DK" || c === "CZ" || c === "PL" ? [340, 180]
    : c === "SK" || c === "SE" ? [420, 280] : [360, 190];
  return Math.round((zone[0] + zone[1] * units) / 5) * 5;
}

/* ── helpers for building the commercial chain ────────────────────────────── */

const priceOf = (productId: string, cur: Currency) => cur === "GBP" ? PRODUCT_BY_ID[productId].gbp : PRODUCT_BY_ID[productId].eur;
const qLines = (lines: Line[], cur: Currency): QuoteLine[] =>
  lines.map((l) => ({ productId: l.productId, qty: l.qty, unitPrice: priceOf(l.productId, cur), listPrice: priceOf(l.productId, cur) }));
const units = (lines: Line[]) => lines.reduce((s, l) => s + l.qty, 0);
const lineValue = (lines: Line[], cur: Currency) => lines.reduce((s, l) => s + priceOf(l.productId, cur) * l.qty, 0);
const lineText = (lines: Line[]) => lines.map((l) => (l.qty > 1 ? l.qty + " × " : "") + PRODUCT_BY_ID[l.productId].name).join(", ");

function mail(e: Omit<Email, "id">): Email {
  const m = { id: "EM-" + String(++nMail).padStart(5, "0"), ...e };
  emails.push(m);
  return m;
}
function act(e: Omit<ActivityEvent, "id">) {
  if (e.at < ago(6)) return; // the log keeps the recent week
  activity.push({ id: "AC-" + String(++nAct).padStart(5, "0"), ...e });
}
function run(e: Omit<AgentRun, "id">) {
  if (e.at < ago(7)) return;
  runs.push({ id: "RN-" + String(++nRun).padStart(5, "0"), ...e });
}
const custOf = (id: string) => customers.find((c) => c.id === id)!;
const contactOf = (c: Customer) => contacts.find((x) => x.id === c.contactId)!;
const countryLabel = (c: Customer) => COUNTRY_NAME[c.country];

let nEnq = 4380, nQuote = 2200, nFreight = 1170, nOrder = 2010;
const STORY_ENQ = new Set(["ENQ-4518", "ENQ-4497", "ENQ-4526", "ENQ-4531", "ENQ-4562"]);
const STORY_Q = new Set(["Q-2286", "Q-2271", "Q-2290", "Q-2293"]);
const STORY_FR = new Set(["FR-1206", "FR-1199", "FR-1211", "FR-1214"]);
const nextEnq = () => { do nEnq++; while (STORY_ENQ.has("ENQ-" + nEnq)); return "ENQ-" + nEnq; };
const nextQuote = () => { do nQuote++; while (STORY_Q.has("Q-" + nQuote)); return "Q-" + nQuote; };
const nextFreight = () => { do nFreight++; while (STORY_FR.has("FR-" + nFreight)); return "FR-" + nFreight; };

/* What a customer typically asks for. The T-Bar Linear Row is the best seller. */
const DEMAND: [string, number][] = [
  [SKU.tbar, 30], [SKU.classic, 6], [SKU.chest, 7], [SKU.incline, 5], [SKU.pulldown, 5], [SKU.seated, 5],
  [SKU.shoulder, 4], [SKU.xpress, 3], [SKU.xrow, 3], [SKU.xpull, 3], [SKU.iso45, 5], [SKU.d45, 3],
  [SKU.vtype, 4], [SKU.xshoulder, 4], [SKU.pendulum, 4], [SKU.swing, 3], [SKU.truesq, 3], [SKU.shrug, 3],
];
function demandLines(type: CustomerType, opts?: { multi?: boolean; big?: boolean }): Line[] {
  const wholesale = type === "Wholesale distributor" || type === "Reseller";
  if (wholesale) {
    const a = weighted(DEMAND);
    const lines: Line[] = [{ productId: a, qty: int(3, 8) }];
    if (R() < 0.35) { const b = weighted(DEMAND); if (b !== a) lines.push({ productId: b, qty: int(2, 4) }); }
    return lines;
  }
  const multi = opts?.multi || opts?.big || (type !== "Individual buyer" && R() < 0.14);
  if (!multi) return [{ productId: weighted(DEMAND), qty: type === "Individual buyer" ? 1 : weighted([[1, 75], [2, 18], [3, 7]]) }];
  const n = opts?.big ? int(4, 6) : int(2, 4);
  const set = new Set<string>();
  while (set.size < n) set.add(weighted(DEMAND));
  return [...set].map((p) => ({ productId: p, qty: opts?.big && R() < 0.4 ? 2 : 1 }));
}

const FACILITY: Record<CustomerType, string> = {
  "Commercial gym": "Commercial Gym", "Independent gym": "Commercial Gym", "Performance facility": "Private Training Facility",
  "Individual buyer": "Home Gym", "Wholesale distributor": "Commercial Gym", "Reseller": "Commercial Gym",
};
const HEARD = ["Social Media", "Online search", "Google search ad", "Existing client", "Friends or family", "Business partner", "Social media ad"];

function messageFor(c: Customer, lines: Line[], withPostcode: boolean, postcode: string | null): string {
  const p0 = PRODUCT_BY_ID[lines[0].productId].name;
  const where = c.city + (withPostcode && postcode ? " (" + postcode + ")" : "");
  if (c.type === "Wholesale distributor" || c.type === "Reseller")
    return "We supply commercial gym equipment in " + COUNTRY_NAME[c.country] + " and would like to talk about stocking Mega Mass. "
      + "A first order would be " + lineText(lines) + ". Please send trade pricing and lead times, delivered to " + where + ".";
  if (c.type === "Individual buyer")
    return "Hi, is the " + p0 + " suitable for a garage gym? Could you send the price delivered to " + where + "? Thanks.";
  if (lines.length > 1)
    return "We're kitting out a new strength floor and would like a quote for: " + lineText(lines) + ". Delivery to " + where + ". What are lead times at the moment?";
  if (lines[0].qty > 1)
    return "Looking for a quote on " + lines[0].qty + " × " + p0 + " for our gym in " + where + ". Can you include delivery?";
  return pick([
    "Hi, could you send me a price for the " + p0 + " delivered to " + where + "? We're adding to our strength area.",
    "Hello, I'm interested in the " + p0 + ". What's the price and delivery time to " + where + "?",
    "Saw the " + p0 + " on Instagram. Price including delivery to " + where + " please.",
  ]);
}

function qualify(c: Customer, lines: Line[], missing: string[]): Qualification {
  const value = lineValue(lines, c.currency);
  if (c.type === "Wholesale distributor" || c.type === "Reseller") return "Wholesale / distributor";
  if (c.returning) return "Returning customer";
  if (value >= 10000) return "High-value project";
  if (missing.length) return "Incomplete enquiry";
  if (c.type === "Individual buyer") return "Retail";
  return "Commercial gym";
}
function priorityOf(q: Qualification, value: number): Priority {
  if (q === "Wholesale / distributor" || q === "High-value project" || value >= 10000) return "High";
  if (q === "Retail" || q === "Incomplete enquiry") return value >= 5000 ? "Medium" : "Low";
  return "Medium";
}

function draftReplyFor(c: Customer, lines: Line[], missing: string[]): string {
  const first = contactOf(c).name.split(" ")[0];
  const what = lineText(lines);
  if (missing.length) {
    const ask = missing.map((m) => m.toLowerCase()).join(" and ");
    return "Hi " + first + ",\n\nThanks for getting in touch about the " + what + ". To price delivery properly, could you send your " + ask
      + "? As soon as I have it I'll come back with a full quote including freight.\n\nKind regards,\nNiall\nMega Mass Europe";
  }
  if (c.type === "Wholesale distributor" || c.type === "Reseller")
    return "Hi " + first + ",\n\nThanks for your interest in distributing Mega Mass. I've attached our trade price list (" + c.currency
      + ", confidential) and I'm requesting a freight rate for " + what + " to " + c.city + " now. I'll have a full quote with you shortly.\n\nKind regards,\nNiall\nMega Mass Europe";
  return "Hi " + first + ",\n\nThanks for your enquiry about the " + what + ". I've attached our current price list (" + c.currency
    + ") and I'm getting a freight rate to " + c.city + " so I can send you a full delivered quote.\n\nKind regards,\nNiall\nMega Mass Europe";
}

function postcodeFor(c: Customer): string {
  const pfx = (CITIES[c.country].find((x) => x[0] === c.city) || ["", ""])[1];
  if (c.country === "GB") return pfx + int(1, 20) + " " + int(1, 9) + pick(["AB", "DX", "HL", "QT", "RW", "NP"]);
  if (c.country === "IE") return pfx + (pfx === "D" ? String(int(1, 24)).padStart(2, "0") : "") + " " + pick(["X2K4", "F8R1", "Y6P3", "K2W8"]);
  if (c.country === "NL") return pfx + int(10, 99) + " " + pick(["AB", "KL", "RT", "VD"]);
  return pfx + String(int(100, 999)).padStart(3, "0");
}

/* ── generic enquiry chains, one per bucket ───────────────────────────────── */

type Chain = { e: Enquiry; c: Customer; q?: Quote; f?: FreightRequest };

function newEnquiry(c: Customer, recv: number, opts: {
  lines?: Line[]; missing?: string[]; replied?: boolean; awaiting?: boolean; stage: Enquiry["stage"]; source?: EnquirySource; id?: string;
}): Enquiry {
  const lines = opts.lines || demandLines(c.type);
  const missing = opts.missing ?? [];
  const postcode = missing.includes("Delivery postcode") ? null : postcodeFor(c);
  const q = qualify(c, lines, missing);
  const value = lineValue(lines, c.currency);
  const source = opts.source || weighted<EnquirySource>([["Website quote form", 70], ["Email", 14], ["Instagram", 9], ["Phone", 4], ["Referral", 3]]);
  const e: Enquiry = {
    id: opts.id || nextEnq(), customerId: c.id, contactId: c.contactId, source,
    heardVia: c.returning ? "Existing client" : pick(HEARD), facility: FACILITY[c.type],
    receivedAt: recv, lastContactAt: recv, stage: opts.stage, replied: !!opts.replied, awaitingCustomer: !!opts.awaiting,
    priority: priorityOf(q, value), owner: "Niall", lines, qualification: q, missing, aiAction: "",
    message: messageFor(c, lines, !missing.includes("Delivery postcode"), postcode), postcode,
    draftReply: draftReplyFor(c, lines, missing),
  };
  enquiries.push(e);
  const ct = contactOf(c);
  mail({ recordKind: "enquiry", recordId: e.id, customerId: c.id, direction: "in",
    from: source === "Website quote form" ? "megamasseurope.com quote form" : ct.name + " <" + ct.email + ">",
    to: "sales@megamasseurope.com", at: recv,
    subject: source === "Website quote form" ? "New quote request: " + lineText(lines) : "Quote request: " + PRODUCT_BY_ID[lines[0].productId].name,
    body: e.message });
  act({ at: recv, actor: source === "Website quote form" ? "Website" : "Gmail", actorKind: "system",
    source: source === "Website quote form" ? "Website" : "Gmail",
    title: "Enquiry received from " + COUNTRY_NAME[c.country], detail: c.name + " asked about " + lineText(lines) + ".",
    recordKind: "enquiry", recordId: e.id, customerId: c.id });
  act({ at: recv + 90_000, actor: "Enquiry Agent", actorKind: "agent", source: "Agent",
    title: "Enquiry Agent extracted the requirements", detail: lineText(lines) + " · " + q + (missing.length ? " · missing " + missing.join(", ").toLowerCase() : ""),
    recordKind: "enquiry", recordId: e.id, customerId: c.id });
  run({ agentId: "enquiry", at: recv + 90_000, title: "Read " + e.id + " from " + c.name, outcome: q + (missing.length ? ", missing " + missing.join(", ").toLowerCase() : ", complete"),
    status: "Completed", recordKind: "enquiry", recordId: e.id, durationSec: int(4, 11) });
  return e;
}

function startQuote(ch: Chain, status: QuoteStatus, created: number, id?: string): Quote {
  const q: Quote = {
    id: id || nextQuote(), enquiryId: ch.e.id, customerId: ch.c.id, currency: ch.c.currency,
    lines: qLines(ch.e.lines, ch.c.currency), status, createdAt: created, updatedAt: created, validDays: 14,
    preparedBy: "Quote Agent", notes: [],
  };
  ch.e.quoteId = q.id;
  quotes.push(q);
  ch.q = q;
  return q;
}

function startFreight(ch: Chain, status: FreightRequest["status"], requested: number | null, markup = 15, id?: string): FreightRequest {
  const f: FreightRequest = {
    id: id || nextFreight(), quoteId: ch.q?.id, enquiryId: ch.e.id, customerId: ch.c.id, carrierId: carrierFor(ch.c.country),
    collection: "County Derry warehouse", destination: ch.c.city + ", " + COUNTRY_NAME[ch.c.country] + (ch.e.postcode ? " " + ch.e.postcode : ""),
    lines: ch.e.lines, requestedAt: requested, status, markupPct: markup, missing: [], service: "Palletised, kerbside delivery", chases: 0,
  };
  const noDims = ch.e.lines.filter((l) => PRODUCT_BY_ID[l.productId].dims === null).map((l) => PRODUCT_BY_ID[l.productId].name);
  if (noDims.length) f.missing.push("Dimensions for " + noDims.join(", ") + " (catalogue says TBC)");
  if (ch.q) ch.q.freightId = f.id;
  freight.push(f);
  ch.f = f;
  return f;
}

function receiveRate(f: FreightRequest, at: number, cost?: number, ref?: string) {
  const c = custOf(f.customerId);
  const cur = c.currency;
  const amount = cost ?? carrierCost(c.country, units(f.lines));
  f.carrierQuote = {
    cost: amount, currency: cur, ref: ref || (f.carrierId === "SU-HARB" ? "HF-" : "GX-") + int(40000, 89999), receivedAt: at,
    eta: f.carrierId === "SU-HARB" ? pick(["2 to 3 working days", "Next working day, pallet service"]) : pick(["5 to 7 working days", "4 to 6 working days", "6 to 8 working days"]),
    validUntil: new Date(at + 14 * DAY).toISOString(),
    exclusions: pick(["Tail-lift not included", "Kerbside only, no unloading", "Excludes duties and customs clearance", "Tail-lift not included; no unloading"]),
  };
  if (f.status === "Awaiting rate" || f.status === "To request") f.status = "Rate received";
  mail({ recordKind: "freight", recordId: f.id, customerId: c.id, supplierId: f.carrierId, direction: "in",
    from: carrierName(f.carrierId) + " <" + SUPPLIERS.find((s) => s.id === f.carrierId)!.email + ">", to: "sales@megamasseurope.com", at,
    subject: "RE: Freight quotation request, equipment to " + c.city,
    body: "Hi Niall,\n\nThanks for the request. Rate for " + units(f.lines) + " machine" + (units(f.lines) > 1 ? "s" : "") + " from County Derry to " + c.city + ": "
      + (cur === "GBP" ? "£" : "€") + amount.toLocaleString("en-GB") + " ex VAT. Ref " + f.carrierQuote.ref + ". Transit " + f.carrierQuote.eta.toLowerCase()
      + ". " + f.carrierQuote.exclusions + ". Valid 14 days.\n\nRegards,\n" + carrierName(f.carrierId) + " quotes desk" });
  act({ at, actor: carrierName(f.carrierId), actorKind: "system", source: "Carrier", title: "Carrier quotation recorded",
    detail: carrierName(f.carrierId) + " quoted " + (cur === "GBP" ? "£" : "€") + amount.toLocaleString("en-GB") + " for " + f.id + " to " + c.city + ".",
    recordKind: "freight", recordId: f.id, customerId: c.id });
  act({ at: at + 120_000, actor: "Freight Agent", actorKind: "agent", source: "Agent", title: "Freight Agent applied the markup",
    detail: f.markupPct + "% on " + (cur === "GBP" ? "£" : "€") + amount.toLocaleString("en-GB") + " for " + c.name + ".",
    recordKind: "freight", recordId: f.id, customerId: c.id });
  run({ agentId: "freight", at: at + 120_000, title: "Read " + carrierName(f.carrierId) + " reply for " + f.id,
    outcome: "Rate " + (cur === "GBP" ? "£" : "€") + amount.toLocaleString("en-GB") + ", markup " + f.markupPct + "% applied", status: "Completed",
    recordKind: "freight", recordId: f.id, durationSec: int(5, 14) });
}

function requestSent(f: FreightRequest, at: number) {
  const c = custOf(f.customerId);
  f.requestedAt = at;
  mail({ recordKind: "freight", recordId: f.id, customerId: c.id, supplierId: f.carrierId, direction: "out", from: "Niall <sales@megamasseurope.com>",
    to: carrierName(f.carrierId), at, subject: "Freight quotation request, equipment to " + c.city,
    body: freightBody(f) });
  act({ at: at - 600_000, actor: "Freight Agent", actorKind: "agent", source: "Agent", title: "Freight Agent prepared a shipping request",
    detail: units(f.lines) + " machine" + (units(f.lines) > 1 ? "s" : "") + " to " + c.city + " via " + carrierName(f.carrierId) + ".",
    recordKind: "freight", recordId: f.id, customerId: c.id });
  act({ at, actor: "Niall", actorKind: "person", source: "Gmail", title: "Niall approved the carrier request",
    detail: f.id + " emailed to " + carrierName(f.carrierId) + ".", recordKind: "freight", recordId: f.id, customerId: c.id });
  run({ agentId: "freight", at: at - 600_000, title: "Drafted rate request " + f.id, outcome: "Sent after Niall's approval", status: "Completed",
    recordKind: "freight", recordId: f.id, durationSec: int(6, 16) });
}

export function freightBody(f: FreightRequest): string {
  const rows = f.lines.map((l) => {
    const p = PRODUCT_BY_ID[l.productId];
    return "• " + l.qty + " × " + p.name + (p.weightKg ? " (approx. " + p.weightKg + " kg" + (p.dims ? ", " + p.dims : "") + ")" : " (weight and dimensions to confirm)");
  }).join("\n");
  return "Hi,\n\nCould you quote for the following, please?\n\nCollection: County Derry warehouse, Northern Ireland\nDelivery: " + f.destination
    + "\nService: " + f.service + "\n\n" + rows + "\n\n" + (f.missing.length ? "Still to confirm: " + f.missing.join("; ") + ".\n\n" : "")
    + "Please include transit time, validity and any exclusions.\n\nThanks,\nNiall\nMega Mass Europe";
}

/* Replace an enquiry's message, keeping the inbound email in step. */
function setMessage(e: Enquiry, text: string) {
  e.message = text;
  const m = emails.find((x) => x.recordId === e.id && x.direction === "in");
  if (m) m.body = text;
}

/* ═════════════════════════════════ STORIES ════════════════════════════════ */

const S = {
  milano: addCustomer({ name: "Milano Performance Studio", city: "Milan", country: "IT", type: "Commercial gym", contact: "Marco Bianchi",
    role: "Owner", domain: "milanoperformance.it", since: ago(0, 1) }),
  danube: addCustomer({ name: "Danube Strength", city: "Bratislava", country: "SK", type: "Commercial gym", contact: "Tomáš Horváth",
    role: "Owner", domain: "danubestrength.sk", since: ago(9, 3) }),
  rotterdam: addCustomer({ name: "Rotterdam Iron Supply", city: "Rotterdam", country: "NL", type: "Wholesale distributor", contact: "Daan Visser",
    role: "Purchasing manager", domain: "rotterdamironsupply.nl", since: ago(12, 2) }),
  lyon: addCustomer({ name: "Lyon Performance Club", city: "Lyon", country: "FR", type: "Performance facility", contact: "Camille Laurent",
    role: "Club manager", domain: "lyonperformance.fr", since: ago(6, 4) }),
  rheinland: addCustomer({ name: "Rheinland Performance", city: "Cologne", country: "DE", type: "Performance facility", contact: "Jonas Becker",
    role: "Managing director", domain: "rheinland-performance.de", since: ago(58) }),
  npg: addCustomer({ name: "Northern Power Gym", city: "Manchester", country: "GB", type: "Independent gym", contact: "Danny Whitaker",
    role: "Owner", domain: "northernpowergym.co.uk", since: ago(4, 5) }),
};

/* Story A: Danube Strength. One machine became six. Awaiting Niall's approval. */
{
  const c = S.danube;
  const e = newEnquiry(c, ago(9, 3), { id: "ENQ-4518", stage: "Quote Ready", replied: true, source: "Website quote form",
    lines: [{ productId: SKU.tbar, qty: 1 }] });
  e.initialLines = [{ productId: SKU.tbar, qty: 1 }];
  e.lines = [SKU.tbar, SKU.chest, SKU.incline, SKU.xshoulder, SKU.seated, SKU.swing].map((p) => ({ productId: p, qty: 1 }));
  setMessage(e, "Hello, we are interested in the T-Bar Linear Row for our gym in Bratislava. Price with delivery please.");
  e.postcode = "821 08";
  e.heardVia = "Social Media";
  e.qualification = "High-value project";
  e.priority = "High";
  e.lastContactAt = ago(1, 2);
  const ch: Chain = { e, c };
  const q = startQuote(ch, "Ready for Review", ago(1, 1), "Q-2286");
  q.notes = ["Leverage Chest Press, Leverage Incline Pro and Leverage Seated Row come from the Flex Series intake, arrival late November, not yet confirmed. Delivery date to be confirmed on receipt.",
    "Customer confirmed ground-floor delivery with forklift on site."];
  const f = startFreight(ch, "Awaiting rate", null, 15, "FR-1206");
  f.destination = "Bratislava 821 08, Slovakia";
  f.service = "Palletised, forklift unload on site";
  requestSent(f, ago(6, 5));
  receiveRate(f, ago(1, 2), 2100, "GX-58213");
  f.carrierQuote!.eta = "5 to 7 working days";
  f.carrierQuote!.exclusions = "Tail-lift not included; customer forklift on site";
  const ct = contactOf(c);
  mail({ recordKind: "enquiry", recordId: e.id, customerId: c.id, direction: "out", from: "Niall <sales@megamasseurope.com>", to: ct.email, at: ago(8, 6),
    subject: "RE: New quote request: T-Bar Linear Row",
    body: "Hi Tomáš,\n\nThanks for your enquiry. Price list attached (EUR). Could you send the delivery address so I can get a freight rate to Bratislava?\n\nKind regards,\nNiall" });
  mail({ recordKind: "enquiry", recordId: e.id, customerId: c.id, direction: "in", from: ct.name + " <" + ct.email + ">", to: "sales@megamasseurope.com", at: ago(7, 2),
    subject: "RE: New quote request: T-Bar Linear Row",
    body: "Hello Niall,\n\nThank you. We are fitting out our new floor and would like the full list quoted, one of each:\nT-Bar Linear Row\nLeverage Chest Press\nLeverage Incline Pro\nX Shoulder Press\nLeverage Seated Row\nSwing Squat Pro\n\nDelivery to Bratislava 821 08 (Ružinov). Ground floor, we have a forklift.\n\nBest regards,\nTomáš Horváth\nDanube Strength" });
  act({ at: ago(7, 2), actor: "Gmail", actorKind: "system", source: "Gmail", title: "Danube Strength expanded the request",
    detail: "From one T-Bar Linear Row to six machines.", recordKind: "enquiry", recordId: e.id, customerId: c.id });
  act({ at: ago(7, 1.8), actor: "Enquiry Agent", actorKind: "agent", source: "Agent", title: "Enquiry Agent updated the requirements",
    detail: "Six machines, delivery 821 08 Bratislava, forklift on site.", recordKind: "enquiry", recordId: e.id, customerId: c.id });
  act({ at: ago(1, 1), actor: "Quote Agent", actorKind: "agent", source: "Agent", title: "Quote Agent prepared the quotation",
    detail: "Q-2286 · €19,500 equipment + €2,415 freight = €21,915 ex VAT.", recordKind: "quote", recordId: q.id, customerId: c.id });
  run({ agentId: "quote", at: ago(1, 1), title: "Assembled Q-2286 for Danube Strength", outcome: "€21,915 ex VAT, waiting for Niall", status: "Waiting on Niall",
    recordKind: "quote", recordId: q.id, durationSec: 19 });
  mail({ recordKind: "quote", recordId: q.id, customerId: c.id, direction: "draft", from: "Niall <sales@megamasseurope.com>", to: ct.email, at: ago(1, 1),
    subject: "Your Mega Mass quotation Q-2286",
    body: "Hi Tomáš,\n\nPlease find your quotation for the six machines attached: €19,500 equipment plus €2,415 delivery to Bratislava, €21,915 excluding VAT.\n\nThree of the Leverage machines come from our Flex Series intake, due late November. I'll confirm the delivery date as soon as it lands.\n\nKind regards,\nNiall\nMega Mass Europe" });
}

/* Story B: Rotterdam Iron Supply. Wholesale, ten machines, quote sent. */
{
  const c = S.rotterdam;
  const e = newEnquiry(c, ago(12, 2), { id: "ENQ-4497", stage: "Quote Sent", replied: true, source: "Email",
    lines: [{ productId: SKU.tbar, qty: 10 }] });
  setMessage(e, "We distribute commercial equipment across the Netherlands and Belgium and are interested in 10 × T-Bar Linear Row as an initial order. Can you quote delivered to our warehouse in Rotterdam (3089)? We'd expect to reorder quarterly if it sells.");
  e.postcode = "3089 KL";
  e.lastContactAt = ago(2, 4);
  const ch: Chain = { e, c };
  const q = startQuote(ch, "Sent", ago(5, 3), "Q-2271");
  q.sentAt = ago(5, 3);
  q.overrideRequested = "Daan Visser asked if there is flexibility on unit price at this volume. No discount has been applied.";
  q.notes = ["Ten units available from warehouse stock (14 available)."];
  const f = startFreight(ch, "Awaiting rate", null, 10, "FR-1199");
  f.destination = "Rotterdam 3089 KL, Netherlands";
  requestSent(f, ago(9, 4));
  receiveRate(f, ago(7, 1), 1850, "GX-57744");
  const ct = contactOf(c);
  mail({ recordKind: "quote", recordId: q.id, customerId: c.id, direction: "out", from: "Niall <sales@megamasseurope.com>", to: ct.email, at: ago(5, 3),
    subject: "Your Mega Mass quotation Q-2271",
    body: "Hi Daan,\n\nAttached is your quotation for 10 × T-Bar Linear Row: €28,500 equipment plus €2,035 delivery to Rotterdam, €30,535 excluding VAT.\n\nKind regards,\nNiall" });
  mail({ recordKind: "quote", recordId: q.id, customerId: c.id, direction: "in", from: ct.name + " <" + ct.email + ">", to: "sales@megamasseurope.com", at: ago(2, 4),
    subject: "RE: Your Mega Mass quotation Q-2271",
    body: "Thanks Niall. Is there any flexibility on the unit price at this volume? We'd likely reorder every quarter.\n\nDaan" });
  act({ at: ago(5, 3), actor: "Niall", actorKind: "person", source: "Gmail", title: "Niall approved the customer quotation",
    detail: "Q-2271 sent to Rotterdam Iron Supply, €30,535 ex VAT.", recordKind: "quote", recordId: q.id, customerId: c.id });
  act({ at: ago(2, 3.8), actor: "Quote Agent", actorKind: "agent", source: "Agent", title: "Quote Agent flagged a pricing question",
    detail: "Rotterdam Iron Supply asked about volume pricing. Prepared for review; no discount applied.", recordKind: "quote", recordId: q.id, customerId: c.id });
}

/* Story C: Lyon Performance Club. Freight is blocking the quote. */
{
  const c = S.lyon;
  const e = newEnquiry(c, ago(6, 4), { id: "ENQ-4526", stage: "Freight Requested", replied: true, source: "Website quote form",
    lines: [{ productId: SKU.tbar, qty: 1 }] });
  setMessage(e, "Bonjour, we would like a price for one T-Bar Linear Row delivered to our club in Lyon 69007. Thank you.");
  e.postcode = "69007";
  e.lastContactAt = ago(5, 2);
  const ch: Chain = { e, c };
  startQuote(ch, "Awaiting Freight", ago(4, 6), "Q-2290");
  const f = startFreight(ch, "Awaiting rate", null, 15, "FR-1211");
  f.destination = "Lyon 69007, France";
  requestSent(f, ago(4, 6));
  f.chases = 0;
}

/* Story F: Northern Power Gym. GBP quote, ready for approval. */
{
  const c = S.npg;
  const e = newEnquiry(c, ago(4, 5), { id: "ENQ-4531", stage: "Quote Ready", replied: true, source: "Website quote form",
    lines: [{ productId: SKU.xshoulder, qty: 1 }] });
  setMessage(e, "Hi, after a price on the X Shoulder Press delivered to Manchester M4 6BF. We're a small independent gym, ground floor unit with roller door.");
  e.postcode = "M4 6BF";
  e.lastContactAt = ago(0, 3);
  const ch: Chain = { e, c };
  const q = startQuote(ch, "Ready for Review", ago(0, 2), "Q-2293");
  q.notes = ["X Shoulder Press available from warehouse stock."];
  const f = startFreight(ch, "Awaiting rate", null, 20, "FR-1214");
  f.destination = "Manchester M4 6BF, United Kingdom";
  f.service = "Next-day pallet, tail-lift";
  requestSent(f, ago(3, 5));
  receiveRate(f, ago(0, 3), 350, "HF-71520");
  f.carrierQuote!.eta = "Next working day, pallet service";
  f.carrierQuote!.exclusions = "Tail-lift included; kerbside only";
  run({ agentId: "quote", at: ago(0, 2), title: "Assembled Q-2293 for Northern Power Gym", outcome: "£3,515 ex VAT, waiting for Niall", status: "Waiting on Niall",
    recordKind: "quote", recordId: q.id, durationSec: 12 });
  act({ at: ago(0, 2), actor: "Quote Agent", actorKind: "agent", source: "Agent", title: "Quote Agent prepared the quotation",
    detail: "Q-2293 · £3,095 equipment + £420 freight = £3,515 ex VAT.", recordKind: "quote", recordId: q.id, customerId: c.id });
}

/* The showcase new enquiry: Milano Performance Studio, missing a postcode. */
{
  const c = S.milano;
  const e = newEnquiry(c, ago(0, 0.7), { id: "ENQ-4562", stage: "New", source: "Website quote form",
    lines: [{ productId: SKU.tbar, qty: 1 }], missing: ["Delivery postcode"] });
  setMessage(e, "Hi, we're adding a new strength zone at Milano Performance Studio and want the T-Bar Linear Row. Can you send me the price including delivery to Milan? Thanks, Marco");
  e.heardVia = "Social Media";
  e.qualification = "Commercial gym";
  e.priority = "Medium";
  e.draftReply = "Ciao Marco,\n\nThanks for your enquiry about the T-Bar Linear Row for Milano Performance Studio. To quote delivery to Milan accurately, could you send me the delivery address with postcode?\n\nAs soon as I have it I'll come back with a full quote including freight.\n\nKind regards,\nNiall\nMega Mass Europe";
}

/* ═══════════════════════════ GENERIC PIPELINE ═════════════════════════════ */

const COUNTRY_MIX: [Country, number][] = [
  ["GB", 20], ["IT", 21], ["NL", 19], ["IE", 8], ["DE", 8], ["FR", 6], ["ES", 6], ["BE", 3], ["PL", 2],
  ["AT", 2], ["SK", 1.5], ["PT", 1], ["DK", 1], ["CZ", 1], ["SE", 1],
];
const TYPE_MIX: [CustomerType, number][] = [
  ["Commercial gym", 35], ["Independent gym", 30], ["Performance facility", 12], ["Individual buyer", 12],
  ["Wholesale distributor", 6], ["Reseller", 5],
];
function freshChain(recvDays: number, stage: Enquiry["stage"], opts?: { multi?: boolean; big?: boolean; type?: CustomerType; country?: Country }): Chain {
  const country = opts?.country || weighted(COUNTRY_MIX);
  const type = opts?.type || weighted(TYPE_MIX);
  const recv = ago(recvDays);
  const c = genCustomer(country, type, recv);
  const lines = demandLines(type, opts);
  const e = newEnquiry(c, recv, { stage, lines, replied: stage !== "New" });
  return { e, c };
}

/* 47 unanswered. Milano is one; the four oldest are past 48 hours. */
const unanswered: Chain[] = [{ e: enquiries.find((x) => x.id === "ENQ-4562")!, c: S.milano }];
for (const d of [2.3, 2.7, 3.1, 3.6]) unanswered.push(freshChain(d, "New"));
for (let i = 0; i < 40; i++) unanswered.push(freshChain(between(0.05, 1.9), "New"));
for (const ch of unanswered.slice(1)) {
  if (R() < 0.38) ch.e.missing.push(weighted([["Delivery postcode", 6], ["Quantity", 2], ["Delivery country", 1]]));
  if (ch.e.missing.includes("Delivery postcode")) ch.e.postcode = null;
  ch.e.qualification = qualify(ch.c, ch.e.lines, ch.e.missing);
  ch.e.priority = priorityOf(ch.e.qualification, lineValue(ch.e.lines, ch.c.currency));
  ch.e.draftReply = draftReplyFor(ch.c, ch.e.lines, ch.e.missing);
  ch.e.owner = "Niall";
}

/* 12 answered, waiting on the customer. */
const waiting: Chain[] = [];
for (let i = 0; i < 12; i++) {
  const ch = freshChain(between(4, 14), "New");
  ch.e.replied = true;
  ch.e.awaitingCustomer = true;
  ch.e.lastContactAt = ch.e.receivedAt + between(0.3, 0.8) * DAY;
  ch.e.missing = [pick(["Delivery postcode", "Delivery address", "Quantity"])];
  mail({ recordKind: "enquiry", recordId: ch.e.id, customerId: ch.c.id, direction: "out", from: "Niall <sales@megamasseurope.com>",
    to: contactOf(ch.c).email, at: ch.e.lastContactAt, subject: "RE: " + PRODUCT_BY_ID[ch.e.lines[0].productId].name, body: ch.e.draftReply });
  waiting.push(ch);
}

/* 6 qualified: carrier request drafted, waiting for Niall to approve it. */
const qualified: Chain[] = [];
for (let i = 0; i < 6; i++) {
  const ch = freshChain(between(1, 4), "Qualified");
  ch.e.lastContactAt = ch.e.receivedAt + between(0.2, 0.8) * DAY;
  startQuote(ch, "Draft", ch.e.lastContactAt);
  startFreight(ch, "To request", null, 15);
  qualified.push(ch);
}

/* 18 freight rates outstanding (Lyon plus 17). Five are past three days. */
const awaitingRate: Chain[] = [{ e: enquiries.find((x) => x.id === "ENQ-4526")!, c: S.lyon,
  q: quotes.find((x) => x.id === "Q-2290"), f: freight.find((x) => x.id === "FR-1211") }];
const requestAges = [3.4, 3.8, 4.4, 5.1, ...Array.from({ length: 13 }, () => between(0.3, 2.8))];
for (const age of requestAges) {
  const ch = freshChain(age + between(0.6, 3), "Freight Requested", { country: R() < 0.25 ? "FR" : undefined });
  startQuote(ch, "Awaiting Freight", ago(age));
  const f = startFreight(ch, "Awaiting rate", null, 15);
  requestSent(f, ago(age));
  if (age > 3) f.chases = age > 4.5 ? 1 : 0;
  awaitingRate.push(ch);
}

/* 25 quotes ready for approval (Danube, Northern Power and 23 more). */
const ready: Chain[] = [];
for (let i = 0; i < 23; i++) {
  const reqAge = between(1.2, 5);
  const ch = freshChain(reqAge + between(0.5, 3), "Quote Ready", { multi: R() < 0.3 });
  const f0 = startQuote(ch, "Ready for Review", ago(between(0.05, Math.min(1.1, reqAge - 0.2))));
  const f = startFreight(ch, "Awaiting rate", null, weighted([[15, 70], [12, 12], [18, 10], [20, 8]]));
  requestSent(f, ago(reqAge));
  receiveRate(f, f0.createdAt - between(0.5, 3) * HOUR);
  act({ at: f0.createdAt, actor: "Quote Agent", actorKind: "agent", source: "Agent", title: "Quote Agent prepared the quotation",
    detail: f0.id + " for " + ch.c.name + ".", recordKind: "quote", recordId: f0.id, customerId: ch.c.id });
  run({ agentId: "quote", at: f0.createdAt, title: "Assembled " + f0.id + " for " + ch.c.name, outcome: "Waiting for Niall", status: "Waiting on Niall",
    recordKind: "quote", recordId: f0.id, durationSec: int(8, 22) });
  ready.push(ch);
}

/* 21 quotes sent: Rotterdam, 7 recent, 10 needing a decision chase, 3 large ones going cold. */
const sentRecent: Chain[] = [], sentDecision: Chain[] = [], sentCold: Chain[] = [];
function sentChain(sentAge: number, big: boolean): Chain {
  const recvAge = sentAge + between(4, 7);
  const ch = freshChain(recvAge, "Quote Sent", big ? { big: true, type: pick<CustomerType>(["Commercial gym", "Performance facility", "Commercial gym"]) } : { multi: R() < 0.25 });
  const q = startQuote(ch, "Sent", ago(sentAge + 0.2));
  q.sentAt = ago(sentAge);
  const f = startFreight(ch, "Awaiting rate", null, 15);
  requestSent(f, ago(recvAge - between(0.4, 1)));
  receiveRate(f, ago(sentAge + between(0.3, 1.5)));
  ch.e.lastContactAt = q.sentAt;
  mail({ recordKind: "quote", recordId: q.id, customerId: ch.c.id, direction: "out", from: "Niall <sales@megamasseurope.com>", to: contactOf(ch.c).email,
    at: q.sentAt, subject: "Your Mega Mass quotation " + q.id, body: "Hi " + contactOf(ch.c).name.split(" ")[0] + ",\n\nYour quotation is attached.\n\nKind regards,\nNiall" });
  act({ at: q.sentAt, actor: "Niall", actorKind: "person", source: "Gmail", title: "Niall approved the customer quotation",
    detail: q.id + " sent to " + ch.c.name + ".", recordKind: "quote", recordId: q.id, customerId: ch.c.id });
  return ch;
}
for (let i = 0; i < 7; i++) sentRecent.push(sentChain(between(1, 6), false));
for (let i = 0; i < 10; i++) sentDecision.push(sentChain(between(7.2, 13), false));
for (let i = 0; i < 3; i++) sentCold.push(sentChain(between(14.5, 20), true));

/* 9 lost: 6 declined, 3 expired. */
const LOST_REASONS = ["Bought locally after freight came in high", "Budget moved to next year", "Went with a used machine",
  "No reply after quote", "Chose a cheaper selectorised line", "Delivery date too late for opening"];
for (let i = 0; i < 9; i++) {
  const declined = i < 6;
  const ch = freshChain(between(22, 55), "Lost");
  const q = startQuote(ch, declined ? "Declined" : "Expired", ch.e.receivedAt + 3 * DAY);
  q.sentAt = q.createdAt;
  q.decidedAt = q.createdAt + between(4, 15) * DAY;
  const f = startFreight(ch, "Rate received", ch.e.receivedAt + DAY, 15);
  receiveRate(f, ch.e.receivedAt + 2.5 * DAY);
  ch.e.lostReason = declined ? LOST_REASONS[i] : "Quote expired after 14 days";
}

/* ═══════════════════════════ ORDERS AND INVOICES ══════════════════════════ */

type OrderSpec = {
  cust: Customer; lines: Line[]; status: OrderStatus; accepted: number; freight: number; carrier?: number;
  invoice?: { id: string; issued: number; due: number; paid?: number }; reserve?: boolean; incoming?: Line[];
  dispatched?: number; delivered?: number; eta?: string;
};

function existing(name: string, city: string, country: Country, type: CustomerType, contact: string, role: string, since: number, returning = false): Customer {
  return addCustomer({ name, city, country, type, contact, role, since, returning });
}

let nInv = 0;
function placeOrder(o: OrderSpec) {
  const cur = o.cust.currency;
  const recv = o.accepted - between(5, 12) * DAY;
  const e = newEnquiry(o.cust, recv, { stage: "Won", lines: o.lines, replied: true });
  e.lastContactAt = o.accepted;
  const ch: Chain = { e, c: o.cust };
  const q = startQuote(ch, "Accepted", o.accepted - between(2, 5) * DAY);
  q.sentAt = q.createdAt;
  q.decidedAt = o.accepted;
  const carrier = o.carrier ?? Math.round(o.freight / 1.15);
  const f = startFreight(ch, "Rate received", q.createdAt - 2 * DAY, Math.round((o.freight / carrier - 1) * 1000) / 10);
  receiveRate(f, q.createdAt - 0.5 * DAY, carrier);
  f.status = o.status === "Delivered" ? "Delivered" : o.status === "Dispatched" ? "Dispatched" : "Rate received";
  f.charge = o.freight;
  const id = "SO-" + (++nOrder);
  const order: Order = { id, quoteId: q.id, customerId: o.cust.id, freightId: f.id, currency: cur, lines: qLines(o.lines, cur),
    freightCharge: o.freight, status: o.status, acceptedAt: o.accepted, dispatchedAt: o.dispatched, deliveredAt: o.delivered, eta: o.eta };
  f.orderId = id;
  if (o.invoice) {
    const inv: Invoice = { id: o.invoice.id, customerId: o.cust.id, orderId: id, currency: cur,
      amount: lineValue(o.lines, cur) + o.freight, issuedAt: o.invoice.issued, dueAt: o.invoice.due };
    invoices.push(inv);
    order.invoiceId = inv.id;
    nInv++;
    act({ at: o.invoice.issued, actor: "FreshBooks", actorKind: "system", source: "FreshBooks", title: "FreshBooks invoice created",
      detail: inv.id + " for " + (cur === "GBP" ? "£" : "€") + inv.amount.toLocaleString("en-GB") + " to " + o.cust.name + ".", recordKind: "invoice", recordId: inv.id, customerId: o.cust.id });
    if (o.invoice.paid) {
      payments.push({ id: "PY-" + String(++nPay).padStart(4, "0"), invoiceId: inv.id, amount: inv.amount, currency: cur, at: o.invoice.paid, method: "Bank transfer" });
      act({ at: o.invoice.paid, actor: "FreshBooks", actorKind: "system", source: "FreshBooks", title: "Payment recorded in FreshBooks",
        detail: inv.id + " paid in full by " + o.cust.name + ".", recordKind: "invoice", recordId: inv.id, customerId: o.cust.id });
    }
  }
  for (const l of o.reserve ? o.lines : []) {
    reservations.push({ id: "RS-" + String(++nRes).padStart(3, "0"), productId: l.productId, customerId: o.cust.id, orderId: id, units: l.qty,
      source: "Warehouse stock", allocatedAt: o.accepted + 0.2 * DAY, window: o.eta || "Ready to dispatch",
      status: o.status === "Equipment allocated" ? "Released to dispatch" : "Reserved" });
  }
  for (const l of o.incoming || []) {
    reservations.push({ id: "RS-" + String(++nRes).padStart(3, "0"), productId: l.productId, customerId: o.cust.id, orderId: id, units: l.qty,
      source: "Incoming", shipmentId: "SH-FLEX-NOV", allocatedAt: o.accepted + 0.3 * DAY, window: "Late November, unconfirmed", status: "Awaiting arrival" });
  }
  act({ at: o.accepted, actor: o.cust.name, actorKind: "system", source: "Gmail", title: "Quote accepted",
    detail: q.id + " accepted by " + o.cust.name + ". Order " + id + " created.", recordKind: "order", recordId: id, customerId: o.cust.id });
  orders.push(order);
  return order;
}

/* Recent orders (last month). Together they hold the reserved stock:
   T-Bar Linear Row 10, Classic T-Bar Row 2, X Shoulder Press 1, True Squat Pro 1,
   and 9 of the 15 incoming Flex Series units. */
const L = (p: string, qty = 1): Line => ({ productId: p, qty });
placeOrder({ cust: existing("Amsterdam Barbell Collective", "Amsterdam", "NL", "Independent gym", "Sanne de Jong", "Co-founder", ago(40)),
  lines: [L(SKU.tbar, 2), L(SKU.chest)], incoming: [L(SKU.chest)], status: "Equipment allocated", accepted: ago(13), freight: 740, eta: "T-Bars ready; chest press on Flex intake",
  invoice: { id: "FB-1058", issued: ago(12), due: ago(-2), paid: ago(6) }, reserve: false });
reservations.push({ id: "RS-" + String(++nRes).padStart(3, "0"), productId: SKU.tbar, customerId: customers[customers.length - 1].id, orderId: orders[orders.length - 1].id,
  units: 2, source: "Warehouse stock", allocatedAt: ago(6), window: "Ships with chest press on arrival", status: "Reserved" });
placeOrder({ cust: existing("Dublin Strength Collective", "Dublin", "IE", "Independent gym", "Ciarán Doyle", "Owner", ago(35)),
  lines: [L(SKU.tbar), L(SKU.incline), L(SKU.seated)], incoming: [L(SKU.incline), L(SKU.seated)], status: "Payment confirmed", accepted: ago(11), freight: 610,
  invoice: { id: "FB-1059", issued: ago(10), due: ago(-4), paid: ago(3) }, eta: "Ships complete after Flex intake" });
reservations.push({ id: "RS-" + String(++nRes).padStart(3, "0"), productId: SKU.tbar, customerId: customers[customers.length - 1].id, orderId: orders[orders.length - 1].id,
  units: 1, source: "Warehouse stock", allocatedAt: ago(3), window: "Ships with Flex units", status: "Reserved" });
placeOrder({ cust: existing("Leeds Iron House", "Leeds", "GB", "Independent gym", "Hannah Pryce", "Owner", ago(30)),
  lines: [L(SKU.classic)], status: "Dispatched", accepted: ago(9), freight: 395, dispatched: ago(1),
  invoice: { id: "FB-1060", issued: ago(9), due: ago(-5), paid: ago(4) }, eta: "Delivery tomorrow" });
placeOrder({ cust: existing("Palestra Forza Bologna", "Bologna", "IT", "Commercial gym", "Chiara Galli", "Manager", ago(28)),
  lines: [L(SKU.tbar, 2)], status: "Payment pending", accepted: ago(8), freight: 745, reserve: true,
  invoice: { id: "FB-1061", issued: ago(7), due: ago(-7) } });
placeOrder({ cust: existing("Glasgow Barbell Club", "Glasgow", "GB", "Independent gym", "Callum Fraser", "Founder", ago(22)),
  lines: [L(SKU.tbar)], status: "Invoice created", accepted: ago(2), freight: 410, reserve: true,
  invoice: { id: "FB-1063", issued: ago(1), due: ago(-13) } });
placeOrder({ cust: existing("Iberia Fitness Supply", "Málaga", "ES", "Wholesale distributor", "Diego Romero", "Commercial director", ago(45)),
  lines: [L(SKU.tbar, 4)], status: "Payment confirmed", accepted: ago(10), freight: 1290, reserve: true,
  invoice: { id: "FB-1062", issued: ago(9), due: ago(-5), paid: ago(2) }, eta: "Collection booking pending" });
placeOrder({ cust: existing("Stockholm Kraft Studio", "Stockholm", "SE", "Performance facility", "Erik Lindqvist", "Head coach", ago(26)),
  lines: [L(SKU.classic, 2)], status: "Payment pending", accepted: ago(5), freight: 1080, reserve: true,
  invoice: { id: "FB-1064", issued: ago(4), due: ago(-10) } });
placeOrder({ cust: existing("Birmingham Strength Co", "Birmingham", "GB", "Commercial gym", "Rebecca Holt", "Manager", ago(18)),
  lines: [L(SKU.xshoulder)], status: "Quote accepted", accepted: ago(0, 5), freight: 420, reserve: true });
placeOrder({ cust: existing("Wien Kraft Studio", "Vienna", "AT", "Independent gym", "Stefan Gruber", "Owner", ago(33)),
  lines: [L(SKU.truesq)], status: "Equipment allocated", accepted: ago(12), freight: 690, reserve: true, eta: "Ready, carrier not booked",
  invoice: { id: "FB-1057", issued: ago(12), due: ago(2), paid: ago(5) } });
placeOrder({ cust: existing("Alpen Gym Distribution", "Salzburg", "AT", "Wholesale distributor", "Katrin Huber", "Purchasing", ago(50)),
  lines: [L(SKU.chest, 2), L(SKU.incline, 2), L(SKU.seated, 2)], incoming: [L(SKU.chest, 2), L(SKU.incline, 2), L(SKU.seated, 2)],
  status: "Payment confirmed", accepted: ago(14), freight: 1480, invoice: { id: "FB-1056", issued: ago(14), due: ago(0), paid: ago(7) }, eta: "Ships on Flex arrival" });
placeOrder({ cust: existing("Paris Force Athlétique", "Paris", "FR", "Performance facility", "Hugo Moreau", "Director", ago(48)),
  lines: [L(SKU.swing)], status: "Delivered", accepted: ago(24), freight: 560, dispatched: ago(14), delivered: ago(9),
  invoice: { id: "FB-1052", issued: ago(23), due: ago(9), paid: ago(10) } });
placeOrder({ cust: existing("Valencia Strength Factory", "Valencia", "ES", "Commercial gym", "Pablo Herrera", "Manager", ago(52)),
  lines: [L(SKU.tbar)], status: "Delivered", accepted: ago(26), freight: 520, dispatched: ago(19), delivered: ago(13),
  invoice: { id: "FB-1055", issued: ago(23), due: ago(9) } });
placeOrder({ cust: existing("Cork Performance Centre", "Cork", "IE", "Performance facility", "Orla Brennan", "Manager", ago(55)),
  lines: [L(SKU.shoulder)], status: "Delivered", accepted: ago(29), freight: 240, dispatched: ago(22), delivered: ago(20),
  invoice: { id: "FB-1054", issued: ago(26), due: ago(12) } });
placeOrder({ cust: existing("Košice Power Gym", "Košice", "SK", "Independent gym", "Martina Kováčová", "Owner", ago(31)),
  lines: [L(SKU.tbar)], status: "Dispatched", accepted: ago(15), freight: 820, dispatched: ago(2), eta: "Due Monday",
  invoice: { id: "FB-1053", issued: ago(15), due: ago(1), paid: ago(4) } });

/* Older orders, all delivered. Nine are now overdue: with the two above that
   makes eleven, €46,820 between them. */
placeOrder({ cust: S.rheinland, lines: [L(SKU.chest, 2)], status: "Delivered", accepted: ago(46), freight: 980, carrier: 875,
  dispatched: ago(40), delivered: ago(35), invoice: { id: "FB-1047", issued: ago(32), due: ago(18) } });
placeOrder({ cust: existing("Torino Iron Club", "Turin", "IT", "Independent gym", "Alessandro Ferri", "Owner", ago(90)),
  lines: [L(SKU.xshoulder)], status: "Delivered", accepted: ago(70), freight: 320, dispatched: ago(62), delivered: ago(57),
  invoice: { id: "FB-1032", issued: ago(55), due: ago(41) } });
placeOrder({ cust: existing("Antwerp Strength Club", "Antwerp", "BE", "Commercial gym", "Wout Peeters", "Owner", ago(95)),
  lines: [L(SKU.iso45)], status: "Delivered", accepted: ago(80), freight: 405, dispatched: ago(72), delivered: ago(68),
  invoice: { id: "FB-1028", issued: ago(66), due: ago(52) } });
placeOrder({ cust: existing("Siłownia Kraków", "Kraków", "PL", "Independent gym", "Piotr Nowak", "Owner", ago(80)),
  lines: [L(SKU.tbar)], status: "Delivered", accepted: ago(62), freight: 545, dispatched: ago(54), delivered: ago(49),
  invoice: { id: "FB-1036", issued: ago(47), due: ago(33) } });
placeOrder({ cust: existing("Bordeaux Strength House", "Bordeaux", "FR", "Commercial gym", "Julien Lefèvre", "Owner", ago(75)),
  lines: [L(SKU.pulldown), L(SKU.seated)], status: "Delivered", accepted: ago(56), freight: 690, dispatched: ago(48), delivered: ago(44),
  invoice: { id: "FB-1039", issued: ago(41), due: ago(27) } });
placeOrder({ cust: existing("Madrid Fuerza Club", "Madrid", "ES", "Commercial gym", "Javier Ortega", "Owner", ago(70)),
  lines: [L(SKU.truesq)], status: "Delivered", accepted: ago(53), freight: 560, dispatched: ago(45), delivered: ago(41),
  invoice: { id: "FB-1041", issued: ago(38), due: ago(24) } });
placeOrder({ cust: existing("Utrecht Krachtcentrum", "Utrecht", "NL", "Commercial gym", "Thijs Bakker", "Owner", ago(66)),
  lines: [L(SKU.tbar)], status: "Delivered", accepted: ago(50), freight: 380, dispatched: ago(43), delivered: ago(40),
  invoice: { id: "FB-1043", issued: ago(36), due: ago(22) } });
placeOrder({ cust: existing("Hamburg Strength Union", "Hamburg", "DE", "Commercial gym", "Anna Schulz", "Manager", ago(64)),
  lines: [L(SKU.seated)], status: "Delivered", accepted: ago(48), freight: 470, dispatched: ago(41), delivered: ago(37),
  invoice: { id: "FB-1045", issued: ago(34), due: ago(20) } });
placeOrder({ cust: existing("Napoli Athletic Centre", "Naples", "IT", "Performance facility", "Matteo Conti", "Head coach", ago(60)),
  lines: [L(SKU.shrug)], status: "Delivered", accepted: ago(42), freight: 310, dispatched: ago(35), delivered: ago(31),
  invoice: { id: "FB-1050", issued: ago(29), due: ago(15) } });
/* Paid and closed. */
placeOrder({ cust: existing("London Strength Republic", "London", "GB", "Commercial gym", "Priya Nair", "Operations manager", ago(100)),
  lines: [L(SKU.tbar, 2), L(SKU.xshoulder)], status: "Delivered", accepted: ago(78), freight: 610, dispatched: ago(70), delivered: ago(68),
  invoice: { id: "FB-1027", issued: ago(68), due: ago(54), paid: ago(56) } });
placeOrder({ cust: existing("Kraftwerk Berlin", "Berlin", "DE", "Independent gym", "Lena Hoffmann", "Owner", ago(98)),
  lines: [L(SKU.vtype)], status: "Delivered", accepted: ago(74), freight: 520, dispatched: ago(66), delivered: ago(62),
  invoice: { id: "FB-1030", issued: ago(60), due: ago(46), paid: ago(45) } });
placeOrder({ cust: existing("Eindhoven Performance Hall", "Eindhoven", "NL", "Performance facility", "Femke Jansen", "Manager", ago(92)),
  lines: [L(SKU.tbar), L(SKU.iso45)], status: "Delivered", accepted: ago(68), freight: 690, dispatched: ago(60), delivered: ago(57),
  invoice: { id: "FB-1033", issued: ago(55), due: ago(41), paid: ago(43) } });
placeOrder({ cust: existing("Iron Club Firenze", "Florence", "IT", "Independent gym", "Francesca Moretti", "Owner", ago(88)),
  lines: [L(SKU.pendulum)], status: "Delivered", accepted: ago(64), freight: 720, dispatched: ago(57), delivered: ago(52),
  invoice: { id: "FB-1035", issued: ago(50), due: ago(36), paid: ago(30) } });
placeOrder({ cust: existing("Galway Iron Gym", "Galway", "IE", "Independent gym", "Eoin Gallagher", "Owner", ago(85)),
  lines: [L(SKU.tbar)], status: "Delivered", accepted: ago(59), freight: 330, dispatched: ago(52), delivered: ago(50),
  invoice: { id: "FB-1038", issued: ago(48), due: ago(34), paid: ago(35) } });
placeOrder({ cust: existing("Lisboa Força Gym", "Lisbon", "PT", "Commercial gym", "Rui Carvalho", "Owner", ago(82)),
  lines: [L(SKU.xrow)], status: "Delivered", accepted: ago(57), freight: 860, dispatched: ago(49), delivered: ago(43),
  invoice: { id: "FB-1040", issued: ago(44), due: ago(30), paid: ago(26) } });
placeOrder({ cust: existing("Nordic Strength Supply", "Copenhagen", "DK", "Wholesale distributor", "Mads Christensen", "Buyer", ago(86)),
  lines: [L(SKU.tbar, 6)], status: "Delivered", accepted: ago(52), freight: 1420, dispatched: ago(44), delivered: ago(39),
  invoice: { id: "FB-1042", issued: ago(38), due: ago(24), paid: ago(22) } });

/* Two of the unanswered enquiries come from existing customers. */
for (const [name, lines, text] of [
  ["Nordic Strength Supply", [L(SKU.tbar, 6)], "Hi Niall, the last six T-Bar Linear Rows sold through. Can we reorder another 6 × T-Bar Linear Row to the same Copenhagen address? Please confirm price and lead time."],
  ["Amsterdam Barbell Collective", [L(SKU.pulldown)], "Hi, could we add a Leverage Pulldown to our order, or quote it separately if that's easier? Same delivery address."],
] as [string, Line[], string][]) {
  const c = customers.find((x) => x.name === name)!;
  c.returning = true;
  const e = newEnquiry(c, ago(between(0.2, 1.6)), { stage: "New", lines, source: "Email" });
  setMessage(e, text);
  e.qualification = qualify(c, lines, []);
  e.priority = "High";
  e.draftReply = draftReplyFor(c, lines, []);
  unanswered.push({ e, c });
}

/* Payment promises: three outstanding commitments, one already broken. */
const promise = (id: string, days: number, note: string, broken = false) => {
  const inv = invoices.find((i) => i.id === id)!;
  inv.promise = { date: ago(-days), amount: inv.amount, note, broken };
};
promise("FB-1036", 2, "Piotr promised a bank transfer within two days.");
promise("FB-1041", 5, "Javier said payment goes out on their next payment run.");
promise("FB-1028", -12, "Wout promised payment twelve days ago. Nothing received.", true);

/* Incoming stock. */
const shipments: IncomingShipment[] = [
  { id: "SH-FLEX-NOV", name: "Flex Series, November intake", eta: "Late November", confirmed: false,
    lines: [{ productId: SKU.chest, units: 5 }, { productId: SKU.incline, units: 5 }, { productId: SKU.seated, units: 5 }],
    note: "Arrival date not confirmed. Availability depends on actual receipt at County Derry." },
];

/* ═══════════════════════════ FOLLOW-UPS (32) ═════════════════════════════ */

const fuDraft = (kind: string, c: Customer, extra: string) => {
  const first = contactOf(c).name.split(" ")[0];
  if (kind === "No reply") return "Hi " + first + ",\n\nJust checking you got my last email. If you can send the " + extra.toLowerCase() + ", I'll get your delivered price over the same day.\n\nKind regards,\nNiall";
  if (kind === "Quote decision") return "Hi " + first + ",\n\nFollowing up on quotation " + extra + ". Happy to answer any questions on the machines or delivery. Is it still something you're planning?\n\nKind regards,\nNiall";
  if (kind === "Going cold") return "Hi " + first + ",\n\nI wanted to check in on quotation " + extra + " before the freight rate lapses. If timing has moved, I can hold the quote and re-check delivery.\n\nKind regards,\nNiall";
  if (kind === "No first response") return "Hi " + first + ",\n\nApologies for the wait on your enquiry. " + extra + "\n\nKind regards,\nNiall";
  return "Hi " + first + ",\n\nThanks again for confirming payment for " + extra + ". Could you let me know once it has gone through so I can update our records?\n\nKind regards,\nNiall";
};
function followUp(f: Omit<FollowUp, "id" | "status">) {
  followUps.push({ id: "FU-" + String(++nFollow).padStart(3, "0"), status: "Awaiting review", ...f });
}
for (const ch of waiting) followUp({ kind: "No reply", customerId: ch.c.id, enquiryId: ch.e.id, dueInDays: 3, lastTouch: ch.e.lastContactAt,
  value: lineValue(ch.e.lines, ch.c.currency), currency: ch.c.currency, draft: fuDraft("No reply", ch.c, ch.e.missing[0]) });
for (const ch of sentDecision) followUp({ kind: "Quote decision", customerId: ch.c.id, enquiryId: ch.e.id, quoteId: ch.q!.id, dueInDays: 7,
  lastTouch: ch.q!.sentAt!, value: lineValue(ch.e.lines, ch.c.currency), currency: ch.c.currency, draft: fuDraft("Quote decision", ch.c, ch.q!.id) });
for (const ch of sentCold) followUp({ kind: "Going cold", customerId: ch.c.id, enquiryId: ch.e.id, quoteId: ch.q!.id, dueInDays: 14,
  lastTouch: ch.q!.sentAt!, value: lineValue(ch.e.lines, ch.c.currency), currency: ch.c.currency, draft: fuDraft("Going cold", ch.c, ch.q!.id) });
for (const ch of unanswered.slice(1, 5)) followUp({ kind: "No first response", customerId: ch.c.id, enquiryId: ch.e.id, dueInDays: 3,
  lastTouch: ch.e.receivedAt, value: lineValue(ch.e.lines, ch.c.currency), currency: ch.c.currency,
  draft: fuDraft("No first response", ch.c, ch.e.draftReply.split("\n\n")[1] || "") });
for (const id of ["FB-1036", "FB-1041", "FB-1028"]) {
  const inv = invoices.find((i) => i.id === id)!;
  const c = custOf(inv.customerId);
  followUp({ kind: "Payment promise", customerId: c.id, invoiceId: id, dueInDays: inv.promise!.broken ? 3 : 7, lastTouch: inv.promise!.broken ? ago(16) : ago(int(2, 5)),
    value: inv.amount, currency: inv.currency, draft: fuDraft("Payment promise", c, id) });
}

/* ═══════════════════════════ APPROVALS (36) ══════════════════════════════ */

function approval(a: Omit<Approval, "id">) { approvals.push({ id: "AP-" + String(++nAppr).padStart(3, "0"), ...a }); }
const qTotal = (q: Quote, f?: FreightRequest) => q.lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)
  + (f?.carrierQuote ? Math.round(f.carrierQuote.cost * (1 + f.markupPct / 100)) : 0);

const danubeQ = quotes.find((q) => q.id === "Q-2286")!;
approval({ kind: "Customer quotation", action: "Approve equipment and freight quote", customerId: S.danube.id, recordKind: "quote", recordId: "Q-2286",
  amount: qTotal(danubeQ, freight.find((f) => f.id === "FR-1206")), currency: "EUR", status: "Ready", preparedBy: "Quote Agent", createdAt: ago(1, 1), pinned: 1,
  context: "Six machines for the new floor in Bratislava. Carrier rate received yesterday (€2,100 + 15%). Three Flex units come from the late-November intake." });
const rotQ = quotes.find((q) => q.id === "Q-2271")!;
approval({ kind: "Price review", action: "Review 10-machine quote", customerId: S.rotterdam.id, recordKind: "quote", recordId: "Q-2271",
  amount: qTotal(rotQ, freight.find((f) => f.id === "FR-1199")), currency: "EUR", status: "Ready", preparedBy: "Quote Agent", createdAt: ago(2, 3.8), pinned: 2,
  context: "Quote sent five days ago at list price. Daan Visser asked about volume pricing. No discount applied; any override needs your approval." });
const npgQ = quotes.find((q) => q.id === "Q-2293")!;
approval({ kind: "Customer quotation", action: "Approve GBP quotation", customerId: S.npg.id, recordKind: "quote", recordId: "Q-2293",
  amount: qTotal(npgQ, freight.find((f) => f.id === "FR-1214")), currency: "GBP", status: "Ready", preparedBy: "Quote Agent", createdAt: ago(0, 2), pinned: 3,
  context: "One X Shoulder Press from stock. Harbour Freight quoted £350 this morning; 20% markup gives £420." });
approval({ kind: "Freight request", action: "Request freight rate", customerId: S.lyon.id, recordKind: "freight", recordId: "FR-1211",
  amount: null, currency: "EUR", status: "Needs action", preparedBy: "Freight Agent", createdAt: ago(0, 6), pinned: 4,
  context: "Greyhound Express has not replied in over three working days. A chase is drafted; the Lyon quote cannot go out until the rate arrives." });
for (const ch of ready) {
  approval({ kind: "Customer quotation", action: "Approve quotation", customerId: ch.c.id, recordKind: "quote", recordId: ch.q!.id,
    amount: qTotal(ch.q!, ch.f), currency: ch.c.currency, status: "Ready", preparedBy: "Quote Agent", createdAt: ch.q!.createdAt,
    context: lineText(ch.e.lines) + " to " + ch.c.city + ". Carrier rate received; markup " + ch.f!.markupPct + "%." });
}
for (const ch of qualified) {
  approval({ kind: "Freight request", action: "Send carrier rate request", customerId: ch.c.id, recordKind: "freight", recordId: ch.f!.id,
    amount: null, currency: ch.c.currency, status: "Ready", preparedBy: "Freight Agent", createdAt: ch.e.lastContactAt,
    context: units(ch.e.lines) + " machine" + (units(ch.e.lines) > 1 ? "s" : "") + " to " + ch.c.city + " via " + carrierName(ch.f!.carrierId) + "." });
}
for (const [id, why] of [["FB-1047", "18 days overdue. First payment-status email, polite."], ["FB-1032", "41 days overdue. Second reminder."], ["FB-1039", "27 days overdue. No reply to the first reminder."]] as const) {
  const inv = invoices.find((i) => i.id === id)!;
  approval({ kind: "Payment follow-up", action: "Send payment-status email", customerId: inv.customerId, recordKind: "invoice", recordId: id,
    amount: inv.amount, currency: inv.currency, status: "Ready", preparedBy: "Receivables Agent", createdAt: ago(0, 7), context: why });
  const c = custOf(inv.customerId);
  mail({ recordKind: "invoice", recordId: id, customerId: c.id, direction: "draft", from: "Niall <sales@megamasseurope.com>", to: contactOf(c).email, at: ago(0, 7),
    subject: "Invoice " + id + ", payment status",
    body: "Hi " + contactOf(c).name.split(" ")[0] + ",\n\nI hope the equipment is going well. Our records show invoice " + id + " for €" + inv.amount.toLocaleString("en-GB")
      + " is still open. Could you let me know when payment is planned, or if anything is holding it up?\n\nKind regards,\nNiall\nMega Mass Europe" });
}

/* ═════════════════════════════ TASKS ═════════════════════════════════════ */

const T = (title: string, owner: string, dueDays: number, priority: Priority, dept: Task["dept"], status: Task["status"], recordKind: Task["recordKind"], recordId: string) =>
  tasks.push({ id: "TK-" + String(tasks.length + 1).padStart(3, "0"), title, owner, due: ago(-dueDays), priority, dept, status, recordKind, recordId });
T("Approve Danube Strength quotation (€21,915)", "Niall", 0.2, "High", "Sales", "Not started", "quote", "Q-2286");
T("Decide on Rotterdam Iron Supply volume pricing", "Niall", 1, "High", "Sales", "In progress", "quote", "Q-2271");
T("Review drafted replies to unanswered enquiries", "Niall", 0.3, "High", "Sales", "In progress", "enquiry", "ENQ-4562");
T("Chase Greyhound Express for the Lyon rate", "Freight Agent", 0.1, "High", "Freight", "Waiting", "freight", "FR-1211");
T("Confirm Flex Series arrival date with Mega Mass US", "Niall", 2, "High", "Stock", "Not started", "shipment", "SH-FLEX-NOV");
T("Call Rheinland Performance about FB-1047", "Niall", 1, "Medium", "Finance", "Not started", "invoice", "FB-1047");
T("Book carrier collection for Wien Kraft Studio", "Niall", 1, "Medium", "Freight", "Not started", "order", orders.find((o) => o.customerId === customers.find((c) => c.name === "Wien Kraft Studio")!.id)!.id);
T("Confirm VAT treatment for EU business quotes with the accountant", "Niall", 5, "Medium", "Finance", "Not started", "customer", S.danube.id);
T("Confirm payment terms wording for quotations", "Niall", 5, "Medium", "Finance", "Not started", "quote", "Q-2286");
T("Update website availability text for T-Bar Linear Row", "Natalie", 3, "Medium", "Systems", "Not started", "product", SKU.tbar);
T("Remove 'Already an Atlantis client' from the quote form", "Natalie", 7, "Low", "Systems", "Not started", "product", SKU.tbar);
T("Confirm dimensions for Leverage Seated Row (catalogue says TBC)", "Natalie", 4, "Low", "Stock", "Not started", "product", SKU.seated);
T("Allocate the 6 unallocated Flex units", "Niall", 3, "Medium", "Stock", "Not started", "shipment", "SH-FLEX-NOV");
T("Reconcile FreshBooks payments for week 47", "Receivables Agent", 1, "Low", "Finance", "In progress", "invoice", "FB-1059");
T("Send trade price list to new distributor enquiries", "Niall", 2, "Medium", "Sales", "Not started", "enquiry", unanswered.find((x) => x.e.qualification === "Wholesale / distributor")?.e.id || "ENQ-4562");
T("File signed Danube delivery note once received", "Niall", 9, "Low", "Sales", "Done", "quote", "Q-2286");

/* ═══════════════════════ AGENT ROUTINES IN THE LOG ═══════════════════════ */

for (let d = 0; d < 6; d++) {
  const at = ago(d) - (ago(d) % DAY) + 7 * HOUR;
  if (at > NOW) continue;
  run({ agentId: "briefing", at, title: "Morning briefing", outcome: d === 0 ? "Danube approval, Lyon freight delay, three payment promises" : "Briefing delivered to Home", status: "Completed", recordKind: "quote", recordId: "Q-2286", durationSec: int(18, 30) });
  run({ agentId: "followup", at: at + 2 * HOUR, title: "Daily follow-up scan", outcome: "Follow-ups drafted, none sent: auto-chasing is off", status: "Completed", recordKind: "followup", recordId: "FU-001", durationSec: int(20, 40) });
  run({ agentId: "receivables", at: at + 1.5 * HOUR, title: "FreshBooks receivables check", outcome: "11 overdue, €46,820, 3 promises tracked", status: "Completed", recordKind: "invoice", recordId: "FB-1047", durationSec: int(14, 26) });
  for (let h = 1; h < 10; h += 3) {
    const t = at + h * HOUR;
    if (t > NOW) continue;
    run({ agentId: "ops", at: t, title: "Stalled-work sweep", outcome: h === 7 && d === 0 ? "Lyon rate request over 3 working days" : "Nothing stalled beyond limits", status: h === 7 && d === 0 ? "Flagged" : "Completed", recordKind: "freight", recordId: "FR-1211", durationSec: int(3, 9) });
  }
}
run({ agentId: "intel", at: ago(2, 2), title: "Weekly sales intelligence", outcome: "T-Bar Linear Row is 31% of machines requested; Italy and Netherlands up", status: "Completed", recordKind: "product", recordId: SKU.tbar, durationSec: 41 });
run({ agentId: "ops", at: ago(0, 1), title: "Ageing enquiry check", outcome: "4 enquiries without a first response past 48 hours", status: "Flagged", recordKind: "enquiry", recordId: unanswered[1].e.id, durationSec: 6 });
run({ agentId: "ops", at: ago(0, 1.2), title: "Website availability check", outcome: "T-Bar Linear Row page still says 'Estimated arrival October 2026'", status: "Flagged", recordKind: "product", recordId: SKU.tbar, durationSec: 8 });
run({ agentId: "receivables", at: ago(0, 7), title: "Prepared payment follow-ups", outcome: "Rheinland, Torino, Bordeaux drafts waiting for Niall", status: "Waiting on Niall", recordKind: "invoice", recordId: "FB-1047", durationSec: 22 });
run({ agentId: "freight", at: ago(0, 6), title: "Overdue rate check", outcome: "FR-1211 to Lyon: no reply in over 3 working days, chase drafted", status: "Waiting on Niall", recordKind: "freight", recordId: "FR-1211", durationSec: 9 });

act({ at: ago(0, 6), actor: "Freight Agent", actorKind: "agent", source: "Agent", title: "Freight Agent flagged a late carrier rate",
  detail: "Greyhound Express has not replied on FR-1211 (Lyon). Chase drafted for approval.", recordKind: "freight", recordId: "FR-1211", customerId: S.lyon.id, attention: true });
act({ at: ago(0, 7), actor: "Receivables Agent", actorKind: "agent", source: "Agent", title: "Payment follow-ups prepared",
  detail: "Rheinland Performance (FB-1047, €7,880), Torino Iron Club and Bordeaux Strength House.", recordKind: "invoice", recordId: "FB-1047", customerId: S.rheinland.id });
act({ at: ago(0, 1), actor: "Ops Watchdog", actorKind: "agent", source: "Agent", title: "Ops Watchdog flagged ageing enquiries",
  detail: "Four enquiries have had no first response for more than 48 hours.", recordKind: "enquiry", recordId: unanswered[1].e.id, customerId: unanswered[1].c.id, attention: true });
act({ at: ago(1, 3), actor: "Pulse", actorKind: "system", source: "Pulse", title: "Incoming stock allocation updated",
  detail: "Flex Series intake: 9 of 15 units reserved, 6 unallocated.", recordKind: "shipment", recordId: "SH-FLEX-NOV" });
act({ at: ago(2, 4), actor: "Natalie", actorKind: "person", source: "Drive", title: "Natalie uploaded the Flex Series packing list",
  detail: "Packing list for the November intake filed in Drive.", recordKind: "shipment", recordId: "SH-FLEX-NOV" });
act({ at: ago(0, 1.2), actor: "Ops Watchdog", actorKind: "agent", source: "Agent", title: "Website availability text out of date",
  detail: "T-Bar Linear Row page still says 'Estimated arrival October 2026'; 14 are available in County Derry.", recordKind: "product", recordId: SKU.tbar, attention: true });

/* ═════════════════════════ FINAL TOUCHES ═════════════════════════════════ */

function aiActionFor(e: Enquiry): string {
  const f = freight.find((x) => x.enquiryId === e.id);
  switch (e.stage) {
    case "New":
      if (e.awaitingCustomer) return "Follow up: no reply in " + Math.max(1, Math.round((NOW - e.lastContactAt) / DAY)) + " days";
      if (e.missing.includes("Delivery postcode")) return "Request delivery postcode";
      if (e.missing.includes("Quantity")) return "Confirm quantity";
      if (e.missing.length) return "Ask for " + e.missing[0].toLowerCase();
      if (e.qualification === "Wholesale / distributor") return "Send trade price list and request freight";
      return "Send price list and request freight";
    case "Qualified": return "Approve carrier request to " + (f ? carrierName(f.carrierId) : "carrier");
    case "Freight Requested":
      return f && f.requestedAt && NOW - f.requestedAt > 3 * DAY ? "Chase " + carrierName(f.carrierId) + " for the rate" : "Waiting on " + (f ? carrierName(f.carrierId) : "carrier");
    case "Quote Ready": return "Approve quotation";
    case "Quote Sent": {
      const q = quotes.find((x) => x.id === e.quoteId);
      return q?.overrideRequested ? "Review pricing question" : q?.sentAt && NOW - q.sentAt > 7 * DAY ? "Follow up on the quote decision" : "Await customer decision";
    }
    case "Won": return "Track payment and dispatch";
    default: return "Closed: " + (e.lostReason || "lost");
  }
}
for (const e of enquiries) {
  e.aiAction = aiActionFor(e);
  if (e.stage === "New" && !e.replied) e.owner = "Niall";
}
/* Ensure Milano's extraction reads exactly as the brief. */
{ const m = enquiries.find((x) => x.id === "ENQ-4562")!; m.aiAction = "Request shipping address"; }

void PRODUCTS;

export function createSeed(): MMState {
  return {
    now: NOW,
    customers, contacts, suppliers: SUPPLIERS, products: PRODUCTS, enquiries, quotes, freight, invoices, payments, orders,
    reservations, shipments, followUps, approvals, emails, activity: activity.sort((a, b) => b.at - a.at),
    runs: runs.sort((a, b) => b.at - a.at), tasks,
    controls: {
      followUpAuto: false,
      cadence: [3, 7, 14, 30],
      defaultMarkup: 15,
      requireApproval: { quotes: true, emails: true, overrides: true, markups: true, stock: true, payments: true },
      agentsOn: { briefing: true, ops: true, enquiry: true, quote: true, freight: true, followup: true, receivables: true, intel: true },
    },
    panel: null,
    toasts: [],
    builderQuoteId: "Q-2286",
    seq: 0,
  };
}
