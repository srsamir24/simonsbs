# Byggjakt 🏗️🇳🇴

> Working title — "Byggjakt" = *build-hunt*, a play on **Prisjakt**. Rename freely.

**Price comparison for construction materials in Norway — that compares the *total cost of the trip*, not just the sticker price.**

Most price-comparison sites tell you which store is cheapest for one item. Byggjakt
answers the question a builder or DIY-er actually has:

> "I need this whole shopping list. Given where I live, my car, toll roads, and fuel/strøm
> prices — what's the cheapest way to actually *get* all of it?"

That means weighing item prices **together with** driving time, fuel/electricity cost, and
**bompenger (tolls)** — and deciding whether to buy everything at one store or split the
basket across a couple of stores that are near each other.

## Status

📐 **Planning phase.** No application code yet. This repo currently contains the product &
technical plan. See **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** for the full design,
the phased roadmap, and the (significant) open risks around price-data acquisition.

## The core idea in one picture

```
Shopping list  ─┐
Your location  ─┤
Your car       ─┼──▶  Trip Optimizer  ──▶  "Buy A,B at Maxbo Lier + C at Montér Drammen.
Fuel/strøm     ─┤      (price + drive +        Total: 4 210 kr incl. 84 kr toll, 96 kr fuel.
Toll data      ─┘       toll + time)            You save 340 kr vs the single cheapest store."
```

## Planned stack

- **Next.js + TypeScript** PWA (installable, works on phone and desktop, one codebase)
- **PostgreSQL + PostGIS** for products, prices, and store geolocation
- **OSRM** (self-hosted, OpenStreetMap) for routing; tolls via the
  [bompengekalkulator API](https://om.bompengekalkulator.no/docs); strøm via the free
  [hvakosterstrommen.no API](https://www.hvakosterstrommen.no/strompris-api)

## Biggest open risk

Norwegian building-material retailers don't publish open price APIs. **How we legally and
reliably get price data is the make-or-break of this project** — the plan treats it as
Phase 0, not an afterthought. See [ARCHITECTURE.md §3](docs/ARCHITECTURE.md#3-the-hard-part-getting-price-data).
