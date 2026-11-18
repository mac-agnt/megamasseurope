import { useEffect, useState } from "react";
import type { PanelRef } from "../types";
import { useMM } from "../store";
import Drawer from "./Drawer";
import Toasts from "./Toasts";

/* Mounted once at the app root, above everything: the shared record drawer
   (opened anywhere with openPanel) and the toast stack. */

/** Keeps the last panel mounted briefly after closing so it can fade out. */
function useLinger(panel: PanelRef | null, ms: number) {
  const [last, setLast] = useState<PanelRef | null>(panel);
  useEffect(() => {
    if (panel) { setLast(panel); return; }
    const t = window.setTimeout(() => setLast(null), ms);
    return () => window.clearTimeout(t);
  }, [panel, ms]);
  return { ref: panel ?? last, leaving: !panel && !!last };
}

export default function Overlay() {
  const s = useMM();
  const { ref, leaving } = useLinger(s.panel, 210);
  return (
    <>
      {ref && <Drawer s={s} panel={ref} leaving={leaving} />}
      <Toasts toasts={s.toasts} />
    </>
  );
}
