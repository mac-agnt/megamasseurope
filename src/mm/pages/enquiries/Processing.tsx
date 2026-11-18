import { useState, type ReactNode } from "react";
import type { Contact, Customer, Enquiry, MMState } from "../../types";
import { approveReply, createQuote, go, openPanel, setDraftReply } from "../../store";
import { contactOf, customerOf, ix, stockOf } from "../../select";
import { countryName, num, plural, since, stamp } from "../../format";
import {
  Avatar, Badge, Button, Card, Confidential, CountryTag, Empty, I, Icon, Label, MONO, Mail, ProductThumb, Row, Status, Timeline,
} from "../../ui";
import {
  PRIORITY_TONE, enquiryTimeline, interestOf, isUnanswered, isWaiting, quantityText, unitsOf,
} from "./data";
import { ELLIPSIS, FormBox, MoreButton, ReplyBox } from "./bits";

/* The right side of the Inbox workspace: one enquiry, processed end to end.
   Source on the left, the Enquiry Agent's reading on the right, then the
   prepared reply and the record's timeline. */

type P = { s: MMState; e: Enquiry; c: Customer; ct: Contact };

export function Processing({ s, e }: { s: MMState; e: Enquiry }) {
  const c = customerOf(s, e.customerId);
  const ct = s.contacts.find((x) => x.id === e.contactId) ?? contactOf(s, c);
  const p: P = { s, e, c, ct };
  return (
    <>
      <Header {...p} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 14 }}>
        {e.source === "Website quote form" ? <WebsiteForm {...p} /> : <MessageSource {...p} />}
        <Extraction {...p} />
      </div>
      <Reply {...p} />
      <History s={s} e={e} />
    </>
  );
}

function StateBadge({ e }: { e: Enquiry }) {
  if (isUnanswered(e)) return <Badge tone="accent" dot>Unanswered</Badge>;
  if (isWaiting(e)) return <Badge tone="warn" dot>Waiting on customer</Badge>;
  return <Status s={e.stage} />;
}

function Header({ e, c, ct }: P) {
  const meta: ReactNode[] = [
    <span key="who">{ct.name}, {ct.role.toLowerCase()}</span>,
    <span key="id" style={MONO}>{e.id}</span>,
    <span key="src">{e.source}</span>,
    <span key="age">Received {since(e.receivedAt)}</span>,
    <span key="own">Owner: {e.owner}</span>,
  ];
  return (
    <Card pad="16px 18px">
      <Row gap={12} wrap style={{ alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <Row gap={8} wrap>
            <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.4px", color: "var(--ink)" }}>{c.name}</span>
            <CountryTag c={c.country} />
            <StateBadge e={e} />
            <Badge tone={PRIORITY_TONE[e.priority]}>{e.priority} priority</Badge>
          </Row>
          <Row gap={14} wrap style={{ marginTop: 7, fontSize: 12.5, color: "var(--dim)" }}>{meta}</Row>
        </div>
        <Button size="sm" icon={I.eye} onClick={() => openPanel("enquiry", e.id)}>Open record</Button>
      </Row>
    </Card>
  );
}

/* ── source: the website form as submitted ───────────────────────────────── */

function WebsiteForm({ s, e, c, ct }: P) {
  const sp = ct.name.indexOf(" ");
  const first = sp > 0 ? ct.name.slice(0, sp) : ct.name;
  const last = sp > 0 ? ct.name.slice(sp + 1) : "";
  const cart = e.initialLines ?? e.lines;
  const grew = !!e.initialLines && unitsOf(e.lines) !== unitsOf(e.initialLines);
  return (
    <Card title="Website enquiry" hint={"megamasseurope.com quote form, " + stamp(e.receivedAt)}
      right={<Icon d={I.globe} size={16} style={{ color: "var(--faint)" }} />}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
        <FormBox label="First Name" value={first} />
        <FormBox label="Last Name" value={last} />
        <FormBox label="Email" value={ct.email} />
        <FormBox label="Phone" value={ct.phone} />
        <FormBox label="City" value={c.city} />
        <FormBox label="Zip Code" value={e.postcode ?? ""} warn={!e.postcode} note={e.postcode ? undefined : "Left blank on the form"} />
        <FormBox label="Country/Region" value={countryName(c.country)} />
        <FormBox label="Facility type" value={e.facility} />
        <FormBox label="How did you hear about MEGAMASS" value={e.heardVia} span />
        <FormBox label="Message" value={e.message} span multiline />
      </div>
      <Label style={{ marginTop: 16 }}>Quote cart</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 9 }}>
        {cart.map((l) => {
          const pr = ix(s).product[l.productId];
          return (
            <Row key={l.productId} gap={10}>
              {pr && <ProductThumb p={pr} size={34} />}
              <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink)", ...ELLIPSIS }}>{pr ? pr.name : l.productId}</span>
              <span style={{ ...MONO, fontSize: 11.5, color: "var(--dim)" }}>Qty {l.qty}</span>
            </Row>
          );
        })}
      </div>
      {grew && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 9 }}>
        The request grew to {plural(unitsOf(e.lines), "machine")} by email after this form came in.</div>}
    </Card>
  );
}

/* ── source: email, Instagram, phone or referral ──────────────────────────── */

const SOURCE_META: Record<Exclude<Enquiry["source"], "Website quote form">, { title: string; hint: string; icon: string }> = {
  Email: { title: "Email enquiry", hint: "Gmail, sales@megamasseurope.com", icon: I.mail },
  Instagram: { title: "Instagram message", hint: "Direct message to @megamasseurope", icon: I.send },
  Phone: { title: "Phone enquiry", hint: "Logged from a call", icon: I.user },
  Referral: { title: "Referral", hint: "Passed on by a contact", icon: I.link },
};

function MessageSource({ s, e, c, ct }: P) {
  const meta = SOURCE_META[e.source as keyof typeof SOURCE_META] ?? SOURCE_META.Email;
  const inbound = s.emails.filter((m) => m.recordKind === "enquiry" && m.recordId === e.id && m.direction === "in").sort((a, b) => a.at - b.at)[0];
  return (
    <Card title={meta.title} hint={meta.hint + ", " + stamp(e.receivedAt)} right={<Icon d={meta.icon} size={16} style={{ color: "var(--faint)" }} />}>
      <Mail from={inbound ? inbound.from : ct.name + " <" + ct.email + ">"} to={inbound ? inbound.to : "sales@megamasseurope.com"}
        at={stamp(inbound ? inbound.at : e.receivedAt)} subject={inbound?.subject} body={inbound ? inbound.body : e.message} />
      <Label style={{ marginTop: 16, marginBottom: 9 }}>Contact details on file</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
        <FormBox label="Email" value={ct.email} />
        <FormBox label="Phone" value={ct.phone} />
        <FormBox label="City" value={c.city + ", " + countryName(c.country)} />
        <FormBox label="Postcode" value={e.postcode ?? ""} warn={!e.postcode} note={e.postcode ? undefined : "Not given"} />
      </div>
    </Card>
  );
}

/* ── the Enquiry Agent's reading ─────────────────────────────────────────── */

function Extraction({ s, e, c, ct }: P) {
  const read = s.activity.find((a) => a.recordId === e.id && a.actor === "Enquiry Agent");
  const rows: [string, ReactNode][] = [
    ["Customer", ct.name],
    ["Business", c.name],
    ["Country", countryName(c.country)],
    ["Interest", interestOf(s, e)],
    ["Quantity", quantityText(e)],
    ["Customer type", e.qualification],
    ["Information missing", e.missing.length
      ? <Badge tone="warn" dot style={{ whiteSpace: "normal", height: "auto", minHeight: 22, padding: "3px 9px" }}>{e.missing.join(", ")}</Badge>
      : <span style={{ color: "var(--ok)" }}>Nothing missing</span>],
    ["Recommended action", <span style={{ color: "var(--accent)", fontWeight: 600 }}>{e.aiAction}</span>],
  ];
  const products = [...new Set(e.lines.map((l) => l.productId))].map((id) => ix(s).product[id]).filter(Boolean);
  return (
    <Card title="AI extraction" hint={"Enquiry Agent" + (read ? ", read " + stamp(read.at) : "")} right={<Avatar name="Enquiry Agent" size={28} />}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.map(([k, v], i) => (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "minmax(92px,38%) minmax(0,1fr)", gap: 12, alignItems: "baseline",
            padding: "9px 0", borderTop: i ? "1px solid var(--border)" : undefined }}>
            <span style={{ fontSize: 12, color: "var(--dim)" }}>{k}</span>
            <span style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.45, overflowWrap: "anywhere" }}>{v}</span>
          </div>
        ))}
      </div>
      {products.length > 0 && <>
        <Label style={{ marginTop: 14, marginBottom: 8 }}>Stock check</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {products.map((pr) => {
            const st = stockOf(s, pr);
            const text = st.available > 0 ? num(st.available) + " available in County Derry"
              : st.incoming > 0 ? "None in stock, " + num(st.incomingFree) + " of " + num(st.incoming) + " incoming unallocated"
              : "None in stock";
            return (
              <Row key={pr.id} gap={8} style={{ fontSize: 12.5 }}>
                <span style={{ flex: 1, color: "var(--body)", ...ELLIPSIS }}>{pr.name}</span>
                <span style={{ color: st.available > 0 ? "var(--ok)" : "var(--warn)", whiteSpace: "nowrap" }}>{text}</span>
              </Row>
            );
          })}
        </div>
      </>}
    </Card>
  );
}

/* ── prepared reply and actions ───────────────────────────────────────────── */

function Reply({ s, e, c, ct }: P) {
  const [editing, setEditing] = useState(false);
  const open = isUnanswered(e);
  const missing = e.missing.length > 0;
  const sent = s.emails.filter((m) => m.recordKind === "enquiry" && m.recordId === e.id && m.direction === "out").sort((a, b) => b.at - a.at)[0];
  const simulated = s.activity.some((a) => a.recordKind === "enquiry" && a.recordId === e.id && a.simulated);
  const first = ct.name.split(" ")[0];

  const badge = open ? <Badge tone="accent">Waiting for your approval</Badge>
    : sent && simulated ? <Badge tone="ok" dot>Reply sent (simulated)</Badge>
    : sent ? <Badge>Replied {since(sent.at)}</Badge> : null;
  const askTitle = !open ? "A reply has already gone to " + first + "."
    : missing ? "Sends the prepared reply asking for the " + e.missing.join(", ").toLowerCase() + "."
    : "Nothing is missing on this enquiry.";

  return (
    <Card title={open ? "Prepared reply" : "Reply"} right={badge}
      hint={open ? "Drafted by the Enquiry Agent in your voice. Nothing goes to " + first + " until you approve it."
        : sent ? "Last email to " + first + ", " + stamp(sent.at) : "Nothing sent from the inbox for this enquiry."}>
      {open ? <ReplyBox value={e.draftReply} editing={editing} onChange={(v) => setDraftReply(e.id, v)} />
        : sent ? <Mail kind="out" from={sent.from} to={sent.to} at={stamp(sent.at)} subject={sent.subject} body={sent.body} />
        : <Empty title="No inbox reply on record" sub="It moved on through the quote and freight steps. The timeline below has the detail." />}
      {open && !missing && <Row gap={8} style={{ marginTop: 10 }}><Confidential label={"Price list attached, " + c.currency} /></Row>}
      {!open && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 10 }}>Next step: <span style={{ color: "var(--ink)" }}>{e.aiAction}</span></div>}
      <Row wrap gap={8} style={{ marginTop: 14 }}>
        <Button kind="primary" icon={I.check} disabled={!open} title={open ? "Approve and send the reply above" : "Reply already sent"}
          onClick={() => { approveReply(e.id); setEditing(false); }}>Approve Reply</Button>
        <Button icon={I.edit} disabled={!open} onClick={() => setEditing(!editing)}>{editing ? "Done Editing" : "Edit Reply"}</Button>
        <span title={askTitle} style={{ display: "inline-flex" }}>
          <Button icon={I.mail} disabled={!open || !missing} title={askTitle} onClick={() => { approveReply(e.id); setEditing(false); }}>Request More Information</Button>
        </span>
        <Button icon={I.quote} title={e.quoteId ? "Open " + e.quoteId + " in the quote builder" : "Start a quote from this enquiry in the quote builder"}
          onClick={() => { createQuote(e.id); go("Quotes", "builder"); }}>{e.quoteId ? "Open Quote" : "Create Quote"}</Button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Simulated in this demo: nothing is sent.</span>
      </Row>
    </Card>
  );
}

/* ── timeline ─────────────────────────────────────────────────────────────── */

const SHOWN = 8;

function History({ s, e }: { s: MMState; e: Enquiry }) {
  const [all, setAll] = useState(false);
  const items = enquiryTimeline(s, e);
  const shown = all ? items : items.slice(0, SHOWN);
  return (
    <Card title="Timeline" hint="Website, Gmail, carrier and agent activity on this enquiry, newest first" right={<Badge>{plural(items.length, "event")}</Badge>}>
      {items.length === 0 ? <Empty title="Nothing logged yet" />
        : <Timeline items={shown.map((it) => ({ at: stamp(it.at), title: it.title, detail: it.detail, who: it.who, tone: it.tone }))} />}
      {items.length > SHOWN && <MoreButton onClick={() => setAll(!all)}>{all ? "Show fewer" : "Show all " + items.length}</MoreButton>}
    </Card>
  );
}
