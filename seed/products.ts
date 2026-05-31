import type { Product } from "../lib/domain/types.js";

/** Phase 1 seed catalogue — a handful of common materials. Expand toward ~50–100 for the MVP. */
export const SEED_PRODUCTS: Product[] = [
  {
    id: "lumber-48x98-impr",
    name: "Impregnert terrassebord / stender 48x98mm",
    category: "trelast",
    unit: "m",
    attributes: { width_mm: 48, height_mm: 98, treatment: "impregnert" },
  },
  {
    id: "gips-13mm-standard",
    name: "Gipsplate standard 13mm 120x240cm",
    category: "gips",
    unit: "stk",
    attributes: { thickness_mm: 13, width_cm: 120, length_cm: 240 },
  },
  {
    id: "isolasjon-glava-150",
    name: "Glassull isolasjon 150mm (per pakke)",
    category: "isolasjon",
    unit: "pakke",
    attributes: { thickness_mm: 150 },
  },
  {
    id: "sement-25kg",
    name: "Sement 25kg sekk",
    category: "mørtel",
    unit: "sekk",
    attributes: { weight_kg: 25 },
  },
  {
    id: "osb-12mm",
    name: "OSB-plate 12mm 120x240cm",
    category: "plater",
    unit: "stk",
    attributes: { thickness_mm: 12 },
  },
];
