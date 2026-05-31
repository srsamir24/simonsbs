import { haversineMeters } from "../domain/geo.js";
import type {
  BasketLine,
  LatLng,
  Offer,
  Ore,
  OptimizeRequest,
  Store,
} from "../domain/types.js";
import type { RoutingClient, StromPriceClient, TollClient } from "../external/interfaces.js";
import { fuelCostOre } from "./fuel.js";
import { bestRoundTripOrder } from "./tsp.js";

/** Which store each basket line is bought from, and at what unit price. */
export interface LineAssignment {
  productId: string;
  qty: number;
  storeId: string;
  unitPriceOre: Ore;
  lineTotalOre: Ore;
}

/** A full evaluated plan: where to buy everything + the trip to collect it. */
export interface Plan {
  storeIds: string[];
  /** Visit order of stores (origin is implicit start & end). */
  visitOrder: string[];
  assignments: LineAssignment[];
  materialsOre: Ore;
  tollOre: Ore;
  fuelOre: Ore;
  /** Monetized value of driving time (0 if timeValueOrePerHour is 0). */
  timeValueOre: Ore;
  distanceMeters: number;
  durationSeconds: number;
  /** materials + toll + fuel + timeValue. The number plans are ranked by. */
  totalOre: Ore;
}

export interface OptimizeResult {
  /** Plans sorted ascending by totalOre (cheapest first). */
  plans: Plan[];
  /** The cheapest single-store plan, for "you save X vs one store" messaging. */
  bestSingleStore?: Plan;
  /** Basket lines that no in-radius store could supply at all. */
  unfulfillable: BasketLine[];
}

interface Deps {
  routing: RoutingClient;
  toll: TollClient;
  strom: StromPriceClient;
}

/** Enumerate all subsets of `items` with size in [1, maxSize]. */
function subsetsUpTo<T>(items: T[], maxSize: number): T[][] {
  const out: T[][] = [];
  const n = items.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const subset: T[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) subset.push(items[i]!);
    if (subset.length <= maxSize) out.push(subset);
  }
  return out;
}

/**
 * Core Trip Optimizer.
 *
 * Strategy (see docs/ARCHITECTURE.md §5): prefilter stores by radius + stock, enumerate store
 * subsets up to `maxStores`, assign each line to its cheapest store within the subset, solve the
 * tiny exact TSP for the visiting order, then price the trip (materials + tolls + fuel + time).
 * Plans are ranked by total cost.
 */
export async function optimize(
  req: OptimizeRequest,
  stores: Store[],
  offers: Offer[],
  deps: Deps,
): Promise<OptimizeResult> {
  const maxStores = req.maxStores ?? 3;
  const timeValuePerHour = req.timeValueOrePerHour ?? 0;

  // Index offers by (storeId|productId) for O(1) lookup, keeping only in-stock ones.
  const offerKey = (storeId: string, productId: string) => `${storeId}|${productId}`;
  const offerMap = new Map<string, Offer>();
  for (const o of offers) {
    if (o.inStock === false) continue;
    offerMap.set(offerKey(o.storeId, o.productId), o);
  }

  // Prefilter: stores within radius that stock at least one basket line.
  const productIds = new Set(req.basket.map((l) => l.productId));
  const candidateStores = stores.filter((s) => {
    if (haversineMeters(req.origin, s.location) > req.maxRadiusMeters) return false;
    for (const pid of productIds) if (offerMap.has(offerKey(s.id, pid))) return true;
    return false;
  });

  // A line is fulfillable if ANY candidate store stocks it.
  const unfulfillable = req.basket.filter(
    (line) => !candidateStores.some((s) => offerMap.has(offerKey(s.id, line.productId))),
  );
  const fulfillable = req.basket.filter((line) => !unfulfillable.includes(line));

  // Resolve EV energy price once (used by fuel model for EV cars).
  const evPrice =
    req.car.fuelType === "ev"
      ? (req.car.energyPriceOrePerKwh ?? (await deps.strom.priceOrePerKwh(req.originZone)))
      : undefined;

  const plans: Plan[] = [];

  for (const subset of subsetsUpTo(candidateStores, maxStores)) {
    // Assign each fulfillable line to its cheapest store within this subset.
    const assignments: LineAssignment[] = [];
    let coversAll = true;
    let materialsOre = 0;

    for (const line of fulfillable) {
      let bestOffer: Offer | undefined;
      for (const s of subset) {
        const o = offerMap.get(offerKey(s.id, line.productId));
        if (o && (!bestOffer || o.priceOre < bestOffer.priceOre)) bestOffer = o;
      }
      if (!bestOffer) {
        coversAll = false;
        break;
      }
      const lineTotal = bestOffer.priceOre * line.qty;
      materialsOre += lineTotal;
      assignments.push({
        productId: line.productId,
        qty: line.qty,
        storeId: bestOffer.storeId,
        unitPriceOre: bestOffer.priceOre,
        lineTotalOre: lineTotal,
      });
    }
    // Only consider plans that cover the whole fulfillable basket — otherwise plans aren't
    // comparable (a cheap plan that skips half the list isn't really cheaper).
    if (!coversAll) continue;

    // Only the stores actually used (a 3-store subset may resolve to 2 used stores).
    const usedStoreIds = [...new Set(assignments.map((a) => a.storeId))];
    const usedStores = usedStoreIds.map((id) => subset.find((s) => s.id === id)!);

    const trip = await priceTrip(req.origin, usedStores, deps, req, evPrice, timeValuePerHour);

    plans.push({
      storeIds: usedStoreIds,
      visitOrder: trip.visitOrder,
      assignments,
      materialsOre,
      tollOre: trip.tollOre,
      fuelOre: trip.fuelOre,
      timeValueOre: trip.timeValueOre,
      distanceMeters: trip.distanceMeters,
      durationSeconds: trip.durationSeconds,
      totalOre: materialsOre + trip.tollOre + trip.fuelOre + trip.timeValueOre,
    });
  }

  // Deduplicate plans that use the same set of stores (different subsets can resolve to the
  // same used-store set); keep the cheapest of each.
  const byStoreSet = new Map<string, Plan>();
  for (const p of plans) {
    const key = [...p.storeIds].sort().join(",");
    const existing = byStoreSet.get(key);
    if (!existing || p.totalOre < existing.totalOre) byStoreSet.set(key, p);
  }
  const deduped = [...byStoreSet.values()].sort((a, b) => a.totalOre - b.totalOre);

  const bestSingleStore = deduped.find((p) => p.storeIds.length === 1);

  return { plans: deduped, bestSingleStore, unfulfillable };
}

/** Route the origin -> used stores -> origin and price the driving (toll + fuel + time). */
async function priceTrip(
  origin: LatLng,
  usedStores: Store[],
  deps: Deps,
  req: OptimizeRequest,
  evPrice: Ore | undefined,
  timeValuePerHour: Ore,
): Promise<{
  visitOrder: string[];
  tollOre: Ore;
  fuelOre: Ore;
  timeValueOre: Ore;
  distanceMeters: number;
  durationSeconds: number;
}> {
  // Node 0 = origin, nodes 1.. = stores. Order them with the exact mini-TSP.
  const nodes: LatLng[] = [origin, ...usedStores.map((s) => s.location)];
  const storeIndices = usedStores.map((_, i) => i + 1);
  const cost = (a: number, b: number) => haversineMeters(nodes[a]!, nodes[b]!);
  const order = bestRoundTripOrder(storeIndices, cost);

  const visitOrder = order.map((idx) => usedStores[idx - 1]!.id);
  const waypoints: LatLng[] = [origin, ...order.map((idx) => nodes[idx]!), origin];

  const route = await deps.routing.route(waypoints);
  const tollOre = await deps.toll.tollForRoute(route, /* withAutoPass */ true);
  const fuelOre = fuelCostOre(route.distanceMeters, req.car, evPrice);
  const timeValueOre = Math.round((route.durationSeconds / 3600) * timeValuePerHour);

  return {
    visitOrder,
    tollOre,
    fuelOre,
    timeValueOre,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
  };
}
