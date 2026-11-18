import { useState, type CSSProperties, type ReactNode } from "react";
import { I, Icon, MONO, ProductThumb } from "../ui";
import type { LinkItem } from "./chain";
import { useNav } from "./kit";

/* "Linked records": the chain around the open record as a row of chips.
   The current record is marked; every other chip opens its record.
   Each chevron travels with the chip after it, so wrapped lines never end on an arrow. */

const COLLAPSE_AT = 3;

function Chip({ it, onOpen }: { it: LinkItem; onOpen: () => void }) {
  const inner = (
    <>
      {it.product && <ProductThumb p={it.product} size={20} />}
      {!it.product && (
        <span style={{ ...MONO, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: it.current ? "var(--accent)" : "var(--faint)", flex: "none" }}>{it.step}</span>
      )}
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{it.label}</span>
    </>
  );
  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 7, height: 28, maxWidth: 230, minWidth: 0, padding: it.product ? "0 11px 0 4px" : "0 11px",
    borderRadius: 999, fontSize: 12, fontFamily: "inherit", flex: "none",
  };
  const label = it.step + " " + it.label;
  if (it.current) {
    return (
      <span aria-current="true" title={"Open now: " + label}
        style={{ ...base, border: "1px solid var(--accent-line)", background: "var(--accent-soft)", color: "var(--ink)", fontWeight: 600 }}>{inner}</span>
    );
  }
  return (
    <button className="ixf" onClick={onOpen} title={"Open " + label.toLowerCase()} aria-label={"Open " + label}
      style={{ ...base, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--body)", cursor: "pointer",
        transition: "border-color .18s var(--ease), background .18s var(--ease), color .18s var(--ease)" }}>{inner}</button>
  );
}

/** Keeps a separator glued to the chip that follows it. */
function Joined({ lead, children }: { lead?: ReactNode; children: ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, maxWidth: "100%" }}>{lead}{children}</span>;
}

export default function LinkedRow({ items, chain }: { items: LinkItem[]; chain: boolean }) {
  const nav = useNav();
  const [expanded, setExpanded] = useState(false);
  const machines = items.filter((it) => it.kind === "product");
  const collapse = !expanded && machines.length > COLLAPSE_AT && !machines.some((m) => m.current);
  const hidden = new Set<LinkItem>(collapse ? machines.slice(1) : []);
  const main = items.filter((it) => !it.extra && !hidden.has(it));
  const extras = items.filter((it) => it.extra);
  const firstHidden = collapse ? machines[0] : undefined;
  const sep = <Icon d={I.chevron} size={10} stroke={2} style={{ color: "var(--faint)", opacity: 0.7 }} />;

  const nodes: ReactNode[] = [];
  main.forEach((it, i) => {
    nodes.push(
      <Joined key={it.kind + ":" + it.id} lead={chain && i > 0 ? sep : undefined}>
        <Chip it={it} onOpen={() => nav.open(it.kind, it.id)} />
      </Joined>,
    );
    if (it === firstHidden) {
      nodes.push(
        <button key="more-machines" className="ixf" onClick={() => setExpanded(true)} title="Show every machine on this record"
          style={{ height: 28, padding: "0 11px", borderRadius: 999, border: "1px dashed var(--border-strong)", background: "none", color: "var(--dim)",
            fontSize: 12, fontFamily: "inherit", cursor: "pointer", flex: "none" }}>
          +{hidden.size} machines
        </button>,
      );
    }
  });
  if (expanded && machines.length > COLLAPSE_AT) {
    nodes.push(
      <button key="fewer-machines" onClick={() => setExpanded(false)}
        style={{ border: 0, background: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", padding: "0 4px", fontFamily: "inherit" }}>
        Fewer machines
      </button>,
    );
  }
  extras.forEach((it, i) => {
    nodes.push(
      <Joined key={"x:" + it.kind + ":" + it.id} lead={i === 0 ? <span style={{ width: 1, height: 16, background: "var(--border-strong)", margin: "0 4px 0 2px", flex: "none" }} /> : undefined}>
        <Chip it={it} onOpen={() => nav.open(it.kind, it.id)} />
      </Joined>,
    );
  });

  return <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "7px 6px", minWidth: 0 }}>{nodes}</div>;
}
