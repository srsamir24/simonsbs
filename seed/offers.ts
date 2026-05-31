import { kr } from "../lib/domain/money.js";
import type { Offer } from "../lib/domain/types.js";
import { SEED_PRODUCTS } from "./products.js";
import { SEED_STORES } from "./stores.js";

/**
 * HAND-GENERATED PLACEHOLDER PRICES (incl. mva) for Phase 1 demo — NOT scraped, not
 * authoritative. Built deterministically so the comparison is interesting:
 *   price = base(product) × storeFactor × wobble(store, product)
 * The discount chains (Byggmax/Bauhaus) are cheaper on average but often farther away, so the
 * optimizer has a real price-vs-travel trade-off to solve. No single store wins everything.
 */
const OBSERVED = new Date("2026-05-31T09:00:00Z");

/** Base price per unit (kr, incl mva) keyed by product id. */
const BASE_KR: Record<string, number> = {
  "lumber-48x98-impr": 40,
  "gips-13mm-standard": 125,
  "isolasjon-glava-150": 900,
  "sement-25kg": 105,
  "osb-12mm": 175,
};

/** Relative price level per store (full-service chains pricier, discounters cheaper). */
const STORE_FACTOR: Record<string, number> = {
  "maxbo-vaekero": 1.05,
  "maxbo-baerums-verk": 1.06,
  "maxbo-asker": 1.03,
  "maxbo-lier": 1.01,
  "monter-lillestrom": 1.04,
  "monter-orring": 1.02,
  "monter-ostre-aker": 1.05,
  "monter-lier": 1.0,
  "byggmax-abildso": 0.95,
  "byggmax-drammen": 0.96,
  "bauhaus-liertoppen": 0.93,
  "bauhaus-vestby": 0.94,
};

/** Products a given store does NOT stock (realistic gaps → tests fulfillability + variety). */
const OMISSIONS: Record<string, string[]> = {
  "byggmax-abildso": ["isolasjon-glava-150"],
  "bauhaus-vestby": ["isolasjon-glava-150"],
  "maxbo-asker": ["osb-12mm"],
  "monter-orring": ["sement-25kg"],
  "maxbo-vaekero": ["osb-12mm"],
};

/** Deterministic ±12% wobble from a string hash, so cheapest store differs per product. */
function wobble(storeId: string, productId: string): number {
  const s = `${storeId}:${productId}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 0.88 + ((h % 1000) / 1000) * 0.24; // 0.88 .. 1.12
}

/** Round to the nearest 0,50 kr for believable shelf prices. */
function shelf(kroner: number): number {
  return Math.round(kroner * 2) / 2;
}

function build(): Offer[] {
  const out: Offer[] = [];
  for (const store of SEED_STORES) {
    const factor = STORE_FACTOR[store.id] ?? 1;
    const omitted = new Set(OMISSIONS[store.id] ?? []);
    for (const product of SEED_PRODUCTS) {
      if (omitted.has(product.id)) continue;
      const base = BASE_KR[product.id]!;
      const price = shelf(base * factor * wobble(store.id, product.id));
      out.push({
        storeId: store.id,
        productId: product.id,
        priceOre: kr(price),
        inclMva: true,
        observedAt: OBSERVED,
      });
    }
  }
  return out;
}

export const SEED_OFFERS: Offer[] = build();
