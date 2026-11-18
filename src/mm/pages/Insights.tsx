import Executive from "./insights/Executive";
import FunnelTab from "./insights/FunnelTab";
import Markets from "./insights/Markets";
import Sales from "./insights/Sales";
import Risk from "./insights/Risk";

/* Insights: what is happening across Mega Mass Europe without reading the inbox.
   Tabs: executive, funnel, markets, sales, risk (see modules.ts). */
export default function Insights({ tab }: { tab: string }) {
  switch (tab) {
    case "funnel": return <FunnelTab />;
    case "markets": return <Markets />;
    case "sales": return <Sales />;
    case "risk": return <Risk />;
    default: return <Executive />;
  }
}
