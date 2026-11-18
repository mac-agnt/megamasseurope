import type { Product } from "./types";

/* The 18 machines published on megamasseurope.com (names as the site spells
   them, tidied for case). Weights and dimensions come from the published
   catalogue; null means the catalogue says TBC. Prices are a private demo
   price book, not the website's figures. Stock is a demo assumption. */

const P = (
  id: string, slug: string, name: string, series: Product["series"], range: string,
  category: Product["category"], weightKg: number | null, dims: string | null,
  websiteLabel: string, eur: number, gbp: number, inStock: number,
): Product => ({ id, slug, name, series, range, category, image: "/catalog/" + slug + ".webp",
  weightKg, dims, websiteLabel, eur, gbp, inStock });

const PRE27 = "Pre-order, delivery 2027";

export const PRODUCTS: Product[] = [
  P("MM-LIN-TBR", "t-bar-linear-row", "T-Bar Linear Row", "Linear", "Xpload & Linear Range", "Row",
    100, "H1.4 × W1.0 × L1.6 m", "Estimated arrival October 2026", 2850, 2795, 24),
  P("MM-CLS-TBR", "classic-t-bar-row", "Classic T-Bar Row", "Classic", "Xpload & Linear Range", "Row",
    100, "H1.31 × W1.0 × L2.24 m", "Available now", 1950, 1895, 6),
  P("MM-FLX-CHP", "leverage-chest-press", "Leverage Chest Press", "Flex", "Leverage Range", "Press",
    null, null, PRE27, 3450, 3395, 0),
  P("MM-FLX-INC", "leverage-incline-pro", "Leverage Incline Pro", "Flex", "Leverage Range", "Press",
    250, "H1.31 × W1.0 × L1.6 m", PRE27, 3200, 3150, 0),
  P("MM-FLX-PLD", "leverage-pulldown", "Leverage Pulldown", "Flex", "Leverage Range", "Pulldown",
    150, "H2.13 × W1.23 × L1.9 m", PRE27, 3050, 2995, 0),
  P("MM-FLX-SRW", "leverage-seated-row", "Leverage Seated Row", "Flex", "Leverage Range", "Row",
    null, null, PRE27, 3000, 2950, 0),
  P("MM-FLX-SHP", "leverage-shoulder-press", "Leverage Shoulder Press", "Flex", "Leverage Range", "Press",
    135, "H1.0 × W1.0 × L1.9 m", PRE27, 3050, 2995, 0),
  P("MM-XPL-LPR", "xpload-linear-press", "Xpload Linear Press", "Xpload", "Xpload & Linear Range", "Press",
    420, "H1.83 × W1.9 × L1.4 m", PRE27, 5950, 5850, 0),
  P("MM-XPL-LRW", "xpload-linear-row", "Xpload Linear Row", "Xpload", "Xpload & Linear Range", "Row",
    420, "H1.85 × W2.0 × L1.8 m", PRE27, 5950, 5850, 0),
  P("MM-XPL-PLD", "xpload-pulldown", "Xpload Pulldown", "Xpload", "Xpload & Linear Range", "Pulldown",
    205, "H2.3 × W1.5 × L2.0 m", PRE27, 4250, 4195, 0),
  P("MM-LIN-45I", "45-degree-iso-linear-row-pro", "45 Degree ISO Linear Row Pro", "Linear", "Xpload & Linear Range", "Row",
    250, "H1.36 × W1.32 × L1.49 m", PRE27, 4150, 4095, 0),
  P("MM-LIN-45D", "45-degree-linear-row-pro-d-handles", "45 Degree Linear Row Pro, D Handles", "Linear", "Xpload & Linear Range", "Row",
    null, null, PRE27, 4150, 4095, 0),
  P("MM-LIN-VTR", "v-type-linear-row", "V Type Linear Row", "Linear", "Xpload & Linear Range", "Row",
    150, "H1.6 × W1.62 × L1.37 m", PRE27, 3650, 3595, 0),
  P("MM-XSR-SHP", "x-shoulder-press", "X Shoulder Press", "X-Series", "Leverage Range", "Press",
    null, null, PRE27, 3100, 3095, 4),
  P("MM-SQT-PEN", "pendulum-squat-machine", "Pendulum Squat Machine", "Squat & Lower Body", "Squat & Lower Body", "Squat",
    null, null, PRE27, 6400, 6295, 0),
  P("MM-SQT-SWG", "swing-squat-pro", "Swing Squat Pro", "Squat & Lower Body", "Squat & Lower Body", "Squat",
    500, "H2.2 × W1.1 × L2.2 m", PRE27, 3900, 3850, 2),
  P("MM-SQT-TRU", "true-squat-pro", "True Squat Pro", "Squat & Lower Body", "Squat & Lower Body", "Squat",
    null, null, "Available now, Europe warehouse stock", 4950, 4895, 3),
  P("MM-LWR-SHR", "shrug-row-rdls-combo", "Shrug Row / RDL Combo", "Squat & Lower Body", "Squat & Lower Body", "Lower body",
    80, "H1.12 × W0.75 × L1.64 m", PRE27, 1650, 1595, 0),
];

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

/* Short ids used while writing seed data. */
export const SKU = {
  tbar: "MM-LIN-TBR", classic: "MM-CLS-TBR", chest: "MM-FLX-CHP", incline: "MM-FLX-INC",
  pulldown: "MM-FLX-PLD", seated: "MM-FLX-SRW", shoulder: "MM-FLX-SHP", xpress: "MM-XPL-LPR",
  xrow: "MM-XPL-LRW", xpull: "MM-XPL-PLD", iso45: "MM-LIN-45I", d45: "MM-LIN-45D", vtype: "MM-LIN-VTR",
  xshoulder: "MM-XSR-SHP", pendulum: "MM-SQT-PEN", swing: "MM-SQT-SWG", truesq: "MM-SQT-TRU", shrug: "MM-LWR-SHR",
} as const;
