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

const META: Record<LivingHereCategory, { label: string; glyph: string; tone: string }> = {
  education: { label: "Écoles", glyph: "É", tone: "#dcebf5" },
  groceries: { label: "Courses", glyph: "C", tone: "#eee7f8" },
  health: { label: "Santé", glyph: "+", tone: "#f5e3df" },
  transport: { label: "Transports", glyph: "T", tone: "#dcebf5" },
  food: { label: "Restaurants", glyph: "R", tone: "#f2e5d4" },
  green_sport: { label: "Parcs & sport", glyph: "P", tone: "#dfead8" },
  worship: { label: "Mosquées", glyph: "M", tone: "#dcebe5" },
  banking: { label: "Banques", glyph: "B", tone: "#e7e9ea" },
  parking: { label: "Parking", glyph: "P", tone: "#dfe7ee" },
  shopping: { label: "Commerces", glyph: "S", tone: "#ebe3f5" },
  coast: { label: "Côte", glyph: "C", tone: "#dcecf3" },
  other: { label: "Autres", glyph: "•", tone: "#e8e7e2" },
};

const MAARIF_HERO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Parfumerie_jura%2C_Ma%C3%A2rif%2C_Casablanca.jpg/1280px-Parfumerie_jura%2C_Ma%C3%A2rif%2C_Casablanca.jpg";
const MAARIF_HERO_SOURCE =
  "https://commons.wikimedia.org/wiki/File:Parfumerie_jura,_Ma%C3%A2rif,_Casablanca.jpg";

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
      if (picked.length === 2) break;
    }
    return picked;
  }, [context]);

  return (
    <aside className="maarif-target-rail" data-maarif-target-rail>
      <figure className="maarif-target-hero">
        <img
          src={MAARIF_HERO}
          alt="Place publique derrière la rue Abou Zaid Addadoussi à Maârif, Casablanca"
        />
        <div className="maarif-target-hero-shade" />
        <figcaption>
          <span>Maârif · photo 2013</span>
          <a href={MAARIF_HERO_SOURCE} target="_blank" rel="noreferrer">
            Sam Nabi · CC BY-SA 2.0
          </a>
        </figcaption>
      </figure>

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
          Découvrez Maârif à partir des repères publics actuellement sourcés sur la carte. Les indicateurs non vérifiés restent volontairement absents.
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
          <div><strong>Exact</strong><span>Pins uniquement avec coordonnées exactes</span></div>
        </article>
      </section>

      <section className="maarif-target-nearby">
        <div className="maarif-target-nearby-head"><h2>À proximité</h2><span>Repères vérifiés</span></div>
        <div className="maarif-target-cards">
          {nearby.length > 0 ? nearby.map((anchor) => {
            const meta = META[anchor.category] ?? META.other;
            return (
              <article key={anchor.poi_id}>
                <div className="maarif-target-thumb" style={{ background: meta.tone }}>
                  <span className="maarif-target-thumb-mark">{meta.glyph}</span>
                  <em>{meta.label}</em>
                </div>
                <strong>{meta.label}</strong>
                <small>{anchor.name}</small>
                <p>{anchor.territorial_wording}</p>
              </article>
            );
          }) : (
            <div className="maarif-target-empty">Contexte quartier indisponible.</div>
          )}
        </div>
      </section>

      <style jsx global>{`
        .maarif-target-rail{position:absolute;z-index:30;top:74px;right:10px;width:372px;max-height:calc(100svh - 170px);overflow:hidden;border-radius:22px;background:#fffdf9;box-shadow:0 26px 60px rgb(31 42 41/.16);border:1px solid rgb(255 255 255/.88);color:#1d2926}
        .maarif-target-hero{position:relative;height:158px;margin:0;overflow:hidden;border-radius:22px 22px 0 0;background:#d7e3e1}.maarif-target-hero img{width:100%;height:100%;display:block;object-fit:cover;object-position:center 53%;filter:saturate(.94) contrast(.96) brightness(1.05)}.maarif-target-hero-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(22,37,35,0),rgba(22,37,35,.12))}.maarif-target-hero figcaption{position:absolute;left:12px;right:12px;bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:8px}.maarif-target-hero figcaption span,.maarif-target-hero figcaption a{padding:5px 8px;border-radius:999px;background:rgb(255 255 255/.92);font-size:7px;font-weight:800;color:#47544f;text-decoration:none;white-space:nowrap}.maarif-target-hero figcaption a{font-weight:650;opacity:.9}
        .maarif-target-head{display:flex;align-items:flex-start;justify-content:space-between;padding:17px 22px 10px}.maarif-target-head h1{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:34px;font-weight:760;line-height:.98;letter-spacing:-.045em}.maarif-target-head p{margin:6px 0 0;font-size:15px;color:#737a76}.maarif-target-head button{display:grid;place-items:center;width:40px;height:40px;border-radius:999px;border:1px solid #ded8cf;background:#fff;color:#b67746;font-size:23px;box-shadow:0 5px 16px rgb(31 42 41/.07)}
        .maarif-target-tabs{display:grid;grid-template-columns:1.35fr 1fr .55fr .65fr;align-items:end;padding:0 22px;border-bottom:1px solid #e8e2d9}.maarif-target-tabs button{min-height:42px;border:0;background:transparent;font-size:10px;font-weight:760;color:#626b67;position:relative;white-space:nowrap}.maarif-target-tabs button.active{color:#17302e}.maarif-target-tabs button.active:after{content:"";position:absolute;left:6px;right:6px;bottom:-1px;height:3px;border-radius:999px;background:#17302e}.maarif-target-tabs button:disabled{opacity:.34}
        .maarif-target-copy{padding:15px 22px 8px}.maarif-target-copy p{margin:0;font-size:12px;line-height:1.48;color:#58625e}
        .maarif-target-metrics{display:grid;gap:7px;padding:7px 22px 14px}.maarif-target-metrics article{display:flex;align-items:center;gap:12px;min-height:55px;padding:9px 12px;border-radius:14px;background:#f8f5ef;border:1px solid #ece5db}.maarif-target-metrics i{display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px;border-radius:999px;background:#e7f1ed;color:#0b6668;font-style:normal;font-size:14px}.maarif-target-metrics strong,.maarif-target-metrics span{display:block}.maarif-target-metrics strong{font-size:16px;line-height:1}.maarif-target-metrics span{margin-top:4px;font-size:9px;line-height:1.25;color:#7b817d}
        .maarif-target-nearby{padding:14px 22px 18px;border-top:1px solid #e8e2d9}.maarif-target-nearby-head{display:flex;align-items:center;justify-content:space-between}.maarif-target-nearby-head h2{margin:0;font-size:18px;font-weight:720;letter-spacing:-.025em}.maarif-target-nearby-head span{font-size:8px;font-weight:850;color:#2979d3}.maarif-target-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-top:11px}.maarif-target-cards article{min-width:0}.maarif-target-thumb{position:relative;height:70px;overflow:hidden;border-radius:13px;border:1px solid #e1ddd4}.maarif-target-thumb:after{content:"";position:absolute;inset:auto -18px -28px 28%;height:62px;border-radius:50%;background:rgb(255 255 255/.38);transform:rotate(-12deg)}.maarif-target-thumb-mark{position:absolute;z-index:1;left:12px;top:11px;display:grid;place-items:center;width:29px;height:29px;border-radius:999px;background:rgb(255 255 255/.92);font-size:11px;font-weight:850;color:#0b6668}.maarif-target-thumb em{position:absolute;z-index:1;left:11px;bottom:8px;font-style:normal;font-size:9px;font-weight:850;color:#29423d}.maarif-target-cards>article>strong{display:block;margin-top:7px;font-size:10px}.maarif-target-cards small{display:block;margin-top:3px;font-size:8px;line-height:1.28;color:#5f6965;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.maarif-target-cards p{margin:4px 0 0;font-size:7px;line-height:1.25;color:#89908c}.maarif-target-empty{font-size:9px;color:#737b78}
        [data-vivre-ici-cesium-spike-page] .cesium-spike-rail{visibility:hidden;pointer-events:none}
        @media(max-width:1023px){.maarif-target-rail{left:12px;right:12px;top:auto;bottom:16px;width:auto;max-height:42svh;border-radius:26px}.maarif-target-hero{display:none}.maarif-target-head{padding:15px 16px 10px}.maarif-target-head h1{font-size:28px}.maarif-target-head p{font-size:13px}.maarif-target-head button{width:36px;height:36px}.maarif-target-tabs{padding:0 12px}.maarif-target-tabs button{min-height:38px;font-size:10px}.maarif-target-copy{padding:12px 16px 2px}.maarif-target-copy p{font-size:10px;line-height:1.45}.maarif-target-metrics{grid-template-columns:repeat(3,1fr);gap:6px;padding:8px 12px 12px}.maarif-target-metrics article{display:block;min-height:64px;padding:9px}.maarif-target-metrics i{width:26px;height:26px;font-size:12px}.maarif-target-metrics strong{margin-top:6px;font-size:12px}.maarif-target-metrics span{font-size:7px}.maarif-target-nearby{display:none}}
      `}</style>
    </aside>
  );
}
