import { useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { Priority } from "../../types";
import { I, Icon, MONO, inputStyle, toneInk } from "../../ui";
import { EUR_EQ_NOTE, PRIORITY_TONE } from "./data";

/* Small pieces shared by the Enquiries tabs. Theme tokens only. */

export const ELLIPSIS: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 };

/** Enter or Space activates a div acting as a button. */
export const onKeyActivate = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

export function PriorityDot({ p, size = 8, style }: { p: Priority; size?: number; style?: CSSProperties }) {
  return <span title={p + " priority"} aria-label={p + " priority"}
    style={{ width: size, height: size, borderRadius: 999, background: toneInk(PRIORITY_TONE[p]), flex: "none", display: "inline-block", ...style }} />;
}

/** Up to two lines, then an ellipsis. For names that matter more than the space they get. */
export const CLAMP2: CSSProperties = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere", minWidth: 0 };

export function SearchBox({ value, onChange, placeholder, style }: { value: string; onChange: (v: string) => void; placeholder: string; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", minWidth: 0, ...style }}>
      <Icon d={I.search} size={14} style={{ position: "absolute", left: 11, top: 10, color: "var(--faint)", pointerEvents: "none" }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        style={{ ...inputStyle, width: "100%", paddingLeft: 32 }} />
    </div>
  );
}

/** A field as it arrived on the website quote form. Blank and flagged fields get a warning tint. */
export function FormBox({ label, value, warn, note, span, multiline }: {
  label: string; value: string; warn?: boolean; note?: string; span?: boolean; multiline?: boolean;
}) {
  return (
    <div style={{ minWidth: 0, gridColumn: span ? "1 / -1" : undefined }}>
      <div style={{ fontSize: 11, color: warn ? "var(--warn)" : "var(--dim)", fontWeight: 500, marginBottom: 5 }}>{label}</div>
      <div style={{ minHeight: 32, padding: multiline ? "9px 11px" : "7px 11px", borderRadius: 10, fontSize: 12.5, lineHeight: 1.5,
        color: "var(--ink)", overflowWrap: "anywhere", whiteSpace: multiline ? "pre-wrap" : undefined,
        background: warn ? "var(--warn-soft)" : "var(--surface-faint)",
        border: "1px solid " + (warn ? "color-mix(in srgb, var(--warn) 45%, transparent)" : "var(--border)") }}>
        {value}
      </div>
      {note && <div style={{ fontSize: 11, color: "var(--warn)", marginTop: 4 }}>{note}</div>}
    </div>
  );
}

/** The prepared reply: read-only until Edit Reply is pressed. Grows to fit the
    whole draft so the sign-off is never hidden. */
export function ReplyBox({ value, onChange, editing, rows = 6 }: { value: string; onChange: (v: string) => void; editing: boolean; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [value, editing]);
  return (
    <textarea ref={ref} value={value} readOnly={!editing} rows={rows} aria-label="Prepared reply" onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, height: "auto", width: "100%", padding: "12px 14px", lineHeight: 1.6, resize: editing ? "vertical" : "none",
        background: editing ? "var(--surface-2)" : "var(--surface-faint)", color: editing ? "var(--ink)" : "var(--body)",
        borderColor: editing ? "var(--accent-line)" : "var(--border)", cursor: editing ? "text" : "default" }} />
  );
}

/** Pill button used for cadence chips. */
export function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button onClick={onClick} title={title} aria-pressed={on} className="mm-btn"
      style={{ height: 28, padding: "0 12px", borderRadius: 999, fontSize: 12, fontWeight: on ? 600 : 500, cursor: "pointer", whiteSpace: "nowrap",
        background: on ? "var(--accent-soft)" : "var(--surface-2)", color: on ? "var(--accent)" : "var(--dim)",
        border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)") }}>
      {children}
    </button>
  );
}

/** A small stat without a card around it, for summary strips. */
export function MiniStat({ label, value, sub, style }: { label: ReactNode; value: ReactNode; sub?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ minWidth: 0, ...style }}>
      <div style={{ fontSize: 12, color: "var(--dim)", ...ELLIPSIS }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.6px", color: "var(--ink)", marginTop: 6, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

export function EurEqNote({ style }: { style?: CSSProperties }) {
  return <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "0 2px", ...style }}>{EUR_EQ_NOTE}</div>;
}

export function SmallLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...MONO, fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)", ...style }}>{children}</div>;
}

/** Text button for "Show all" style toggles. */
export function MoreButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ border: 0, background: "none", color: "var(--accent)", fontSize: 12.5, cursor: "pointer", padding: "6px 4px", fontFamily: "inherit" }}>
      {children}
    </button>
  );
}
