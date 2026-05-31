import type { LatLng, Meters, Ore, PriceZone, Seconds } from "../domain/types.js";

/**
 * External-service interfaces. The optimizer depends ONLY on these, never on concrete
 * HTTP clients, so it can be unit-tested with deterministic mocks (see lib/external/mock.ts)
 * and later backed by OSRM / bompengekalkulator / hvakosterstrommen (lib/external/live.ts).
 */

/** A driven route through an ordered list of waypoints (origin -> stores -> origin). */
export interface RouteResult {
  distanceMeters: Meters;
  durationSeconds: Seconds;
  /** The waypoints the route passed through, in order, for toll lookup & display. */
  waypoints: LatLng[];
}

export interface RoutingClient {
  /** Route through the given ordered waypoints. */
  route(waypoints: LatLng[]): Promise<RouteResult>;
}

export interface TollClient {
  /**
   * Total toll cost (bompenger) for a route, in øre.
   * `withAutoPass` selects the discounted AutoPASS tariff vs the full tariff.
   */
  tollForRoute(route: RouteResult, withAutoPass: boolean): Promise<Ore>;
}

export interface StromPriceClient {
  /** Current strøm spot price for a zone, in øre per kWh. */
  priceOrePerKwh(zone: PriceZone): Promise<Ore>;
}
