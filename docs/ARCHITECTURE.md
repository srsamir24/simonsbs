# Byggjakt — Product & Technical Plan

_Last updated: 2026-05-31 · Status: planning, no app code yet_

A Prisjakt-style price-comparison web app for **construction materials in Norway**, whose
distinguishing feature is that it optimizes the **total cost of acquiring a shopping list** —
item prices **+** driving time **+** fuel/electricity **+** bompenger (tolls) — and can split
a basket across nearby stores.

---

## 1. Problem & differentiation

### Who it's for
- **DIY / self-builders** doing a renovation (oppussing) or a cabin (hytte) project.
- **Small contractors** (snekker, småbedrift) who buy materials weekly and feel every krone
  of price difference, toll, and hour of driving.

### Why existing tools don't solve it
| Tool | Gap |
|------|-----|
| Prisjakt / Prisguiden | Consumer electronics; almost no building materials. |
| Individual store sites | Show only their own prices; no cross-store comparison. |
| DrivstoffAppen, toll calculators | Solve *one* sub-problem (fuel, or tolls) in isolation. |
| Google Maps | Routes you, but knows nothing about material prices or baskets. |

**Byggjakt's wedge:** nobody combines *material prices × geography × real Norwegian travel
costs* into a single "cheapest total trip" answer. That's the whole product.

### The headline feature
Given a basket + home location + car profile, produce a ranked set of **plans**:

> _"Buy items A & B at **Maxbo Lier** and item C at **Montér Drammen** (they're 6 km apart).
> Materials 3 980 kr + 84 kr toll + 96 kr fuel = **4 160 kr total**, 41 min driving.
> You save **340 kr** vs buying everything at the single cheapest store."_

---

## 2. Scope — phased

We deliberately ship the **engine on seed data first**, because the optimizer is fully
buildable and demoable before the price-data problem (§3) is solved. That de-risks the build:
even with hand-entered prices for 3 stores, the product is already useful and testable.

### Phase 0 — De-risk data (do this in parallel, see §3)
Spike scraping/feeds for 2–3 chains. Decide the legal/sourcing strategy. **This gates whether
the product can ever be real**, so it starts now, not after the UI is pretty.

### Phase 1 — MVP (engine on seed data)
- A curated catalog of ~50–100 common materials (2x4 impregnated lumber, gips, isolasjon,
  sement, OSB, etc.), priced by hand for **3–5 real stores** in one region (e.g. greater Oslo/Drammen).
- Search a product → see price per store + distance from you.
- Build a basket → **Trip Optimizer** returns ranked plans with full cost breakdown
  (materials + toll + fuel/strøm + drive time).
- Car profile (petrol / diesel / EV, consumption) + your location.
- PWA: installable, mobile-first.

### Phase 2 — Real data + matching
- Automated price ingestion for the chains validated in Phase 0.
- Product matching across stores via **EAN/GTIN** where available, fuzzy matching otherwise.
- Price history + "price dropped" view.
- Expand store coverage region by region.

### Phase 3 — Polish & retention
- Saved baskets / projects (a "hytte" project, a "bad-oppussing" project).
- Alerts ("gips dropped 12% at Optimera near you").
- Pro features: bulk/contractor pricing, VAT toggle, account-level.
- Live fuel prices if a data partnership becomes available (§4).

> **Recommended first build target:** Phase 1. It's a complete, demoable product on seed data
> and forces us to design the schema and optimizer correctly before scaling data.

---

## 3. The hard part: getting price data

**This is the make-or-break of the project.** Construction retailers in Norway
(Byggmakker, Maxbo, Montér, Optimera, Byggmax, Bauhaus, Obs Bygg) publish **no open price
APIs**. Treat acquisition as a first-class, ongoing problem — not a checkbox.

### Options, roughly best → worst
1. **Official partnerships / affiliate feeds.** Cleanest and legally safe. Some chains run
   affiliate programs (Adtraction/Adservice/Partner-ads in the Nordics) that include product
   feeds. Start by *asking* — a price-comparison site sends them buyers.
2. **Structured data already on their pages.** Many e-commerce sites embed
   `schema.org/Product` + `Offer` JSON-LD, `og:` tags, or a JSON product API behind the
   storefront (inspect XHR calls). Far more robust than parsing HTML.
3. **Sitemap + product-page scraping.** Crawl `sitemap.xml`, fetch product pages, extract
   price/EAN. Fragile and ToS-sensitive.
4. **Crowd-sourced prices.** Users submit/confirm prices (how DrivstoffAppen bootstrapped).
   Great for coverage and freshness, needs moderation.

### Hard constraints to respect
- **Legality / ToS:** check each site's `robots.txt` and terms. Norwegian/EU rules
  (database rights, GDPR for any personal data) apply. **Prefer permission over forgiveness** —
  reach out to chains before scraping at scale. Flag anything ambiguous to the product owner.
- **Robustness:** scrapers break when sites change. Need per-source adapters, monitoring,
  and graceful staleness ("price last seen 3 days ago").
- **Product matching:** the same 48×98 impregnated stud has different names/SKUs per chain.
  **EAN/GTIN is the join key when present;** otherwise fuzzy match on
  attributes (dimensions, material, brand) with a human-review queue.

### Recommendation
Phase 0 spike: pick **two** chains, inspect their pages for JSON-LD / hidden JSON APIs, and
prototype an adapter for each. In parallel, send partnership/affiliate inquiries. Let the spike
result decide how ambitious data coverage can be — design the rest of the system so the price
source is a **pluggable adapter** behind a stable internal interface, so we can mix feeds,
scrapers, and crowd-sourcing per store.

---

## 4. Norway-specific data sources (researched)

| Need | Source | Notes |
|------|--------|-------|
| **Tolls (bompenger)** | [bompengekalkulator.no API](https://om.bompengekalkulator.no/docs) | Best-fit. Two modes: post **waypoints** from an actual route, or **to/from addresses**. Returns toll stations (name, coords, direction), distance/time, and cost **with & without AutoPASS** discount, plus ferries. Confirm API key + pricing/rate limits during integration. Alternative: [TollGuru](https://tollguru.com/toll-calculator-norway). |
| **Electricity (strøm)** | [hvakosterstrommen.no API](https://www.hvakosterstrommen.no/strompris-api) | **Free & open.** Hourly spot prices per price zone **NO1–NO5**, today + tomorrow, in NOK (ENTSO-E data, Norges Bank FX). Ideal for EV trip-cost. For all-in cost add nettleie + avgifter — see [Glitre nettleie API](https://www.glitrenett.no/kunde/nettleie-og-priser/api-for-nettleie). |
| **Fuel (bensin/diesel)** | ⚠️ No clean open API. | DrivstoffAppen / Drivstoffapp own their data (written consent required). **Plan:** model fuel cost as `consumption(l/10km) × distance × price_per_litre`, with `price_per_litre` configurable and seeded from a national average (e.g. [GlobalPetrolPrices](https://www.globalpetrolprices.com/Norway/gasoline_prices/)); pursue a data partnership only in Phase 3. |
| **Routing** | [OSRM](https://project-osrm.org/) self-hosted on OSM data | No per-request cost; Lua profiles can weight/avoid toll roads. Managed alternatives to start faster: [Mapbox Directions](https://www.liedman.net/leaflet-routing-machine/tutorials/alternative-routers/), [GraphHopper](https://www.graphhopper.com/) (free tiers ~2.5k–10k req/day). |
| **Geocoding / addresses** | [Kartverket](https://kartverket.no/) (official NO addresses), Nominatim (OSM) | For converting user/store addresses → coordinates. |
| **Maps display** | MapLibre + OSM tiles, or Mapbox GL | MapLibre keeps it free/open. |

---

## 5. The Trip Optimizer (the fun part)

This is a well-defined optimization problem and is fully buildable on seed data.

### Inputs
- **Basket:** `[{ product_id, qty }]`
- **Origin:** user coordinates (and optionally a return-home leg).
- **Car profile:** `fuel_type ∈ {petrol, diesel, ev}`, `consumption`, prices
  (`price_per_litre` or strøm zone), optional `time_value_per_hour` (how much the user values
  an hour — lets us trade money vs time).
- **Candidate stores:** those stocking ≥1 basket item, within a max radius.

### What we compute per candidate plan
A **plan** = an assignment of each basket line to a store, plus the driving route visiting the
chosen stores from origin and back.

```
total_cost(plan) =
    Σ item_price(line, assigned_store)          # materials
  + toll_cost(route)                            # bompengekalkulator
  + fuel_cost(route.distance, car_profile)      # litres×price OR kWh×spot
  + time_value_per_hour × route.duration        # optional, user-tunable
```

`route` is solved as a small **TSP / set-cover hybrid**:
- *Set cover:* which subset of stores collectively stocks the whole basket cheaply enough to
  justify visiting them?
- *TSP:* given a chosen store subset, find the shortest origin→stores→origin order.

### Algorithm (pragmatic, not academic)
Baskets touch only a handful of nearby stores, so brute force is fine:
1. **Prefilter** stores by radius and stock coverage.
2. Enumerate store subsets up to **k = 3** stores (1-store, 2-store, 3-store plans). The
   combinatorics stay tiny at k≤3.
3. For each subset: assign each line to its cheapest store *in the subset*; solve the small TSP
   (≤4 nodes incl. origin → exact) for the route; query routing + tolls + fuel.
4. Rank by `total_cost`; also surface "fastest" and "fewest stores" as alternative sorts.
5. Cache route/toll legs between store pairs aggressively (they rarely change).

### Honest gotchas
- **Stock availability** ("is it actually in this store today?") is harder than price and may
  not be in feeds — start by assuming "listed = available", show a caveat.
- **Quantity/units** must be normalized (per piece vs per meter vs per m²/pack) or comparisons
  lie. This belongs in the catalog schema from day one.
- Toll/fuel API calls cost latency and quota — batch and cache per store-pair.

---

## 6. Architecture

```
                         ┌─────────────────────────────────────────┐
                         │            Next.js (App Router)          │
   Browser / PWA  ◀────▶ │  React UI · server actions · API routes  │
   (MapLibre map,        └───────────────┬─────────────────────────┘
    installable)                         │
                       ┌─────────────────┼──────────────────────────┐
                       │                 │                          │
              ┌────────▼───────┐ ┌───────▼────────┐      ┌──────────▼─────────┐
              │ Trip Optimizer │ │  Catalog /     │      │  Pricing adapters  │
              │  (TS module)   │ │  Search (PG +  │      │  (pluggable per    │
              │                │ │   PostGIS)     │      │   store: feed /    │
              └───┬────────┬───┘ └────────────────┘      │   scrape / crowd)  │
                  │        │                              └─────────┬──────────┘
        ┌─────────▼──┐ ┌───▼─────────┐                    ┌─────────▼──────────┐
        │  Routing   │ │  External   │                    │  Ingestion workers │
        │  (OSRM)    │ │  data APIs: │                    │  (cron/queue) →    │
        └────────────┘ │  tolls,     │                    │  prices + EAN match│
                       │  strøm      │                    └────────────────────┘
                       └─────────────┘
                                  │
                         ┌────────▼─────────┐
                         │  PostgreSQL +    │
                         │  PostGIS         │
                         └──────────────────┘
```

### Components
- **Next.js + TypeScript** monorepo. UI + API routes + server actions in one app for Phase 1;
  split ingestion workers into a separate service when scraping volume grows.
- **PostgreSQL + PostGIS** — products, EAN, stores (with geo), prices, price history,
  user baskets. PostGIS for radius/nearest-store queries.
- **Pricing adapters** — a stable internal interface `PriceSource.fetch(store) → Offer[]`,
  implemented per store as feed / scraper / crowd-sourced. Keeps the volatile, ToS-sensitive
  part isolated.
- **Trip Optimizer** — pure TypeScript module (§5), unit-testable in isolation with no
  external calls (inject routing/toll/fuel as interfaces → mockable).
- **External-data clients** — thin, cached wrappers over OSRM, bompengekalkulator,
  hvakosterstrommen.
- **Ingestion workers** — scheduled jobs that refresh prices and run EAN matching; isolated so
  a broken scraper never takes down the app.

### Suggested repo layout (when we start Phase 1)
```
/app                 Next.js routes + UI
/lib/optimizer       Trip Optimizer (pure, tested)
/lib/pricing         PriceSource interface + per-store adapters
/lib/external        OSRM / toll / strøm clients (cached)
/lib/db              schema, queries (Prisma or Drizzle)
/workers             ingestion + matching jobs
/seed                hand-entered Phase-1 catalog & store data
/docs                this plan
```

---

## 7. Tech stack summary

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend / app | **Next.js (App Router) + TypeScript**, PWA | One codebase, mobile + desktop, installable; chosen with user. |
| UI | React, Tailwind, shadcn/ui | Fast, consistent. |
| Maps | **MapLibre GL** + OSM tiles | Free/open; Mapbox GL as paid upgrade. |
| DB | **PostgreSQL + PostGIS** | Geo queries are core. |
| ORM | Drizzle or Prisma | TS-native. |
| Routing | **OSRM** self-host (OSM) | No per-request cost; toll-aware Lua profiles. |
| Tolls | bompengekalkulator API | Norway-specific, AutoPASS-accurate. |
| Strøm | hvakosterstrommen API | Free, per-zone hourly. |
| Hosting | Vercel (app) + a VPS/container for OSRM & workers | OSRM needs a real box; Next.js fits serverless. |

---

## 8. Open questions for the product owner

1. **Geography first:** which region do we seed in Phase 1? (Greater Oslo/Drammen has dense
   store overlap *and* lots of tolls → great showcase.)
2. **Audience priority:** lean DIY/consumer (inkl. mva pricing, simpler) or pro/contractor
   (eks. mva, bulk, accounts)? Affects pricing display and feature order.
3. **Data ambition for v1:** OK to launch on **hand-entered prices for ~5 stores** to prove the
   concept, while we pursue feeds/partnerships? (Strongly recommended.)
4. **Scraping appetite:** how aggressive are we willing to be vs. waiting for
   partnerships/affiliate feeds? This is a legal/risk call, not just technical.
5. **Time-vs-money:** should the optimizer expose a "value of my time per hour" slider, or just
   rank by pure kroner and show time as info?
6. **Name/branding:** "Byggjakt" is a placeholder. Keep, or pick something else?

---

## 9. Immediate next steps

- [ ] Owner answers §8 Q1–Q4 (region, audience, data ambition, scraping appetite).
- [ ] Phase 0 spike: inspect 2 chains' product pages for JSON-LD / hidden JSON APIs; send
      affiliate/partnership inquiries.
- [x] **Build the Trip Optimizer against seed data with mocked routing/toll/fuel clients +
      tests.** ✅ Done — see `lib/optimizer/`, `seed/`, `npm test`, `npm run demo`.
- [x] **Hand-enter a Phase-1 seed catalog (greater Oslo/Drammen, zone NO1).** ✅ `seed/`.
- [ ] Scaffold the Next.js + TS app + UI (basket builder, map, results) on top of the engine.
- [ ] Add PostGIS schema + persistence (products, EAN, stores, prices, baskets) to replace
      the in-memory seed arrays.
- [ ] Wire real OSRM + bompengekalkulator + hvakosterstrommen behind the cached clients
      (drop-in replacements for `lib/external/mock.ts` implementing `lib/external/interfaces.ts`).

## 10. What's built so far (Phase 1 engine)

```
lib/domain/      types, money (øre-based), geo (haversine)
lib/external/    interfaces (Routing/Toll/Strøm) + deterministic mocks
lib/optimizer/   fuel & strøm cost model, exact mini-TSP, the optimizer, tests
seed/            real Oslo/Drammen stores + sample catalogue + hand-entered prices
scripts/demo.ts  end-to-end "cheapest total trip" demo  (npm run demo)
```

Design choices worth knowing:
- **Money is integer øre** everywhere to avoid float drift when summing baskets/tolls/fuel.
- **External services are interfaces**, so the optimizer is pure and unit-tested with mocks;
  swapping in live OSRM/toll/strøm requires no optimizer changes.
- **Optimizer strategy** = enumerate store subsets up to `maxStores` (default 3), assign each
  line to its cheapest store in the subset, solve an exact mini-TSP for the visit order, then
  price materials + toll + fuel + (optional) time value. Plans ranked by total cost.
