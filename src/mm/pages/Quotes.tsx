import Overview from "./quotes/Overview";
import Builder from "./quotes/Builder";
import Approvals from "./quotes/Approvals";
import Sent from "./quotes/Sent";
import PriceBooks from "./quotes/PriceBooks";

/* Quotes: the commercial engine. Tabs come from modules.ts (overview, builder,
   approvals, sent, pricebooks); every number is read from the shared store. */
export default function Quotes({ tab }: { tab: string }) {
  switch (tab) {
    case "builder": return <Builder />;
    case "approvals": return <Approvals />;
    case "sent": return <Sent />;
    case "pricebooks": return <PriceBooks />;
    default: return <Overview />;
  }
}
