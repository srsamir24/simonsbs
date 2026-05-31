/**
 * Runnable end-to-end demo of the Trip Optimizer on seed data + mock external clients.
 *   npm run demo
 */
import { formatKr, kr, toKr } from "../lib/domain/money.js";
import type { CarProfile, OptimizeRequest } from "../lib/domain/types.js";
import {
  MockRoutingClient,
  MockStromPriceClient,
  MockTollClient,
} from "../lib/external/mock.js";
import { optimize, type Plan } from "../lib/optimizer/optimizer.js";
import { SEED_OFFERS } from "../seed/offers.js";
import { SEED_PRODUCTS } from "../seed/products.js";
import { SEED_STORES } from "../seed/stores.js";

const deps = {
  routing: new MockRoutingClient(),
  toll: new MockTollClient(),
  strom: new MockStromPriceClient(),
};

const car: CarProfile = {
  fuelType: "petrol",
  consumptionPer100km: 7,
  fuelPriceOrePerLitre: kr(21.5),
};

const req: OptimizeRequest = {
  origin: { lat: 59.74, lng: 10.2 }, // near Drammen
  originZone: "NO1",
  basket: [
    { productId: "lumber-48x98-impr", qty: 100 },
    { productId: "gips-13mm-standard", qty: 10 },
    { productId: "sement-25kg", qty: 4 },
    { productId: "osb-12mm", qty: 6 },
  ],
  car,
  maxRadiusMeters: 60_000,
  maxStores: 3,
  timeValueOrePerHour: kr(150),
};

const productName = (id: string) => SEED_PRODUCTS.find((p) => p.id === id)?.name ?? id;
const storeName = (id: string) => SEED_STORES.find((s) => s.id === id)?.name ?? id;

function printPlan(p: Plan, label: string) {
  console.log(`\n${label}`);
  console.log(`  Stores: ${p.visitOrder.map(storeName).join("  →  ")}`);
  for (const a of p.assignments) {
    console.log(
      `    • ${a.qty} × ${productName(a.productId)}  @ ${storeName(a.storeId)}` +
        `  = ${formatKr(a.lineTotalOre)}`,
    );
  }
  console.log(`  Materials: ${formatKr(p.materialsOre)}`);
  console.log(`  Bompenger: ${formatKr(p.tollOre)}`);
  console.log(`  Drivstoff: ${formatKr(p.fuelOre)}  (${(p.distanceMeters / 1000).toFixed(1)} km)`);
  console.log(`  Tid:       ${formatKr(p.timeValueOre)}  (${(p.durationSeconds / 60).toFixed(0)} min)`);
  console.log(`  ── TOTAL:  ${formatKr(p.totalOre)}`);
}

const res = await optimize(req, SEED_STORES, SEED_OFFERS, deps);

console.log("=".repeat(64));
console.log("BYGGJAKT — cheapest total trip");
console.log("=".repeat(64));

printPlan(res.plans[0]!, "🏆 BEST PLAN (cheapest total):");

if (res.bestSingleStore && res.bestSingleStore !== res.plans[0]) {
  printPlan(res.bestSingleStore, "🏬 Cheapest SINGLE store:");
  const saving = res.bestSingleStore.totalOre - res.plans[0]!.totalOre;
  console.log(
    `\n💰 The best plan saves ${formatKr(saving)} vs the single cheapest store ` +
      `(${(toKr(saving) / toKr(res.bestSingleStore.totalOre) * 100).toFixed(1)}%).`,
  );
}

console.log(`\n(${res.plans.length} candidate plans evaluated)`);
if (res.unfulfillable.length) {
  console.log(`⚠️  Unfulfillable: ${res.unfulfillable.map((l) => productName(l.productId)).join(", ")}`);
}
