import type { CSSProperties, ReactNode } from "react";
import type { MMState, Quote } from "../../types";
import { contactOf, customerOf, ix, quoteEquipment, quoteFreight } from "../../select";
import { countryName, dateLong, money } from "../../format";
import { I, Icon, MONO } from "../../ui";
import { DAY, freightOf, rangeLabel } from "./lib";

/* The customer-facing quotation, rendered as a printed sheet. A light paper
   surface defined with rgba (works in every Pulse theme) and a dark header band
   so the orange-on-transparent Mega Mass Europe logo reads correctly. */

const PAPER = {
  bg: "rgba(251,251,249,1)",
  ink: "rgba(17,18,20,.95)",
  body: "rgba(17,18,20,.8)",
  dim: "rgba(17,18,20,.56)",
  faint: "rgba(17,18,20,.42)",
  rule: "rgba(17,18,20,.16)",
  soft: "rgba(17,18,20,.08)",
  tint: "rgba(17,18,20,.035)",
  band: "rgba(9,9,10,1)",
  bandInk: "rgba(255,255,255,.95)",
  bandDim: "rgba(255,255,255,.52)",
};

const cap: CSSProperties = { ...MONO, fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: PAPER.faint };

function Meta({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={cap}>{k}</div>
      <div style={{ marginTop: 4, fontSize: 12.5, color: PAPER.ink, fontWeight: 500 }}>{v}</div>
    </div>
  );
}

function TotalRow({ k, v, sub, strong }: { k: ReactNode; v: ReactNode; sub?: ReactNode; strong?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: strong ? "10px 0 0" : "5px 0" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: strong ? 13 : 12.5, color: strong ? PAPER.ink : PAPER.body, fontWeight: strong ? 600 : 400 }}>{k}</div>
        {sub && <div style={{ fontSize: 11, color: PAPER.faint, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: strong ? 17 : 12.5, fontWeight: strong ? 700 : 500, color: PAPER.ink, letterSpacing: strong ? "-.3px" : undefined,
        fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</div>
    </div>
  );
}

export default function QuotePreview({ s, q }: { s: MMState; q: Quote }) {
  const c = customerOf(s, q.customerId);
  const ct = contactOf(s, c);
  const e = ix(s).enquiry[q.enquiryId];
  const f = freightOf(s, q);
  const P = ix(s).product;
  const equipment = quoteEquipment(q);
  const ship = quoteFreight(s, q);
  const issued = q.sentAt ?? s.now;
  const validUntil = issued + q.validDays * DAY;
  const dest = f?.destination ?? (c.city + (e?.postcode ? " " + e.postcode : "") + ", " + countryName(c.country));
  const cur = q.currency;

  return (
    <div style={{ background: PAPER.bg, color: PAPER.body, borderRadius: 8, overflow: "hidden", fontSize: 12.5, lineHeight: 1.5,
      boxShadow: "0 1px 0 var(--glass-highlight), 0 22px 60px var(--glass-shadow)", minWidth: 0 }}>
      {/* header band */}
      <div style={{ background: PAPER.band, padding: "22px 28px", display: "flex", alignItems: "center", gap: 16 }}>
        <img src="/brand/megamass-logo.png" alt="Mega Mass Europe" style={{ height: 30, width: "auto", display: "block", flex: "none" }} />
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ ...MONO, fontSize: 9.5, letterSpacing: ".26em", color: PAPER.bandDim }}>QUOTATION</div>
          <div style={{ ...MONO, fontSize: 19, fontWeight: 600, color: PAPER.bandInk, marginTop: 3, letterSpacing: ".02em" }}>{q.id}</div>
        </div>
      </div>

      <div style={{ padding: "22px 28px 22px" }}>
        {/* document facts */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(96px,1fr))", gap: 14, paddingBottom: 18, borderBottom: "1px solid " + PAPER.soft }}>
          <Meta k="Issue date" v={dateLong(issued)} />
          <Meta k="Valid until" v={dateLong(validUntil)} />
          <Meta k="Currency" v={cur === "GBP" ? "GBP (£)" : "EUR (€)"} />
          <Meta k="Your reference" v={<span style={MONO}>{q.enquiryId}</span>} />
        </div>

        {/* parties */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 18, padding: "18px 0" }}>
          <div style={{ minWidth: 0 }}>
            <div style={cap}>Prepared for</div>
            <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: PAPER.ink }}>{c.name}</div>
            <div style={{ color: PAPER.body }}>{ct.name}, {ct.role}</div>
            <div style={{ color: PAPER.body }}>Delivery: {dest}</div>
            <div style={{ color: PAPER.dim }}>{ct.email}</div>
            <div style={{ color: PAPER.dim }}>{ct.phone}</div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={cap}>From</div>
            <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: PAPER.ink }}>Mega Mass Europe</div>
            <div style={{ color: PAPER.body }}>Official UK and EU distributor of Mega Mass</div>
            <div style={{ color: PAPER.body }}>Warehouse: County Derry, Northern Ireland</div>
            <div style={{ color: PAPER.dim }}>sales@megamasseurope.com</div>
            <div style={{ color: PAPER.dim }}>+44 7388 204997</div>
          </div>
        </div>

        {/* lines */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 48px 92px 96px", gap: 10, padding: "8px 10px", background: PAPER.tint, borderRadius: 6 }}>
          <span style={cap}>Machine</span>
          <span style={{ ...cap, textAlign: "right" }}>Units</span>
          <span style={{ ...cap, textAlign: "right" }}>Unit price</span>
          <span style={{ ...cap, textAlign: "right" }}>Line total</span>
        </div>
        {q.lines.length === 0 && <div style={{ padding: "16px 10px", color: PAPER.faint }}>No machines on this quotation yet.</div>}
        {q.lines.map((l, i) => {
          const p = P[l.productId];
          return (
            <div key={l.productId + i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 48px 92px 96px", gap: 10, alignItems: "baseline",
              padding: "9px 10px", borderBottom: "1px solid " + PAPER.soft }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: PAPER.ink, fontWeight: 500 }}>{p?.name ?? l.productId}</div>
                {p && <div style={{ fontSize: 11, color: PAPER.faint }}>{rangeLabel(p, ", ")}</div>}
              </div>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: PAPER.ink }}>{l.qty}</span>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money(l.unitPrice, cur)}</span>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: PAPER.ink, fontWeight: 500 }}>{money(l.unitPrice * l.qty, cur)}</span>
            </div>
          );
        })}

        {/* totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <div style={{ width: "100%", maxWidth: 330 }}>
            <TotalRow k="Equipment subtotal" v={money(equipment, cur)} />
            <TotalRow k={"Shipping to " + (c.city || countryName(c.country))} sub={f?.service}
              v={ship === null ? <span style={{ fontSize: 12, fontWeight: 500, color: PAPER.dim }}>Pending carrier rate</span> : money(ship, cur)} />
            <div style={{ padding: "5px 0", fontSize: 12, color: PAPER.dim, fontStyle: "italic" }}>VAT: treatment pending confirmation</div>
            <div style={{ height: 1, background: PAPER.rule, marginTop: 4 }} />
            <TotalRow strong k="Total excluding VAT"
              v={ship === null ? <span style={{ fontSize: 12.5, fontWeight: 600, color: PAPER.dim }}>Pending carrier rate</span> : money(equipment + ship, cur)}
              sub={ship === null ? "Equipment " + money(equipment, cur) + " plus shipping once the carrier replies" : undefined} />
          </div>
        </div>

        {/* terms */}
        <div style={{ display: "grid", gap: 14, marginTop: 20, paddingTop: 16, borderTop: "1px solid " + PAPER.soft }}>
          <div>
            <div style={cap}>Commercial notes</div>
            {q.notes.length ? (
              <ul style={{ margin: "6px 0 0", paddingLeft: 16, color: PAPER.body }}>
                {q.notes.map((n, i) => <li key={i} style={{ marginTop: i ? 4 : 0 }}>{n}</li>)}
              </ul>
            ) : <div style={{ marginTop: 6, color: PAPER.faint }}>None added.</div>}
          </div>
          <div>
            <div style={cap}>Validity</div>
            <div style={{ marginTop: 6 }}>
              Valid for {q.validDays} days from the issue date, until {dateLong(validUntil)}.
              {f?.carrierQuote && <> Shipping price based on the carrier rate held until {dateLong(new Date(f.carrierQuote.validUntil).getTime())}.</>}
            </div>
          </div>
          <div style={{ border: "1px dashed " + PAPER.rule, borderRadius: 6, padding: "9px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1, color: PAPER.body }}>Payment conditions: to be confirmed</span>
            <span style={{ ...cap, fontSize: 8.5 }}>Placeholder</span>
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 22, paddingTop: 12, borderTop: "1px solid " + PAPER.rule,
          fontSize: 11, color: PAPER.dim }}>
          <span style={{ flex: 1, minWidth: 220 }}>sales@megamasseurope.com · +44 7388 204997 · megamasseurope.com</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", borderRadius: 999,
            border: "1px solid " + PAPER.rule, color: PAPER.ink, fontSize: 10.5, fontWeight: 600, letterSpacing: ".04em" }}>
            <Icon d={I.lock} size={11} stroke={2.2} />Confidential pricing
          </span>
        </div>
      </div>
    </div>
  );
}
