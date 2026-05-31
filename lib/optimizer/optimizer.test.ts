import { describe, expect, it } from "vitest";
import { kr, toKr } from "../domain/money.js";
import type { CarProfile, OptimizeRequest } from "../domain/types.js";
import {
  MockRoutingClient,
  MockStromPriceClient,
  MockTollClient,
} from "../external/mock.js";
import { SEED_OFFERS } from "../../seed/offers.js";
import { SEED_STORES } from "../../seed/stores.js";
import { optimize } from "./optimizer.js";

const deps = {
  routing: new MockRoutingClient(),
  toll: new MockTollClient(),
  strom: new MockStromPriceClient(),
};

// A petrol car: 0,7 l/km -> 7 l/100km, fuel 20 kr/l.
const petrol: CarProfile = {
  fuelType: "petrol",
  consumptionPer100km: 7,
  fuelPriceOrePerLitre: kr(20),
};

// Origin near Drammen.
const origin = { lat: 59.74, lng: 10.2 };

function baseReq(overrides: Partial<OptimizeRequest> = {}): OptimizeRequest {
  return {
    origin,
    originZone: "NO1",
    basket: [
      { productId: "lumber-48x98-impr", qty: 100 },
      { productId: "gips-13mm-standard", qty: 10 },
      { productId: "sement-25kg", qty: 4 },
    ],
    car: petrol,
    maxRadiusMeters: 60_000,
    maxStores: 3,
    ...overrides,
  };
}

describe("optimize", () => {
  it("returns plans sorted cheapest-first by total cost", async () => {
    const res = await optimize(baseReq(), SEED_STORES, SEED_OFFERS, deps);
    expect(res.plans.length).toBeGreaterThan(0);
    for (let i = 1; i < res.plans.length; i++) {
      expect(res.plans[i]!.totalOre).toBeGreaterThanOrEqual(res.plans[i - 1]!.totalOre);
    }
  });

  it("each plan's total equals materials + toll + fuel + time", async () => {
    const res = await optimize(baseReq(), SEED_STORES, SEED_OFFERS, deps);
    for (const p of res.plans) {
      expect(p.totalOre).toBe(p.materialsOre + p.tollOre + p.fuelOre + p.timeValueOre);
    }
  });

  it("covers the whole fulfillable basket in every plan", async () => {
    const res = await optimize(baseReq(), SEED_STORES, SEED_OFFERS, deps);
    for (const p of res.plans) {
      const lines = new Set(p.assignments.map((a) => a.productId));
      expect(lines).toEqual(new Set(["lumber-48x98-impr", "gips-13mm-standard", "sement-25kg"]));
    }
  });

  it("assigns each line to the cheapest store WITHIN the chosen plan", async () => {
    const res = await optimize(baseReq(), SEED_STORES, SEED_OFFERS, deps);
    for (const p of res.plans) {
      for (const a of p.assignments) {
        // No offer in the plan's stores is cheaper than the one chosen.
        const cheaperInPlan = SEED_OFFERS.filter(
          (o) => o.productId === a.productId && p.storeIds.includes(o.storeId),
        ).some((o) => o.priceOre < a.unitPriceOre);
        expect(cheaperInPlan).toBe(false);
      }
    }
  });

  it("the cheapest total plan beats or ties the cheapest single store", async () => {
    const res = await optimize(baseReq(), SEED_STORES, SEED_OFFERS, deps);
    expect(res.bestSingleStore).toBeDefined();
    expect(res.plans[0]!.totalOre).toBeLessThanOrEqual(res.bestSingleStore!.totalOre);
  });

  it("marks a basket line unfulfillable when no in-radius store stocks it", async () => {
    const res = await optimize(
      baseReq({ basket: [{ productId: "does-not-exist", qty: 1 }] }),
      SEED_STORES,
      SEED_OFFERS,
      deps,
    );
    expect(res.unfulfillable).toHaveLength(1);
    expect(res.plans).toHaveLength(0);
  });

  it("a tight radius excludes far stores (Bauhaus Vestby)", async () => {
    const res = await optimize(
      baseReq({ maxRadiusMeters: 15_000 }),
      SEED_STORES,
      SEED_OFFERS,
      deps,
    );
    const allStores = new Set(res.plans.flatMap((p) => p.storeIds));
    expect(allStores.has("bauhaus-vestby")).toBe(false);
    expect(allStores.has("monter-lillestrom")).toBe(false);
  });

  it("raising the value of time shifts ranking toward fewer/closer stores", async () => {
    const cheap = await optimize(baseReq(), SEED_STORES, SEED_OFFERS, deps);
    const timeCostly = await optimize(
      baseReq({ timeValueOrePerHour: kr(1000) }),
      SEED_STORES,
      SEED_OFFERS,
      deps,
    );
    // With time valued very highly, the top plan should not visit more stores than the
    // money-only top plan.
    expect(timeCostly.plans[0]!.storeIds.length).toBeLessThanOrEqual(
      cheap.plans[0]!.storeIds.length,
    );
  });

  it("handles an EV by pricing strøm from the origin zone", async () => {
    const ev: CarProfile = { fuelType: "ev", consumptionPer100km: 18 };
    const res = await optimize(baseReq({ car: ev }), SEED_STORES, SEED_OFFERS, deps);
    expect(res.plans.length).toBeGreaterThan(0);
    // Fuel cost should be positive for any plan that involves driving.
    expect(res.plans.some((p) => p.fuelOre > 0)).toBe(true);
  });

  it("produces a sane, non-trivial total (sanity bound)", async () => {
    const res = await optimize(baseReq(), SEED_STORES, SEED_OFFERS, deps);
    const best = res.plans[0]!;
    // 100 m lumber + 10 gips + 4 sement is a few thousand kroner; never zero, never absurd.
    expect(toKr(best.totalOre)).toBeGreaterThan(3000);
    expect(toKr(best.totalOre)).toBeLessThan(20000);
  });
});
