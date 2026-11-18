import Catalogue from "./stock/Catalogue";
import Availability from "./stock/Availability";
import Incoming from "./stock/Incoming";
import Reservations from "./stock/Reservations";

/* Products & Stock: kept simple on purpose. In stock, reserved, available,
   incoming. Not a warehouse system. */
export default function Stock({ tab }: { tab: string }) {
  switch (tab) {
    case "availability": return <Availability />;
    case "incoming": return <Incoming />;
    case "reservations": return <Reservations />;
    default: return <Catalogue />;
  }
}
