import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { MMState, Supplier } from "../../types";
import { setMarkup } from "../../store";
import { num } from "../../format";
import { Badge, Button, Cell, I, Icon, MONO, Note, ProductThumb, Row, toneInk, type Tone } from "../../ui";
import { carriers, markupLocked, regionShort, seriesText, splitPlace, waitText, DAY, type FreightView } from "./lib";

/* Small building blocks shared by the four Freight tabs. Theme tokens only. */

const MINUS = "M5 12h14";

export const joinAnd = (a: string[]) => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);

/** Carriers were named on a call and are not confirmed supplier records. */
export function ToConfirm({ sup }: { sup?: Supplier }) {
  if (!sup || sup.confirmed) return null;
  return (
    <span title={sup.note} style={{ display: "inline-flex", flex: "none" }}>
      <Badge tone="neutral" style={{ height: 19, padding: "0 7px", fontSize: 10.5 }}>To confirm</Badge>
    </span>
  );
}

/** One line on the carriers: who they are, that they are unconfirmed, and that nothing is integrated. */
export function CarrierNote({ s, style }: { s: MMState; style?: CSSProperties }) {
  const list = carriers(s);
  const open = list.filter((c) => !c.confirmed);
  const named = joinAnd(list.map((c) => c.name + " (" + regionShort(c) + ")"));
  const confirm = !open.length ? "" : open.length === list.length
    ? (list.length === 2 ? " Neither is" : " None is") + " a confirmed supplier record yet."
    : " Still to confirm: " + joinAnd(open.map((c) => c.name)) + ".";
  return (
    <Note icon={I.truck} style={style}>
      {named} {list.length === 1 ? "was" : "were"} named on the call.{confirm} There is no carrier integration: rate requests go out
      as emails Niall approves, and collections are booked with the carrier directly.
    </Note>
  );
}

export function CarrierCell({ sup }: { sup?: Supplier }) {
  return <Cell top={<span style={{ fontSize: 12.5 }}>{sup?.name ?? "Carrier"}</span>} sub={regionShort(sup) + (sup && !sup.confirmed ? ", to confirm" : "")} />;
}

export function PlaceCell({ v }: { v: FreightView }) {
  const [top, sub] = splitPlace(v.f.destination);
  return <Cell top={top} sub={v.postcodeMissing ? <span style={{ color: "var(--warn)" }}>Postcode missing</span> : sub} />;
}

export function MachinesCell({ v, thumb = true }: { v: FreightView; thumb?: boolean }) {
  const first = v.machines[0];
  if (!first) return <span style={{ color: "var(--faint)" }}>None listed</span>;
  const more = v.machines.length - 1;
  return (
    <Row gap={8}>
      {thumb && <ProductThumb p={first.p} size={28} />}
      <Cell top={(first.qty > 1 ? first.qty + " × " : "") + first.p.name}
        sub={more > 0 ? "+" + more + " more machine" + (more > 1 ? "s" : "") : seriesText(first.p.series)} />
    </Row>
  );
}

/** Catalogue weights and sizes. Anything the catalogue lists as TBC is flagged, never estimated. */
export function DimsCell({ v }: { v: FreightView }) {
  const kg = v.machines.reduce((n, m) => n + (m.p.weightKg ?? 0) * m.qty, 0);
  const tbcUnits = v.machines.filter((m) => m.p.dims === null || m.p.weightKg === null).reduce((n, m) => n + m.qty, 0);
  if (!tbcUnits) {
    return <Cell top={num(kg) + " kg"} sub={v.machines.length === 1 ? v.machines[0].p.dims : "All sizes listed"} />;
  }
  return (
    <div style={{ minWidth: 0 }}>
      <Row gap={6}>
        <Badge tone="warn" style={{ height: 20, padding: "0 7px", fontSize: 11 }}>{tbcUnits} TBC</Badge>
        {kg > 0 && <span style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>{num(kg)} kg</span>}
      </Row>
      <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {kg > 0 ? "Known weights only" : "Catalogue says TBC"}
      </div>
    </div>
  );
}

export function WaitBadge({ v }: { v: FreightView }) {
  const tone: Tone = v.late ? "bad" : v.waitMs > 2 * DAY ? "warn" : "neutral";
  return <Badge tone={tone}>{waitText(v.waitMs)}</Badge>;
}

/** Markup editor. Writes straight to the record with setMarkup, so charges and totals update live. */
export function MarkupInput({ v, compact }: { v: FreightView; compact?: boolean }) {
  const value = v.f.markupPct;
  const locked = markupLocked(v);
  const show = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const [txt, setTxt] = useState(show(value));
  useEffect(() => { setTxt(show(value)); }, [value]);
  const commit = (n: number) => { if (!locked && Number.isFinite(n)) setMarkup(v.f.id, n); };
  const h = compact ? 28 : 34;
  const btn: CSSProperties = { width: h - 6, height: h - 2, border: 0, background: "none", color: "var(--dim)", padding: 0,
    cursor: locked ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
  return (
    <div title={locked ?? "Markup on the carrier cost. Changes need Niall's approval before the quote is sent."}
      onClick={(e) => e.stopPropagation()}
      style={{ display: "inline-flex", alignItems: "center", height: h, borderRadius: 10, flex: "none", background: "var(--surface-2)",
        border: "1px solid " + (locked ? "var(--border)" : "var(--border-strong)"), opacity: locked ? 0.55 : 1 }}>
      <button type="button" aria-label="Lower the markup by one point" disabled={!!locked || value <= 0} onClick={() => commit(value - 1)} style={btn}>
        <Icon d={MINUS} size={12} stroke={2.2} />
      </button>
      <input aria-label="Markup percent" value={txt} disabled={!!locked} inputMode="decimal"
        onChange={(e) => { setTxt(e.target.value); commit(parseFloat(e.target.value)); }}
        onBlur={() => setTxt(show(value))}
        style={{ width: compact ? 30 : 38, height: h - 2, border: 0, padding: 0, background: "none", color: "var(--ink)", textAlign: "right",
          fontSize: compact ? 12.5 : 14, fontWeight: 600, outline: "none", fontFamily: "inherit", fontVariantNumeric: "tabular-nums" }} />
      <span style={{ fontSize: compact ? 12 : 13, color: "var(--dim)", paddingLeft: 2 }}>%</span>
      <button type="button" aria-label="Raise the markup by one point" disabled={!!locked || value >= 60} onClick={() => commit(value + 1)} style={btn}>
        <Icon d={I.plus} size={12} stroke={2.2} />
      </button>
    </div>
  );
}

/** A clearly labelled demo control (nothing real happens behind it). */
export function DemoButton({ onClick, children, title, icon = true }: { onClick: () => void; children: ReactNode; title?: string; icon?: boolean }) {
  return (
    <span title={title ?? "Demo control: records a carrier reply as if the email had just arrived. No carrier is contacted."}
      onClick={(e) => e.stopPropagation()}
      style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 2px 2px 9px", borderRadius: 999,
        border: "1px dashed var(--border-strong)", flex: "none" }}>
      <span style={{ ...MONO, fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--faint)" }}>Demo</span>
      <Button kind="ghost" size="sm" icon={icon ? I.spark : undefined} onClick={onClick}>{children}</Button>
    </span>
  );
}

/** Numbered stage markers for a showcase block: done, current or upcoming. */
export function StepDots({ steps, stage }: { steps: number[]; stage: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, flex: "none" }}>
      {steps.map((n) => {
        const done = n - 1 < stage, on = n - 1 === stage;
        return (
          <span key={n} style={{ width: 20, height: 20, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, background: done ? "var(--accent)" : on ? "var(--accent-soft)" : "var(--surface-2)",
            color: done ? "var(--on-accent)" : on ? "var(--accent)" : "var(--faint)", border: on ? "1.5px solid var(--accent)" : "1px solid var(--border)" }}>
            {done ? <Icon d={I.check} size={11} stroke={3} /> : n}
          </span>
        );
      })}
    </span>
  );
}

/** One panel of the workflow showcase. Lights up when it holds the current stage. */
export function Block({ title, steps, stage, right, children, style }: {
  title: ReactNode; steps: number[]; stage: number; right?: ReactNode; children: ReactNode; style?: CSSProperties;
}) {
  const active = steps.some((n) => n - 1 === stage);
  return (
    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px 16px", borderRadius: 16,
      border: "1px solid " + (active ? "var(--accent-line)" : "var(--border)"), background: active ? "var(--accent-faint)" : "var(--surface-faint)", ...style }}>
      <Row gap={10}>
        <StepDots steps={steps} stage={stage} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.1px" }}>{title}</span>
        {right}
      </Row>
      {children}
    </div>
  );
}

/** Label and number on one line, separated by a hairline above. */
export function CalcRow({ label, value, sub, strong }: { label: ReactNode; value: ReactNode; sub?: ReactNode; strong?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: strong ? "var(--ink)" : "var(--body)", fontWeight: strong ? 600 : 400 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: strong ? 16 : 13, fontWeight: strong ? 600 : 500, color: "var(--ink)", fontVariantNumeric: "tabular-nums",
        letterSpacing: strong ? "-.3px" : undefined, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

/** Small pill: faint label, strong value. */
export function MiniStat({ label, value, tone }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 11px", borderRadius: 999,
      border: "1px solid var(--border)", background: "var(--surface-2)", flex: "none" }}>
      <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: tone ? toneInk(tone) : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </span>
  );
}

/** Horizontal scroll wrapper for wide tables, so narrow windows never squash the columns. */
export const fits = (w: number, min: number) => w === 0 || w >= min + 6; // 0: not measured yet
export function Wide({ min, children }: { min: number; children: ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: min }}>{children}</div>
    </div>
  );
}

/** Measured width of an element, kept current with ResizeObserver. 0 until measured. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => { const e = entries[0]; if (e) setW(e.contentRect.width); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}
