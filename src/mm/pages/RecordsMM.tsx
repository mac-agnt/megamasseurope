import CustomersTab from "./records/CustomersTab";
import SuppliersTab from "./records/SuppliersTab";
import ProductsTab from "./records/ProductsTab";
import OrdersTab from "./records/OrdersTab";

/* Mega Mass record tabs under Pulse's Records hero. Ontology, Files and
   Contacts stay Pulse's own; anything else renders nothing here. */
export default function RecordsMM({ tab }: { tab: string }) {
  switch (tab) {
    case "customers": return <CustomersTab />;
    case "suppliers": return <SuppliersTab />;
    case "products": return <ProductsTab />;
    case "orders": return <OrdersTab />;
    default: return null;
  }
}
