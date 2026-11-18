import Enquiries from "./pages/Enquiries";
import Quotes from "./pages/Quotes";
import Freight from "./pages/Freight";
import Orders from "./pages/Orders";
import Stock from "./pages/Stock";
import Insights from "./pages/Insights";
import AgentRuns from "./pages/AgentRuns";
import RecordsMM from "./pages/RecordsMM";

/* Routes the Mega Mass modules. `page` and `tab` come from PulseLogic. */
export default function MMPage({ page, tab }: { page: string; tab: string }) {
  switch (page) {
    case "Enquiries": return <Enquiries tab={tab} />;
    case "Quotes": return <Quotes tab={tab} />;
    case "Freight": return <Freight tab={tab} />;
    case "Orders": return <Orders tab={tab} />;
    case "Stock": return <Stock tab={tab} />;
    case "Insights": return <Insights tab={tab} />;
    case "Agents": return tab === "runs" ? <AgentRuns tab={tab} /> : null;
    case "Records": return <RecordsMM tab={tab} />;
    default: return null;
  }
}
