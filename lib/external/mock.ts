import { haversineMeters } from "../domain/geo.js";
import type { LatLng, Ore, PriceZone } from "../domain/types.js";
import type {
  RouteResult,
  RoutingClient,
  RoutingMatrix,
  StromPriceClient,
  TollClient,
} from "./interfaces.js";

/**
 * Deterministic mock external clients for Phase 1, tests, and offline demos.
 * These approximate reality well enough to develop and demo the optimizer before
 * OSRM / bompengekalkulator / hvakosterstrommen are wired in.
 */

/**
 * Routing approximated from straight-line distance with a road-network detour factor,
 * driven at an assumed average speed. Good enough for ranking; replace with OSRM for accuracy.
 */
export class MockRoutingClient implements RoutingClient {
  constructor(
    private readonly detourFactor = 1.3,
    private readonly avgSpeedKmh = 60,
  ) {}

  private legMeters(a: LatLng, b: LatLng): number {
    return haversineMeters(a, b) * this.detourFactor;
  }

  async route(waypoints: LatLng[]): Promise<RouteResult> {
    let distance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      distance += this.legMeters(waypoints[i - 1]!, waypoints[i]!);
    }
    const durationSeconds = (distance / 1000 / this.avgSpeedKmh) * 3600;
    return { distanceMeters: distance, durationSeconds, waypoints };
  }

  async table(points: LatLng[]): Promise<RoutingMatrix> {
    const n = points.length;
    const distanceMeters = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    const durationSeconds = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const d = this.legMeters(points[i]!, points[j]!);
        distanceMeters[i]![j] = d;
        durationSeconds[i]![j] = (d / 1000 / this.avgSpeedKmh) * 3600;
      }
    }
    return { distanceMeters, durationSeconds };
  }
}

/**
 * Toll approximated as a flat charge per "toll-likely" segment over a distance threshold.
 * Real tariffs vary wildly by ring/road; this only exists so the optimizer has a non-zero,
 * monotonic toll signal until bompengekalkulator is integrated.
 */
export class MockTollClient implements TollClient {
  constructor(
    private readonly fullTariffOrePerLeg = 3500, // 35 kr
    private readonly autoPassDiscount = 0.2, // 20% off
    private readonly tolledLegMinMeters = 8000,
  ) {}

  async tollForRoute(route: RouteResult, withAutoPass: boolean): Promise<Ore> {
    let toll = 0;
    for (let i = 1; i < route.waypoints.length; i++) {
      const legMeters = haversineMeters(route.waypoints[i - 1]!, route.waypoints[i]!) * 1.3;
      if (legMeters >= this.tolledLegMinMeters) toll += this.fullTariffOrePerLeg;
    }
    if (withAutoPass) toll = Math.round(toll * (1 - this.autoPassDiscount));
    return toll;
  }
}

/** Static strøm prices per zone (øre/kWh). Replace with hvakosterstrommen live data. */
export class MockStromPriceClient implements StromPriceClient {
  private readonly prices: Record<PriceZone, Ore> = {
    NO1: 90,
    NO2: 110,
    NO3: 45,
    NO4: 35,
    NO5: 80,
  };

  async priceOrePerKwh(zone: PriceZone): Promise<Ore> {
    return this.prices[zone];
  }
}
