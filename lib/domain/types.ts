/**
 * Core domain types for Byggjakt.
 *
 * Money is always represented in øre (integer, 1 NOK = 100 øre) to avoid floating
 * point rounding when summing baskets, tolls and fuel. Use `kr()` / `toKr()` helpers
 * in `lib/domain/money.ts` at the UI boundary.
 */

export type Ore = number; // integer NOK-øre
export type Meters = number;
export type Seconds = number;

/** A geographic point (WGS84). */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Norwegian electricity price zones, used for EV strøm cost. */
export type PriceZone = "NO1" | "NO2" | "NO3" | "NO4" | "NO5";

/** Unit a material is sold/compared in. Comparisons across stores must normalize to this. */
export type Unit = "stk" | "m" | "m2" | "pakke" | "sekk" | "liter";

/** A catalogue product — the abstract material, independent of any store. */
export interface Product {
  id: string;
  /** Global trade item number (EAN/GTIN) — the cross-store join key when present. */
  ean?: string;
  name: string;
  category: string; // e.g. "trelast", "isolasjon", "gips"
  brand?: string;
  unit: Unit;
  /** Free-form normalized attributes used for fuzzy matching when EAN is absent. */
  attributes?: Record<string, string | number>;
}

/** A physical store location belonging to a chain. */
export interface Store {
  id: string;
  chain: string; // e.g. "Maxbo", "Montér", "Optimera"
  name: string; // e.g. "Maxbo Lier"
  location: LatLng;
  zone: PriceZone;
  address?: string;
}

/**
 * A price for a product at a store. `priceOre` is the consumer price *incl. mva* by default
 * (Phase 1 / DIY). `inclMva` lets us support pro/eks-mva display later without schema change.
 */
export interface Offer {
  storeId: string;
  productId: string;
  priceOre: Ore;
  inclMva: boolean;
  /** When this price was last observed — drives "price last seen N days ago" staleness UI. */
  observedAt: Date;
  /** Whether the item is believed in stock. Many sources can't tell us; default true. */
  inStock?: boolean;
}

/** One line of the user's shopping list. */
export interface BasketLine {
  productId: string;
  qty: number;
}

export type FuelType = "petrol" | "diesel" | "ev";

/** The user's car + cost assumptions, used to price the driving part of a trip. */
export interface CarProfile {
  fuelType: FuelType;
  /**
   * Consumption.
   *  - petrol/diesel: litres per 100 km
   *  - ev:            kWh per 100 km
   */
  consumptionPer100km: number;
  /** Price of a litre of fuel in øre (petrol/diesel only). */
  fuelPriceOrePerLitre?: Ore;
  /**
   * EV energy price in øre per kWh (ev only). If omitted, the optimizer can look it up from
   * the strøm price source for the origin's zone.
   */
  energyPriceOrePerKwh?: Ore;
}

/** Everything needed to run the optimizer. */
export interface OptimizeRequest {
  origin: LatLng;
  /** Origin's price zone, for EV strøm lookup. */
  originZone: PriceZone;
  basket: BasketLine[];
  car: CarProfile;
  /** Only consider stores within this radius (metres) of the origin. */
  maxRadiusMeters: Meters;
  /** Max number of stores a single plan may visit. Keeps the search tiny. Default 3. */
  maxStores?: number;
  /** Value the user places on an hour of their time, in øre. 0 = ignore time. Default 0. */
  timeValueOrePerHour?: Ore;
}
