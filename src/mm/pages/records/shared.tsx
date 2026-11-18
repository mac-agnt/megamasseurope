import type { ReactNode } from "react";
import type { RecordKind } from "../../types";
import { openPanel } from "../../store";
import { I, Icon, MONO, inputStyle, toneInk, type Tone } from "../../ui";

/* Small pieces shared by the Records tabs (Customers, Suppliers, Products, Orders). */

const fold = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Accent- and case-insensitive match of a search query against any of the fields. */
export function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  return fields.some((f) => !!f && fold(f).includes(q));
}

/** Compact header row: name, count and a one-line summary on the left, filters on the right. */
export function HeadRow({ title, count, summary, children }: { title: string; count: number; summary?: ReactNode; children?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "6px 2px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flex: "1 1 340px", minWidth: 0, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.3px", color: "var(--ink)" }}>{title}</span>
        <span style={{ ...MONO, fontSize: 11, color: "var(--faint)" }}>{count}</span>
        {summary && <span style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.45 }}>{summary}</span>}
      </div>
      {children && <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{children}</div>}
    </div>
  );
}

export function SearchBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div style={{ position: "relative", width: 250, maxWidth: "100%" }}>
      <Icon d={I.search} size={14} style={{ position: "absolute", left: 11, top: 9, color: "var(--faint)", pointerEvents: "none" }} />
      <input className="ixi" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} aria-label={label}
        style={{ ...inputStyle, height: 32, width: "100%", paddingLeft: 32, paddingRight: value ? 30 : 11 }} />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search" className="ixm"
          style={{ position: "absolute", right: 5, top: 5, width: 22, height: 22, border: 0, borderRadius: 7, background: "var(--surface)", color: "var(--dim)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon d={I.x} size={10} stroke={2.4} />
        </button>
      )}
    </div>
  );
}

/** A record reference inside a table row. Opens the record panel without triggering the row. */
export function RecChip({ kind, id, label, tone, icon, title }: { kind: RecordKind; id: string; label?: ReactNode; tone?: Tone; icon?: string; title?: string }) {
  return (
    <button className="ixf" title={title ?? "Open " + id} onClick={(e) => { e.stopPropagation(); openPanel(kind, id); }}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 24, maxWidth: "100%", minWidth: 0, padding: "0 9px", borderRadius: 999,
        border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--body)", fontSize: 11.5, fontFamily: "inherit", cursor: "pointer",
        whiteSpace: "nowrap", flex: "none", transition: "border-color .18s var(--ease), background .18s var(--ease), color .18s var(--ease)" }}>
      {tone && <span style={{ width: 6, height: 6, borderRadius: 3, background: toneInk(tone), flex: "none" }} />}
      {icon && <Icon d={icon} size={11} style={{ color: "var(--faint)" }} />}
      <span style={{ ...MONO, fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis" }}>{label ?? id}</span>
    </button>
  );
}

export const NONE = <span style={{ color: "var(--faint)" }}>None</span>;

/** Right-aligned count; zero reads quiet. */
export function Count({ n, strong }: { n: number; strong?: boolean }) {
  return <span style={{ fontVariantNumeric: "tabular-nums", color: n === 0 ? "var(--faint)" : strong ? "var(--ink)" : "var(--body)", fontWeight: strong && n > 0 ? 600 : 400 }}>{n}</span>;
}

/** Wide tables scroll sideways on small screens instead of crushing columns. */
export function TableFrame({ min, children }: { min: number; children: ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", boxShadow: "var(--card-shadow)", padding: "14px 6px 8px", minWidth: 0 }}>
      <div style={{ overflowX: "auto", scrollbarWidth: "thin" }}>
        <div style={{ minWidth: min }}>{children}</div>
      </div>
    </div>
  );
}
