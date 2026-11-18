import type { MMState, RecordKind } from "../types";
import { decideFollowUp, setFollowUpDraft } from "../store";
import { invoiceStatus, ix, outstanding, quoteTotal } from "../select";
import { Button, Facts, I, MONO, Note, Status, TextArea } from "../ui";
import { dateShort, money, since, stamp, until } from "../format";
import {
  ActivityList, Box, DAY, Missing, Muted, PanelBody, RecLink, RecordRow, SIM_NOTE, Section, StatBand, activityFor, useNav,
} from "./kit";

/* Follow-up: a drafted chase that waits for Niall. Automatic chasing stays off. */

export default function FollowUpPanel({ s, id }: { s: MMState; id: string }) {
  const nav = useNav();
  const x = ix(s);
  const fu = s.followUps.find((y) => y.id === id);
  if (!fu) return <Missing />;
  const c = x.customer[fu.customerId];
  const ct = s.contacts.find((k) => k.id === c.contactId);
  const linked: { kind: RecordKind; id: string; label: string } | null = fu.quoteId ? { kind: "quote", id: fu.quoteId, label: "Quote " + fu.quoteId }
    : fu.invoiceId ? { kind: "invoice", id: fu.invoiceId, label: "Invoice " + fu.invoiceId }
    : fu.enquiryId ? { kind: "enquiry", id: fu.enquiryId, label: "Enquiry " + fu.enquiryId } : null;
  const due = fu.lastTouch + fu.dueInDays * DAY;
  const pending = fu.status === "Awaiting review";
  const q = fu.quoteId ? x.quote[fu.quoteId] : undefined;
  const inv = fu.invoiceId ? x.invoice[fu.invoiceId] : undefined;
  const e = fu.enquiryId ? x.enquiry[fu.enquiryId] : undefined;

  const actions = pending ? (
    <>
      <Button kind="primary" icon={I.send} onClick={() => decideFollowUp(fu.id, "Approved")}>Approve</Button>
      <Button kind="secondary" icon={I.clock} onClick={() => decideFollowUp(fu.id, "Snoozed")}>Snooze</Button>
      <Button kind="ghost" icon={I.x} onClick={() => decideFollowUp(fu.id, "Dismissed")}>Dismiss</Button>
    </>
  ) : undefined;

  return (
    <PanelBody actions={actions} foot={pending ? SIM_NOTE : undefined}>
      <StatBand items={[
        { label: "Value", value: fu.value !== null ? money(fu.value, fu.currency) : "Not priced", sub: fu.kind },
        { label: "Last touch", value: since(fu.lastTouch), sub: dateShort(fu.lastTouch) },
        due <= Date.now()
          ? { label: "Suggested send", value: pending ? "Due now" : "Passed", tone: pending ? "warn" : undefined, sub: "Since " + dateShort(due) }
          : { label: "Suggested send", value: until(due), sub: dateShort(due) },
        { label: "Timing", value: "Day " + fu.dueInDays, sub: "Cadence " + s.controls.cadence.join(", ") + " days" },
      ]} />

      <Note tone="info" icon={I.lock}>
        {s.controls.followUpAuto
          ? "Automatic chasing is on in Settings, but this one still waits for your review."
          : "Automatic chasing is off. Nothing goes out until you approve it."}
      </Note>

      <Section title="Details">
        <Box>
          <Facts rows={[
            ["Kind", fu.kind],
            ["Status", <Status s={fu.status} />],
            ["Customer", <RecLink kind="customer" id={c.id}>{c.name}</RecLink>],
            ["Contact", ct ? ct.name + ", " + ct.email : "Not recorded"],
            ["Linked record", linked ? <RecLink kind={linked.kind} id={linked.id}>{linked.label}</RecLink> : "None"],
            ["Last touch", stamp(fu.lastTouch)],
          ]} />
        </Box>
      </Section>

      {(q || inv || e) && (
        <Section title="Where it stands">
          <Box pad="5px">
            {q && (
              <RecordRow onClick={() => nav.open("quote", q.id)} title={q.id + " · " + money(quoteTotal(s, q), q.currency) + " ex VAT"}
                sub={q.sentAt ? "Sent " + since(q.sentAt) + ", valid " + q.validDays + " days" : "Not sent yet"} right={<Status s={q.status} />} />
            )}
            {inv && (
              <RecordRow onClick={() => nav.open("invoice", inv.id)} title={inv.id + " · " + money(outstanding(s, inv), inv.currency) + " outstanding"}
                sub={inv.promise ? (inv.promise.broken ? "Promise broken: " : "Promised for " + dateShort(inv.promise.date) + ": ") + inv.promise.note : "Due " + dateShort(inv.dueAt)}
                right={<Status s={invoiceStatus(s, inv)} />} />
            )}
            {e && !q && (
              <RecordRow onClick={() => nav.open("enquiry", e.id)} title={e.id + " · " + e.lines.map((l) => x.product[l.productId]?.name ?? l.productId).join(", ")}
                sub={e.missing.length ? "Still missing " + e.missing.join(", ").toLowerCase() : e.aiAction} right={<Status s={e.stage} />} />
            )}
          </Box>
        </Section>
      )}

      <Section title="Drafted message" right={ct ? <span style={{ ...MONO, fontSize: 10, color: "var(--faint)" }}>To {ct.email}</span> : undefined}>
        {pending ? (
          <Box pad="14px">
            <TextArea value={fu.draft} rows={8} onChange={(v) => setFollowUpDraft(fu.id, v)} />
            <Muted style={{ marginTop: 10, fontSize: 12 }}>Drafted by the Follow-up Agent. Edit it here; approving sends this text.</Muted>
          </Box>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Note tone={fu.status === "Approved" ? "ok" : "neutral"} icon={fu.status === "Approved" ? I.check : I.pause}>
              {fu.status === "Approved" ? "Approved. In this demo nothing was sent." : fu.status === "Snoozed" ? "Snoozed. It stays out of the review list for now." : "Dismissed. No message goes out."}
            </Note>
            <Box pad="14px 16px">
              <div style={{ fontSize: 12.5, color: "var(--dim)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{fu.draft}</div>
            </Box>
          </div>
        )}
      </Section>

      <Section title="Activity">
        <ActivityList events={activityFor(s, [fu.id])} empty="No activity on this follow-up yet." />
      </Section>
    </PanelBody>
  );
}
