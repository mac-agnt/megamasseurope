import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import type { ActivityEvent, Approval, Currency, Email, MMState, Product, RecordKind } from "../types";
import { openPanel, setTask } from "../store";
import { ix, stockOf } from "../select";
import { Avatar, Badge, Button, I, Icon, Label, MONO, Mail, Note, ProductThumb, Status, Timeline, toneInk, type Tone } from "../ui";
import { money, since, stamp, until } from "../format";

/* Building blocks shared by every record panel body. Theme tokens only. */

export const DAY = 86_400_000;
export const SIM_NOTE = "Simulated in this demo: nothing is sent.";
export const MAIL_ANCHOR = "mm-panel-correspondence";

const OPEN_STAGES = ["New", "Qualified", "Freight Requested", "Quote Ready", "Quote Sent"];
export const isOpenStage = (stage: string) => OPEN_STAGES.includes(stage);
export const isOpenApproval = (status: string) => status === "Ready" || status === "Needs action";

/* ── navigation inside the drawer (keeps a back trail) ───────────────────── */

export type Nav = { open: (kind: RecordKind, id: string) => void };
export const NavContext = createContext<Nav>({ open: (kind, id) => openPanel(kind, id) });
export const useNav = () => useContext(NavContext);

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const calm = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
}

/* ── layout ───────────────────────────────────────────────────────────────── */

/** Scrolling body of the drawer. `actions` render in a bar pinned to the foot. */
export function PanelBody({ children, actions, foot }: { children: ReactNode; actions?: ReactNode; foot?: ReactNode }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", scrollbarWidth: "thin", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "1 0 auto", padding: "20px 24px 30px", display: "flex", flexDirection: "column", gap: 26 }}>{children}</div>
      {actions && (
        <div style={{ position: "sticky", bottom: 0, zIndex: 2, padding: "14px 24px 16px", background: "var(--overlay)", borderTop: "1px solid var(--border)",
          backdropFilter: "blur(18px) saturate(1.3)", WebkitBackdropFilter: "blur(18px) saturate(1.3)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>{actions}</div>
          {foot && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 9, lineHeight: 1.45 }}>{foot}</div>}
        </div>
      )}
    </div>
  );
}

export function Section({ title, right, id, children }: { title: ReactNode; right?: ReactNode; id?: string; children: ReactNode }) {
  return (
    <section id={id} style={{ minWidth: 0, scrollMarginTop: 12 }}>
      <Label right={right} style={{ marginBottom: 11, minHeight: 18 }}>{title}</Label>
      {children}
    </section>
  );
}

/** Inner glass block inside the drawer. A tone tints the ring and, faintly, the fill. */
export function Box({ children, pad = "15px 16px", tone, style }: { children: ReactNode; pad?: string; tone?: Tone; style?: CSSProperties }) {
  const ring = tone === "accent" ? "var(--accent-line)" : tone ? "color-mix(in srgb, " + toneInk(tone) + " 34%, transparent)" : "var(--border)";
  const fill = tone === "accent" ? "var(--accent-faint)" : tone && tone !== "neutral" ? "color-mix(in srgb, " + toneInk(tone) + " 6%, var(--surface))" : "var(--surface)";
  return <div style={{ background: fill, border: "1px solid " + ring, borderRadius: 14, padding: pad, minWidth: 0, ...style }}>{children}</div>;
}

/** The approval a record is waiting on, with who prepared it and why. */
export function ApprovalBox({ a, extra }: { a: Approval; extra?: ReactNode }) {
  const tone: Tone = a.kind === "Price review" || a.status === "Needs action" ? "warn" : "accent";
  return (
    <Box tone={tone} pad="15px 16px">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar name={a.preparedBy} size={30} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...MONO, fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: toneInk(tone) }}>
            {a.status === "Needs action" ? "Needs action" : "Waiting for your approval"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 5 }}>{a.action}</div>
          <div style={{ fontSize: 12.5, color: "var(--body)", marginTop: 5, lineHeight: 1.55 }}>{a.context}</div>
          {extra}
          <div style={{ ...MONO, fontSize: 10, color: "var(--faint)", marginTop: 8 }}>{a.kind} · {a.preparedBy} · {since(a.createdAt)}</div>
        </div>
      </div>
    </Box>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5, ...style }}>{children}</div>;
}

export function Missing() {
  return (
    <PanelBody>
      <Box pad="26px 20px">
        <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>This record is no longer in the demo data.</div>
        <Muted style={{ marginTop: 6 }}>Close the panel and open it again from the list.</Muted>
      </Box>
    </PanelBody>
  );
}

/* ── numbers ──────────────────────────────────────────────────────────────── */

export type StatItem = { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: Tone; big?: boolean };

export function Stat({ label, value, sub, tone, big }: StatItem) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...MONO, fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ marginTop: 7, fontSize: big ? 30 : 18, fontWeight: big ? 600 : 500, letterSpacing: big ? "-1px" : "-.35px", lineHeight: 1.08,
        color: tone ? toneInk(tone) : "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 5, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

/** A row of key numbers at the top of a panel. */
export function StatBand({ items, min = 112 }: { items: StatItem[]; min?: number }) {
  return (
    <Box pad="16px 18px">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(" + min + "px,1fr))", gap: "16px 20px" }}>
        {items.map((it, i) => <Stat key={i} {...it} />)}
      </div>
    </Box>
  );
}

/** Label and value on one line, used for totals and breakdowns. */
export function Line2({ label, value, strong, tone, top }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: Tone; top?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "7px 0", borderTop: top ? "1px solid var(--border)" : undefined, marginTop: top ? 4 : 0 }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: strong ? "var(--ink)" : "var(--dim)", fontWeight: strong ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: strong ? 14 : 13, fontWeight: strong ? 600 : 500, color: tone ? toneInk(tone) : "var(--ink)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{value}</span>
    </div>
  );
}

/* ── rows and links ───────────────────────────────────────────────────────── */

/** Clickable list row inside a panel section. */
export function RecordRow({ onClick, lead, title, sub, right }: {
  onClick?: () => void; lead?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode;
}) {
  return (
    <div onClick={onClick} className={onClick ? "mm-row" : undefined} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", borderRadius: 11, cursor: onClick ? "pointer" : undefined, minWidth: 0, outline: "none" }}>
      {lead}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
      </div>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>{right}</div>}
      {onClick && <Icon d={I.chevron} size={13} style={{ color: "var(--faint)" }} />}
    </div>
  );
}

/** Rows inside a block, with a "show all" toggle past `limit`. */
export function RowList<T>({ rows, render, limit = 6, empty }: { rows: T[]; render: (r: T, i: number) => ReactNode; limit?: number; empty?: ReactNode }) {
  const [all, setAll] = useState(false);
  if (!rows.length) return <Box><Muted>{empty ?? "Nothing linked yet."}</Muted></Box>;
  const shown = all ? rows : rows.slice(0, limit);
  return (
    <Box pad="5px">
      {shown.map((r, i) => <div key={i}>{render(r, i)}</div>)}
      {rows.length > limit && <ShowMore all={all} n={rows.length} onClick={() => setAll(!all)} />}
    </Box>
  );
}

export function ShowMore({ all, n, onClick }: { all: boolean; n: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ border: 0, background: "none", color: "var(--accent)", fontSize: 12.5, cursor: "pointer", padding: "8px 10px 6px", fontFamily: "inherit" }}>
      {all ? "Show fewer" : "Show all " + n}
    </button>
  );
}

/** Inline record reference that opens it in the drawer. */
export function RecLink({ kind, id, children }: { kind: RecordKind; id: string; children: ReactNode }) {
  const nav = useNav();
  return (
    <button className="ixt" onClick={(e) => { e.stopPropagation(); nav.open(kind, id); }}
      style={{ border: 0, borderBottom: "1px solid var(--border-strong)", background: "none", padding: 0, color: "var(--ink)", font: "inherit", cursor: "pointer", textAlign: "left", maxWidth: "100%" }}>
      {children}
    </button>
  );
}

/** Small machine pill: thumbnail and quantity, opens the product record. */
export function MachinePill({ p, qty }: { p: Product; qty: number }) {
  const nav = useNav();
  return (
    <button className="ixf" onClick={(e) => { e.stopPropagation(); nav.open("product", p.id); }} title={p.name}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 30, maxWidth: "100%", padding: "0 11px 0 4px", borderRadius: 999, border: "1px solid var(--border)",
        background: "var(--surface-2)", color: "var(--ink)", fontSize: 12.5, fontFamily: "inherit", cursor: "pointer", transition: "border-color .18s var(--ease), background .18s var(--ease)" }}>
      <ProductThumb p={p} size={22} />
      <span style={{ ...MONO, fontSize: 11, color: "var(--dim)" }}>{qty} ×</span>
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
    </button>
  );
}

/* ── record history ───────────────────────────────────────────────────────── */

export const emailsFor = (s: MMState, kind: RecordKind, id: string) =>
  s.emails.filter((m) => m.recordKind === kind && m.recordId === id).sort((a, b) => a.at - b.at);
export const activityFor = (s: MMState, ids: string[]) =>
  s.activity.filter((a) => ids.includes(a.recordId)).sort((a, b) => b.at - a.at);

/** Email thread, oldest first. Long threads show the latest `limit`. */
export function MailThread({ emails, empty = "No emails on this record yet.", limit = 6 }: { emails: Email[]; empty?: ReactNode; limit?: number }) {
  const [all, setAll] = useState(false);
  if (!emails.length) return <Box><Muted>{empty}</Muted></Box>;
  const shown = all || emails.length <= limit ? emails : emails.slice(-limit);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {emails.length > limit && <ShowMore all={all} n={emails.length} onClick={() => setAll(!all)} />}
      {shown.map((m) => <Mail key={m.id} from={m.from} to={m.to} at={stamp(m.at)} subject={m.subject} body={m.body} kind={m.direction} />)}
    </div>
  );
}

const eventTone = (a: ActivityEvent): Tone | undefined =>
  a.attention ? "warn" : a.actorKind === "agent" ? "accent" : a.actorKind === "person" ? "ok" : undefined;

export function ActivityList({ events, limit = 6, empty = "No activity logged on this record this week." }: { events: ActivityEvent[]; limit?: number; empty?: ReactNode }) {
  const [all, setAll] = useState(false);
  if (!events.length) return <Box><Muted>{empty}</Muted></Box>;
  const shown = all ? events : events.slice(0, limit);
  return (
    <Box pad="16px 16px 12px">
      <Timeline items={shown.map((a) => ({ at: stamp(a.at), title: a.title, detail: a.detail, who: a.actor, tone: eventTone(a) }))} />
      {events.length > limit && <ShowMore all={all} n={events.length} onClick={() => setAll(!all)} />}
    </Box>
  );
}

/** Open tasks that point at this record. Renders nothing when there are none. */
export function OpenTasks({ s, kind, id }: { s: MMState; kind: RecordKind; id: string }) {
  const tasks = s.tasks.filter((t) => t.recordKind === kind && t.recordId === id && t.status !== "Done");
  if (!tasks.length) return null;
  return (
    <Section title="Open tasks" right={<span style={{ ...MONO, fontSize: 10, color: "var(--faint)" }}>{tasks.length}</span>}>
      <Box pad="5px">
        {tasks.map((t) => (
          <RecordRow key={t.id} lead={<Avatar name={t.owner} size={26} />} title={t.title}
            sub={t.owner + " · due " + until(t.due) + " · " + t.dept}
            right={<><Status s={t.status} /><Button size="sm" kind="ghost" icon={I.check} onClick={() => setTask(t.id, "Done")} title="Mark the task done">Done</Button></>} />
        ))}
      </Box>
    </Section>
  );
}

/* ── stock ────────────────────────────────────────────────────────────────── */

export type StockCheck = { product: Product; qty: number; available: number; incomingFree: number; shipment?: string; state: "ok" | "incoming" | "short" };

export function stockCheck(s: MMState, lines: { productId: string; qty: number }[]): StockCheck[] {
  const out: StockCheck[] = [];
  for (const l of lines) {
    const p = ix(s).product[l.productId];
    if (!p) continue;
    const st = stockOf(s, p);
    const here = Math.max(0, st.available);
    const state: StockCheck["state"] = st.available >= l.qty ? "ok" : here + st.incomingFree >= l.qty ? "incoming" : "short";
    const sh = s.shipments.find((x) => x.lines.some((y) => y.productId === p.id));
    out.push({ product: p, qty: l.qty, available: st.available, incomingFree: st.incomingFree, shipment: sh?.name, state });
  }
  return out;
}

/** Stock position for the machines on a record. Lines that lean on the same incoming
   shipment are grouped; anything that cannot be covered gets its own warning. */
export function StockNotes({ checks }: { checks: StockCheck[] }) {
  const incoming = checks.filter((c) => c.state === "incoming");
  const short = checks.filter((c) => c.state === "short");
  const negative = checks.filter((c) => c.available < 0);
  if (!incoming.length && !short.length) {
    return <Note tone="ok" icon={I.check}>Every machine on this record is available from County Derry stock.</Note>;
  }
  const byShipment = new Map<string, StockCheck[]>();
  for (const c of incoming) byShipment.set(c.shipment || "incoming stock", (byShipment.get(c.shipment || "incoming stock") || []).concat([c]));
  const line = (c: StockCheck, tail: string) => (
    <div key={c.product.id} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <span style={{ width: 4, height: 4, borderRadius: 2, background: "currentColor", flex: "none", transform: "translateY(-2px)" }} />
      <span><strong style={{ fontWeight: 600 }}>{c.product.name}</strong>: {c.qty} needed, {Math.max(0, c.available) || "none"} in County Derry, {tail}</span>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[...byShipment].map(([ship, list]) => (
        <Note key={ship} tone="warn" icon={I.clock}>
          <div>{list.length === 1 ? "One machine relies" : list.length + " machines rely"} on {ship}. Arrival not confirmed.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 7 }}>
            {list.map((c) => line(c, c.incomingFree + " unallocated incoming."))}
          </div>
        </Note>
      ))}
      {short.length > 0 && (
        <Note tone="bad">
          <div>Not enough stock, even counting incoming units. Confirm supply before committing.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 7 }}>
            {short.map((c) => line(c, c.incomingFree + " unallocated incoming."))}
          </div>
        </Note>
      )}
      {negative.length > 0 && (
        <Note tone="bad">Available stock is already negative for {negative.map((c) => c.product.name).join(", ")}. Check reservations before promising more.</Note>
      )}
    </div>
  );
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** True when a website label still promises an arrival month that has already passed. */
export function labelOutdated(label: string, now = Date.now()): boolean {
  const m = /estimated arrival (\w+) (\d{4})/i.exec(label);
  if (!m) return false;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month < 0) return false;
  return new Date(Number(m[2]), month + 1, 1).getTime() <= now;
}

/* ── money ────────────────────────────────────────────────────────────────── */

/** Sums per currency so EUR and GBP are never added together. */
export function moneyByCurrency(parts: { amount: number; currency: Currency }[]): string {
  const eur = parts.filter((p) => p.currency === "EUR").reduce((n, p) => n + p.amount, 0);
  const gbp = parts.filter((p) => p.currency === "GBP").reduce((n, p) => n + p.amount, 0);
  if (eur && gbp) return money(eur, "EUR") + " and " + money(gbp, "GBP");
  if (gbp) return money(gbp, "GBP");
  return money(eur, "EUR");
}

export function ToneDot({ tone }: { tone: Tone }) {
  return <span style={{ width: 6, height: 6, borderRadius: 3, background: toneInk(tone), flex: "none", display: "inline-block" }} />;
}

export function Tag({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}

/** Lifecycle tracker sized for the drawer: every step shares the width, labels wrap. */
export function StageTrack({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", minWidth: 0 }}>
      {steps.map((st, i) => {
        const done = i < current, on = i === current;
        return (
          <div key={st} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            {i > 0 && <span style={{ position: "absolute", top: 10, right: "50%", width: "100%", height: 2, background: done || on ? "var(--accent)" : "var(--track)" }} />}
            <span style={{ position: "relative", width: 22, height: 22, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
              background: done ? "var(--accent)" : on ? "var(--accent-soft)" : "var(--surface-2)", border: on ? "2px solid var(--accent)" : "1px solid var(--border)",
              color: done ? "var(--on-accent)" : "var(--accent)", fontSize: 10, fontWeight: 700 }}>
              {done ? <Icon d={I.check} size={12} stroke={3} /> : i + 1}
            </span>
            <span style={{ marginTop: 7, fontSize: 10.5, textAlign: "center", color: on ? "var(--ink)" : done ? "var(--body)" : "var(--faint)", fontWeight: on ? 600 : 400, lineHeight: 1.3, padding: "0 2px" }}>{st}</span>
          </div>
        );
      })}
    </div>
  );
}
