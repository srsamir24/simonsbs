"use client";

import { useMemo, useState } from "react";
import { formatKr, toKr } from "@/lib/domain/money";
import type { FuelType, LatLng, PriceZone } from "@/lib/domain/types";

interface ProductDTO {
  id: string;
  name: string;
  unit: string;
  category: string;
}
interface StoreDTO {
  id: string;
  name: string;
  chain: string;
}

interface Assignment {
  productId: string;
  qty: number;
  storeId: string;
  unitPriceOre: number;
  lineTotalOre: number;
}
interface Plan {
  storeIds: string[];
  visitOrder: string[];
  assignments: Assignment[];
  materialsOre: number;
  tollOre: number;
  fuelOre: number;
  timeValueOre: number;
  distanceMeters: number;
  durationSeconds: number;
  totalOre: number;
}
interface Result {
  plans: Plan[];
  bestSingleStore: Plan | null;
  unfulfillable: { productId: string; qty: number }[];
}

// A few origin presets in the greater Oslo/Drammen area (zone NO1).
const ORIGINS: { label: string; loc: LatLng; zone: PriceZone }[] = [
  { label: "Drammen sentrum", loc: { lat: 59.744, lng: 10.204 }, zone: "NO1" },
  { label: "Asker", loc: { lat: 59.834, lng: 10.435 }, zone: "NO1" },
  { label: "Oslo vest", loc: { lat: 59.927, lng: 10.69 }, zone: "NO1" },
  { label: "Ski", loc: { lat: 59.72, lng: 10.835 }, zone: "NO1" },
];

const CARS: { label: string; fuelType: FuelType; consumption: number }[] = [
  { label: "Bensin (0,7 l/mil)", fuelType: "petrol", consumption: 7 },
  { label: "Diesel (0,6 l/mil)", fuelType: "diesel", consumption: 6 },
  { label: "Elbil (1,8 kWh/mil)", fuelType: "ev", consumption: 18 },
];

export default function Planner({
  products,
  stores,
}: {
  products: ProductDTO[];
  stores: StoreDTO[];
}) {
  const storeName = useMemo(() => {
    const m = new Map(stores.map((s) => [s.id, s.name]));
    return (id: string) => m.get(id) ?? id;
  }, [stores]);
  const productName = useMemo(() => {
    const m = new Map(products.map((p) => [p.id, p]));
    return (id: string) => m.get(id);
  }, [products]);

  const [qty, setQty] = useState<Record<string, number>>(() => ({
    "lumber-48x98-impr": 100,
    "gips-13mm-standard": 10,
    "sement-25kg": 4,
  }));
  const [originIdx, setOriginIdx] = useState(0);
  const [carIdx, setCarIdx] = useState(0);
  const [timeValue, setTimeValue] = useState(150);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const basketCount = Object.values(qty).filter((q) => q > 0).length;

  async function run() {
    setLoading(true);
    const origin = ORIGINS[originIdx]!;
    const car = CARS[carIdx]!;
    const body = {
      origin: origin.loc,
      originZone: origin.zone,
      basket: Object.entries(qty).map(([productId, q]) => ({ productId, qty: q })),
      car: {
        fuelType: car.fuelType,
        consumptionPer100km: car.consumption,
        fuelPriceOrePerLitre: car.fuelType === "ev" ? undefined : 2150, // 21,50 kr/l
      },
      timeValueKrPerHour: timeValue,
    };
    const res = await fetch("/api/optimize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setResult((await res.json()) as Result);
    setLoading(false);
  }

  return (
    <div className="grid">
      {/* ---- Controls ---- */}
      <div>
        <div className="card">
          <h2>Handleliste</h2>
          {products.map((p) => (
            <div className="row" key={p.id}>
              <div>
                <div className="label">{p.name}</div>
                <div className="sub">
                  {p.category} · pris per {p.unit}
                </div>
              </div>
              <input
                type="number"
                min={0}
                value={qty[p.id] ?? 0}
                onChange={(e) =>
                  setQty({ ...qty, [p.id]: Math.max(0, Number(e.target.value)) })
                }
              />
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h2>Din situasjon</h2>
          <div className="field">
            <label>Utgangspunkt (hjem)</label>
            <select value={originIdx} onChange={(e) => setOriginIdx(Number(e.target.value))}>
              {ORIGINS.map((o, i) => (
                <option key={o.label} value={i}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Bil</label>
            <select value={carIdx} onChange={(e) => setCarIdx(Number(e.target.value))}>
              {CARS.map((c, i) => (
                <option key={c.label} value={i}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Verdi på tiden din: {timeValue} kr/time</label>
            <input
              type="range"
              min={0}
              max={500}
              step={25}
              value={timeValue}
              style={{ width: "100%" }}
              onChange={(e) => setTimeValue(Number(e.target.value))}
            />
          </div>
          <button className="go" onClick={run} disabled={loading || basketCount === 0}>
            {loading ? "Regner ut …" : `Finn billigste tur (${basketCount} varer)`}
          </button>
        </div>
      </div>

      {/* ---- Results ---- */}
      <div>
        {!result && (
          <div className="empty">
            Velg varer og trykk <b>Finn billigste tur</b>.
          </div>
        )}

        {result && result.plans.length === 0 && (
          <div className="empty">Fant ingen butikker som dekker handlelista i nærheten.</div>
        )}

        {result?.plans.map((plan, i) => {
          const isBest = i === 0;
          const saving =
            result.bestSingleStore && isBest
              ? result.bestSingleStore.totalOre - plan.totalOre
              : 0;
          return (
            <div className={`plan${isBest ? " best" : ""}`} key={i}>
              <div className="planhead">
                <span className="tag">
                  {isBest
                    ? "🏆 Billigste totalt"
                    : `Alternativ ${i + 1} · ${plan.storeIds.length} butikk(er)`}
                </span>
                <span className="total">{formatKr(plan.totalOre)}</span>
              </div>
              <div className="route">
                Rute: <b>{plan.visitOrder.map(storeName).join("  →  ")}</b>
              </div>
              {plan.assignments.map((a) => {
                const p = productName(a.productId);
                return (
                  <div className="assign" key={a.productId}>
                    <span>
                      {a.qty} × {p?.name ?? a.productId} ·{" "}
                      <span className="store">{storeName(a.storeId)}</span>
                    </span>
                    <span>{formatKr(a.lineTotalOre)}</span>
                  </div>
                );
              })}
              <div className="breakdown">
                <span>
                  Varer <b>{formatKr(plan.materialsOre)}</b>
                </span>
                <span>
                  Bompenger <b>{formatKr(plan.tollOre)}</b>
                </span>
                <span>
                  Drivstoff <b>{formatKr(plan.fuelOre)}</b> ·{" "}
                  {(plan.distanceMeters / 1000).toFixed(1)} km
                </span>
                <span>
                  Tid <b>{formatKr(plan.timeValueOre)}</b> ·{" "}
                  {(plan.durationSeconds / 60).toFixed(0)} min
                </span>
              </div>
              {saving > 0 && (
                <div className="save">
                  💰 Sparer {formatKr(saving)} vs. å handle alt i den billigste enkeltbutikken (
                  {((toKr(saving) / toKr(result!.bestSingleStore!.totalOre)) * 100).toFixed(1)} %)
                </div>
              )}
            </div>
          );
        })}

        {result && result.unfulfillable.length > 0 && (
          <div className="warn">
            ⚠️ Ingen butikk i nærheten har:{" "}
            {result.unfulfillable.map((l) => productName(l.productId)?.name ?? l.productId).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
