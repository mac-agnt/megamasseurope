import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { MMState, Quote, RecordKind } from "../../types";
import { openPanel } from "../../store";
import { Badge, I, Icon, MONO, inputStyle } from "../../ui";
import { flagsOf, heldApprovalFor, intakeFor } from "./lib";

/* Small pieces shared by the Quotes tabs. Theme tokens only. */

const KIND_ICON: Partial<Record<RecordKind, string>> = {
  enquiry: I.inbox, customer: I.building, quote: I.quote, freight: I.truck, order: I.order, invoice: I.file,
  followup: I.clock, product: I.box, supplier: I.building, shipment: I.box,
};

/** Pill that opens a record in the shared panel. */
export function RecordChip({ kind, id, label, title, compact }: { kind: RecordKind; id: string; label?: ReactNode; title?: string; compact?: boolean }) {
  return (
    <button className="mm-btn" title={title || "Open " + id}
      onClick={(e) => { e.stopPropagation(); openPanel(kind, id); }}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, height: compact ? 24 : 26, padding: compact ? "0 8px" : "0 10px", borderRadius: 999, flex: "none",
        border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--body)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
        maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
      {!compact && <Icon d={KIND_ICON[kind] || I.link} size={12} />}
      {label ?? <span style={{ ...MONO, fontSize: compact ? 11.5 : 12 }}>{id}</span>}
    </button>
  );
}

/** Clickable block that keeps the kit's .mm-row hover (an inline background would override it). Enter and Space activate it. */
export function Press({ onClick, title, style, children, className = "mm-row" }: {
  onClick: () => void; title?: string; style?: CSSProperties; children: ReactNode; className?: string;
}) {
  return (
    <div role="button" tabIndex={0} title={title} className={className}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      style={{ cursor: "pointer", minWidth: 0, ...style }}>
      {children}
    </div>
  );
}

/** Native checkbox in the theme accent. Clicks never reach the row underneath. */
export function Check({ on, onChange, mixed, title }: { on: boolean; onChange: () => void; mixed?: boolean; title?: string }) {
  return (
    <input type="checkbox" checked={on} title={title} aria-label={title}
      ref={(el) => { if (el) el.indeterminate = !!mixed; }}
      onClick={(e) => e.stopPropagation()} onChange={onChange}
      style={{ width: 15, height: 15, margin: 0, accentColor: "var(--accent)", cursor: "pointer", display: "block" }} />
  );
}

/** Flags worth a look before approving: stock, price override, missing dimensions, on hold. */
export function QuoteFlags({ s, q, empty = true }: { s: MMState; q: Quote; empty?: boolean }) {
  const f = flagsOf(s, q);
  const held = heldApprovalFor(s, q.id);
  const out: ReactNode[] = [];
  if (held) out.push(<Badge key="held" tone="neutral">On hold</Badge>);
  if (f.stockTone) {
    const intakeOnly = f.stock.every((x) => x.a.kind === "intake");
    const sh = intakeFor(s, f.stock[0].productId);
    const label = intakeOnly && sh ? sh.name.split(" ")[0] + " intake" : f.stock.some((x) => x.a.kind === "none") ? "No stock" : "Stock short";
    out.push(
      <span key="stock" title={f.stock.map((x) => x.name + ": " + x.a.text).join("\n")}>
        <Badge tone={f.stockTone}>{label}{f.stock.length > 1 ? " ×" + f.stock.length : ""}</Badge>
      </span>,
    );
  }
  if (f.override) out.push(<span key="ovr" title="A unit price differs from the price book. Needs Niall's approval."><Badge tone="warn">Override</Badge></span>);
  if (f.dims.length) out.push(<span key="dims" title={f.dims.join("\n")}><Badge tone="neutral">Dims missing</Badge></span>);
  if (q.overrideRequested) out.push(<span key="pq" title={q.overrideRequested}><Badge tone="accent">Pricing question</Badge></span>);
  if (!out.length) return empty ? <span style={{ fontSize: 12, color: "var(--faint)" }}>Clean</span> : null;
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 4, minWidth: 0 }}>{out}</div>;
}

/** Number field that keeps its own text while typing and commits valid values. */
export function NumField({ value, onCommit, prefix, suffix, width = 112, disabled, inputRef, min = 0, max, title }: {
  value: number; onCommit: (n: number) => void; prefix?: string; suffix?: string; width?: number; disabled?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void; min?: number; max?: number; title?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => { if (!focus) setText(String(value)); }, [value, focus]);
  const commit = (t: string) => {
    const n = parseFloat(t);
    if (!Number.isFinite(n) || n < min || (max !== undefined && n > max)) return;
    if (n !== value) onCommit(n);
  };
  const pad: CSSProperties = { paddingLeft: prefix ? 24 : 11, paddingRight: suffix ? 26 : 11 };
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", flex: "none" }} title={title}>
      {prefix && <span style={{ position: "absolute", left: 10, fontSize: 13, color: "var(--dim)", pointerEvents: "none" }}>{prefix}</span>}
      <input ref={inputRef} value={text} disabled={disabled} inputMode="decimal"
        onFocus={(e) => { setFocus(true); e.currentTarget.select(); }}
        onBlur={() => { setFocus(false); commit(text); }}
        onChange={(e) => { const t = e.target.value.replace(/[^0-9.]/g, ""); setText(t); commit(t); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") { setText(String(value)); e.currentTarget.blur(); }
        }}
        style={{ ...inputStyle, ...MONO, ...pad, width, height: 32, textAlign: "right", opacity: disabled ? 0.6 : 1 }} />
      {suffix && <span style={{ position: "absolute", right: 10, fontSize: 12.5, color: "var(--dim)", pointerEvents: "none" }}>{suffix}</span>}
    </span>
  );
}

/** Minus / count / plus. */
export function Stepper({ value, onChange, min = 1, disabled }: { value: number; onChange: (n: number) => void; min?: number; disabled?: boolean }) {
  const btn = (d: number, label: string, off: boolean): ReactNode => (
    <button className="mm-btn" aria-label={label} title={label} disabled={off || disabled}
      onClick={(e) => { e.stopPropagation(); onChange(value + d); }}
      style={{ width: 28, height: 30, border: 0, background: "none", color: off || disabled ? "var(--faint)" : "var(--ink)",
        cursor: off || disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <Icon d={d < 0 ? "M5 12h14" : I.plus} size={13} stroke={2} />
    </button>
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: 32, borderRadius: 10, border: "1px solid var(--border)",
      background: "var(--surface-2)", flex: "none", opacity: disabled ? 0.6 : 1 }}>
      {btn(-1, "One fewer", value <= min)}
      <span style={{ ...MONO, minWidth: 26, textAlign: "center", fontSize: 13, color: "var(--ink)" }}>{value}</span>
      {btn(1, "One more", false)}
    </span>
  );
}

/** One readiness item: icon, text, tone. */
export function ReadyItem({ tone, children, title }: { tone: "ok" | "warn" | "bad" | "neutral"; children: ReactNode; title?: string }) {
  const ink = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--bad)" : "var(--dim)";
  const icon = tone === "ok" ? I.check : tone === "neutral" ? I.clock : I.alert;
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--body)", minWidth: 0 }}>
      <span style={{ width: 20, height: 20, borderRadius: 7, flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: ink, background: tone === "ok" ? "var(--ok-soft)" : tone === "warn" ? "var(--warn-soft)" : tone === "bad" ? "var(--bad-soft)" : "var(--track)" }}>
        <Icon d={icon} size={12} stroke={2.2} />
      </span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </span>
  );
}

/** Larger confidential mark for the price books. */
export function ConfidentialBig({ children }: { children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 34, padding: "0 14px", borderRadius: 999,
      border: "1px solid var(--accent-line)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: 13, fontWeight: 600, letterSpacing: "-.1px" }}>
      <Icon d={I.lock} size={14} stroke={2.2} />{children}
    </span>
  );
}

/** Small mono value cell: 12.5px tabular. */
export function Num({ children, dim, strong }: { children: ReactNode; dim?: boolean; strong?: boolean }) {
  return <span style={{ ...MONO, fontSize: 12.5, color: dim ? "var(--dim)" : strong ? "var(--ink)" : "var(--body)", fontWeight: strong ? 600 : 400, whiteSpace: "nowrap" }}>{children}</span>;
}
