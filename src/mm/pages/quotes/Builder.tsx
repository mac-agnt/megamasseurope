import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FreightRequest, MMState, Product, Quote, QuoteStatus } from "../../types";
import {
  addLine, approveQuote, openPanel, removeLine, requestFreight, saveDraft, sendFreightRequest, setBuilderQuote, setLine, setMarkup,
  simulateCarrierReply, submitForApproval, toast, useMM,
} from "../../store";
import { contactOf, customerOf, freightCharge, ix, markupAmount, quoteEquipment, quoteFreight, quoteTotal, quoteUnits, stockOf } from "../../select";
import { age, countryName, dateLong, dateShort, money, plural, since, sym } from "../../format";
import {
  Badge, Button, Card, CountryTag, Empty, Facts, I, Icon, Label, MONO, Note, Page, PageHead, ProductThumb, Row, Status, inputStyle,
} from "../../ui";
import { OPEN, availability, eqOf, flagsOf, freightOf, intakeFor, isEditable, orderFor, rangeLabel, type Avail } from "./lib";
import { NumField, Press, ReadyItem, RecordChip, Stepper } from "./bits";
import QuotePreview from "./QuotePreview";

/* Quote Builder: pick an open quote, edit lines against live stock and the
   price book, check freight, and see the customer's document update as you go. */

export default function Builder() {
  const s = useMM();
  const q = (ix(s).quote[s.builderQuoteId] as Quote | undefined) ?? s.quotes.find((x) => OPEN.includes(x.status));
  if (!q) {
    return (
      <Page>
        <PageHead title="Quote Builder" />
        <Card><Empty title="No open quotes" sub="Start a quote from an enquiry and it opens here." /></Card>
      </Page>
    );
  }
  return <BuilderFor key={q.id} s={s} q={q} />;
}

function BuilderFor({ s, q }: { s: MMState; q: Quote }) {
  const c = customerOf(s, q.customerId);
  const ct = contactOf(s, c);
  const e = ix(s).enquiry[q.enquiryId];
  const f = freightOf(s, q);
  const order = orderFor(s, q.id);
  const editable = isEditable(q);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const [catalogue, setCatalogue] = useState(false);
  const fl = flagsOf(s, q);
  const charge = quoteFreight(s, q);
  const carrier = f ? s.suppliers.find((x) => x.id === f.carrierId) : undefined;
  const changed = f ? linesChanged(q, f) : false;

  const editQuote = () => {
    const el = priceRef.current;
    if (!el) { setCatalogue(true); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
    el.select();
  };

  const status = q.status;
  const canSubmit = status === "Draft" || status === "Awaiting Freight";
  const canApprove = status === "Ready for Review";

  return (
    <Page>
      <PageHead title="Quote Builder"
        sub="Edit the machines, check stock and freight, then send it for approval. The document on the right is exactly what the customer receives." />

      {/* toolbar: picker, links, actions, readiness */}
      <Card pad="14px 16px" style={{ zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <QuotePicker s={s} q={q} />
          <Status s={status} />
          <span style={{ fontSize: 12, color: "var(--faint)" }}>Updated {since(q.updatedAt)}</span>
          <div style={{ flex: 1 }} />
          <Row gap={6} wrap>
            <RecordChip kind="enquiry" id={q.enquiryId} label={<><span style={MONO}>{q.enquiryId}</span></>} title="Open the enquiry" />
            <RecordChip kind="customer" id={c.id} label={c.name} title="Open the customer" />
            {f && <RecordChip kind="freight" id={f.id} label={<span style={MONO}>{f.id}</span>} title="Open the freight request" />}
            {order && <RecordChip kind="order" id={order.id} label={<span style={MONO}>{order.id}</span>} title="Open the order" />}
            {order?.invoiceId && <RecordChip kind="invoice" id={order.invoiceId} label={<span style={MONO}>{order.invoiceId}</span>} title="Open the FreshBooks invoice" />}
          </Row>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <Button icon={I.edit} onClick={editQuote} disabled={!editable} title={editable ? "Jump to the first price" : "Sent quotes are locked"}>Edit Quote</Button>
          <Button icon={I.file} onClick={() => saveDraft(q.id)} disabled={!editable}>Save Draft</Button>
          <Button icon={I.truck} onClick={() => requestFreight(q.id)} disabled={!!q.freightId}
            title={q.freightId ? "Freight already requested (" + q.freightId + ")" : "Prepare a carrier rate request for approval"}>Request Freight</Button>
          <Button kind={canSubmit ? "primary" : "secondary"} icon={I.send} onClick={() => submitForApproval(q.id)} disabled={!canSubmit}
            title={canSubmit ? "Move to Ready for Review once freight is priced" : status === "Ready for Review" ? "Already waiting for approval" : "Already sent"}>Submit for Approval</Button>
          <Button kind={canApprove ? "primary" : "secondary"} icon={I.check} onClick={() => approveQuote(q.id)} disabled={!canApprove}
            title={canApprove ? "Approve and email the quotation. Simulated, nothing is sent." : "Only quotes ready for review can be approved"}>Approve & Send (simulated)</Button>
          <div style={{ flex: 1 }} />
          <Button kind="ghost" icon={I.download} onClick={() => toast("Preview PDF generated (simulated)", q.id + " · " + c.name)}>Download Preview</Button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px 18px", flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <span style={{ ...MONO, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--faint)" }}>Before it goes out</span>
          {!f ? <ReadyItem tone="bad">No freight request yet</ReadyItem>
            : charge !== null ? <ReadyItem tone={changed ? "warn" : "ok"}>{changed ? "Machines changed since the carrier quoted" : "Freight priced, " + money(charge, q.currency)}</ReadyItem>
            : f.status === "To request" ? <ReadyItem tone="warn">Carrier request drafted, not sent</ReadyItem>
            : <ReadyItem tone="warn">Waiting on {carrier?.name ?? "the carrier"}, no freight price yet</ReadyItem>}
          {fl.override ? <ReadyItem tone="warn">Price override, needs Niall's approval</ReadyItem> : <ReadyItem tone="ok">All lines at list price</ReadyItem>}
          {fl.stock.length === 0 ? <ReadyItem tone="ok">Every line covered by stock</ReadyItem>
            : <ReadyItem tone={fl.stockTone === "bad" ? "bad" : "warn"} title={fl.stock.map((x) => x.name + ": " + x.a.text).join("\n")}>
              {fl.stockTone === "bad" ? plural(fl.stock.length, "line") + " short of stock" : plural(fl.stock.length, "line") + " from " + intakeText(s, fl.stock[0].productId)}
            </ReadyItem>}
          {fl.dims.length + fl.otherMissing.length > 0 || !e?.postcode
            ? <ReadyItem tone="warn" title={[...fl.dims, ...fl.otherMissing, ...(e?.postcode ? [] : ["Delivery postcode"])].join("\n")}>
              {fl.dims.length ? "Dimensions to confirm" : "Delivery details missing"}
            </ReadyItem>
            : <ReadyItem tone="ok">Delivery details complete</ReadyItem>}
          <ReadyItem tone="neutral">VAT treatment pending confirmation</ReadyItem>
          <ReadyItem tone="neutral">Payment conditions to be confirmed</ReadyItem>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(440px,1fr))", gap: 16, alignItems: "start" }}>
        {/* LEFT: customer, machines, freight */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <Card title="Customer" hint={e ? e.source + " · enquiry received " + since(e.receivedAt) + (c.returning ? " · returning customer" : "") : undefined}
            right={<CountryTag c={c.country} />}>
            <Facts cols={2} rows={[
              ["Customer", c.name],
              ["Contact", ct.name + ", " + ct.role],
              ["Email", ct.email],
              ["Phone", ct.phone],
              ["City", c.city + (e?.postcode ? " " + e.postcode : "")],
              ["Country", countryName(c.country) + " (" + c.country + ")"],
              ["Customer type", c.type],
              ["Currency", <span key="cur" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon d={I.lock} size={12} />{q.currency}, fixed by the customer record</span>],
            ]} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ minWidth: 0 }}>
                <Label>Delivery country</Label>
                <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 5 }}>{countryName(c.country)}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <Label>Delivery address</Label>
                <div style={{ fontSize: 13, color: e?.postcode ? "var(--ink)" : "var(--warn)", marginTop: 5 }}>
                  {f?.destination ?? c.city + (e?.postcode ? " " + e.postcode : "")}{!e?.postcode && " · postcode missing"}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Machines"
            hint={<>{plural(q.lines.length, "line")}, {plural(quoteUnits(q), "unit")} · {q.currency} prices from the private price book</>}
            right={editable ? <Button size="sm" kind={catalogue ? "secondary" : "primary"} icon={catalogue ? I.x : I.plus} onClick={() => setCatalogue(!catalogue)}>
              {catalogue ? "Close catalogue" : "Add machine"}</Button> : undefined}>
            {!editable && (
              <Note tone="info" icon={I.lock} style={{ marginBottom: 12 }}>
                {q.sentAt ? "Sent " + dateShort(q.sentAt) + ". " : ""}This quote is with the customer, so the lines are locked. A change needs a revised quote.
              </Note>
            )}
            {catalogue && editable && <Catalogue s={s} q={q} onClose={() => setCatalogue(false)} />}
            {q.lines.length === 0 && <Empty title="No machines on this quote" sub="Add one from the catalogue." />}
            <div>
              {q.lines.map((l, i) => (
                <LineRow key={l.productId + "-" + i} s={s} q={q} i={i} editable={editable}
                  priceRef={i === 0 ? (el) => { priceRef.current = el; } : undefined} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <span style={{ flex: 1, fontSize: 12.5, color: "var(--dim)" }}>
                Equipment subtotal{fl.override && <span style={{ color: "var(--warn)" }}> · includes a price override</span>}
              </span>
              <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.4px", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(quoteEquipment(q), q.currency)}</span>
            </div>
          </Card>

          <FreightCard s={s} q={q} f={f} editable={editable} changed={changed} />
        </div>

        {/* RIGHT: the customer's document */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 2px" }}>
            <Label style={{ flex: 1 }}>Customer preview</Label>
            <Badge tone={q.sentAt ? "info" : "neutral"}>{q.sentAt ? "Issued " + dateShort(q.sentAt) : "Draft, not issued"}</Badge>
          </div>
          <QuotePreview s={s} q={q} />
          <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "2px 4px", lineHeight: 1.5 }}>
            Updates live as you edit. Prices are demo values. Nothing is emailed from this screen until you approve, and in this demo sending is simulated.
          </div>
        </div>
      </div>
    </Page>
  );
}

/* ── one machine line ─────────────────────────────────────────────────────── */

function LineRow({ s, q, i, editable, priceRef }: { s: MMState; q: Quote; i: number; editable: boolean; priceRef?: (el: HTMLInputElement | null) => void }) {
  const l = q.lines[i];
  const p = ix(s).product[l.productId];
  const a = availability(s, p, l.qty);
  const diff = l.unitPrice - l.listPrice;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "52px minmax(0,1fr)", gap: 12, padding: "14px 2px", borderTop: i ? "1px solid var(--border)" : undefined,
      animation: "rowIn .3s var(--ease) both" }}>
      <ProductThumb p={p} size={52} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <button onClick={() => openPanel("product", p.id)} title="Open the product record"
              style={{ border: 0, padding: 0, background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "var(--ink)",
                textAlign: "left", letterSpacing: "-.2px" }}>{p.name}</button>
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{rangeLabel(p)} · <span style={MONO}>{p.id}</span></div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(l.unitPrice * l.qty, q.currency)}</div>
            <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>line total</div>
          </div>
          {editable && <Button size="sm" kind="ghost" icon={I.x} title="Remove this line" onClick={() => removeLine(q.id, i)} />}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <Stepper value={l.qty} min={1} disabled={!editable} onChange={(n) => setLine(q.id, i, { qty: Math.max(1, n) })} />
          <span style={{ fontSize: 12, color: "var(--faint)" }}>×</span>
          <NumField value={l.unitPrice} prefix={sym(q.currency)} disabled={!editable} inputRef={priceRef} title="Unit price, ex VAT"
            onCommit={(n) => setLine(q.id, i, { unitPrice: Math.round(n) })} />
          {diff !== 0 ? (
            <>
              <Badge tone="warn">Override, needs Niall's approval</Badge>
              <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{money(Math.abs(diff), q.currency)} {diff < 0 ? "below" : "above"} list {money(l.listPrice, q.currency)}</span>
              {editable && (
                <button onClick={() => setLine(q.id, i, { unitPrice: l.listPrice })}
                  style={{ border: 0, background: "none", padding: 0, color: "var(--accent)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Reset to list</button>
              )}
            </>
          ) : <span style={{ fontSize: 11.5, color: "var(--faint)" }}>List price {money(l.listPrice, q.currency)}</span>}
        </div>

        <StockLine a={a} qty={l.qty} />
      </div>
    </div>
  );
}

function StockLine({ a, qty }: { a: Avail; qty: number }) {
  const st = a.st;
  const cell = (k: string, v: number, tone?: string) => (
    <span style={{ whiteSpace: "nowrap" }}>{k} <span style={{ color: tone || "var(--body)" }}>{v}</span></span>
  );
  return (
    <div style={{ marginTop: 9 }}>
      <div style={{ ...MONO, fontSize: 11, color: "var(--faint)", display: "flex", gap: "4px 14px", flexWrap: "wrap" }}>
        {cell("In stock", st.inStock)}
        {cell("Reserved", st.reserved)}
        {cell("Available", st.available, st.available < qty ? "var(--warn)" : "var(--ok)")}
        {cell("Incoming free", st.incomingFree)}
      </div>
      {a.text && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 7, fontSize: 12, lineHeight: 1.45,
          color: a.tone === "bad" ? "var(--bad)" : "var(--warn)" }}>
          <Icon d={I.alert} size={13} style={{ marginTop: 2 }} />
          <span>{a.text}</span>
        </div>
      )}
    </div>
  );
}

/* ── freight block ────────────────────────────────────────────────────────── */

function FreightCard({ s, q, f, editable, changed }: { s: MMState; q: Quote; f: FreightRequest | undefined; editable: boolean; changed: boolean }) {
  if (!f) {
    return (
      <Card title="Freight" hint="No carrier has been asked yet.">
        <Note tone="warn">No freight request on this quote. It can't be priced or sent until a carrier rate comes back. Pulse never guesses a freight cost.</Note>
        <div style={{ marginTop: 12 }}>
          <Button kind="primary" icon={I.truck} onClick={() => requestFreight(q.id)}>Request Freight</Button>
        </div>
      </Card>
    );
  }
  const carrier = s.suppliers.find((x) => x.id === f.carrierId);
  const cq = f.carrierQuote;
  const charge = freightCharge(f);
  const canMarkup = editable && !!cq && f.charge === undefined;
  return (
    <Card title="Freight"
      hint={<>{carrier?.name ?? "Carrier"}{carrier && !carrier.confirmed && <span style={{ color: "var(--warn)" }}> · carrier record to confirm</span>}</>}
      right={<Row gap={6}><Status s={f.status} /><RecordChip kind="freight" id={f.id} /></Row>}>
      <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.55 }}>
        {f.collection} to <span style={{ color: "var(--ink)" }}>{f.destination}</span>
        <div style={{ color: "var(--dim)" }}>{f.service}</div>
      </div>

      {cq ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginTop: 14 }}>
            <Tile k="Carrier cost" v={money(cq.cost, cq.currency)} sub={"Ref " + cq.ref} />
            <div style={{ padding: "11px 12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
              <div style={{ fontSize: 11.5, color: "var(--dim)" }}>Markup</div>
              <div style={{ marginTop: 6 }}>
                {canMarkup
                  ? <NumField value={f.markupPct} suffix="%" width={84} min={0} max={60} title="Markup on the carrier cost" onCommit={(n) => setMarkup(f.id, n)} />
                  : <span style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{f.markupPct}%</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 5 }}>+{money(markupAmount(f), cq.currency)}</div>
            </div>
            <Tile k="Customer charge" v={charge === null ? "Pending" : money(charge, q.currency)} sub="on the quotation" strong />
          </div>
          <div style={{ ...MONO, fontSize: 12, color: "var(--dim)", marginTop: 10 }}>
            {money(cq.cost, cq.currency)} + {f.markupPct}% = <span style={{ color: "var(--ink)" }}>{charge === null ? "pending" : money(charge, q.currency)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginTop: 12, fontSize: 12, color: "var(--dim)" }}>
            <span>Transit: <span style={{ color: "var(--body)" }}>{cq.eta}</span></span>
            <span>Rate valid until: <span style={{ color: "var(--body)" }}>{dateLong(new Date(cq.validUntil).getTime())}</span></span>
            <span>Received: <span style={{ color: "var(--body)" }}>{since(cq.receivedAt)}</span></span>
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6 }}>Exclusions: <span style={{ color: "var(--body)" }}>{cq.exclusions}</span></div>
          {canMarkup && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>Markup changes go to Niall with the quote. Default markup is {s.controls.defaultMarkup}%.</div>}
          {changed && (
            <Note tone="warn" style={{ marginTop: 12 }}>
              The machines on this quote no longer match what the carrier priced ({plural(f.lines.reduce((n, l) => n + l.qty, 0), "unit")} quoted). Ask {carrier?.name ?? "the carrier"} to re-quote before sending.
            </Note>
          )}
        </>
      ) : f.status === "To request" ? (
        <>
          <Note tone="warn" style={{ marginTop: 14 }}>Carrier request drafted, not sent. It goes to {carrier?.name ?? "the carrier"} only when you approve it.</Note>
          <Row gap={8} style={{ marginTop: 12 }}>
            <Button kind="primary" icon={I.send} onClick={() => sendFreightRequest(f.id)}>Approve and send request</Button>
            <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Simulated, nothing is emailed.</span>
          </Row>
        </>
      ) : (
        <>
          <Note tone="warn" icon={I.clock} style={{ marginTop: 14 }}>
            Waiting on carrier, no freight price yet.
            {f.requestedAt && <> Requested {since(f.requestedAt)}{f.chases ? ", chased " + plural(f.chases, "time") : ""}.</>}
            {f.requestedAt && Date.now() - f.requestedAt > 3 * 86_400_000 && <> Over three days without a reply.</>}
          </Note>
          <Row gap={8} wrap style={{ marginTop: 12 }}>
            <Button icon={I.send} onClick={() => sendFreightRequest(f.id)} title="Send a chase email (simulated)">Chase carrier</Button>
            <Button kind="ghost" icon={I.refresh} onClick={() => simulateCarrierReply(f.id)} title="Demo control: pretend the carrier's reply has just landed in Gmail">Simulate carrier reply</Button>
          </Row>
        </>
      )}

      {f.missing.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <Label>Flagged on the request</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 7 }}>
            {f.missing.map((m) => (
              <div key={m} style={{ display: "flex", gap: 7, fontSize: 12, color: "var(--body)", lineHeight: 1.45 }}>
                <Icon d={I.alert} size={13} style={{ marginTop: 2, color: "var(--warn)" }} />{m}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function Tile({ k, v, sub, strong }: { k: string; v: ReactNode; sub?: ReactNode; strong?: boolean }) {
  return (
    <div style={{ padding: "11px 12px", borderRadius: 12, background: strong ? "var(--accent-faint)" : "var(--surface-2)",
      border: "1px solid " + (strong ? "var(--accent-line)" : "var(--border)"), minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{k}</div>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.4px", color: "var(--ink)", marginTop: 6, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
    </div>
  );
}

/** "the Flex Series intake, unconfirmed" */
function intakeText(s: MMState, productId: string): string {
  const sh = intakeFor(s, productId);
  if (!sh) return "incoming stock";
  return "the " + sh.name.split(",")[0] + " intake" + (sh.confirmed ? "" : ", unconfirmed");
}

/** True when the quote's machines differ from what the carrier was asked to price. */
function linesChanged(q: Quote, f: FreightRequest): boolean {
  const tally = (xs: { productId: string; qty: number }[]) => {
    const m: Record<string, number> = {};
    for (const x of xs) m[x.productId] = (m[x.productId] || 0) + x.qty;
    return m;
  };
  const a = tally(q.lines), b = tally(f.lines);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] || 0) !== (b[k] || 0)) return true;
  return false;
}

/* ── quote picker ─────────────────────────────────────────────────────────── */

const PICK_ORDER: QuoteStatus[] = ["Ready for Review", "Awaiting Freight", "Draft", "Sent"];

function QuotePicker({ s, q }: { s: MMState; q: Quote }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (ev: MouseEvent) => { if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false); };
    const key = (ev: KeyboardEvent) => { if (ev.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  const c = customerOf(s, q.customerId);
  const t = term.trim().toLowerCase();
  const match = (x: Quote) => {
    if (!t) return true;
    const cx = customerOf(s, x.customerId);
    return (x.id + " " + cx.name + " " + cx.city + " " + countryName(cx.country)).toLowerCase().includes(t);
  };
  const choose = (id: string) => { setBuilderQuote(id); setOpen(false); setTerm(""); };

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 0 }}>
      <button onClick={() => setOpen(!open)} className="mm-btn" aria-expanded={open}
        style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 40, padding: "0 12px 0 14px", borderRadius: 12, cursor: "pointer",
          border: "1px solid " + (open ? "var(--accent-line)" : "var(--border-strong)"), background: "var(--surface-2)", color: "var(--ink)",
          fontFamily: "inherit", maxWidth: "100%", minWidth: 0 }}>
        <Icon d={I.quote} size={15} style={{ color: "var(--accent)" }} />
        <span style={{ ...MONO, fontSize: 13, fontWeight: 600 }}>{q.id}</span>
        <span style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
        <span style={{ fontSize: 12.5, color: "var(--dim)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{money(quoteTotal(s, q), q.currency)}</span>
        <Icon d={I.chevron} size={13} style={{ transform: open ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform .18s var(--ease)", color: "var(--dim)" }} />
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 40, width: 460, maxWidth: "calc(100vw - 64px)",
          background: "var(--overlay)", border: "1px solid var(--border-strong)", borderRadius: 14, boxShadow: "0 22px 60px var(--glass-shadow)",
          padding: 8, backdropFilter: "blur(18px)", animation: "mmToastIn .18s var(--ease) both" }}>
          <div style={{ position: "relative" }}>
            <Icon d={I.search} size={14} style={{ position: "absolute", left: 11, top: 10, color: "var(--faint)" }} />
            <input autoFocus value={term} onChange={(ev) => setTerm(ev.target.value)} placeholder="Search by quote, customer or city"
              style={{ ...inputStyle, width: "100%", paddingLeft: 32 }} />
          </div>
          <div className="mm-scroll" style={{ maxHeight: 400, overflowY: "auto", marginTop: 4 }}>
            {!OPEN.includes(q.status) && (
              <div style={{ padding: "8px 8px 2px", fontSize: 11.5, color: "var(--faint)" }}>Showing {q.id}, now {q.status.toLowerCase()}. Pick an open quote below.</div>
            )}
            {PICK_ORDER.map((g) => {
              const xs = s.quotes.filter((x) => x.status === g && match(x))
                .sort((a, b) => (g === "Ready for Review" ? eqOf(s, b) - eqOf(s, a) : b.updatedAt - a.updatedAt));
              if (!xs.length) return null;
              return (
                <div key={g}>
                  <Label style={{ padding: "10px 8px 5px" }} right={<span style={{ ...MONO, fontSize: 10, color: "var(--faint)" }}>{xs.length}</span>}>{g}</Label>
                  {xs.map((x) => {
                    const cx = customerOf(s, x.customerId);
                    const on = x.id === q.id;
                    return (
                      <Press key={x.id} onClick={() => choose(x.id)}
                        style={{ display: "grid", gridTemplateColumns: "64px minmax(0,1fr) auto", gap: 10, alignItems: "center",
                          padding: "7px 8px", borderRadius: 9, background: on ? "var(--accent-soft)" : undefined, color: "var(--body)" }}>
                        <span style={{ ...MONO, fontSize: 12, color: on ? "var(--accent)" : "var(--ink)" }}>{x.id}</span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cx.name}</span>
                          <span style={{ display: "block", fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {cx.city}, {cx.country} · {age(x.updatedAt)} ago
                          </span>
                        </span>
                        <span style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums", color: "var(--body)", whiteSpace: "nowrap" }}>{money(quoteTotal(s, x), x.currency)}</span>
                      </Press>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── catalogue picker ─────────────────────────────────────────────────────── */

function Catalogue({ s, q, onClose }: { s: MMState; q: Quote; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const t = term.trim().toLowerCase();
  const list = s.products.filter((p) => !t || (p.name + " " + p.range + " " + p.series + " " + p.category).toLowerCase().includes(t));
  const add = (p: Product) => {
    const idx = q.lines.findIndex((l) => l.productId === p.id);
    if (idx >= 0) {
      setLine(q.id, idx, { qty: q.lines[idx].qty + 1 });
      toast("Quantity raised", p.name + " on " + q.id + " is now " + (q.lines[idx].qty + 1) + ".");
    } else {
      addLine(q.id, p.id);
      toast("Machine added", p.name + " added to " + q.id + " at list price.");
    }
  };
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface-faint)", padding: 12, marginBottom: 12, animation: "rowIn .25s var(--ease) both" }}>
      <Row gap={8}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <Icon d={I.search} size={14} style={{ position: "absolute", left: 11, top: 10, color: "var(--faint)" }} />
          <input autoFocus value={term} onChange={(ev) => setTerm(ev.target.value)} placeholder="Search the 18 machines by name, range or category"
            style={{ ...inputStyle, width: "100%", paddingLeft: 32 }} />
        </div>
        <Button size="sm" kind="ghost" icon={I.x} onClick={onClose} title="Close the catalogue" />
      </Row>
      <div className="mm-scroll" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 8, marginTop: 10, maxHeight: 330, overflowY: "auto" }}>
        {list.map((p) => {
          const st = stockOf(s, p);
          const onQuote = q.lines.some((l) => l.productId === p.id);
          const price = q.currency === "GBP" ? p.gbp : p.eur;
          const a = availability(s, p, 1);
          const stockText = st.available > 0 ? st.available + " available" : st.incomingFree > 0 ? st.incomingFree + " free in intake" : "No stock";
          return (
            <Press key={p.id} onClick={() => add(p)} title={a.text ?? "Available from County Derry stock"}
              style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr)", gap: 9, alignItems: "center", padding: 8, borderRadius: 12,
                border: "1px solid " + (onQuote ? "var(--accent-line)" : "var(--border)") }}>
              <ProductThumb p={p} size={40} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12.5, color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap" }}>
                  <span style={{ color: "var(--body)", fontVariantNumeric: "tabular-nums" }}>{money(price, q.currency)}</span>
                  <span style={{ color: st.available > 0 ? "var(--ok)" : st.incomingFree > 0 ? "var(--warn)" : "var(--faint)" }}>{stockText}</span>
                  {onQuote && <span style={{ color: "var(--accent)" }}>on quote</span>}
                </span>
              </span>
            </Press>
          );
        })}
        {list.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: "var(--dim)" }}>No machine matches that search.</div>}
      </div>
    </div>
  );
}
