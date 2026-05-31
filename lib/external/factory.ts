import type { RoutingClient, StromPriceClient, TollClient } from "./interfaces.js";
import { MockRoutingClient, MockStromPriceClient, MockTollClient } from "./mock.js";
import { HvaKosterStrommenClient, OsrmRoutingClient } from "./live.js";

export interface ExternalClients {
  routing: RoutingClient;
  toll: TollClient;
  strom: StromPriceClient;
}

/**
 * Assemble the external clients once (caches & circuit breakers are per-instance, so we keep a
 * module-level singleton). Live routing (OSRM) and strøm (hvakosterstrommen) are used by default,
 * each falling back to its deterministic mock when the network is unavailable. Tolls remain mock
 * until the bompengekalkulator API key/integration lands.
 *
 *   BYGGJAKT_DISABLE_LIVE=1  → force the mock clients everywhere (offline/deterministic).
 *   OSRM_URL=https://...     → point routing at a self-hosted OSRM instead of the demo server.
 */
function build(): ExternalClients {
  const mockRouting = new MockRoutingClient();
  const mockStrom = new MockStromPriceClient();
  const toll = new MockTollClient();

  if (process.env.BYGGJAKT_DISABLE_LIVE) {
    return { routing: mockRouting, toll, strom: mockStrom };
  }

  return {
    routing: new OsrmRoutingClient(mockRouting, { baseUrl: process.env.OSRM_URL }),
    toll,
    strom: new HvaKosterStrommenClient(mockStrom),
  };
}

let singleton: ExternalClients | undefined;

export function getExternalClients(): ExternalClients {
  if (!singleton) singleton = build();
  return singleton;
}
