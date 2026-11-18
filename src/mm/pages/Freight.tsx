import { useMM } from "../store";
import RequestsTab from "./freight/RequestsTab";
import AwaitingTab from "./freight/AwaitingTab";
import ReviewTab from "./freight/ReviewTab";
import DispatchTab from "./freight/DispatchTab";

/* Freight: one email-and-wait job per price becomes one traceable workflow.
   Tabs: requests (KPIs, workflow showcase, every request), awaiting (by carrier),
   review (carrier rates and markup) and dispatch (ready to book to delivered). */
export default function Freight({ tab }: { tab: string }) {
  const s = useMM();
  switch (tab) {
    case "awaiting": return <AwaitingTab s={s} />;
    case "review": return <ReviewTab s={s} />;
    case "dispatch": return <DispatchTab s={s} />;
    default: return <RequestsTab s={s} />;
  }
}
