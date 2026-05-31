import type { Store } from "../lib/domain/types.js";

/**
 * Phase 1 seed stores — REAL building-material outlets in the greater Oslo / Viken area, with
 * their real branch names and street addresses (sourced from each chain's store finder).
 * Coordinates are geocoded approximately to the address/area (good to ~within a few hundred
 * metres) — fine for demo distances; swap for exact Kartverket geocoding later. All in zone NO1.
 *
 * Prices (seed/offers.ts) remain hand-generated demo data, NOT scraped — see ARCHITECTURE §3.
 */
export const SEED_STORES: Store[] = [
  // ---- Maxbo ----
  {
    id: "maxbo-vaekero",
    chain: "Maxbo",
    name: "Maxbo Vækerø",
    address: "Drammensveien 230, 0277 Oslo",
    location: { lat: 59.9165, lng: 10.665 },
    zone: "NO1",
  },
  {
    id: "maxbo-baerums-verk",
    chain: "Maxbo",
    name: "Maxbo Bærums Verk",
    address: "Lommedalsveien 214, 1354 Bærums Verk",
    location: { lat: 59.9515, lng: 10.496 },
    zone: "NO1",
  },
  {
    id: "maxbo-asker",
    chain: "Maxbo",
    name: "Maxbo Asker",
    address: "Lensmannslia 22, 1386 Asker",
    location: { lat: 59.836, lng: 10.456 },
    zone: "NO1",
  },
  {
    id: "maxbo-lier",
    chain: "Maxbo",
    name: "Maxbo Lier",
    address: "Husebysletta 5, 3400 Lier",
    location: { lat: 59.792, lng: 10.256 },
    zone: "NO1",
  },
  // ---- Montér ----
  {
    id: "monter-lillestrom",
    chain: "Montér",
    name: "Montér Lillestrøm",
    address: "Isakveien 22, 2004 Lillestrøm",
    location: { lat: 59.962, lng: 11.07 },
    zone: "NO1",
  },
  {
    id: "monter-orring",
    chain: "Montér",
    name: "Montér Orring",
    address: "Slimeveien 4, 1275 Oslo",
    location: { lat: 59.809, lng: 10.839 },
    zone: "NO1",
  },
  {
    id: "monter-ostre-aker",
    chain: "Montér",
    name: "Montér Østre Aker",
    address: "Østre Aker vei 253, 0976 Oslo",
    location: { lat: 59.948, lng: 10.853 },
    zone: "NO1",
  },
  {
    id: "monter-lier",
    chain: "Montér",
    name: "Montér Lier",
    address: "Gjellebekkstubben 8, 3420 Lierskogen",
    location: { lat: 59.788, lng: 10.278 },
    zone: "NO1",
  },
  // ---- Byggmax ----
  {
    id: "byggmax-abildso",
    chain: "Byggmax",
    name: "Byggmax Abildsø",
    address: "Enebakkveien 309, 1188 Oslo",
    location: { lat: 59.87, lng: 10.82 },
    zone: "NO1",
  },
  {
    id: "byggmax-drammen",
    chain: "Byggmax",
    name: "Byggmax Drammen",
    address: "Dråpen 19, 3036 Drammen",
    location: { lat: 59.739, lng: 10.223 },
    zone: "NO1",
  },
  // ---- Bauhaus ----
  {
    id: "bauhaus-liertoppen",
    chain: "Bauhaus",
    name: "Bauhaus Liertoppen",
    address: "Gjellebekkveien 1, 3420 Lierskogen",
    location: { lat: 59.787, lng: 10.286 },
    zone: "NO1",
  },
  {
    id: "bauhaus-vestby",
    chain: "Bauhaus",
    name: "Bauhaus Vestby",
    address: "Verpetveien 38, 1540 Vestby",
    location: { lat: 59.595, lng: 10.79 },
    zone: "NO1",
  },
];
