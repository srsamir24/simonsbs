import type { LatLng, Ore, PriceZone } from "../domain/types.js";
import type { RouteResult, RoutingClient, StromPriceClient } from "./interfaces.js";

/**
 * Live external clients backed by real public APIs, each wrapping a `fallback` client used when
 * the network call fails (offline dev, sandboxed CI, API downtime). A tiny circuit breaker stops
 * us from eating a timeout on every call once an endpoint is known to be unreachable — the first
 * failure trips it and subsequent calls use the fallback instantly until the cooldown passes.
 *
 * `fetchImpl` is injectable so these are unit-testable without real network (see live.test.ts).
 */

type FetchLike = typeof fetch;

class CircuitBreaker {
  private openUntil = 0;
  constructor(private readonly cooldownMs: number) {}
  get isOpen(): boolean {
    return Date.now() < this.openUntil;
  }
  trip(): void {
    this.openUntil = Date.now() + this.cooldownMs;
  }
  reset(): void {
    this.openUntil = 0;
  }
}

async function fetchJson(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Strøm — hvakosterstrommen.no (free, hourly spot price per zone)     */
/* ------------------------------------------------------------------ */

interface HksPriceEntry {
  NOK_per_kWh: number;
  time_start: string;
  time_end: string;
}

export interface HvaKosterStrommenOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  cooldownMs?: number;
}

/** Year/month/day in Europe/Oslo, for building the API path (prices are published per Oslo day). */
function osloYmd(now: Date): { y: string; md: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { y: get("year"), md: `${get("month")}-${get("day")}` };
}

export class HvaKosterStrommenClient implements StromPriceClient {
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly breaker: CircuitBreaker;
  private readonly cache = new Map<string, Ore>();

  constructor(
    private readonly fallback: StromPriceClient,
    opts: HvaKosterStrommenOptions = {},
  ) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 3000;
    this.breaker = new CircuitBreaker(opts.cooldownMs ?? 60_000);
  }

  async priceOrePerKwh(zone: PriceZone): Promise<Ore> {
    const now = new Date();
    const { y, md } = osloYmd(now);
    const hourKey = `${zone}|${y}-${md}|${now.getUTCHours()}`;
    const cached = this.cache.get(hourKey);
    if (cached != null) return cached;
    if (this.breaker.isOpen) return this.fallback.priceOrePerKwh(zone);

    try {
      const url = `https://www.hvakosterstrommen.no/api/v1/prices/${y}/${md}_${zone}.json`;
      const data = (await fetchJson(this.fetchImpl, url, this.timeoutMs)) as HksPriceEntry[];
      const entry =
        data.find((e) => {
          const start = new Date(e.time_start).getTime();
          const end = new Date(e.time_end).getTime();
          return now.getTime() >= start && now.getTime() < end;
        }) ?? data[0];
      if (!entry) throw new Error("empty strøm price response");
      // NOK_per_kWh is the spot price (excl. nettleie/avgift); good enough for trip cost now.
      const ore = Math.round(entry.NOK_per_kWh * 100);
      this.breaker.reset();
      this.cache.set(hourKey, ore);
      return ore;
    } catch {
      this.breaker.trip();
      return this.fallback.priceOrePerKwh(zone);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Routing — OSRM (driving distance & duration through waypoints)      */
/* ------------------------------------------------------------------ */

interface OsrmRoute {
  distance: number; // metres
  duration: number; // seconds
}
interface OsrmResponse {
  code: string;
  routes?: OsrmRoute[];
}

export interface OsrmOptions {
  fetchImpl?: FetchLike;
  /** OSRM base URL. Defaults to the public demo server (rate-limited; self-host for production). */
  baseUrl?: string;
  timeoutMs?: number;
  cooldownMs?: number;
}

export class OsrmRoutingClient implements RoutingClient {
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly breaker: CircuitBreaker;
  private readonly cache = new Map<string, RouteResult>();

  constructor(
    private readonly fallback: RoutingClient,
    opts: OsrmOptions = {},
  ) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.baseUrl = (opts.baseUrl ?? "https://router.project-osrm.org").replace(/\/$/, "");
    this.timeoutMs = opts.timeoutMs ?? 3500;
    this.breaker = new CircuitBreaker(opts.cooldownMs ?? 60_000);
  }

  async route(waypoints: LatLng[]): Promise<RouteResult> {
    const key = waypoints.map((w) => `${w.lng.toFixed(5)},${w.lat.toFixed(5)}`).join(";");
    const cached = this.cache.get(key);
    if (cached) return cached;
    if (this.breaker.isOpen) return this.fallback.route(waypoints);

    try {
      const url = `${this.baseUrl}/route/v1/driving/${key}?overview=false&annotations=false`;
      const data = (await fetchJson(this.fetchImpl, url, this.timeoutMs)) as OsrmResponse;
      const route = data.code === "Ok" ? data.routes?.[0] : undefined;
      if (!route) throw new Error(`OSRM returned ${data.code}`);
      const result: RouteResult = {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        waypoints,
      };
      this.breaker.reset();
      this.cache.set(key, result);
      return result;
    } catch {
      this.breaker.trip();
      return this.fallback.route(waypoints);
    }
  }
}
