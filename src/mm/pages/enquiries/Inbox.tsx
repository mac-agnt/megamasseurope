import { useCallback, useState } from "react";
import type { Enquiry, MMState } from "../../types";
import { approveReplies, useMM } from "../../store";
import { HISTORY, awaitingCustomer, customerOf, ix, unanswered } from "../../select";
import { num, plural } from "../../format";
import { Button, Card, Empty, Grid, I, Icon, Kpi, Note, Page, PageHead, Row, Seg } from "../../ui";
import {
  DAY, HOUR, ageLong, draftsReady, highPriorityOpen, inboxRows, isUnanswered, matchesQuery, oldestUnanswered, openEnquiries,
  receivedWithin, sortEnquiries, type InboxFilter, type InboxSort,
} from "./data";
import { InboxList } from "./InboxList";
import { InboxTable } from "./InboxTable";
import { Processing } from "./Processing";

/* Enquiries > Inbox. KPI strip, then either the workspace (list plus the
   processing view) or the full table. Nothing reaches a customer until Niall
   approves it, and every send is simulated. */

type View = "workspace" | "table";
type Memo = { view: View; filter: InboxFilter; sort: InboxSort; q: string; selected: string };

/* Kept outside React so the inbox reopens where Niall left it after visiting
   another tab or module. Milano is the showcase enquiry. */
const memo: Memo = { view: "workspace", filter: "unanswered", sort: "newest", q: "", selected: "ENQ-4562" };

function useRemembered<K extends keyof Memo>(k: K): [Memo[K], (v: Memo[K]) => void] {
  const [v, setV] = useState<Memo[K]>(memo[k]);
  const set = useCallback((nv: Memo[K]) => { memo[k] = nv; setV(nv); }, [k]);
  return [v, set];
}

export default function Inbox() {
  const s = useMM();
  const [view, setView] = useRemembered("view");
  const [filter, setFilter] = useRemembered("filter");
  const [sort, setSort] = useRemembered("sort");
  const [q, setQ] = useRemembered("q");
  const [selected, setSelected] = useRemembered("selected");
  const [confirming, setConfirming] = useState(false);

  const un = unanswered(s);
  const waiting = awaitingCustomer(s);
  const high = highPriorityOpen(s);
  const lastDay = receivedWithin(s, DAY);
  const oldest = oldestUnanswered(s);
  const ready = draftsReady(s);
  const counts: Record<InboxFilter, number> = { unanswered: un.length, waiting: waiting.length, open: openEnquiries(s).length, high: high.length };
  const rows = sortEnquiries(inboxRows(s, filter).filter((e) => matchesQuery(s, e, q)), sort);
  const current: Enquiry | undefined = ix(s).enquiry[selected] ?? rows[0];

  const showFilter = (f: InboxFilter) => { setFilter(f); setView("workspace"); };
  const oldestAge = oldest ? Date.now() - oldest.receivedAt : 0;
  const oldestCust = oldest ? customerOf(s, oldest.customerId) : undefined;

  return (
    <Page>
      <PageHead title="Enquiry inbox"
        sub="Every request from the website form, Gmail and Instagram, read by the Enquiry Agent with a reply drafted in your voice. Nothing goes to a customer until you approve it." />

      <Grid cols="repeat(auto-fit,minmax(176px,1fr))" gap={12}>
        <Kpi hero tone="accent" label="Unanswered" value={num(un.length)} onClick={() => showFilter("unanswered")}
          sub={plural(ready.length, "reply", "replies") + " ready to approve, " + num(un.length - ready.length) + " need details"} />
        <Kpi tone="warn" label="Waiting on customer" value={num(waiting.length)} onClick={() => showFilter("waiting")}
          sub="Answered, waiting on their details" />
        <Kpi tone="bad" label="High priority open" value={num(high.length)} onClick={() => showFilter("high")}
          sub={num(high.filter(isUnanswered).length) + " of them still unanswered"} />
        <Kpi tone="info" label="Received in the last 24h" value={num(lastDay.length)}
          onClick={() => { showFilter("open"); setSort("newest"); }}
          sub={num(lastDay.filter((e) => e.source === "Website quote form").length) + " through the website form"} />
        <Kpi tone={oldestAge > 48 * HOUR ? "bad" : "neutral"} label="Oldest unanswered" value={oldest ? ageLong(oldestAge) : "None"}
          onClick={oldest ? () => { setSelected(oldest.id); showFilter("unanswered"); } : undefined}
          sub={oldestCust ? oldestCust.name + ", " + oldestCust.city : "Every enquiry has had a reply"} />
      </Grid>

      <Note icon={I.clock} style={{ padding: "8px 12px" }}>
        {HISTORY.source}: {num(HISTORY.reported)} quotation requests, {HISTORY.window}. {HISTORY.note}
      </Note>

      <Row wrap gap={10}>
        <Seg<View> options={[["workspace", "Workspace"], ["table", "Table"]]} value={view} onChange={setView} />
        <span style={{ flex: 1 }} />
        <Button kind={ready.length ? "primary" : "secondary"} icon={I.check} disabled={!ready.length || confirming}
          title={ready.length ? "Replies for unanswered enquiries with nothing missing" : "No complete drafts waiting"}
          onClick={() => setConfirming(true)}>
          {ready.length ? "Approve " + plural(ready.length, "drafted reply", "drafted replies") : "No complete drafts waiting"}
        </Button>
      </Row>

      {confirming && ready.length > 0 && <ConfirmBatch s={s} ready={ready} onClose={() => setConfirming(false)} />}

      {view === "workspace" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "stretch" }}>
          <InboxList s={s} rows={rows} selectedId={current?.id} onSelect={setSelected} filter={filter} onFilter={setFilter}
            counts={counts} sort={sort} onSort={setSort} q={q} onQ={setQ} style={{ flex: "38 1 340px", minWidth: 0 }} />
          <div style={{ flex: "62 1 560px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {current ? <Processing key={current.id} s={s} e={current} />
              : <Card><Empty title="No enquiry selected" sub="Pick one from the list to process it." /></Card>}
          </div>
        </div>
      ) : (
        <InboxTable s={s} rows={rows} filter={filter} onFilter={setFilter} counts={counts} q={q} onQ={setQ} />
      )}
    </Page>
  );
}

/** Inline confirm for the batch send: these go to customers, so ask once more. */
function ConfirmBatch({ s, ready, onClose }: { s: MMState; ready: Enquiry[]; onClose: () => void }) {
  const names = ready.slice(0, 3).map((e) => customerOf(s, e.customerId).name);
  const more = ready.length - names.length;
  return (
    <Card tone="accent" pad="14px 16px">
      <Row wrap gap={12}>
        <span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon d={I.send} size={16} /></span>
        <div style={{ flex: "1 1 380px", minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
            Send {plural(ready.length, "prepared reply", "prepared replies")} now?
          </div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>
            Only unanswered enquiries with nothing missing: {names.join(", ")}{more > 0 ? " and " + num(more) + " more" : ""}.
            Each customer gets the reply the Enquiry Agent drafted, as it stands. Simulated in this demo: nothing is sent.
          </div>
        </div>
        <Button kind="primary" icon={I.check} onClick={() => { approveReplies(ready.map((e) => e.id)); onClose(); }}>
          Approve {plural(ready.length, "reply", "replies")}
        </Button>
        <Button kind="ghost" onClick={onClose}>Cancel</Button>
      </Row>
    </Card>
  );
}
