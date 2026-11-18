# Pulse for Mega Mass Europe

Frontend-only demo of Pulse, the AI operations dashboard, set up for Mega Mass Europe: the official UK and EU distributor of Mega Mass commercial strength machines, shipping from County Derry, Northern Ireland. Mock data throughout. Every send, FreshBooks change and carrier booking is simulated.

Built on the **Pulse v5 Harbour** template from Claude Design. Read `DEMO_BRIEF.md` for the business facts and story numbers, and `CLAUDE.md` for the layout rules every copy keeps.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npx tsc -b         # type-check only
```

## What's in it

| Area | Where |
| --- | --- |
| Mega Mass modules: Enquiries, Quotes, Freight, Orders, Products & Stock, Insights | `src/mm/pages/` |
| Data model, seeded snapshot, selectors and store (every number comes from here) | `src/mm/types.ts`, `src/mm/seed.ts`, `src/mm/select.ts`, `src/mm/store.ts` |
| Record panel for every record kind | `src/mm/panel/` |
| Pulse pages: Home (Helios chat), Agents, Dashboard, Work, Records, Activity, Settings | `src/views/pages/` |
| Overlays: ⌘K palette, agent studio, Helios mini chat, work viewer, new record, background gallery | `src/views/overlays/` |
| App frame: side rail, top bar, notifications | `src/views/AppShell.tsx` |
| Pulse state and behaviour | `src/logic/PulseLogic.js` |
| Template copy, Helios answers, Dashboard areas, KPI tiles, Settings | `src/logic/data.js` |
| Agent avatar | `src/components/AgentFace.tsx` |
| Theme tokens and animations | `src/styles/pulse.css` |

## How it fits together

- The **Mega Mass store** (`src/mm/store.ts`) holds one in-memory snapshot. The selectors in `src/mm/select.ts` work out every count, total and KPI from the records, so an approval anywhere moves every number.
- **`PulseLogic`** holds Pulse's own UI state. Its `renderVals()` returns one flat object `v`, and the views are plain React components that render from it.
- **`data.js`** carries the template copy. Helios answers (`pickAnswer`), the Dashboard areas (`ASPECT_DEFS`) and the KPI tiles (`KPI_DEFS`) read the store each time they render, so they always agree with the modules. A "Confirm ..." button in a Helios answer runs the matching store action, simulated like every other action.
- **`LogicHost`** (`src/runtime/logic.tsx`) mounts the logic and re-renders on `setState`.
- **Backgrounds** live in `src/App.tsx`:
  - `dashboardBackdrop`: the colour of the Dashboard KPI background
  - `kpiBackdropOn`: whether that background shows
  - `recordsBackdrop`: the colour of the Records wash (`""` uses the theme gradient)

## Demo rules

- No live integrations. The website quote form, Gmail, Google Drive and FreshBooks are mock data. Carriers are an email workflow, not an integration.
- Nothing is sent, written to FreshBooks or booked with a carrier. Simulated actions say so.
- Quotes, customer emails, price overrides, freight markups, stock commitments and payment follow-ups all wait for Niall's approval. Automatic chasing is off.
- A UK quote is in GBP only. Totals across currencies are EUR equivalent at the demo rate £1 = €1.15.
- All customers are fictional and all prices are demo values.

## Updating from Claude Design

Don't run `npm run import-design` on this copy. It regenerates `src/views/`, `src/styles/pulse.css`, `src/styles/interactions.css` and `src/logic/` from the file in `design/`, which wipes the Mega Mass copy and the layout guards described in `CLAUDE.md`. `AgentFace` is hand-written and left alone.

## Fixed from the mockup

In the mockup, the work viewer's wrapper `<div>` was never closed, so the ⌘K palette, agent studio, new record dialog and background gallery could only appear while the work viewer was open. They now open on their own. The fix is applied in `tools/import-design.mjs`.
