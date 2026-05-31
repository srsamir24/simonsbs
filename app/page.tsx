import { SEED_PRODUCTS } from "@/seed/products";
import { SEED_STORES } from "@/seed/stores";
import Planner from "./Planner";

export default function Page() {
  // Pass plain serializable data to the client component.
  const products = SEED_PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    category: p.category,
  }));
  const stores = SEED_STORES.map((s) => ({ id: s.id, name: s.name, chain: s.chain }));

  return (
    <div className="wrap">
      <header className="hero">
        <h1>
          <span className="pin">🏗️</span> Byggjakt
        </h1>
        <p>
          Velg hva du trenger, så finner vi den <b>billigste totale turen</b> — ikke bare
          laveste pris, men pris + bompenger + drivstoff + kjøretid. Vi deler gjerne handlelista
          på flere butikker i nærheten hvis det lønner seg.
        </p>
      </header>
      <Planner products={products} stores={stores} />
    </div>
  );
}
