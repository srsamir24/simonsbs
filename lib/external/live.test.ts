import { describe, expect, it, vi } from "vitest";
import { MockRoutingClient, MockStromPriceClient } from "./mock.js";
import { HvaKosterStrommenClient, OsrmRoutingClient } from "./live.js";

/** Build a fetch stub that returns the given JSON, or throws if `fail` is set. */
function stubFetch(json: unknown, fail = false) {
  return vi.fn(async () => {
    if (fail) throw new Error("network down");
    return { ok: true, status: 200, json: async () => json } as Response;
  });
}

describe("HvaKosterStrommenClient", () => {
  // An hourly series covering "now" so the current-hour lookup matches.
  const now = new Date();
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);
  const hourEnd = new Date(hourStart.getTime() + 3600_000);
  const series = [
    {
      NOK_per_kWh: 1.2345,
      time_start: hourStart.toISOString(),
      time_end: hourEnd.toISOString(),
    },
  ];

  it("parses NOK/kWh into øre/kWh for the current hour", async () => {
    const fetchImpl = stubFetch(series);
    const client = new HvaKosterStrommenClient(new MockStromPriceClient(), { fetchImpl });
    expect(await client.priceOrePerKwh("NO1")).toBe(123); // round(1.2345 * 100)
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("caches within the hour (no second fetch)", async () => {
    const fetchImpl = stubFetch(series);
    const client = new HvaKosterStrommenClient(new MockStromPriceClient(), { fetchImpl });
    await client.priceOrePerKwh("NO1");
    await client.priceOrePerKwh("NO1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back to the mock when the API fails", async () => {
    const fetchImpl = stubFetch(null, true);
    const fallback = new MockStromPriceClient();
    const client = new HvaKosterStrommenClient(fallback, { fetchImpl });
    expect(await client.priceOrePerKwh("NO1")).toBe(await fallback.priceOrePerKwh("NO1"));
  });

  it("trips the breaker so repeated failures don't refetch", async () => {
    const fetchImpl = stubFetch(null, true);
    const client = new HvaKosterStrommenClient(new MockStromPriceClient(), { fetchImpl });
    await client.priceOrePerKwh("NO2");
    await client.priceOrePerKwh("NO3"); // breaker open → no fetch
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("OsrmRoutingClient", () => {
  const wps = [
    { lat: 59.91, lng: 10.75 },
    { lat: 59.74, lng: 10.2 },
    { lat: 59.91, lng: 10.75 },
  ];
  const okResponse = { code: "Ok", routes: [{ distance: 92000, duration: 4200 }] };

  it("parses OSRM distance and duration", async () => {
    const fetchImpl = stubFetch(okResponse);
    const client = new OsrmRoutingClient(new MockRoutingClient(), { fetchImpl });
    const r = await client.route(wps);
    expect(r.distanceMeters).toBe(92000);
    expect(r.durationSeconds).toBe(4200);
    expect(r.waypoints).toEqual(wps);
  });

  it("caches identical routes", async () => {
    const fetchImpl = stubFetch(okResponse);
    const client = new OsrmRoutingClient(new MockRoutingClient(), { fetchImpl });
    await client.route(wps);
    await client.route(wps);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back to the mock router when OSRM fails", async () => {
    const fetchImpl = stubFetch(null, true);
    const fallback = new MockRoutingClient();
    const client = new OsrmRoutingClient(fallback, { fetchImpl });
    const r = await client.route(wps);
    const expected = await fallback.route(wps);
    expect(r.distanceMeters).toBeCloseTo(expected.distanceMeters, 5);
  });

  it("falls back when OSRM returns a non-Ok code", async () => {
    const fetchImpl = stubFetch({ code: "NoRoute" });
    const fallback = new MockRoutingClient();
    const client = new OsrmRoutingClient(fallback, { fetchImpl });
    const r = await client.route(wps);
    expect(r.distanceMeters).toBeGreaterThan(0); // came from fallback, not a throw
  });
});
