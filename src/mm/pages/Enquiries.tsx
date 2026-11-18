import Inbox from "./enquiries/Inbox";
import Qualification from "./enquiries/Qualification";
import Pipeline from "./enquiries/Pipeline";
import FollowUps from "./enquiries/FollowUps";

/* Enquiries module. Tab ids come from modules.ts: inbox, qualification,
   pipeline, followups. Anything unknown falls back to the inbox. */
export default function Enquiries({ tab }: { tab: string }) {
  switch (tab) {
    case "qualification": return <Qualification />;
    case "pipeline": return <Pipeline />;
    case "followups": return <FollowUps />;
    default: return <Inbox />;
  }
}
