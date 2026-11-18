import { useEffect, useMemo, useRef, useState } from "react";
import type { MMState, PanelRef } from "../types";
import { closePanel, openPanel } from "../store";
import { I, Icon, Label, MONO } from "../ui";
import { NavContext, type Nav } from "./kit";
import { headOf, shortLabel } from "./head";
import { linksFor } from "./chain";
import LinkedRow from "./LinkedRow";
import EnquiryPanel from "./EnquiryPanel";
import QuotePanel from "./QuotePanel";
import FreightPanel from "./FreightPanel";
import InvoicePanel from "./InvoicePanel";
import OrderPanel from "./OrderPanel";
import CustomerPanel from "./CustomerPanel";
import ProductPanel from "./ProductPanel";
import ShipmentPanel from "./ShipmentPanel";
import FollowUpPanel from "./FollowUpPanel";
import SupplierPanel from "./SupplierPanel";

/* The shared record drawer: scrim, glass panel on the right, header with the
   linked-records chain, and the body for the record kind. */

function Body({ s, panel }: { s: MMState; panel: PanelRef }) {
  switch (panel.kind) {
    case "enquiry": return <EnquiryPanel s={s} id={panel.id} />;
    case "quote": return <QuotePanel s={s} id={panel.id} />;
    case "freight": return <FreightPanel s={s} id={panel.id} />;
    case "invoice": return <InvoicePanel s={s} id={panel.id} />;
    case "order": return <OrderPanel s={s} id={panel.id} />;
    case "customer": return <CustomerPanel s={s} id={panel.id} />;
    case "product": return <ProductPanel s={s} id={panel.id} />;
    case "shipment": return <ShipmentPanel s={s} id={panel.id} />;
    case "followup": return <FollowUpPanel s={s} id={panel.id} />;
    case "supplier": return <SupplierPanel s={s} id={panel.id} />;
  }
}

const ctlStyle = {
  height: 30, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", color: "var(--dim)", cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit", flex: "none" as const,
  transition: "color .2s var(--ease), border-color .2s var(--ease)",
};

export default function Drawer({ s, panel, leaving }: { s: MMState; panel: PanelRef; leaving: boolean }) {
  const [trail, setTrail] = useState<PanelRef[]>([]);
  const box = useRef<HTMLElement>(null);

  /* Links inside the drawer remember where you came from, so Back works. */
  const nav = useMemo<Nav>(() => ({
    open: (kind, id) => {
      if (kind === panel.kind && id === panel.id) return;
      setTrail((t) => t.concat([panel]).slice(-20));
      openPanel(kind, id);
    },
  }), [panel]);
  const prev = trail[trail.length - 1];
  const back = () => {
    if (!prev) return;
    setTrail((t) => t.slice(0, -1));
    openPanel(prev.kind, prev.id);
  };

  useEffect(() => { if (leaving) setTrail([]); }, [leaving]);

  /* Esc closes the drawer. */
  useEffect(() => {
    if (leaving) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      closePanel();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [leaving]);

  useEffect(() => { box.current?.focus({ preventScroll: true }); }, []);

  const head = headOf(s, panel);
  const links = linksFor(s, panel, trail);
  const glassBlur = "blur(40px) saturate(1.4)";

  return (
    <>
      <div onClick={closePanel} aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 100, background: "var(--scrim)", backdropFilter: "blur(6px) saturate(1.1)", WebkitBackdropFilter: "blur(6px) saturate(1.1)",
          animation: "scrimIn .3s var(--ease) backwards", opacity: leaving ? 0 : 1, transition: "opacity .2s var(--ease)", pointerEvents: leaving ? "none" : "auto" }} />
      <aside ref={box} role="dialog" aria-modal="true" aria-label={head.kindLabel + " " + head.id + ", " + head.title} tabIndex={-1}
        style={{ position: "fixed", top: 12, right: 12, bottom: 12, zIndex: 101, width: "min(600px, 94vw)", display: "flex", flexDirection: "column", overflow: "hidden",
          background: "var(--overlay)", border: "1px solid var(--border-strong)", borderRadius: "var(--card-r,18px)", outline: "none",
          backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur, boxShadow: "0 30px 90px var(--glass-shadow), inset 0 1px 0 var(--glass-highlight)",
          animation: "mmPanelIn .42s cubic-bezier(.16,1,.3,1) backwards", opacity: leaving ? 0 : 1, transform: leaving ? "translateX(24px)" : "none",
          transition: "opacity .2s var(--ease), transform .2s var(--ease)", pointerEvents: leaving ? "none" : "auto" }}>
        <NavContext.Provider value={nav}>
          <header style={{ flex: "none", padding: "18px 22px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ width: 28, height: 28, flex: "none", borderRadius: 9, background: "var(--accent-faint)", border: "1px solid var(--accent-line)", color: "var(--accent)",
                display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d={head.icon} size={14} />
              </span>
              <span style={{ ...MONO, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)", whiteSpace: "nowrap" }}>{head.kindLabel}</span>
              <span style={{ ...MONO, fontSize: 10.5, letterSpacing: ".04em", color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{head.id}</span>
              <span style={{ flex: 1 }} />
              {prev && (
                <button className="ixm" onClick={back} title={"Back to " + shortLabel(s, prev)} style={{ ...ctlStyle, padding: "0 11px 0 8px", fontSize: 12, maxWidth: 210 }}>
                  <Icon d={I.chevron} size={12} stroke={2.2} style={{ transform: "rotate(180deg)" }} />
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shortLabel(s, prev)}</span>
                </button>
              )}
              <button className="ixm" onClick={closePanel} aria-label="Close" title="Close (Esc)" style={{ ...ctlStyle, width: 30 }}>
                <Icon d={I.x} size={12} stroke={2.2} />
              </button>
            </div>
            <div style={{ marginTop: 13, fontSize: 22, fontWeight: 500, letterSpacing: "-.6px", lineHeight: 1.15, color: "var(--ink)", overflowWrap: "anywhere" }}>{head.title}</div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 9, minWidth: 0 }}>
              {head.badges}
              <span style={{ fontSize: 12.5, color: "var(--dim)", minWidth: 0, lineHeight: 1.45 }}>{head.sub}</span>
            </div>
            {links.items.length > 1 && (
              <div style={{ marginTop: 16 }}>
                <Label style={{ marginBottom: 8 }}>Linked records</Label>
                <LinkedRow key={panel.kind + ":" + panel.id} items={links.items} chain={links.chain} />
              </div>
            )}
          </header>
          <div key={panel.kind + ":" + panel.id} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", animation: "fadeIn .26s var(--ease) backwards" }}>
            <Body s={s} panel={panel} />
          </div>
        </NavContext.Provider>
      </aside>
    </>
  );
}
