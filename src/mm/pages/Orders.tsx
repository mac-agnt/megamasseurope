import OrdersOverview from "./orders/Overview";
import ConfirmedOrders from "./orders/Confirmed";
import Invoices from "./orders/Invoices";
import Payments from "./orders/Payments";
import Fulfilment from "./orders/Fulfilment";

/* Orders: the operational layer around FreshBooks. FreshBooks stays the record
   for invoices, payments and completed deals; every write here is simulated. */
export default function Orders({ tab }: { tab: string }) {
  switch (tab) {
    case "confirmed": return <ConfirmedOrders />;
    case "invoices": return <Invoices />;
    case "payments": return <Payments />;
    case "fulfilment": return <Fulfilment />;
    default: return <OrdersOverview />;
  }
}
