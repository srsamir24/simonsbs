import { kr } from "../lib/domain/money.js";
import type { Offer } from "../lib/domain/types.js";

/**
 * HAND-ENTERED PLACEHOLDER PRICES (incl. mva) for Phase 1 demo — NOT scraped, not authoritative.
 * The whole point of the optimizer is to compare these, so prices deliberately vary by store and
 * no single store is cheapest for everything (that's what makes basket-splitting interesting).
 */
const OBSERVED = new Date("2026-05-31T09:00:00Z");

function offer(storeId: string, productId: string, kroner: number): Offer {
  return { storeId, productId, priceOre: kr(kroner), inclMva: true, observedAt: OBSERVED };
}

export const SEED_OFFERS: Offer[] = [
  // lumber-48x98-impr (per metre)
  offer("maxbo-lier", "lumber-48x98-impr", 39.9),
  offer("monter-drammen", "lumber-48x98-impr", 42.5),
  offer("optimera-asker", "lumber-48x98-impr", 37.9), // cheapest lumber
  offer("byggmax-drammen", "lumber-48x98-impr", 41.0),
  offer("bauhaus-ski", "lumber-48x98-impr", 44.9),

  // gips-13mm-standard (per board)
  offer("maxbo-lier", "gips-13mm-standard", 129.0),
  offer("monter-drammen", "gips-13mm-standard", 119.0), // cheapest gips
  offer("optimera-asker", "gips-13mm-standard", 135.0),
  offer("byggmax-drammen", "gips-13mm-standard", 124.0),
  // (Bauhaus does not stock this one — tests fulfillability)

  // isolasjon-glava-150 (per pack)
  offer("maxbo-lier", "isolasjon-glava-150", 899.0),
  offer("monter-drammen", "isolasjon-glava-150", 949.0),
  offer("optimera-asker", "isolasjon-glava-150", 879.0), // cheapest isolasjon
  offer("byggmax-drammen", "isolasjon-glava-150", 915.0),

  // sement-25kg (per sack)
  offer("maxbo-lier", "sement-25kg", 109.0),
  offer("monter-drammen", "sement-25kg", 99.0), // cheapest sement
  offer("byggmax-drammen", "sement-25kg", 105.0),
  offer("bauhaus-ski", "sement-25kg", 95.0), // actually cheapest, but far away

  // osb-12mm (per board)
  offer("maxbo-lier", "osb-12mm", 179.0),
  offer("byggmax-drammen", "osb-12mm", 169.0), // cheapest osb
  offer("optimera-asker", "osb-12mm", 185.0),
];
