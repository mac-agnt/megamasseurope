# Pulse demo brief: Mega Mass Europe

Demo for **Niall** (owner, primary commercial operator) and **Natalie** (involved in technical decisions; exact role not confirmed). Presentation Fri 20 Nov 2026, 16:30. Frontend-only, mock data, every action simulated.

**Goal:** take Niall from personally handling hundreds of enquiries, freight quotes, emails and invoices to supervising a system that does the repetitive work and asks for his approval. Simple, not a complicated CRM.

## 1. The business (verified from megamasseurope.com unless marked)

- Official UK and EU distributor of the US brand Mega Mass. Commercial strength machines. Started around Sept 2025 (from the call).
- Warehouse: County Derry, Northern Ireland (from the call; no street address anywhere, do not invent one).
- Site: WordPress/WooCommerce. Storefront shows no prices, only "Add to Quote". Quote form fields: First/Last name, Email, Phone, City, Zip Code, Country/Region, Facility type (Colleges and High schools, Commercial Gym, Private Training Facility, Sports Team, Residential, Home Gym), How did you hear, Message. Reply promise on site: "within the next 1 to 2 business days".
- Contact: info@megamasseurope.com, sales@megamasseurope.com, +44 7388 204997. Instagram @megamasseurope.
- Brand: black (#050505) and orange (#FF4B00 in CSS, #F84515 in the logo). Logo `public/brand/megamass-logo.png` (orange MEGAMASS, white EUROPE). Pulse keeps its own typography (Geist).
- 18 products in `src/mm/catalog.ts` with images in `public/catalog/`. T-Bar Linear Row is the best seller. Website labels most machines "Pre-order, delivery 2027"; Classic T-Bar Row and True Squat Pro "Available now"; T-Bar Linear Row still says "Estimated arrival October 2026" (now out of date).
- Systems: Gmail / Google Workspace, Google Drive, Gemini (current AI), FreshBooks (invoices, payments, completed deals), website quote form. HubSpot trialled then abandoned. Google Sheets largely retired. Freight quotes by email.
- Carriers named on the call: Greyhound Express (Europe) and Harbour Freight Manchester (UK). Neither confirmed as a supplier record: show them with a "to confirm" note, never as integrations.

## 2. Hard constraints

- No public checkout, no public prices. Pricing is confidential: EUR and GBP private price books, same for all customers apart from currency. No automatic wholesale discounts; manual overrides need Niall's approval.
- Human approval by default for: customer quotations, customer emails, price overrides, freight markups, stock commitments, payment follow-ups.
- Automatic chasing is OFF by default (Niall has reservations). Follow-up timing 3/7/14/30 days, configurable.
- No real sending, no FreshBooks writes, no carrier booking, no live integrations. Label simulated actions ("Simulated in this demo: nothing was sent").
- Never invent a freight cost before a carrier reply. Flag missing dimensions/postcodes instead of guessing.
- Do not guess VAT treatment or payment terms: show "pending confirmation".
- Do not restart deposit pre-orders. Never let available stock go negative without a warning.
- No warehouse-management system. Keep stock simple: in stock, reserved, available, incoming.
- The 163 quotation requests (Sat 14 to Tue 17 Nov, reported by Niall on the 17 Nov call) is a historical note, separate from the demo dataset (`HISTORY` in `src/mm/select.ts`).
- All customers are fictional. All prices are demo values.

## 3. The demo snapshot (all derived from records in `src/mm/seed.ts`)

| Headline | Value | Selector |
|---|---|---|
| Unanswered enquiries | 47 | `unanswered(s)` |
| Quotes awaiting approval | 25 | `quotesForApproval(s)` |
| Freight rates outstanding | 18 | `freightOutstanding(s)` |
| Overdue invoices | 11 | `overdueInvoices(s)` |
| Overdue value | €46,820 | `headline(s).overdueValue` |
| Follow-ups to review | 32 | `followUpsToReview(s)` |
| Open approvals | 36 | `openApprovals(s)` |

Pipeline: New 59 (47 unanswered + 12 waiting on customer), Qualified 6, Freight Requested 18, Quote Ready 25, Quote Sent 21, Won 30, Lost 9.

## 4. Six story threads (identical numbers everywhere)

- **A. Danube Strength, Bratislava SK** (ENQ-4518, Q-2286, FR-1206). Asked for 1 T-Bar Linear Row, expanded to six machines: T-Bar Linear Row €2,850, Leverage Chest Press €3,450, Leverage Incline Pro €3,200, X Shoulder Press €3,100, Leverage Seated Row €3,000, Swing Squat Pro €3,900 = €19,500. Greyhound Express €2,100 + 15% = €2,415. **€21,915 ex VAT. Ready for Review, waiting for Niall.** Three Flex units come from the late-November intake.
- **B. Rotterdam Iron Supply NL** (ENQ-4497, Q-2271, FR-1199). Wholesale, 10 × T-Bar Linear Row = €28,500. Freight €1,850 + 10% = €2,035. **€30,535. Quote sent, awaiting response.** Customer asked about volume pricing: a "Price review" approval (no discount assumed).
- **C. Lyon Performance Club FR** (ENQ-4526, Q-2290, FR-1211). 1 × T-Bar Linear Row €2,850. **Awaiting carrier response for over three days.** No final price. Freight Agent drafted a chase ("Request freight rate", Needs action).
- **D. Rheinland Performance, Cologne DE.** FreshBooks **FB-1047, €7,880, 18 days overdue** (2 × Leverage Chest Press + €980 freight). Receivables Agent prepared a polite payment-status email.
- **E. Flex Series November intake** (SH-FLEX-NOV). **15 units** (5 each Leverage Chest Press, Leverage Incline Pro, Leverage Seated Row), **9 reserved, 6 unallocated**, late November, unconfirmed.
- **F. Northern Power Gym, Manchester GB** (ENQ-4531, Q-2293, FR-1214). 1 × X Shoulder Press £3,095. Harbour Freight £350 + 20% = £420. **£3,515. Ready for approval.** GBP only, never mixed with EUR.
- Showcase new enquiry: **Milano Performance Studio**, Marco Bianchi, Italy (ENQ-4562), 1 × T-Bar Linear Row, commercial gym, missing delivery postcode, recommended action "Request shipping address".
- Stock: T-Bar Linear Row 24 in stock, 10 reserved, 14 available. Leverage Chest Press and Incline Pro 0 in stock (incoming only).

## 5. Architecture contract (read before writing a page)

- **Store** `src/mm/store.ts`: `useMM()` returns the whole state; actions: `approveQuote`, `approve(approvalId)`, `holdApproval`, `keepListPrice`, `approveReply`, `approveReplies`, `setDraftReply`, `createQuote`, `setBuilderQuote`, `setLine`, `addLine`, `removeLine`, `saveDraft`, `submitForApproval`, `markAccepted`, `requestFreight`, `sendFreightRequest` (also chases), `simulateCarrierReply`, `setMarkup`, `markBooked`, `markDispatched`, `recordPayment`, `sendPaymentFollowUp`, `decideFollowUp`, `setFollowUpDraft`, `setControl`, `toggleApprovalRule`, `toggleAgent`, `setTask`, `openPanel(kind,id)`, `closePanel`, `toast`, `go(page, tab)` (navigate in Pulse). Each action updates records, activity, agent runs and shows a toast.
- **Selectors** `src/mm/select.ts`: every number. Never hard-code a count, total or KPI. Use `quoteTotal`, `quoteEquipment`, `quoteFreight`, `freightCharge`, `outstanding`, `invoiceStatus`, `daysOverdue`, `stockOf`, `headline`, `stageCounts`, `funnel`, `markets`, `productDemand`, `enquiriesByDay`, `revenueAtRisk`, `avgMarkup`, `carrierStats`, `customerGraph`, `ix(s)` (id indexes). EUR and GBP are never summed raw: use `eurEq` and label "EUR equivalent at demo rate £1 = €1.15".
- **UI kit** `src/mm/ui.tsx`: `Page`, `PageHead`, `Grid`, `Row`, `Card`, `Label`, `Kpi`, `Money`, `Badge`, `Status`, `CountryTag`, `Confidential`, `Note`, `Avatar`, `Who`, `ProductThumb`, `Button`, `Seg`, `Field`, `inputStyle`, `TextArea`, `Toggle`, `Table`/`Cell`, `BarList`, `Columns`, `Funnel`, `Stages`, `Timeline`, `Empty`, `Facts`, `Mail`, `Icon`/`I`. Use these. Theme tokens only (`var(--accent)` etc.), no hex colours except agent tints in `AGENT_META`.
- **Format** `src/mm/format.ts`: `money`, `moneyShort`, `num`, `pct`, `since`, `age`, `until`, `dateShort`, `stamp`, `countryName`, `plural`.
- Pages receive `{ tab }` and render that tab. Rows open the shared record panel with `openPanel(kind, id)` (kinds: customer, enquiry, quote, freight, invoice, order, product, shipment, followup, supplier).
- Modules and tab ids: `src/mm/modules.ts`.

## 6. Writing and design rules

- Copy is plain, direct, Irish-business tone. No em dashes or en dashes in any visible text. No exclamation marks. No lorem ipsum. No "Welcome to".
- Pages must fill the width with real content: no big empty gaps, no placeholder cards. Mix layouts (KPI strip, table, split detail, board, chart) rather than repeating one card grid.
- Pulse look: glass cards, rounded, quiet; accent (brand orange) only for primary actions, active states and key highlights.
- Every list row is clickable into the record panel. Primary actions are real store actions.
- TypeScript strict must pass: `npx tsc -b` from the repo root. No new dependencies.

## 7. Locked template rules (override the client brief)

- Side rail starts Home, Agents. Then Enquiries, Quotes, Freight, Orders, Products & Stock, Insights, Work, Records, Activity. Settings sits at the rail foot.
- Records: Ontology first, then Files, Contacts, then Customers, Suppliers, Products, Orders ("Documents" = Files).
- Home centre column stays clean (status pill, greeting, subline, ask box, chat). KPIs go on Dashboard (Home's second top-bar tab); briefing and approvals go in the right widget rail.
- Never run `npm run import-design`.
