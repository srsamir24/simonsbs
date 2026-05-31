import type { Ore } from "./types.js";

/** Convert kroner (possibly fractional) to integer øre. */
export function kr(kroner: number): Ore {
  return Math.round(kroner * 100);
}

/** Convert øre to kroner (number). */
export function toKr(ore: Ore): number {
  return ore / 100;
}

/** Format øre as a Norwegian-style price string, e.g. 419900 -> "4 199,00 kr". */
export function formatKr(ore: Ore): string {
  const kroner = toKr(ore);
  const formatted = new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kroner);
  return `${formatted} kr`;
}
