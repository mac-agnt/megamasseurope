import type { CSSProperties, ReactNode } from "react";
import { Badge, Icon, I, MONO, toneInk, type Tone } from "../../ui";
import { EQ_NOTE } from "./calc";

/* Small presentational pieces shared by the Insights and Agents pages.
   Theme tokens only, so they re-skin with Pulse. */

/** Grid template that never goes past `max` columns and drops a column whenever one would be under `min` px. */
export const upTo = (max: number, min: number, gap = 14) =>
  "repeat(auto-fit,minmax(max(" + min + "px,calc((100% - " + (max - 1) * gap + "px) / " + max + " - 1px)),1fr))";

/** Weighted row that wraps: panes keep their proportions side by side and stack full width when the panel is narrow. */
export function Flow({ children, gap = 14, style }: { children: ReactNode; gap?: number; style?: CSSProperties }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap, alignItems: "stretch", minWidth: 0, ...style }}>{children}</div>;
}
export function Pane({ grow = 1, basis = 300, children, style }: { grow?: number; basis?: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ flex: grow + " 1 " + basis + "px", minWidth: 0, display: "flex", flexDirection: "column", ...style }}>{children}</div>;
}
/** Card style that fills its pane, so cards in one row share a height. */
export const fill: CSSProperties = { flex: 1, display: "flex", flexDirection: "column" };

/** Shown wherever EUR and GBP have been added together. */
export function EqBadge({ style }: { style?: CSSProperties }) {
  return <Badge tone="neutral" style={style}>{EQ_NOTE}</Badge>;
}

/** 100% composition bar with a legend underneath. */
export function SplitBar({ parts, height = 12, format = (n) => String(n), legend = true }: {
  parts: { label: ReactNode; value: number; tone: Tone }[]; height?: number; format?: (n: number) => string; legend?: boolean;
}) {
  const shown = parts.filter((p) => p.value > 0);
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", gap: 3, height, minWidth: 0 }}>
        {shown.map((p, i) => (
          <div key={i} title={format(p.value)} style={{ flex: p.value + " 1 0", minWidth: 4, borderRadius: 4, background: toneInk(p.tone),
            transformOrigin: "left", animation: "sweep .6s var(--ease) both", animationDelay: i * 70 + "ms" }} />
        ))}
        {shown.length === 0 && <div style={{ flex: 1, borderRadius: 4, border: "1px dashed var(--border-strong)" }} />}
      </div>
      {legend && <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: 12 }}>
        {parts.map((p, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--dim)", minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: toneInk(p.tone), flex: "none" }} />
            {p.label}
            <span style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{format(p.value)}</span>
          </span>
        ))}
      </div>}
    </div>
  );
}

/** Label over a figure, for inline stat rows inside cards. */
export function Stat({ label, value, sub, tone, big }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: Tone; big?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ fontSize: big ? 30 : 20, fontWeight: 600, letterSpacing: big ? "-1px" : "-.5px", lineHeight: 1.1, marginTop: 5,
        color: tone ? toneInk(tone) : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 4, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

/** A clickable record line: what it is on the left, the money or age on the right. */
export function RecRow({ title, sub, value, meta, onClick, lead, wrap }: {
  title: ReactNode; sub?: ReactNode; value?: ReactNode; meta?: ReactNode; onClick?: () => void; lead?: ReactNode; wrap?: boolean;
}) {
  const clip: CSSProperties = wrap ? { lineHeight: 1.4 } : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  return (
    <div onClick={onClick} className={onClick ? "mm-row" : undefined}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", margin: "0 -10px", borderRadius: 10, cursor: onClick ? "pointer" : undefined, minWidth: 0 }}>
      {lead}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", ...clip }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, ...clip }}>{sub}</div>}
      </div>
      {(value !== undefined || meta) && (
        <div style={{ textAlign: "right", flex: "none" }}>
          {value !== undefined && <div style={{ fontSize: 13, color: "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</div>}
          {meta && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap" }}>{meta}</div>}
        </div>
      )}
    </div>
  );
}

/** Legend key: a small square in a tone, matching a segment of a SplitBar. */
export function Key({ tone }: { tone: Tone }) {
  return <span style={{ width: 8, height: 8, borderRadius: 2, background: toneInk(tone), flex: "none", display: "inline-block" }} />;
}

/** Filter chip. */
export function Chip({ on, onClick, children, count }: { on: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button onClick={onClick} className="mm-btn"
      style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 30, padding: "0 12px 0 6px", borderRadius: 999, cursor: "pointer",
        border: "1px solid " + (on ? "var(--border-strong)" : "var(--border)"), background: on ? "var(--pill-bg)" : "var(--surface)",
        color: on ? "var(--pill-ink)" : "var(--body)", fontSize: 12, fontWeight: on ? 600 : 500, whiteSpace: "nowrap", flex: "none" }}>
      {children}
      {count !== undefined && <span style={{ ...MONO, fontSize: 10.5, color: on ? "var(--pill-ink)" : "var(--faint)", opacity: on ? 0.7 : 1 }}>{count}</span>}
    </button>
  );
}

/** Text link styled as an action, with an arrow. */
export function GoLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="mm-btn"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, background: "none", padding: 0, cursor: "pointer",
        color: "var(--accent)", fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap" }}>
      {children}<Icon d={I.arrow} size={13} stroke={2} />
    </button>
  );
}

/** Thin horizontal bar sized against a maximum, no background track. */
export function Bar({ value, max, tone = "accent", height = 5 }: { value: number; max: number; tone?: Tone; height?: number }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return <div style={{ height, width: w + "%", borderRadius: 3, background: toneInk(tone), opacity: 0.4 + 0.6 * (max ? value / max : 0),
    transformOrigin: "left", animation: "sweep .6s var(--ease) both" }} />;
}
