import type { Store } from "../lib/domain/types.js";

/**
 * Phase 1 seed stores — real chains & approximate real locations in the greater Oslo/Drammen
 * region (zone NO1). Coordinates are approximate and for demo only. Prices in offers.ts are
 * HAND-ENTERED PLACEHOLDERS, not scraped — see docs/ARCHITECTURE.md §3.
 */
export const SEED_STORES: Store[] = [
  {
    id: "maxbo-lier",
    chain: "Maxbo",
    name: "Maxbo Lier",
    location: { lat: 59.7889, lng: 10.2569 },
    zone: "NO1",
    address: "Lier",
  },
  {
    id: "monter-drammen",
    chain: "Montér",
    name: "Montér Drammen",
    location: { lat: 59.7456, lng: 10.2045 },
    zone: "NO1",
    address: "Drammen",
  },
  {
    id: "optimera-asker",
    chain: "Optimera",
    name: "Optimera Asker",
    location: { lat: 59.8333, lng: 10.4358 },
    zone: "NO1",
    address: "Asker",
  },
  {
    id: "byggmax-drammen",
    chain: "Byggmax",
    name: "Byggmax Drammen",
    location: { lat: 59.7301, lng: 10.196 },
    zone: "NO1",
    address: "Drammen",
  },
  {
    id: "bauhaus-ski",
    chain: "Bauhaus",
    name: "Bauhaus Ski",
    location: { lat: 59.7195, lng: 10.8356 },
    zone: "NO1",
    address: "Ski",
  },
];
