import type { CarProfile, Meters, Ore } from "../domain/types.js";

/**
 * Energy/fuel cost of driving `distanceMeters`, in øre.
 *
 *   petrol/diesel:  litres = consumption(l/100km) * km/100 ;  cost = litres * pricePerLitre
 *   ev:             kWh    = consumption(kWh/100km) * km/100 ; cost = kWh    * pricePerKwh
 *
 * For EV, the energy price must be supplied (either on the car profile, or resolved from the
 * strøm price source by the caller and passed in via `evPriceOrePerKwh`).
 */
export function fuelCostOre(
  distanceMeters: Meters,
  car: CarProfile,
  evPriceOrePerKwh?: Ore,
): Ore {
  const km = distanceMeters / 1000;
  const unitsPer100 = car.consumptionPer100km;
  const units = (unitsPer100 * km) / 100;

  if (car.fuelType === "ev") {
    const price = car.energyPriceOrePerKwh ?? evPriceOrePerKwh;
    if (price == null) {
      throw new Error("EV fuel cost requires an energy price (øre/kWh).");
    }
    return Math.round(units * price);
  }

  if (car.fuelPriceOrePerLitre == null) {
    throw new Error("Petrol/diesel fuel cost requires fuelPriceOrePerLitre (øre/litre).");
  }
  return Math.round(units * car.fuelPriceOrePerLitre);
}
