import { useEffect, useState } from "react";
import type { Toast } from "../types";

/* Toast stack, bottom right, above everything. Store toasts expire on their own;
   this keeps each one on screen a moment longer so it can fade out. */

type Shown = Toast & { leaving: boolean };

export default function Toasts({ toasts }: { toasts: Toast[] }) {
  const [shown, setShown] = useState<Shown[]>([]);

  useEffect(() => {
    setShown((prev) => {
      const live = new Set(toasts.map((t) => t.id));
      const next: Shown[] = prev.map((t) => (live.has(t.id) || t.leaving ? t : { ...t, leaving: true }));
      for (const t of toasts) if (!prev.some((p) => p.id === t.id)) next.push({ ...t, leaving: false });
      return next;
    });
  }, [toasts]);

  useEffect(() => {
    if (!shown.some((t) => t.leaving)) return;
    const timer = window.setTimeout(() => setShown((prev) => prev.filter((t) => !t.leaving)), 240);
    return () => window.clearTimeout(timer);
  }, [shown]);

  if (!shown.length) return null;
  return (
    <div role="status" aria-live="polite"
      style={{ position: "fixed", right: 20, bottom: 20, zIndex: 120, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10,
        width: "min(380px, calc(100vw - 40px))", pointerEvents: "none" }}>
      {shown.map((t) => (
        <div key={t.id}
          style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%", padding: "13px 16px 13px 14px", borderRadius: 14,
            background: "var(--overlay)", border: "1px solid var(--border-strong)", color: "var(--ink)",
            backdropFilter: "blur(28px) saturate(1.4)", WebkitBackdropFilter: "blur(28px) saturate(1.4)",
            boxShadow: "0 18px 50px var(--glass-shadow), inset 0 1px 0 var(--glass-highlight)",
            animation: "mmToastIn .38s cubic-bezier(.16,1,.3,1) backwards",
            opacity: t.leaving ? 0 : 1, transform: t.leaving ? "translateY(6px)" : "none", transition: "opacity .22s var(--ease), transform .22s var(--ease)" }}>
          <span style={{ width: 22, height: 22, flex: "none", marginTop: 1, borderRadius: 999, background: "var(--accent-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--accent)" }} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-.1px", lineHeight: 1.35, overflowWrap: "anywhere" }}>{t.text}</div>
            {t.sub && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.45, overflowWrap: "anywhere" }}>{t.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
