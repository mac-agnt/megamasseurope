import type { ReactNode } from "react";
import type { Invoice, MMState, Order, OrderStatus, Reservation } from "../../types";
import { daysOverdue, GBP_TO_EUR, invoiceStatus, ix, outstanding, productOf } from "../../select";
import { dateShort, money, plural, until } from "../../format";
import { Cell, Icon, I, MONO, ProductThumb, Row, toneBg, toneInk, type Tone } from "../../ui";

/* Shared logic and small pieces for the Orders and Products & Stock modules.
   Payment state is always read from the FreshBooks invoice and its recorded
   payments, never from the order status, so an invoice existing never makes
   a sale look paid. */

export const RATE_NOTE = "EUR eq. at demo rate £1 = €" + GBP_TO_EUR.toFixed(2);
export const FB_SIM = "Simulated in this demo: FreshBooks unchanged.";

export const LIFECYCLE: OrderStatus[] = [
  "Quote accepted", "Invoice created", "Payment pending", "Payment confirmed", "Equipment allocated", "Dispatched", "Delivered",
];

export type LineLike = { productId: string; qty: number };

export const unitCount = (lines: LineLike[]) => lines.reduce((n, l) => n + l.qty, 0);
export const lineLabel = (s: MMState, l: LineLike) => (l.qty > 1 ? l.qty + " × " : "") + productOf(s, l.productId).name;
export const linesText = (s: MMState, lines: LineLike[]) => lines.map((l) => lineLabel(s, l)).join(", ");
export const unitsHeld = (rs: Reservation[]) => rs.reduce((n, r) => n + r.units, 0);

export const invoiceOf = (s: MMState, o: Order): Invoice | undefined => (o.invoiceId ? ix(s).invoice[o.invoiceId] : undefined);
export const isShipped = (o: Order) => o.status === "Dispatched" || o.status === "Delivered";
export const lcFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export function lastPaidAt(s: MMState, invoiceId: string): number | null {
  let at: number | null = null;
  for (const p of s.payments) if (p.invoiceId === invoiceId && (at === null || p.at > at)) at = p.at;
  return at;
}

/** Short name of an incoming shipment, e.g. "Flex intake". */
export function intakeName(s: MMState, shipmentId?: string): string {
  const sh = s.shipments.find((x) => x.id === shipmentId) ?? s.shipments[0];
  return sh ? sh.name.split(" ")[0] + " intake" : "Incoming";
}

/* ── payment ─────────────────────────────────────────────────────────────── */

export type PayState = { label: string; tone: Tone; paid: boolean; detail: string };

export function payState(s: MMState, o: Order): PayState {
  const inv = invoiceOf(s, o);
  if (!inv) return { label: "No invoice yet", tone: "neutral", paid: false, detail: "To raise in FreshBooks" };
  const st = invoiceStatus(s, inv);
  if (st === "Paid") {
    const at = lastPaidAt(s, inv.id);
    return { label: "Paid", tone: "ok", paid: true, detail: at ? "Received " + dateShort(at) : "Paid in FreshBooks" };
  }
  const out = money(outstanding(s, inv), inv.currency);
  if (st === "Overdue") return { label: plural(daysOverdue(s, inv), "day") + " overdue", tone: "bad", paid: false, detail: out + " outstanding" };
  if (st === "Part paid") return { label: "Part paid", tone: "warn", paid: false, detail: out + " left, due " + until(inv.dueAt) };
  return { label: "Awaiting payment", tone: "warn", paid: false, detail: "Due " + until(inv.dueAt) };
}

export type PromiseState = { label: string; tone: Tone; open: boolean };

export function promiseState(s: MMState, inv: Invoice): PromiseState | null {
  const p = inv.promise;
  if (!p) return null;
  if (invoiceStatus(s, inv) === "Paid") return { label: p.broken ? "Paid late" : "Kept", tone: "ok", open: false };
  if (p.broken) return { label: "Broken", tone: "bad", open: true };
  if (p.date < Date.now()) return { label: "Date passed", tone: "bad", open: true };
  return { label: "Due " + until(p.date), tone: "warn", open: true };
}

export const AGE_BUCKETS = [
  { label: "0 to 14 days", min: 0, max: 14 },
  { label: "15 to 30 days", min: 15, max: 30 },
  { label: "31 to 60 days", min: 31, max: 60 },
  { label: "Over 60 days", min: 61, max: Number.POSITIVE_INFINITY },
];

/* ── allocation and readiness ────────────────────────────────────────────── */

export type AllocLine = LineLike & { stock: number; incoming: number; open: number; shipmentId?: string };
export type Alloc = { lines: AllocLine[]; units: number; stock: number; incoming: number; open: number; shipped: boolean; fromStock: boolean };

/** Where each machine on an order comes from, read from the reservations. */
export function allocation(s: MMState, o: Order): Alloc {
  const shipped = isShipped(o);
  const rs = s.reservations.filter((r) => r.orderId === o.id);
  const lines: AllocLine[] = o.lines.map((l) => {
    if (shipped) return { productId: l.productId, qty: l.qty, stock: 0, incoming: 0, open: 0 };
    const mine = rs.filter((r) => r.productId === l.productId);
    const inc = mine.filter((r) => r.source === "Incoming");
    const stock = Math.min(l.qty, unitsHeld(mine.filter((r) => r.source === "Warehouse stock")));
    const incoming = Math.min(l.qty - stock, unitsHeld(inc));
    return { productId: l.productId, qty: l.qty, stock, incoming, open: l.qty - stock - incoming, shipmentId: inc[0]?.shipmentId };
  });
  const sum = (k: "stock" | "incoming" | "open") => lines.reduce((n, l) => n + l[k], 0);
  return { lines, units: unitCount(o.lines), stock: sum("stock"), incoming: sum("incoming"), open: sum("open"), shipped,
    fromStock: !shipped && lines.every((l) => l.stock === l.qty) };
}

export function allocationText(a: Alloc): { label: string; tone: Tone; sub: string } {
  if (a.shipped) return { label: "Left County Derry", tone: "neutral", sub: "No stock held" };
  if (a.fromStock) return { label: a.stock + " from stock", tone: "ok", sub: "County Derry warehouse" };
  const parts: string[] = [];
  if (a.stock) parts.push(a.stock + (a.incoming || a.open ? " stock" : " from stock"));
  if (a.incoming) parts.push(a.incoming + " incoming");
  if (a.open) parts.push(a.open + " not allocated");
  return { label: parts.join(", "), tone: a.open ? "bad" : "warn", sub: a.incoming ? "Flex units, awaiting arrival" : "Needs allocating" };
}

/** Line-level source text for cards. */
export function sourceText(s: MMState, l: AllocLine, shipped: boolean): { label: string; tone: Tone } {
  if (shipped) return { label: "Shipped", tone: "neutral" };
  if (l.stock === l.qty) return { label: "County Derry stock", tone: "ok" };
  if (l.open > 0) return { label: l.open + " not allocated", tone: "bad" };
  const name = intakeName(s, l.shipmentId);
  if (l.stock > 0) return { label: l.stock + " from stock, " + l.incoming + " on " + name, tone: "warn" };
  return { label: name + ", awaiting arrival", tone: "warn" };
}

export function readiness(s: MMState, o: Order): { ready: boolean; why: string } {
  const a = allocation(s, o);
  if (a.shipped) return { ready: false, why: o.status === "Delivered" ? "Delivered" : "On its way" };
  const p = payState(s, o);
  if (!p.paid) return { ready: false, why: invoiceOf(s, o) ? "Payment not confirmed in FreshBooks (" + lcFirst(p.label) + ")" : "No FreshBooks invoice yet" };
  if (a.incoming > 0) {
    const names = a.lines.filter((l) => l.incoming > 0).map((l) => (l.incoming > 1 ? l.incoming + " × " : "") + productOf(s, l.productId).name);
    return { ready: false, why: "Waiting on the " + intakeName(s, a.lines.find((l) => l.incoming > 0)?.shipmentId) + " for " + names.join(", ") + ". Arrival not confirmed." };
  }
  if (a.open > 0) return { ready: false, why: plural(a.open, "machine") + " not allocated yet" };
  return { ready: true, why: "Paid in FreshBooks and " + (a.units === 1 ? "the machine is" : "all " + a.units + " machines are") + " reserved from County Derry stock" };
}

/** Delivery note for an order. An ETA written before dispatch (e.g. "Collection booking pending")
    is stale once the order is dispatched in this session, so it is not repeated then. */
export function etaOf(s: MMState, o: Order): string | undefined {
  if ((o.status === "Dispatched" || o.status === "Delivered") && o.dispatchedAt && o.dispatchedAt > s.now) return "Delivery date from the carrier to confirm";
  return o.eta;
}

export function carrierOf(s: MMState, o: Order) {
  const f = o.freightId ? ix(s).freight[o.freightId] : undefined;
  if (!f) return null;
  const name = s.suppliers.find((x) => x.id === f.carrierId)?.name ?? "Carrier";
  const booked = f.status === "Booked" || f.status === "Dispatched" || f.status === "Delivered";
  return { f, name, booked };
}

/* ── small presentational pieces ─────────────────────────────────────────── */

/** Mono uppercase figure label with a large number underneath. */
export function Fig({ label, value, sub, tone, size = 20 }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: Tone; size?: number }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...MONO, fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ fontSize: size, fontWeight: 600, letterSpacing: "-.5px", marginTop: 6, lineHeight: 1.1, color: tone ? toneInk(tone) : "var(--ink)",
        fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 5, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

/** Right-aligned two-line number cell for tables. */
export function NumCell({ top, sub, tone }: { top: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div style={{ textAlign: "right", minWidth: 0 }}>
      <div style={{ color: tone ? toneInk(tone) : "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{top}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap" }}>{sub}</div>}
    </div>
  );
}

/** Small coloured text, used for states inside table cells. */
export function Tinted({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span style={{ color: tone === "neutral" ? "var(--dim)" : toneInk(tone), whiteSpace: "nowrap" }}>{children}</span>;
}

const ORDER_TONE: Record<OrderStatus, Tone> = {
  "Quote accepted": "info", "Invoice created": "info", "Payment pending": "warn", "Payment confirmed": "ok",
  "Equipment allocated": "accent", Dispatched: "info", Delivered: "ok",
};

/** Order stage as a dot and text: narrower than a badge, truncates cleanly in tables. */
export function StageText({ status }: { status: OrderStatus }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: toneInk(ORDER_TONE[status]), flex: "none" }} />
      <span style={{ color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{status}</span>
    </span>
  );
}

/** Overlapping product thumbnails. */
export function Thumbs({ s, lines, size = 26, max = 3 }: { s: MMState; lines: LineLike[]; size?: number; max?: number }) {
  return (
    <span style={{ display: "inline-flex", flex: "none" }}>
      {lines.slice(0, max).map((l, i) => (
        <span key={l.productId + i} style={{ display: "inline-flex", marginLeft: i ? -Math.round(size * 0.36) : 0, borderRadius: Math.max(8, size * 0.22) + 1,
          boxShadow: "0 0 0 2px var(--surface)", position: "relative", zIndex: max - i }}>
          <ProductThumb p={productOf(s, l.productId)} size={size} />
        </span>
      ))}
    </span>
  );
}

/** Machines column: thumbnails, first line, the rest underneath. */
export function MachinesCell({ s, lines }: { s: MMState; lines: LineLike[] }) {
  const first = lines[0];
  return (
    <Row gap={10}>
      <Thumbs s={s} lines={lines} />
      <Cell top={first ? lineLabel(s, first) : "No machines"}
        sub={lines.length > 1 ? "+ " + linesText(s, lines.slice(1)) : plural(unitCount(lines), "machine")} />
    </Row>
  );
}

/** A clickable row with an icon tile, used for short action lists. */
export function ActionRow({ icon, tone = "neutral", title, sub, right, onClick }: {
  icon: string; tone?: Tone; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={onClick ? "mm-row" : undefined}
      style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto 14px", gap: 12, alignItems: "center", padding: "9px 10px",
        margin: "0 -10px", borderRadius: 12, cursor: onClick ? "pointer" : undefined }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: toneBg(tone), color: tone === "neutral" ? "var(--body)" : toneInk(tone),
        display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Icon d={icon} size={16} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{right}</div>
      {onClick ? <Icon d={I.chevron} size={14} style={{ color: "var(--faint)" }} /> : <span />}
    </div>
  );
}

/** One square per unit: filled for held units, dashed outline for free ones. */
export function UnitBlocks({ parts, size = 14 }: { parts: { n: number; tone: Tone | "free"; title?: string }[]; size?: number }) {
  const cells: { tone: Tone | "free"; title?: string }[] = [];
  for (const p of parts) for (let i = 0; i < p.n; i++) cells.push({ tone: p.tone, title: p.title });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {cells.map((c, i) => (
        <span key={i} title={c.title} style={{ width: size, height: size, borderRadius: Math.max(3, size * 0.28), flex: "none",
          background: c.tone === "free" ? "transparent" : toneInk(c.tone), border: c.tone === "free" ? "1px dashed var(--border-strong)" : "1px solid transparent",
          transformOrigin: "left", animation: "sweep .5s var(--ease) both", animationDelay: Math.min(i, 20) * 14 + "ms" }} />
      ))}
    </div>
  );
}

/** Legend entry for UnitBlocks. */
export function Key({ tone, children }: { tone: Tone | "free"; children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--dim)", whiteSpace: "nowrap" }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: tone === "free" ? "transparent" : toneInk(tone),
        border: tone === "free" ? "1px dashed var(--border-strong)" : "none" }} />
      {children}
    </span>
  );
}
