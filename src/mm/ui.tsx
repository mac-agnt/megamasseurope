import { useState, type CSSProperties, type ReactNode } from "react";
import type { Country, Currency, Product } from "./types";
import { initials, money } from "./format";

/* Mega Mass UI kit. Built only from Pulse theme tokens (var(--surface), --border,
   --accent, --ok, --warn, --bad, --ink/--body/--dim/--faint, --card-r, --mono),
   so every module looks like Pulse and re-themes with it. Use these instead of
   hand-styling new pages. */

export const MONO: CSSProperties = { fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums" };

/* ── icons (stroke paths, 24 grid) ───────────────────────────────────────── */
export const I = {
  inbox: "M3 13h4l1.5 3h7l1.5-3h4 M3 13l2.4-7A2 2 0 0 1 7.3 4.6h9.4a2 2 0 0 1 1.9 1.4L21 13v4.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V13Z",
  quote: "M6.4 3.6h7.4l4.2 4.2v12.6H6.4V3.6Z M13.4 3.8v4.2h4.2 M9 12h6 M9 15.6h6 M9 8.4h2.6",
  truck: "M2.8 6.4h11v9.4h-11z M13.8 9.4h3.9l2.9 3.1v3.3h-6.8 M6.6 18.4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z M16.8 18.4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z",
  order: "M4 7.5 12 3.5l8 4v9L12 20.5l-8-4v-9Z M4 7.5l8 4 8-4 M12 11.5v9",
  box: "M3.8 7.6 12 3.8l8.2 3.8v8.8L12 20.2l-8.2-3.8V7.6Z M3.8 7.6 12 11.4l8.2-3.8 M12 11.4v8.8 M7.9 5.7l8.2 3.8",
  chart: "M4.5 19.5V13 M9.7 19.5V7.5 M14.9 19.5v-8 M20 19.5V5",
  agent: "M8.5 3.6h7A2.4 2.4 0 0 1 17.9 6v5.6a2.4 2.4 0 0 1-2.4 2.4h-7A2.4 2.4 0 0 1 6.1 11.6V6a2.4 2.4 0 0 1 2.4-2.4Z M9.6 8.2h.01 M14.4 8.2h.01 M12 14v2.6 M7.6 20.4h8.8",
  check: "M20 6 9 17l-5-5",
  x: "M6 6l12 12 M18 6 6 18",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2",
  alert: "M12 3.5 21.5 20h-19L12 3.5Z M12 10v4.4 M12 17.2h.01",
  lock: "M6.5 10.5h11v9h-11z M8.6 10.5V8a3.4 3.4 0 0 1 6.8 0v2.5",
  mail: "M4 6.5h16v11H4z M4 7l8 6 8-6",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  plus: "M12 5v14 M5 12h14",
  edit: "M4 20h4L19 9a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6V20Z",
  pause: "M8 5v14 M16 5v14",
  eye: "M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z M12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z",
  search: "m21 21-4.3-4.3 M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3 12h18 M12 3c2.6 2.8 3.8 5.8 3.8 9s-1.2 6.2-3.8 9c-2.6-2.8-3.8-5.8-3.8-9S9.4 5.8 12 3Z",
  refresh: "M4.5 12a7.5 7.5 0 0 1 12.8-5.3 M19.5 12a7.5 7.5 0 0 1-12.8 5.3 M17.3 4v3.3h-3.3 M6.7 20v-3.3H10",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  file: "M6.4 3.6h7.4l4.2 4.2v12.6H6.4V3.6Z M13.4 3.8v4.2h4.2",
  user: "M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9",
  building: "M4.5 20V6.4A1.4 1.4 0 0 1 5.9 5h6.2a1.4 1.4 0 0 1 1.4 1.4V20 M13.5 10.5h4.6A1.4 1.4 0 0 1 19.5 12v8 M3 20h18 M7.5 8.5h2.5 M7.5 12h2.5 M7.5 15.5h2.5",
  spark: "M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5 18 18 M18 6l-2.5 2.5 M8.5 15.5 6 18",
  send: "M3.5 12 20.5 4 16 20l-3.4-6.6L3.5 12Z",
  download: "M12 4v11 M7 10.5l5 5 5-5 M5 19.5h14",
  money: "M3.5 7h17v10h-17z M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z M6.5 10v.01 M17.5 14v.01",
  calendar: "M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z",
  filter: "M4 5h16l-6.2 7.6V19l-3.6-1.8v-4.6L4 5Z",
  chevron: "m9 6 6 6-6 6",
  dot: "M12 12h.01",
};

export function Icon({ d, size = 15, stroke = 1.7, style }: { d: string; size?: number; stroke?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", ...style }}>
      <path d={d} />
    </svg>
  );
}

/* ── layout ───────────────────────────────────────────────────────────────── */

export function Page({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ padding: "6px 24px 34px", display: "flex", flexDirection: "column", gap: 16, animation: "pageIn .55s var(--ease) both", ...style }}>{children}</div>;
}

/** Compact page heading: title, one line of context, actions on the right. */
export function PageHead({ title, sub, right, kicker }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; kicker?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", padding: "8px 2px 2px" }}>
      <div style={{ flex: "1 1 360px", minWidth: 0 }}>
        {kicker && <div style={{ ...MONO, fontSize: 10, letterSpacing: ".14em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>{kicker}</div>}
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-.7px", lineHeight: 1.1, color: "var(--ink)" }}>{title}</h1>
        {sub && <div style={{ marginTop: 7, fontSize: 13.5, color: "var(--dim)", lineHeight: 1.5, maxWidth: 760 }}>{sub}</div>}
      </div>
      {right && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{right}</div>}
    </div>
  );
}

export function Grid({ cols = "repeat(auto-fit,minmax(220px,1fr))", gap = 14, children, style }: { cols?: string; gap?: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: "grid", gridTemplateColumns: cols, gap, alignItems: "start", ...style }}>{children}</div>;
}

export function Row({ children, gap = 8, style, wrap }: { children: ReactNode; gap?: number; style?: CSSProperties; wrap?: boolean }) {
  return <div style={{ display: "flex", alignItems: "center", gap, flexWrap: wrap ? "wrap" : undefined, minWidth: 0, ...style }}>{children}</div>;
}

/** The standard glass card. `title` + optional `hint`/`right` render a header row. */
export function Card({ title, hint, right, children, pad = "18px 20px", style, onClick, tone }: {
  title?: ReactNode; hint?: ReactNode; right?: ReactNode; children?: ReactNode; pad?: string; style?: CSSProperties;
  onClick?: () => void; tone?: "accent" | "warn" | "bad" | "ok";
}) {
  const ring = tone === "accent" ? "var(--accent-line)" : tone === "warn" ? "color-mix(in srgb, var(--warn) 40%, transparent)"
    : tone === "bad" ? "color-mix(in srgb, var(--bad) 40%, transparent)" : tone === "ok" ? "color-mix(in srgb, var(--ok) 35%, transparent)" : "var(--border)";
  return (
    <div onClick={onClick} className={onClick ? "mm-card-click" : undefined}
      style={{ position: "relative", background: "var(--surface)", border: "1px solid " + ring, borderRadius: "var(--card-r,18px)",
        boxShadow: "var(--card-shadow)", padding: pad, minWidth: 0, cursor: onClick ? "pointer" : undefined, ...style }}>
      {(title || right || hint) && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: children ? 14 : 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.2px", color: "var(--ink)" }}>{title}</div>}
            {hint && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{hint}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

/** Thin labelled section header inside a card or page. */
export function Label({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, ...style }}>
      <span style={{ flex: 1, ...MONO, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--faint)" }}>{children}</span>
      {right}
    </div>
  );
}

export function Divider({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 1, background: "var(--border)", ...style }} />;
}

/* ── numbers ──────────────────────────────────────────────────────────────── */

export type Tone = "accent" | "ok" | "warn" | "bad" | "neutral" | "info";
const TONE: Record<Tone, [string, string]> = {
  accent: ["var(--accent)", "var(--accent-soft)"],
  ok: ["var(--ok)", "var(--ok-soft)"],
  warn: ["var(--warn)", "var(--warn-soft)"],
  bad: ["var(--bad)", "var(--bad-soft)"],
  neutral: ["var(--dim)", "var(--track)"],
  info: ["#7cb7ff", "rgba(124,183,255,.13)"],
};
export const toneInk = (t: Tone) => TONE[t][0];
export const toneBg = (t: Tone) => TONE[t][1];

/** KPI tile. Clickable when `onClick` is passed. */
export function Kpi({ label, value, sub, tone = "neutral", onClick, hero }: {
  label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: Tone; onClick?: () => void; hero?: boolean;
}) {
  return (
    <div onClick={onClick} className={onClick ? "mm-card-click" : undefined}
      style={{ background: hero ? "var(--accent-faint)" : "var(--surface)", border: "1px solid " + (hero ? "var(--accent-line)" : "var(--border)"),
        borderRadius: "var(--card-r,18px)", padding: "15px 17px 14px", minWidth: 0, cursor: onClick ? "pointer" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 6, height: 6, borderRadius: 2, background: toneInk(tone), flex: "none" }} />
        <span style={{ fontSize: 12, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.8px", marginTop: 8, lineHeight: 1, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 7, lineHeight: 1.35 }}>{sub}</div>}
    </div>
  );
}

export function Money({ v, cur = "EUR", dim }: { v: number | null | undefined; cur?: Currency; dim?: boolean }) {
  if (v === null || v === undefined) return <span style={{ color: "var(--faint)" }}>Pending</span>;
  return <span style={{ fontVariantNumeric: "tabular-nums", color: dim ? "var(--dim)" : undefined, whiteSpace: "nowrap" }}>{money(v, cur)}</span>;
}

/* ── badges ───────────────────────────────────────────────────────────────── */

export function Badge({ tone = "neutral", children, dot, style }: { tone?: Tone; children: ReactNode; dot?: boolean; style?: CSSProperties }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", borderRadius: 999,
      background: toneBg(tone), color: toneInk(tone), fontSize: 11.5, fontWeight: 500, whiteSpace: "nowrap", flex: "none", ...style }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: 3, background: "currentColor" }} />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  // enquiries
  New: "accent", Qualified: "info", "Freight Requested": "warn", "Quote Ready": "accent", "Quote Sent": "info", Won: "ok", Lost: "neutral",
  // quotes
  Draft: "neutral", "Awaiting Freight": "warn", "Ready for Review": "accent", Approved: "ok", Sent: "info", Accepted: "ok", Declined: "neutral", Expired: "neutral",
  // freight
  "To request": "neutral", "Awaiting rate": "warn", "Rate received": "ok", Booked: "info", Dispatched: "info", Delivered: "ok",
  // invoices
  Paid: "ok", Overdue: "bad", "Part paid": "warn",
  // orders
  "Quote accepted": "info", "Invoice created": "info", "Payment pending": "warn", "Payment confirmed": "ok", "Equipment allocated": "accent",
  // approvals and follow-ups
  Ready: "accent", "Needs action": "warn", Held: "neutral", "Awaiting review": "warn", Snoozed: "neutral", Dismissed: "neutral",
  // priority
  High: "bad", Medium: "warn", Low: "neutral",
  // tasks
  "Not started": "neutral", "In progress": "info", Waiting: "warn", Done: "ok",
  // reservations
  Reserved: "accent", "Awaiting arrival": "warn", "Released to dispatch": "ok",
  // agent runs
  Completed: "ok", "Waiting on Niall": "warn", Flagged: "bad", Skipped: "neutral",
};
export function Status({ s }: { s: string }) {
  return <Badge tone={STATUS_TONE[s] || "neutral"} dot>{s}</Badge>;
}

export function CountryTag({ c }: { c: Country }) {
  return <span style={{ ...MONO, fontSize: 10, letterSpacing: ".06em", padding: "2px 6px", borderRadius: 6, border: "1px solid var(--border)", color: "var(--dim)", flex: "none" }}>{c}</span>;
}

export function Confidential({ label = "Confidential pricing" }: { label?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 24, padding: "0 10px", borderRadius: 999,
      border: "1px solid var(--accent-line)", background: "var(--accent-faint)", color: "var(--accent)", fontSize: 11.5, fontWeight: 500 }}>
      <Icon d={I.lock} size={12} stroke={2} />{label}
    </span>
  );
}

/** Small note for anything simulated, unverified or awaiting confirmation. */
export function Note({ children, tone = "neutral", icon = I.alert, style }: { children: ReactNode; tone?: Tone; icon?: string; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "10px 12px", borderRadius: 12, background: toneBg(tone),
      color: tone === "neutral" ? "var(--dim)" : toneInk(tone), fontSize: 12.5, lineHeight: 1.5, ...style }}>
      <Icon d={icon} size={14} style={{ marginTop: 2 }} />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

/* ── people and agents ────────────────────────────────────────────────────── */

export const AGENT_META: Record<string, { name: string; tint: string; initials: string }> = {
  briefing: { name: "Briefing", tint: "#ff8a4c", initials: "BR" },
  ops: { name: "Ops Watchdog", tint: "#ef6a6a", initials: "OW" },
  enquiry: { name: "Enquiry Agent", tint: "#7cb7ff", initials: "EN" },
  quote: { name: "Quote Agent", tint: "#ffb44c", initials: "QA" },
  freight: { name: "Freight Agent", tint: "#5fd3a0", initials: "FR" },
  followup: { name: "Follow-up Agent", tint: "#c39bff", initials: "FU" },
  receivables: { name: "Receivables Agent", tint: "#f2c14e", initials: "RA" },
  intel: { name: "Sales Intelligence Agent", tint: "#5ec8e0", initials: "SI" },
};
const AGENT_BY_NAME = Object.fromEntries(Object.entries(AGENT_META).map(([k, v]) => [v.name, k]));

/** Initials avatar. Agents get a rounded-square tinted mark; people a circle. */
export function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  const agentKey = AGENT_BY_NAME[name];
  if (agentKey) {
    const a = AGENT_META[agentKey];
    return <span title={a.name} style={{ width: size, height: size, flex: "none", borderRadius: size * 0.32, background: a.tint + "26", color: a.tint,
      display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, letterSpacing: ".02em" }}>{a.initials}</span>;
  }
  const me = name === "Niall";
  return <span title={name} style={{ width: size, height: size, flex: "none", borderRadius: 999, background: me ? "var(--accent-soft)" : "var(--surface-2)",
    color: me ? "var(--accent)" : "var(--body)", border: me ? "none" : "1px solid var(--border)", display: "inline-flex", alignItems: "center",
    justifyContent: "center", fontSize: size * 0.38, fontWeight: 600 }}>{initials(name)}</span>;
}

export function Who({ name, sub }: { name: string; sub?: ReactNode }) {
  return (
    <Row gap={9}>
      <Avatar name={name} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
      </div>
    </Row>
  );
}

export function ProductThumb({ p, size = 44 }: { p: Product; size?: number }) {
  return (
    <span style={{ width: size, height: size, flex: "none", borderRadius: Math.max(8, size * 0.22), background: "#f4f4f2", overflow: "hidden",
      display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }}>
      <img src={p.image} alt={p.name} loading="lazy" style={{ width: "92%", height: "92%", objectFit: "contain" }} />
    </span>
  );
}

/* ── controls ─────────────────────────────────────────────────────────────── */

type BtnKind = "primary" | "secondary" | "ghost" | "danger" | "ok";
export function Button({ kind = "secondary", size = "md", onClick, icon, children, disabled, title, style }: {
  kind?: BtnKind; size?: "sm" | "md"; onClick?: (e: React.MouseEvent) => void; icon?: string; children?: ReactNode; disabled?: boolean; title?: string; style?: CSSProperties;
}) {
  const h = size === "sm" ? 28 : 34;
  const base: CSSProperties = { height: h, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: children ? (size === "sm" ? "0 11px" : "0 15px") : 0,
    width: children ? undefined : h, borderRadius: "var(--cta-r,11px)", fontSize: size === "sm" ? 12 : 13, fontWeight: 600, letterSpacing: "-.1px", whiteSpace: "nowrap",
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, flex: "none", transition: "transform .16s var(--ease), background .18s var(--ease), border-color .18s var(--ease)" };
  const look: Record<BtnKind, CSSProperties> = {
    primary: { background: "var(--accent-fill,var(--accent))", color: "var(--on-accent)", border: "0", boxShadow: "var(--accent-glow,none)" },
    secondary: { background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--border)" },
    ghost: { background: "none", color: "var(--dim)", border: "1px solid transparent" },
    danger: { background: "var(--bad-soft)", color: "var(--bad)", border: "1px solid transparent" },
    ok: { background: "var(--ok-soft)", color: "var(--ok)", border: "1px solid transparent" },
  };
  return (
    <button className="mm-btn" title={title} disabled={disabled} onClick={(e) => { e.stopPropagation(); if (!disabled && onClick) onClick(e); }} style={{ ...base, ...look[kind], ...style }}>
      {icon && <Icon d={icon} size={size === "sm" ? 13 : 14} stroke={2} />}
      {children}
    </button>
  );
}

/** Segmented control for in-page filters (top-bar tabs come from Pulse itself). */
export function Seg<T extends string>({ options, value, onChange }: { options: (T | [T, ReactNode])[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", flexWrap: "wrap" }}>
      {options.map((o) => {
        const [k, label] = Array.isArray(o) ? o : [o, o];
        const on = k === value;
        return (
          <button key={k} onClick={() => onChange(k)} style={{ height: 26, padding: "0 12px", border: 0, borderRadius: 999, cursor: "pointer", fontSize: 12,
            fontWeight: on ? 600 : 500, background: on ? "var(--pill-bg)" : "none", color: on ? "var(--pill-ink)" : "var(--dim)", whiteSpace: "nowrap" }}>{label}</button>
        );
      })}
    </div>
  );
}

export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 11.5, color: "var(--dim)", fontWeight: 500 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: "var(--faint)" }}>{hint}</span>}
    </label>
  );
}

export const inputStyle: CSSProperties = { height: 34, padding: "0 11px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--ink)", fontSize: 13, outline: "none", minWidth: 0, fontFamily: "inherit" };

export function TextArea({ value, onChange, rows = 6, style }: { value: string; onChange: (v: string) => void; rows?: number; style?: CSSProperties }) {
  return <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)}
    style={{ ...inputStyle, height: "auto", padding: "10px 12px", lineHeight: 1.55, resize: "vertical", width: "100%", ...style }} />;
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label?: ReactNode }) {
  return (
    <button onClick={onChange} style={{ display: "inline-flex", alignItems: "center", gap: 9, border: 0, background: "none", cursor: "pointer", color: "var(--body)", fontSize: 13, padding: 0 }}>
      <span style={{ width: 34, height: 20, borderRadius: 999, background: on ? "var(--accent)" : "var(--track)", position: "relative", transition: "background .2s var(--ease)", flex: "none" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: 999, background: on ? "var(--on-accent)" : "var(--dim)", transition: "left .2s var(--ease)" }} />
      </span>
      {label}
    </button>
  );
}

/* ── table ────────────────────────────────────────────────────────────────── */

export type Col<T> = { key: string; label: ReactNode; width?: string; align?: "left" | "right" | "center"; render: (row: T) => ReactNode };

/** Data table: hover rows, optional click, sticky header, row limit with "show all". */
export function Table<T>({ cols, rows, onRow, empty = "Nothing here.", limit, rowKey, dense }: {
  cols: Col<T>[]; rows: T[]; onRow?: (r: T) => void; empty?: ReactNode; limit?: number; rowKey?: (r: T, i: number) => string; dense?: boolean;
}) {
  const [all, setAll] = useState(false);
  const shown = limit && !all ? rows.slice(0, limit) : rows;
  const tpl = cols.map((c) => c.width || "minmax(0,1fr)").join(" ");
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: tpl, gap: 12, padding: "0 12px 9px", borderBottom: "1px solid var(--border)" }}>
        {cols.map((c) => (
          <div key={c.key} style={{ ...MONO, fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)", textAlign: c.align || "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</div>
        ))}
      </div>
      {shown.length === 0 && <div style={{ padding: "26px 12px", textAlign: "center", fontSize: 13, color: "var(--dim)" }}>{empty}</div>}
      {shown.map((r, i) => (
        <div key={rowKey ? rowKey(r, i) : i} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? "mm-row" : undefined}
          style={{ display: "grid", gridTemplateColumns: tpl, gap: 12, alignItems: "center", padding: dense ? "8px 12px" : "11px 12px",
            borderBottom: "1px solid var(--border)", cursor: onRow ? "pointer" : undefined, fontSize: 13, color: "var(--body)", minWidth: 0,
            animation: "rowIn .3s var(--ease) both", animationDelay: Math.min(i, 12) * 18 + "ms" }}>
          {cols.map((c) => (
            <div key={c.key} style={{ minWidth: 0, textAlign: c.align || "left", overflow: "hidden", textOverflow: "ellipsis",
              display: c.align === "right" ? "flex" : undefined, justifyContent: c.align === "right" ? "flex-end" : undefined }}>{c.render(r)}</div>
          ))}
        </div>
      ))}
      {limit && rows.length > limit && (
        <button onClick={() => setAll(!all)} style={{ marginTop: 10, border: 0, background: "none", color: "var(--accent)", fontSize: 12.5, cursor: "pointer", padding: "4px 12px" }}>
          {all ? "Show fewer" : "Show all " + rows.length}
        </button>
      )}
    </div>
  );
}

/** Two-line cell: strong first line, faint second line. */
export function Cell({ top, sub }: { top: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{top}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
    </div>
  );
}

/* ── charts ───────────────────────────────────────────────────────────────── */

/** Horizontal bar list: label, value, bar. No background track. */
export function BarList({ items, format = (n) => String(n), tone = "accent", onItem }: {
  items: { label: ReactNode; value: number; note?: ReactNode; key?: string }[]; format?: (n: number) => string; tone?: Tone; onItem?: (i: number) => void;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {items.map((it, i) => (
        <div key={it.key || i} onClick={onItem ? () => onItem(i) : undefined} style={{ cursor: onItem ? "pointer" : undefined }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5 }}>
            <span style={{ flex: 1, minWidth: 0, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>
            {it.note && <span style={{ fontSize: 11, color: "var(--faint)" }}>{it.note}</span>}
            <span style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{format(it.value)}</span>
          </div>
          <div style={{ marginTop: 6, height: 6, borderRadius: 4, width: Math.max(2, (it.value / max) * 100) + "%", background: toneInk(tone),
            opacity: 0.35 + 0.65 * (it.value / max), transformOrigin: "left", animation: "sweep .6s var(--ease) both" }} />
        </div>
      ))}
    </div>
  );
}

/** Vertical columns with labels underneath. `highlight` marks one column in the accent. */
export function Columns({ data, height = 120, highlight, format = (n) => String(n), tone = "accent" }: {
  data: { label: string; value: number }[]; height?: number; highlight?: number; format?: (n: number) => string; tone?: Tone;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: height + 34 }}>
      {data.map((d, i) => {
        const on = highlight === undefined ? i === data.length - 1 : i === highlight;
        return (
          <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10.5, color: on ? "var(--ink)" : "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{format(d.value)}</span>
            <div style={{ width: "100%", maxWidth: 34, height: Math.max(3, (d.value / max) * height), borderRadius: 6,
              background: on ? toneInk(tone) : "var(--border-strong)", transformOrigin: "bottom", animation: "growBar .6s var(--ease) both", animationDelay: i * 30 + "ms" }} />
            <span style={{ ...MONO, fontSize: 9.5, color: "var(--faint)", whiteSpace: "nowrap" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Funnel: each step is a full-width bar scaled to the first step, with step-to-step conversion. */
export function Funnel({ steps, onStep, active }: { steps: { label: string; n: number; key?: string }[]; onStep?: (i: number) => void; active?: number }) {
  const top = Math.max(1, steps[0]?.n || 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {steps.map((st, i) => {
        const prev = i ? steps[i - 1].n : st.n;
        const conv = i && prev ? Math.round((st.n / prev) * 100) : 100;
        const on = active === i;
        return (
          <div key={st.key || i} onClick={onStep ? () => onStep(i) : undefined} className={onStep ? "mm-row" : undefined}
            style={{ display: "grid", gridTemplateColumns: "150px minmax(0,1fr) 64px", gap: 12, alignItems: "center", padding: "6px 8px", borderRadius: 10,
              cursor: onStep ? "pointer" : undefined, background: on ? "var(--surface-2)" : undefined }}>
            <span style={{ fontSize: 13, color: on ? "var(--ink)" : "var(--body)", fontWeight: on ? 600 : 400 }}>{st.label}</span>
            <div style={{ height: 26, borderRadius: 8, width: Math.max(4, (st.n / top) * 100) + "%", background: i === steps.length - 1 ? "var(--ok)" : "var(--accent)",
              opacity: 1 - i * 0.1, display: "flex", alignItems: "center", paddingLeft: 10, color: "var(--on-accent)", fontSize: 12, fontWeight: 700,
              transformOrigin: "left", animation: "sweep .7s var(--ease) both", animationDelay: i * 60 + "ms" }}>{st.n}</div>
            <span style={{ ...MONO, fontSize: 11, color: i ? "var(--dim)" : "var(--faint)", textAlign: "right" }}>{i ? conv + "%" : "start"}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal stage tracker: done, current, upcoming. */
export function Stages({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, minWidth: 0, overflowX: "auto", paddingBottom: 2 }}>
      {steps.map((s, i) => {
        const done = i < current, on = i === current;
        return (
          <div key={s} style={{ flex: 1, minWidth: 84, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            {i > 0 && <span style={{ position: "absolute", top: 10, right: "50%", width: "100%", height: 2, background: done || on ? "var(--accent)" : "var(--track)" }} />}
            <span style={{ position: "relative", width: 22, height: 22, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
              background: done ? "var(--accent)" : on ? "var(--accent-soft)" : "var(--surface-2)", border: on ? "2px solid var(--accent)" : "1px solid var(--border)",
              color: done ? "var(--on-accent)" : "var(--accent)", fontSize: 10, fontWeight: 700 }}>
              {done ? <Icon d={I.check} size={12} stroke={3} /> : i + 1}
            </span>
            <span style={{ marginTop: 7, fontSize: 11, textAlign: "center", color: on ? "var(--ink)" : done ? "var(--body)" : "var(--faint)", fontWeight: on ? 600 : 400, lineHeight: 1.3, padding: "0 4px" }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Vertical timeline of events. */
export function Timeline({ items }: { items: { at: string; title: ReactNode; detail?: ReactNode; who?: string; tone?: Tone }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "14px minmax(0,1fr)", gap: 12, paddingBottom: i === items.length - 1 ? 0 : 14, position: "relative" }}>
          {i < items.length - 1 && <span style={{ position: "absolute", left: 6, top: 14, bottom: 0, width: 1, background: "var(--border)" }} />}
          <span style={{ width: 9, height: 9, borderRadius: 3, marginTop: 4, marginLeft: 2, background: it.tone ? toneInk(it.tone) : "var(--border-strong)" }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>{it.title}</div>
            {it.detail && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{it.detail}</div>}
            <div style={{ ...MONO, fontSize: 10, color: "var(--faint)", marginTop: 4 }}>{it.at}{it.who ? " · " + it.who : ""}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ padding: "34px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

/** Key/value list used in detail views. */
export function Facts({ rows, cols = 2 }: { rows: [ReactNode, ReactNode][]; cols?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(" + cols + ",minmax(0,1fr))", gap: "12px 18px" }}>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ minWidth: 0 }}>
          <div style={{ ...MONO, fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" }}>{k}</div>
          <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 4, lineHeight: 1.4, overflowWrap: "anywhere" }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

/** An email or form submission rendered as a message card. */
export function Mail({ from, to, at, subject, body, kind = "in" }: { from: string; to?: string; at: string; subject?: string; body: string; kind?: "in" | "out" | "draft" }) {
  return (
    <div style={{ border: "1px solid " + (kind === "draft" ? "var(--accent-line)" : "var(--border)"), borderRadius: 14, padding: "12px 14px",
      background: kind === "out" ? "var(--surface-2)" : kind === "draft" ? "var(--accent-faint)" : "var(--surface-faint)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{from}</span>
        {to && <span style={{ fontSize: 11.5, color: "var(--faint)" }}>to {to}</span>}
        <span style={{ flex: 1 }} />
        {kind === "draft" && <Badge tone="accent">Draft, not sent</Badge>}
        <span style={{ ...MONO, fontSize: 10, color: "var(--faint)" }}>{at}</span>
      </div>
      {subject && <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 5 }}>{subject}</div>}
      <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

export const fmtMoney = money;
