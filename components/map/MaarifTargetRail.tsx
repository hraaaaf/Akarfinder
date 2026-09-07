"use client";

import { useEffect, useMemo, useState } from "react";

type LivingHereCategory =
  | "education" | "groceries" | "health" | "transport" | "food" | "green_sport"
  | "worship" | "banking" | "parking" | "shopping" | "coast" | "other";

type Anchor = {
  poi_id: string;
  name: string;
  category: LivingHereCategory;
  territorial_wording: string;
};

type NeighborhoodContext = {
  neighborhood: string;
  anchor_count: number;
  categories: LivingHereCategory[];
  anchors: Anchor[];
};

const META: Record<LivingHereCategory, { label: string; glyph: string }> = {
  education: { label: "Écoles", glyph: "É" },
  groceries: { label: "Courses", glyph: "C" },
  health: { label: "Santé", glyph: "+" },
  transport: { label: "Transports", glyph: "T" },
  food: { label: "Restaurants", glyph: "R" },
  green_sport: { label: "Parcs & sport", glyph: "P" },
  worship: { label: "Mosquées", glyph: "M" },
  banking: { label: "Banques", glyph: "B" },
  parking: { label: "Parking", glyph: "P" },
  shopping: { label: "Commerces", glyph: "S" },
  coast: { label: "Côte", glyph: "C" },
  other: { label: "Autres", glyph: "•" },
};

export function MaarifTargetRail() {
  const [context, setContext] = useState<NeighborhoodContext | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "local" | "goods">("overview");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/geo/neighborhood-context?city=casablanca&district=maarif", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`context ${response.status}`);
        const payload = await response.json();
        if (!cancelled && payload?.status === "ok" && payload?.context) {
          setContext(payload.context as NeighborhoodContext);
        }
      })
      .catch(() => { if (!cancelled) setContext(null); });
    return () => { cancelled = true; };
  }, []);

  const nearby = useMemo(() => {
    const anchors = context?.anchors ?? [];
    const picked: Anchor[] = [];
    const seen = new Set<LivingHereCategory>();
    for (const anchor of anchors) {
      if (seen.has(anchor.category)) continue;
      seen.add(anchor.category);
      picked.push(anchor);
      if (picked.length === 4) break;
    }
    return picked;
  }, [context]);

  return (
    <aside className="maarif-target-rail" data-maarif-target-rail>
      <div className="maarif-target-hero" aria-label="Illustration éditoriale du quartier Maârif">
        <div className="maarif-target-hero-sky" />
        <div className="maarif-target-hero-buildings" />
        <span>Illustration éditoriale</span>
      </div>

      <header className="maarif-target-head">
        <div>
          <h1>Maârif</h1>
          <p>Casablanca</p>
        </div>
        <button type="button" aria-label="Ajouter Maârif aux favoris">♡</button>
      </header>

      <nav className="maarif-target-tabs" aria-label="Sections Maârif">
        <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>Vue d’ensemble</button>
        <button className={activeTab === "local" ? "active" : ""} onClick={() => setActiveTab("local")}>Vie locale</button>
        <button disabled title="Prix non publié sans source certifiée">Prix</button>
        <button className={activeTab === "goods" ? "active" : ""} onClick={() => setActiveTab("goods")}>Biens</button>
      </nav>

      <section className="maarif-target-copy">
        <p>
          Explorez Maârif à partir de repères publics sourcés. AkarFinder préfère laisser une information absente plutôt que d’inventer un prix, un score ou une distance.
        </p>
      </section>

      <section className="maarif-target-metrics" aria-label="Indicateurs vérifiés">
        <article>
          <i>⌂</i>
          <div><strong>{context?.anchor_count ?? "—"}</strong><span>Repères sourcés</span></div>
        </article>
        <article>
          <i>◎</i>
          <div><strong>{context?.categories?.length ?? "—"}</strong><span>Catégories observées</span></div>
        </article>
        <article>
          <i>⌖</i>
          <div><strong>Exact</strong><span>Coordonnées requises pour un pin</span></div>
        </article>
      </section>

      <section className="maarif-target-nearby">
        <div className="maarif-target-nearby-head"><h2>À proximité</h2><span>Repères vérifiés</span></div>
        <div className="maarif-target-cards">
          {nearby.length > 0 ? nearby.map((anchor) => (
            <article key={anchor.poi_id}>
              <div className="maarif-target-thumb"><b>{META[anchor.category]?.glyph ?? "•"}</b></div>
              <strong>{META[anchor.category]?.label ?? "Repère"}</strong>
              <small>{anchor.name}</small>
            </article>
          )) : (
            <div className="maarif-target-empty">Contexte quartier indisponible.</div>
          )}
        </div>
      </section>

      <style jsx global>{`
        .maarif-target-rail{position:absolute;z-index:30;top:74px;right:10px;width:372px;max-height:calc(100svh - 150px);overflow:auto;border-radius:24px;background:#fffdf9;box-shadow:0 24px 54px rgb(31 42 41/.18);border:1px solid rgb(255 255 255/.8);color:#172523}
        .maarif-target-hero{position:relative;height:170px;overflow:hidden;border-radius:24px 24px 0 0;background:linear-gradient(180deg,#b8d6e8 0%,#d8e6df 42%,#c6d4c4 43%,#adbca8 100%)}
        .maarif-target-hero-sky{position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,0) 50%)}
        .maarif-target-hero-buildings{position:absolute;left:0;right:0;bottom:0;height:62%;background:linear-gradient(90deg,#d7d0c3 0 12%,transparent 12% 15%,#f0eee9 15% 34%,transparent 34% 37%,#d9d8d3 37% 61%,transparent 61% 64%,#ece9e1 64% 83%,transparent 83% 86%,#d4d0c7 86% 100%);clip-path:polygon(0 28%,12% 22%,12% 100%,15% 100%,15% 12%,34% 18%,34% 100%,37% 100%,37% 6%,61% 0,61% 100%,64% 100%,64% 18%,83% 10%,83% 100%,86% 100%,86% 24%,100% 17%,100% 100%,0 100%)}
        .maarif-target-hero:after{content:"";position:absolute;left:46%;bottom:0;width:46px;height:112px;background:linear-gradient(#2f6946,#285c3d);border-radius:50% 50% 12px 12px;filter:blur(.2px);box-shadow:-24px 36px 0 -14px #2f6946,24px 32px 0 -12px #2f6946}
        .maarif-target-hero>span{position:absolute;right:12px;bottom:10px;padding:5px 8px;border-radius:999px;background:rgb(255 255 255/.88);font-size:8px;font-weight:800;color:#52635e}
        .maarif-target-head{display:flex;align-items:flex-start;justify-content:space-between;padding:22px 24px 14px}.maarif-target-head h1{margin:0;font-size:38px;line-height:.98;letter-spacing:-.05em}.maarif-target-head p{margin:5px 0 0;font-size:18px;color:#68716d}.maarif-target-head button{display:grid;place-items:center;width:42px;height:42px;border-radius:999px;border:1px solid #ded7cd;background:#fff;color:#b3774a;font-size:25px;box-shadow:0 4px 14px rgb(31 42 41/.08)}
        .maarif-target-tabs{display:grid;grid-template-columns:1.3fr 1fr .6fr .65fr;align-items:end;padding:0 24px;border-bottom:1px solid #e8e2d9}.maarif-target-tabs button{min-height:46px;border:0;background:transparent;font-size:12px;font-weight:700;color:#5f6865;position:relative}.maarif-target-tabs button.active{color:#17302e}.maarif-target-tabs button.active:after{content:"";position:absolute;left:7px;right:7px;bottom:-1px;height:3px;border-radius:999px;background:#17302e}.maarif-target-tabs button:disabled{opacity:.38}
        .maarif-target-copy{padding:20px 24px 8px}.maarif-target-copy p{margin:0;font-size:14px;line-height:1.62;color:#47524f}
        .maarif-target-metrics{display:grid;gap:9px;padding:10px 24px 18px}.maarif-target-metrics article{display:flex;align-items:center;gap:14px;min-height:72px;padding:12px 16px;border-radius:16px;background:#f8f6f1;border:1px solid #ece7de}.maarif-target-metrics i{display:grid;place-items:center;width:40px;height:40px;border-radius:999px;background:#e8f3ee;color:#0b6668;font-style:normal;font-size:19px}.maarif-target-metrics strong,.maarif-target-metrics span{display:block}.maarif-target-metrics strong{font-size:18px}.maarif-target-metrics span{margin-top:3px;font-size:11px;color:#747c79}
        .maarif-target-nearby{padding:18px 24px 24px;border-top:1px solid #e8e2d9}.maarif-target-nearby-head{display:flex;align-items:center;justify-content:space-between}.maarif-target-nearby-head h2{margin:0;font-size:18px}.maarif-target-nearby-head span{font-size:10px;font-weight:800;color:#2979d3}.maarif-target-cards{display:grid;grid-auto-flow:column;grid-auto-columns:98px;gap:10px;margin-top:14px;overflow-x:auto;padding-bottom:2px}.maarif-target-cards article{min-width:0}.maarif-target-thumb{display:grid;place-items:center;height:68px;border-radius:14px;background:linear-gradient(145deg,#e7d7bd,#d6e3d6);border:1px solid #e3ddd3}.maarif-target-thumb b{display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:#fff;color:#0b6668;font-size:12px}.maarif-target-cards strong{display:block;margin-top:7px;font-size:11px}.maarif-target-cards small{display:block;margin-top:2px;font-size:8px;line-height:1.25;color:#737b78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.maarif-target-empty{font-size:10px;color:#737b78}
        [data-vivre-ici-cesium-spike-page] .cesium-spike-rail{visibility:hidden;pointer-events:none}
        @media(max-width:1023px){.maarif-target-rail{left:12px;right:12px;top:auto;bottom:16px;width:auto;max-height:42svh;border-radius:26px}.maarif-target-hero{display:none}.maarif-target-head{padding:15px 16px 10px}.maarif-target-head h1{font-size:28px}.maarif-target-head p{font-size:13px}.maarif-target-head button{width:36px;height:36px}.maarif-target-tabs{padding:0 12px}.maarif-target-tabs button{min-height:38px;font-size:10px}.maarif-target-copy{padding:12px 16px 2px}.maarif-target-copy p{font-size:10px;line-height:1.45}.maarif-target-metrics{grid-template-columns:repeat(3,1fr);gap:6px;padding:8px 12px 12px}.maarif-target-metrics article{display:block;min-height:64px;padding:9px}.maarif-target-metrics i{width:26px;height:26px;font-size:12px}.maarif-target-metrics strong{margin-top:6px;font-size:12px}.maarif-target-metrics span{font-size:7px}.maarif-target-nearby{display:none}}
      `}</style>
    </aside>
  );
}
