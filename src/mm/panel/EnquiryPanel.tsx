import type { Line, MMState } from "../types";
import { approveReply, closePanel, createQuote, go, setDraftReply } from "../store";
import { enquiryValue, ix } from "../select";
import { Badge, Button, Facts, I, Icon, MONO, Note, Status, TextArea, Who } from "../ui";
import { countryName, dateShort, money, plural, since, stamp } from "../format";
import {
  ActivityList, Box, DAY, MAIL_ANCHOR, MachinePill, MailThread, Missing, Muted, OpenTasks, PanelBody, RecLink, SIM_NOTE, Section, StatBand, StockNotes,
  activityFor, emailsFor, isOpenStage, stockCheck, useNav,
} from "./kit";

/* Enquiry record: who asked, what they asked for, what the Enquiry Agent
   made of it, and the reply waiting for approval. */

const factKey = { ...MONO, fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase" as const, color: "var(--faint)", marginBottom: 8 };

export default function EnquiryPanel({ s, id }: { s: MMState; id: string }) {
  const nav = useNav();
  const x = ix(s);
  const e = x.enquiry[id];
  if (!e) return <Missing />;
  const c = x.customer[e.customerId];
  const ct = s.contacts.find((k) => k.id === e.contactId);
  const quote = e.quoteId ? x.quote[e.quoteId] : undefined;
  const cur = c.currency;
  const units = e.lines.reduce((n, l) => n + l.qty, 0);
  const open = isOpenStage(e.stage);
  const canReply = !e.replied;
  const canQuote = !quote && open;
  const lineText = (ls: Line[]) => ls.map((l) => (l.qty > 1 ? l.qty + " × " : "") + (x.product[l.productId]?.name ?? l.productId)).join(", ");
  const grew = !!e.initialLines && lineText(e.initialLines) !== lineText(e.lines);
  const read = s.activity.find((a) => a.recordId === e.id && a.actor === "Enquiry Agent");
  const waiting = Date.now() - e.receivedAt;
  const checks = open ? stockCheck(s, e.lines) : [];

  const toBuilder = () => { createQuote(e.id); go("Quotes", "builder"); closePanel(); };

  const actions = canReply || canQuote || quote ? (
    <>
      {canReply && <Button kind="primary" icon={I.send} onClick={() => approveReply(e.id)}>Approve reply</Button>}
      {canQuote && <Button kind={canReply ? "secondary" : "primary"} icon={I.quote} onClick={toBuilder}>Create quote</Button>}
      {quote && <Button kind="secondary" icon={I.quote} onClick={() => nav.open("quote", quote.id)}>Open quote {quote.id}</Button>}
    </>
  ) : undefined;

  return (
    <PanelBody actions={actions} foot={canReply ? SIM_NOTE + " Approving sends the prepared reply exactly as written." : undefined}>
      <StatBand items={[
        { label: "Indicative value", value: money(enquiryValue(s, e), cur), sub: quote ? "From quote " + quote.id + ", ex VAT" : "List price, before freight" },
        { label: "Machines", value: units, sub: plural(e.lines.length, "model") },
        { label: "Received", value: since(e.receivedAt), sub: dateShort(e.receivedAt) },
        e.replied
          ? { label: "First response", value: "Sent", tone: "ok", sub: "Last contact " + since(e.lastContactAt) }
          : { label: "First response", value: "Waiting", tone: waiting > 2 * DAY ? "bad" : "warn", sub: "Site promises 1 to 2 business days" },
      ]} />

      {e.stage === "Lost" && <Note>Lost: {e.lostReason || "no reason recorded"}.</Note>}

      <Section title="Customer and contact">
        <Box>
          <Facts rows={[
            ["Customer", <RecLink kind="customer" id={c.id}>{c.name}</RecLink>],
            ["Customer type", c.type],
            ["Contact", ct ? ct.name + ", " + ct.role : "Not recorded"],
            ["Email", ct?.email ?? "Not recorded"],
            ["Phone", ct?.phone ?? "Not recorded"],
            ["Delivery", e.postcode
              ? c.city + " " + e.postcode + ", " + countryName(c.country)
              : <span>{c.city + ", " + countryName(c.country)} <span style={{ color: "var(--warn)" }}>· postcode not given</span></span>],
          ]} />
        </Box>
      </Section>

      <Section title="Request">
        <Box>
          <Facts cols={3} rows={[
            ["Source", e.source],
            ["Heard via", e.heardVia],
            ["Facility type", e.facility],
            ["Received", stamp(e.receivedAt)],
            ["Owner", e.owner],
            ["Stage", <Status s={e.stage} />],
          ]} />
        </Box>
      </Section>

      <Section title="Original message">
        <Box pad="16px 18px">
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--faint)" }}>
            <Icon d={I.mail} size={13} />
            <span>{e.source === "Website quote form" ? "megamasseurope.com quote form" : e.source} · {stamp(e.receivedAt)}</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.65, color: "var(--body)", whiteSpace: "pre-wrap" }}>{e.message}</div>
        </Box>
      </Section>

      <Section title="AI extraction" right={<Badge tone="accent">Enquiry Agent</Badge>}>
        <Box tone="accent" pad="16px 18px">
          <Who name="Enquiry Agent" sub={"Read this enquiry " + since(read ? read.at : e.receivedAt) + ". Facts only, nothing sent."} />
          <div style={{ marginTop: 16 }}>
            <div style={factKey}>Interest</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {e.lines.map((l, i) => { const p = x.product[l.productId]; return p ? <MachinePill key={i} p={p} qty={l.qty} /> : null; })}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <Facts rows={[
              ["Quantity", plural(units, "machine")],
              ["Customer type", e.qualification === c.type ? c.type : c.type + " · " + e.qualification],
              ["Missing info", e.missing.length
                ? <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>{e.missing.map((m) => <Badge key={m} tone="warn">{m}</Badge>)}</span>
                : "Nothing missing"],
              ["Recommended action", <span style={{ color: "var(--accent)", fontWeight: 600 }}>{e.aiAction}</span>],
            ]} />
          </div>
          {grew && e.initialLines && (
            <Note tone="info" icon={I.spark} style={{ marginTop: 14 }}>
              The request grew. First asked for {lineText(e.initialLines)}; now {plural(units, "machine")}.
            </Note>
          )}
        </Box>
      </Section>

      {open && (
        <Section title="Stock check">
          <StockNotes checks={checks} />
        </Section>
      )}

      {canReply ? (
        <Section title="Prepared reply" right={ct ? <span style={{ ...MONO, fontSize: 10, color: "var(--faint)" }}>To {ct.email}</span> : undefined}>
          <Box pad="14px">
            <TextArea value={e.draftReply} rows={10} onChange={(v) => setDraftReply(e.id, v)} />
            <Muted style={{ marginTop: 10, fontSize: 12 }}>Drafted by the Enquiry Agent. Edit it here; approving sends this text.</Muted>
          </Box>
        </Section>
      ) : (
        <Section title="Reply">
          <Note tone={e.awaitingCustomer ? "warn" : "ok"} icon={e.awaitingCustomer ? I.clock : I.check}>
            {e.awaitingCustomer
              ? "Replied " + since(e.lastContactAt) + ". Waiting on the customer for " + (e.missing.join(", ").toLowerCase() || "a reply") + "."
              : "Replied " + since(e.lastContactAt) + ". The sent reply is in the thread below."}
          </Note>
        </Section>
      )}

      <Section title="Email thread" id={MAIL_ANCHOR}>
        <MailThread emails={emailsFor(s, "enquiry", e.id)} />
      </Section>

      <Section title="Activity">
        <ActivityList events={activityFor(s, [e.id])} />
      </Section>

      <OpenTasks s={s} kind="enquiry" id={e.id} />
    </PanelBody>
  );
}
