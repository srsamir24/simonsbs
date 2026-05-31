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

const ORIGINS: { label: string; loc: LatLng; zone: PriceZone }[] = [
  { label: "Drammen", loc: { lat: 59.744, lng: 10.204 }, zone: "NO1" },
  { label: "Asker", loc: { lat: 59.834, lng: 10.435 }, zone: "NO1" },
  { label: "Oslo vest", loc: { lat: 59.927, lng: 10.69 }, zone: "NO1" },
  { label: "Ski", loc: { lat: 59.72, lng: 10.835 }, zone: "NO1" },
];

const CARS: { label: string; fuelType: FuelType; consumption: number }[] = [
  { label: "Bensin", fuelType: "petrol", consumption: 7 },
  { label: "Diesel", fuelType: "diesel", consumption: 6 },
  { label: "Elbil", fuelType: "ev", consumption: 18 },
];

const fmtKm = (m: number) => `${(m / 1000).toFixed(1)} km`;
const fmtMin = (s: number) => `${Math.round(s / 60)} min`;

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
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

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

  const setQ = (id: string, v: number) => setQty({ ...qty, [id]: Math.max(0, v) });
  const basketCount = Object.values(qty).filter((q) => q > 0).length;

  async function run() {
    setLoading(true);
    const origin = ORIGINS[originIdx]!;
    const car = CARS[carIdx]!;
    const res = await fetch("/api/optimize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        origin: origin.loc,
        originZone: origin.zone,
        basket: Object.entries(qty).map(([productId, q]) => ({ productId, qty: q })),
        car: {
          fuelType: car.fuelType,
          consumptionPer100km: car.consumption,
          fuelPriceOrePerLitre: car.fuelType === "ev" ? undefined : 2150,
        },
        timeValueKrPerHour: timeValue,
      }),
    });
    setResult((await res.json()) as Result);
    setLoading(false);
  }

  return (
    <div className="layout">
      {/* ============ CONTROLS ============ */}
      <div className="sticky">
        <section className="panel">
          <div className="panel-head">
            <h2>Ordreseddel</h2>
            <span className="idx">01 / VARER</span>
          </div>
          <div className="panel-body">
            {products.map((p) => (
              <div className="line" key={p.id}>
                <div>
                  <div className="name">{p.name}</div>
                  <div className="meta">
                    {p.category} · pr. {p.unit}
                  </div>
                </div>
                <div className="stepper">
                  <button onClick={() => setQ(p.id, (qty[p.id] ?? 0) - 1)} aria-label="minus">
                    –
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={qty[p.id] ?? 0}
                    onChange={(e) => setQ(p.id, Number(e.target.value))}
                  />
                  <button onClick={() => setQ(p.id, (qty[p.id] ?? 0) + 1)} aria-label="pluss">
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Din situasjon</h2>
            <span className="idx">02 / TUR</span>
          </div>
          <div className="panel-body">
            <div className="field">
              <label>Utgangspunkt</label>
              <div className="segmented cols-4">
                {ORIGINS.map((o, i) => (
                  <button
                    key={o.label}
                    aria-pressed={originIdx === i}
                    onClick={() => setOriginIdx(i)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Bil</label>
              <div className="segmented cols-3">
                {CARS.map((c, i) => (
                  <button key={c.label} aria-pressed={carIdx === i} onClick={() => setCarIdx(i)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <div className="slider-row">
                <label style={{ margin: 0 }}>Verdi på tiden din</label>
                <span className="val">{timeValue} kr/t</span>
              </div>
              <input
                type="range"
                min={0}
                max={500}
                step={25}
                value={timeValue}
                onChange={(e) => setTimeValue(Number(e.target.value))}
              />
            </div>
            <button className="cta" onClick={run} disabled={loading || basketCount === 0}>
              {loading ? "Regner ut …" : `Finn billigste tur →`}
            </button>
          </div>
        </section>
      </div>

      {/* ============ RESULTS ============ */}
      <div>
        <div className="results-head">
          <h2>Forslag</h2>
          <span className="count">
            {result ? `${result.plans.length} ruter vurdert` : "venter på handleliste"}
          </span>
        </div>

        {!result && (
          <div className="placeholder">
            <span className="big">⊹</span>
            Sett opp ordreseddelen og trykk «Finn billigste tur».
            <br />
            Vi sammenligner alle butikk-kombinasjoner i nærheten.
          </div>
        )}

        {result && result.plans.length === 0 && (
          <div className="placeholder">
            <span className="big">∅</span>
            Ingen butikker i nærheten dekker hele handlelista.
          </div>
        )}

        {result?.plans.map((plan, i) => (
          <PlanCard
            key={i}
            plan={plan}
            rank={i}
            best={i === 0}
            single={result.bestSingleStore}
            storeName={storeName}
            productMap={productMap}
          />
        ))}

        {result && result.unfulfillable.length > 0 && (
          <div className="warn">
            <b>⚠ Ikke tilgjengelig i nærheten:</b>{" "}
            {result.unfulfillable
              .map((l) => productMap.get(l.productId)?.name ?? l.productId)
              .join(", ")}
          </div>
        )}

        {result && (
          <p className="footnote">
            Priser er håndlagte demo-data for Oslo/Drammen. Bompenger, drivstoff og kjøretid er
            estimert med mock-klienter — byttes ut med OSRM, bompengekalkulator og
            hvakosterstrommen.
          </p>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  rank,
  best,
  single,
  storeName,
  productMap,
}: {
  plan: Plan;
  rank: number;
  best: boolean;
  single: Plan | null;
  storeName: (id: string) => string;
  productMap: Map<string, ProductDTO>;
}) {
  // Group assignments by store, following visit order.
  const byStore = plan.visitOrder.map((sid) => ({
    storeId: sid,
    items: plan.assignments.filter((a) => a.storeId === sid),
  }));

  const t = plan.totalOre;
  const pct = (v: number) => `${Math.max(0, (v / t) * 100)}%`;
  const saving = best && single ? single.totalOre - plan.totalOre : 0;

  return (
    <article
      className={`order${best ? " best" : ""}`}
      style={{ animationDelay: `${rank * 70}ms` }}
    >
      <div className="order-top">
        <div className="order-tag">
          {best ? "★ Billigste totalt" : `Alternativ ${rank + 1}`}
          <span className="stops">
            {plan.storeIds.length} butikk{plan.storeIds.length > 1 ? "er" : ""} ·{" "}
            {fmtKm(plan.distanceMeters)} · {fmtMin(plan.durationSeconds)}
          </span>
        </div>
        <div className="order-total">
          <div className="num">{formatKr(plan.totalOre).replace(" kr", "")}</div>
          <div className="unit">KR TOTALT</div>
        </div>
      </div>

      {/* itinerary */}
      <div className="itin">
        <span className="node home">
          <span className="pip" /> Hjem
        </span>
        {plan.visitOrder.map((sid) => (
          <span key={sid} style={{ display: "contents" }}>
            <span className="arrow">→</span>
            <span className="node">
              <span className="pip" /> {storeName(sid)}
            </span>
          </span>
        ))}
        <span className="arrow">→</span>
        <span className="node home">
          <span className="pip" /> Hjem
        </span>
      </div>

      {/* stops */}
      {byStore.map(({ storeId, items }) => (
        <div className="stop" key={storeId}>
          <div className="stop-name">{storeName(storeId)}</div>
          {items.map((a) => (
            <div className="item" key={a.productId}>
              <span>
                <span className="q">{a.qty}×</span> {productMap.get(a.productId)?.name ?? a.productId}
              </span>
              <span className="price">{formatKr(a.lineTotalOre)}</span>
            </div>
          ))}
        </div>
      ))}

      {/* breakdown */}
      <div className="breakdown">
        <div className="bar">
          <span className="seg-mat" style={{ width: pct(plan.materialsOre) }} />
          <span className="seg-toll" style={{ width: pct(plan.tollOre) }} />
          <span className="seg-fuel" style={{ width: pct(plan.fuelOre) }} />
          <span className="seg-time" style={{ width: pct(plan.timeValueOre) }} />
        </div>
        <div className="legend">
          <span className="lg">
            <span className="sw seg-mat" /> Varer <b>{formatKr(plan.materialsOre)}</b>
          </span>
          <span className="lg">
            <span className="sw seg-toll" /> Bom <b>{formatKr(plan.tollOre)}</b>
          </span>
          <span className="lg">
            <span className="sw seg-fuel" /> Drivstoff <b>{formatKr(plan.fuelOre)}</b>
          </span>
          <span className="lg">
            <span className="sw seg-time" /> Tid <b>{formatKr(plan.timeValueOre)}</b>
          </span>
        </div>
      </div>

      {saving > 0 && (
        <div className="savings">
          <span className="stamp">Spart {Math.round(toKr(saving))} kr</span>
          <span className="txt">
            Denne ruta er <b>{formatKr(saving)}</b> billigere enn å handle alt i den billigste
            enkeltbutikken — etter bom, drivstoff og tid.
          </span>
        </div>
      )}
    </article>
  );
}
