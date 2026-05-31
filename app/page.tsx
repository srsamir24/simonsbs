import { SEED_PRODUCTS } from "@/seed/products";
import { SEED_STORES } from "@/seed/stores";
import Planner from "./Planner";

export default function Page() {
  const products = SEED_PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    category: p.category,
  }));
  const stores = SEED_STORES.map((s) => ({
    id: s.id,
    name: s.name,
    chain: s.chain,
    address: s.address ?? "",
  }));

  return (
    <div className="shell">
      <div className="topbar">
        <span>
          <span className="dot">◆</span> BYGGJAKT
        </span>
        <span>BYGGEVARER · PRISJAKT FOR HÅNDVERKERE · NO1</span>
        <span>EST. 2026 · NORGE</span>
      </div>

      <header className="hero">
        <div className="kicker">Total turkostnad — ikke bare laveste pris</div>
        <h1>
          Bygg<span className="slash">/</span>jakt
        </h1>
        <p className="lede">
          Velg hva du trenger, så regner vi ut den <b>billigste totale turen</b> — pris pluss
          bompenger, drivstoff og kjøretid. Vi deler gjerne handlelista på flere butikker i
          nærheten når det faktisk lønner seg.
        </p>
        <div className="specstamp">
          REGION · <b>OSLO / VIKEN</b>
          <br />
          SONE · <b>NO1</b>
          <br />
          BUTIKKER · <b>{stores.length}</b>
          <br />
          VARER · <b>{products.length}</b>
        </div>
      </header>

      <Planner products={products} stores={stores} />
    </div>
  );
}
