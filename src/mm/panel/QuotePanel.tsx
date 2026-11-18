import type { MMState } from "../types";
import {
  approve, approveQuote, closePanel, go, holdApproval, markAccepted, requestFreight, sendFreightRequest, setBuilderQuote,
} from "../store";
import { freightCharge, ix, quoteEquipment, quoteFreight, quoteTotal, quoteUnits } from "../select";
import { Badge, Button, Confidential, Facts, I, Icon, Note, ProductThumb, Status } from "../ui";
import { countryName, dateShort, money, plural, since, stamp, until } from "../format";
import {
  ActivityList, ApprovalBox, Box, DAY, Line2, MAIL_ANCHOR, MailThread, Missing, Muted, OpenTasks, PanelBody, RecLink, RecordRow, SIM_NOTE, Section, Stat,
  StockNotes, activityFor, emailsFor, isOpenApproval, scrollToId, stockCheck, useNav,
} from "./kit";

/* Quote record: the money, the machines, the freight behind it and the approval it waits on. */

export default function QuotePanel({ s, id }: { s: MMState; id: string }) {
  const nav = useNav();
  const x = ix(s);
  const q = x.quote[id];
  if (!q) return <Missing />;
  const c = x.customer[q.customerId];
  const ct = s.contacts.find((k) => k.id === c.contactId);
  const f = q.freightId ? x.freight[q.freightId] : undefined;
  const carrier = f ? s.suppliers.find((su) => su.id === f.carrierId) : undefined;
  const cur = q.currency;
  const equipment = quoteEquipment(q);
  const freight = quoteFreight(s, q);
  const total = quoteTotal(s, q);
  const approvals = s.approvals.filter((a) => a.recordId === q.id && isOpenApproval(a.status));
  const approval = approvals[0];
  const review = approvals.find((a) => a.kind === "Price review");
  const final = q.status === "Accepted" || q.status === "Declined" || q.status === "Expired";
  const validTo = (q.sentAt ?? q.createdAt) + q.validDays * DAY;
  const checks = final ? [] : stockCheck(s, q.lines);
  const emails = emailsFor(s, "quote", q.id);
  const overrides = q.lines.filter((l) => l.unitPrice !== l.listPrice).length;

  const primary = q.status === "Ready for Review" ? "approve" : review ? "review" : q.status === "Sent" ? "accept"
    : !q.freightId && !final ? "freight" : f?.status === "To request" ? "send" : "";
  const kindFor = (k: string): "primary" | "secondary" => (primary === k ? "primary" : "secondary");
  const toBuilder = () => { setBuilderQuote(q.id); go("Quotes", "builder"); closePanel(); };

  const actions = (
    <>
      {q.status === "Ready for Review" && <Button kind="primary" icon={I.send} onClick={() => approveQuote(q.id)}>Approve & send</Button>}
      {review && <Button kind={kindFor("review")} icon={I.check} onClick={() => approve(review.id)} title="Reply holding the quoted price">Keep list price</Button>}
      {approval && <Button kind="secondary" icon={I.pause} onClick={() => holdApproval(approval.id)}>Hold</Button>}
      {!q.freightId && !final && <Button kind={kindFor("freight")} icon={I.truck} onClick={() => requestFreight(q.id)}>Request freight</Button>}
      {f && f.status === "To request" && <Button kind={kindFor("send")} icon={I.send} onClick={() => sendFreightRequest(f.id)}>Send carrier request</Button>}
      {q.status === "Sent" && <Button kind={kindFor("accept")} icon={I.check} onClick={() => markAccepted(q.id)}>Mark accepted</Button>}
      {!final && <Button kind="secondary" icon={I.edit} onClick={toBuilder}>Edit in builder</Button>}
      <Button kind="ghost" size="sm" icon={I.mail} onClick={() => scrollToId(MAIL_ANCHOR)} style={{ marginLeft: "auto" }}>View correspondence</Button>
    </>
  );

  return (
    <PanelBody actions={actions} foot={SIM_NOTE}>
      <Box pad="18px 20px">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "18px 26px", alignItems: "center" }}>
          <Stat big label={freight === null ? "Equipment ex VAT" : "Total ex VAT"} value={money(total, cur)}
            sub={freight === null ? "Freight is added once the carrier replies. VAT: treatment pending confirmation." : "VAT: treatment pending confirmation"} />
          <div>
            <Line2 label="Equipment" value={money(equipment, cur)} />
            <Line2 label="Freight" value={freight === null ? "Pending carrier rate" : money(freight, cur)} tone={freight === null ? "warn" : undefined} />
            <Line2 label="Payment terms" value="Pending confirmation" />
            <Line2 label={final ? "Was valid until" : "Valid until"} value={dateShort(validTo) + (final ? "" : ", " + until(validTo))} />
          </div>
        </div>
      </Box>

      {approval && (
        <ApprovalBox a={approval}
          extra={review && q.overrideRequested ? <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 6, lineHeight: 1.55 }}>{q.overrideRequested}</div> : undefined} />
      )}

      <Section title="Customer">
        <Box>
          <Facts rows={[
            ["Customer", <RecLink kind="customer" id={c.id}>{c.name}</RecLink>],
            ["Contact", ct ? ct.name + ", " + ct.role : "Not recorded"],
            ["Email", ct?.email ?? "Not recorded"],
            ["Delivery", c.city + ", " + countryName(c.country)],
            ["Currency", cur === "GBP" ? "GBP, kept separate from EUR" : "EUR"],
            ["Enquiry", <RecLink kind="enquiry" id={q.enquiryId}>{q.enquiryId}</RecLink>],
            ["Prepared by", q.preparedBy],
            ["Created", stamp(q.createdAt)],
            ["Last updated", since(q.updatedAt)],
            ["Sent", q.sentAt ? stamp(q.sentAt) : "Not sent yet"],
          ]} />
        </Box>
      </Section>

      <Section title={"Lines · " + plural(quoteUnits(q), "machine")} right={<Confidential />}>
        <Box pad="6px 6px 10px">
          {q.lines.map((l, i) => {
            const p = x.product[l.productId];
            if (!p) return null;
            const over = l.unitPrice !== l.listPrice;
            return (
              <div key={i} className="mm-row" onClick={() => nav.open("product", p.id)}
                style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: "9px 10px", borderRadius: 11, cursor: "pointer" }}>
                <ProductThumb p={p} size={42} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                    {l.qty} × {money(l.unitPrice, cur)} · {p.id}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{money(l.unitPrice * l.qty, cur)}</span>
                  {over && <Badge tone="warn">Override, list {money(l.listPrice, cur)}</Badge>}
                </div>
              </div>
            );
          })}
          <div style={{ padding: "4px 10px 0" }}>
            <Line2 top label="Equipment" value={money(equipment, cur)} />
            <Line2 label={f?.carrierQuote ? "Freight, " + f.markupPct + "% on the carrier rate" : "Freight"} value={freight === null ? "Pending carrier rate" : money(freight, cur)} tone={freight === null ? "warn" : undefined} />
            <Line2 strong label="Total ex VAT" value={money(total, cur)} />
          </div>
        </Box>
        {overrides > 0 && <Note tone="warn" style={{ marginTop: 10 }}>{plural(overrides, "line")} differ from the price book. Price overrides need your approval.</Note>}
      </Section>

      {!final && (
        <Section title="Stock check">
          <StockNotes checks={checks} />
        </Section>
      )}

      <Section title="Freight">
        {f ? (
          <Box pad="5px">
            <RecordRow onClick={() => nav.open("freight", f.id)}
              lead={<span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--dim)", flex: "none" }}><Icon d={I.truck} size={16} /></span>}
              title={f.id + " · " + (carrier?.name ?? "Carrier")}
              sub={f.carrierQuote
                ? money(f.carrierQuote.cost, f.carrierQuote.currency) + " carrier rate + " + f.markupPct + "% = " + money(freightCharge(f) ?? 0, cur) + " · ref " + f.carrierQuote.ref
                : f.requestedAt ? "Requested " + since(f.requestedAt) + (f.chases ? " · " + plural(f.chases, "chase") : "") : "Drafted, waiting for your approval to send"}
              right={<Status s={f.status} />} />
          </Box>
        ) : (
          <Box><Muted>No freight requested yet. Pulse never puts a freight figure on a quote before a carrier replies.</Muted></Box>
        )}
      </Section>

      {(q.notes.length > 0 || (!review && q.overrideRequested)) && (
        <Section title="Notes">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {!review && q.overrideRequested && <Note tone="warn">{q.overrideRequested}</Note>}
            {q.notes.map((n, i) => <Note key={i} icon={I.file}>{n}</Note>)}
          </div>
        </Section>
      )}

      <Section title="Correspondence" id={MAIL_ANCHOR}
        right={<button className="ixt" onClick={() => nav.open("enquiry", q.enquiryId)} style={{ border: 0, background: "none", color: "var(--dim)", fontSize: 11.5, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Enquiry thread</button>}>
        <MailThread emails={emails} empty="No emails on this quote yet. The earlier conversation is on the enquiry." />
      </Section>

      <Section title="Activity">
        <ActivityList events={activityFor(s, [q.id])} />
      </Section>

      <OpenTasks s={s} kind="quote" id={q.id} />
    </PanelBody>
  );
}
