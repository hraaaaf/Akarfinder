"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  MapPin,
  Search,
  Trees,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resolveCityEntity, resolveNeighborhoodEntity } from "@/lib/geo/geo-entity-registry";
import type { NeighborhoodContextReadModelV1 } from "@/lib/neighborhood-context/read-model";
import { mapPoiCategoryLabel } from "@/lib/neighborhood-context/map-poi-presentation";
import {
  buildMapSearchHref,
  mapNavigationStateFromUrlSearchParams,
} from "@/lib/map/map-navigation-state";

const MAARIF_HERO = {
  src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Parfumerie_jura%2C_Ma%C3%A2rif%2C_Casablanca.jpg/1280px-Parfumerie_jura%2C_Ma%C3%A2rif%2C_Casablanca.jpg",
  alt: "Place publique à Maârif, Casablanca",
  credit: "Sam Nabi · CC BY-SA 2.0",
  source: "https://commons.wikimedia.org/wiki/File:Parfumerie_jura,_Ma%C3%A2rif,_Casablanca.jpg",
} as const;

type ContextPayload =
  | { status: "ok"; context: NeighborhoodContextReadModelV1 }
  | { status: "not_found" | "invalid_request" | "unavailable"; [key: string]: unknown };

type Tab = "market" | "local" | "mobility";

export function MaarifTargetRail() {
  const searchParams = useSearchParams();
  const navigationState = useMemo(
    () => mapNavigationStateFromUrlSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const cityEntity = navigationState.city === "all" ? null : resolveCityEntity(navigationState.city);
  const districtEntity = cityEntity && navigationState.district
    ? resolveNeighborhoodEntity(cityEntity.canonical_name, navigationState.district)
    : null;
  const searchHref = buildMapSearchHref(navigationState);
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [context, setContext] = useState<NeighborhoodContextReadModelV1 | null>(null);

  useEffect(() => {
    setContext(null);
    if (!cityEntity || !districtEntity) return;

    const controller = new AbortController();
    void fetch(
      `/api/geo/neighborhood-context?city=${encodeURIComponent(cityEntity.slug)}&district=${encodeURIComponent(districtEntity.slug)}`,
      { credentials: "same-origin", cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const payload = await response.json() as ContextPayload;
        if (!response.ok || payload.status !== "ok") return null;
        return payload.context;
      })
      .then((nextContext) => {
        if (!controller.signal.aborted) setContext(nextContext);
      })
      .catch(() => {
        if (!controller.signal.aborted) setContext(null);
      });

    return () => controller.abort();
  }, [cityEntity?.slug, districtEntity?.slug]);

  const anchors = context?.anchors.slice(0, 4) ?? [];
  const placeCards = anchors.slice(0, 3);
  const categoryCount = context
    ? new Set(context.categories.map((category) => mapPoiCategoryLabel(category))).size
    : null;

  return (
    <aside
      className="maarif-target-rail"
      data-maarif-target-rail
      data-vivre-ici-tab={activeTab}
      aria-label="Maârif — quartier, vie locale et biens"
    >
      <figure className="maarif-target-hero">
        <img src={MAARIF_HERO.src} alt={MAARIF_HERO.alt} />
        <div className="maarif-target-hero-shade" aria-hidden="true" />
        <figcaption>
          <span>Maârif · Casablanca</span>
          <a href={MAARIF_HERO.source} target="_blank" rel="noreferrer">{MAARIF_HERO.credit}</a>
        </figcaption>
      </figure>

      <div className="maarif-target-body">
        <header className="maarif-target-heading">
          <p className="maarif-target-city"><MapPin size={13} aria-hidden="true" /> Casablanca</p>
          <h1>Maârif</h1>
          <p className="maarif-target-tagline">Vivre, comprendre, puis choisir</p>
          <p className="maarif-target-copy">
            Explorez Maârif à travers ses repères publics sourcés, sa vie locale et les biens disponibles,
            sans inventer de précision géographique.
          </p>
        </header>

        <nav className="maarif-target-tabs" aria-label="Explorer Maârif">
          <button type="button" aria-current={activeTab === "market" ? "page" : undefined} onClick={() => setActiveTab("market")}>
            <BarChart3 size={16} aria-hidden="true" /> Marché
          </button>
          <button type="button" aria-current={activeTab === "local" ? "page" : undefined} onClick={() => setActiveTab("local")}>
            <Users size={16} aria-hidden="true" /> Vie locale
          </button>
          <button type="button" aria-current={activeTab === "mobility" ? "page" : undefined} onClick={() => setActiveTab("mobility")}>
            <ArrowRight size={16} aria-hidden="true" /> Mobilité
          </button>
        </nav>

        {activeTab === "market" ? (
          <section className="maarif-target-market" aria-label="Aperçu du marché immobilier">
            <div className="maarif-target-section-title">
              <p>APERÇU DU MARCHÉ IMMOBILIER</p>
              <span>Données publiées uniquement si sourcées</span>
            </div>
            <div className="maarif-target-stat-grid">
              <div><strong>—</strong><span>Prix moyen</span><small>Non publié</small></div>
              <div><strong>—</strong><span>Évolution</span><small>Non publiée</small></div>
              <div><strong>{context?.anchor_count ?? "—"}</strong><span>Repères sourcés</span><small>Vie locale</small></div>
              <div><strong>{categoryCount ?? "—"}</strong><span>Catégories</span><small>Observées</small></div>
            </div>
          </section>
        ) : null}

        {activeTab === "local" ? (
          <section className="maarif-target-local" aria-label="Vie locale sourcée">
            <div className="maarif-target-section-title">
              <p>REPÈRES DE VIE LOCALE</p>
              <span>Positions issues du contexte sourcé</span>
            </div>
            <div className="maarif-target-local-list">
              {anchors.length ? anchors.map((anchor) => (
                <article key={anchor.poi_id}>
                  <span className="maarif-target-local-icon"><Trees size={15} aria-hidden="true" /></span>
                  <div>
                    <strong>{anchor.name}</strong>
                    <small>{mapPoiCategoryLabel(anchor.category)} · {anchor.territorial_wording}</small>
                  </div>
                </article>
              )) : <p className="maarif-target-empty">Aucun repère frais certifié disponible.</p>}
            </div>
          </section>
        ) : null}

        {activeTab === "mobility" ? (
          <section className="maarif-target-mobility" aria-label="Mobilité">
            <div className="maarif-target-section-title">
              <p>MOBILITÉ</p>
              <span>Pas de métrique inventée</span>
            </div>
            <p>
              Les données de mobilité détaillées ne sont pas publiées ici sans source dédiée.
              La carte conserve les routes et repères géographiques réels.
            </p>
          </section>
        ) : null}

        <div className="maarif-target-actions">
          <Link href={searchHref} className="maarif-target-primary-action">
            <Search size={17} aria-hidden="true" />
            <span>Voir les biens disponibles à Maârif</span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          {districtEntity?.seo_eligible && cityEntity ? (
            <Link href={`/quartiers/${cityEntity.slug}/${districtEntity.slug}`} className="maarif-target-secondary-action">
              <Building2 size={15} aria-hidden="true" />
              Voir la fiche quartier
            </Link>
          ) : null}
        </div>

        <section className="maarif-target-places" aria-label="Lieux d’intérêt">
          <div className="maarif-target-places-heading">
            <h2>Lieux d’intérêt</h2>
            <button type="button" onClick={() => setActiveTab("local")}>Voir tout <ArrowRight size={13} aria-hidden="true" /></button>
          </div>
          <div className="maarif-target-place-grid">
            {placeCards.length ? placeCards.map((anchor) => (
              <article key={anchor.poi_id}>
                <div className="maarif-target-place-visual" aria-hidden="true"><MapPin size={20} /></div>
                <strong>{anchor.name}</strong>
                <small>{mapPoiCategoryLabel(anchor.category)}</small>
              </article>
            )) : <p className="maarif-target-empty">Chargement des repères…</p>}
          </div>
        </section>
      </div>

      <style jsx global>{`
        .maarif-target-rail{grid-column:2;height:100%;min-width:0;overflow-y:auto;background:#fff;border-left:1px solid #e3eaf2;color:#08264d;scrollbar-width:thin}
        .maarif-target-hero{position:relative;height:178px;margin:0;overflow:hidden;background:#dbe8ee}
        .maarif-target-hero img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 54%}
        .maarif-target-hero-shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 48%,rgb(4 25 48/.38))}
        .maarif-target-hero figcaption{position:absolute;left:16px;right:16px;bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;color:#fff;font-size:8px;font-weight:700}
        .maarif-target-hero figcaption span,.maarif-target-hero figcaption a{padding:5px 8px;border-radius:999px;background:rgb(5 28 54/.72);color:#fff;text-decoration:none;backdrop-filter:blur(7px)}
        .maarif-target-body{padding:20px 22px 24px}
        .maarif-target-city{display:flex;align-items:center;gap:5px;margin:0 0 8px;color:#1477f8;font-size:12px;font-weight:800}
        .maarif-target-heading h1{margin:0;color:#062b55;font-size:40px;font-weight:820;line-height:.95;letter-spacing:-.045em}
        .maarif-target-tagline{margin:8px 0 0;color:#26476c;font-size:16px;font-weight:650}
        .maarif-target-copy{margin:9px 0 0;color:#526b87;font-size:12px;line-height:1.45}
        .maarif-target-tabs{display:grid;grid-template-columns:repeat(3,1fr);margin-top:18px;border-bottom:1px solid #dfe7f1}
        .maarif-target-tabs button{position:relative;display:flex;min-height:46px;align-items:center;justify-content:center;gap:7px;border:0;background:transparent;color:#183b64;font-size:11px;font-weight:720;cursor:pointer}
        .maarif-target-tabs button[aria-current="page"]{color:#0874f9}
        .maarif-target-tabs button[aria-current="page"]:after{content:"";position:absolute;left:8px;right:8px;bottom:-1px;height:2px;border-radius:999px;background:#0874f9}
        .maarif-target-market,.maarif-target-local,.maarif-target-mobility{margin-top:16px;border:1px solid #e0e8f2;border-radius:18px;background:#fff;box-shadow:0 8px 24px rgb(7 36 70/.05)}
        .maarif-target-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px 10px}
        .maarif-target-section-title p{margin:0;color:#506986;font-size:9px;font-weight:850;letter-spacing:.13em}
        .maarif-target-section-title span{color:#8798ac;font-size:7px;font-weight:650;text-align:right}
        .maarif-target-stat-grid{display:grid;grid-template-columns:repeat(4,1fr);padding:0 8px 12px}
        .maarif-target-stat-grid div{min-width:0;padding:8px 8px;text-align:center;border-right:1px solid #e8eef5}
        .maarif-target-stat-grid div:last-child{border-right:0}
        .maarif-target-stat-grid strong{display:block;color:#062b55;font-size:20px;font-weight:850;line-height:1}
        .maarif-target-stat-grid span{display:block;margin-top:5px;color:#163d68;font-size:8px;font-weight:750}
        .maarif-target-stat-grid small{display:block;margin-top:3px;color:#8999ab;font-size:7px}
        .maarif-target-local{padding-bottom:9px}
        .maarif-target-local-list{display:grid;gap:7px;padding:0 12px 4px}
        .maarif-target-local-list article{display:flex;align-items:center;gap:10px;padding:9px;border-radius:12px;background:#f6f9fc}
        .maarif-target-local-icon{display:grid;width:30px;height:30px;place-items:center;flex:0 0 30px;border-radius:999px;background:#e7f2ff;color:#0874f9}
        .maarif-target-local-list strong,.maarif-target-local-list small{display:block}
        .maarif-target-local-list strong{font-size:10px;color:#13385f}
        .maarif-target-local-list small{margin-top:3px;font-size:7.5px;color:#75879b}
        .maarif-target-mobility{padding-bottom:14px}
        .maarif-target-mobility>p{margin:0;padding:0 15px;color:#617890;font-size:10px;line-height:1.45}
        .maarif-target-actions{display:grid;gap:8px;margin-top:16px}
        .maarif-target-primary-action,.maarif-target-secondary-action{display:flex;min-height:48px;align-items:center;justify-content:center;gap:9px;border-radius:14px;text-decoration:none;font-size:11px;font-weight:800}
        .maarif-target-primary-action{background:#062b55;color:#fff;box-shadow:0 10px 22px rgb(6 43 85/.18)}
        .maarif-target-primary-action span{flex:1;text-align:center}
        .maarif-target-secondary-action{border:1px solid #d8e1ec;background:#fff;color:#13385f}
        .maarif-target-places{margin-top:18px}
        .maarif-target-places-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .maarif-target-places-heading h2{margin:0;color:#082b54;font-size:16px;font-weight:820}
        .maarif-target-places-heading button{display:flex;align-items:center;gap:4px;border:0;background:transparent;color:#0874f9;font-size:9px;font-weight:800;cursor:pointer}
        .maarif-target-place-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:10px}
        .maarif-target-place-grid article{min-width:0}
        .maarif-target-place-visual{display:grid;height:70px;place-items:center;border:1px solid #dce7f2;border-radius:12px;background:linear-gradient(145deg,#dff0ff,#eef7f1);color:#0874f9}
        .maarif-target-place-grid strong,.maarif-target-place-grid small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .maarif-target-place-grid strong{margin-top:7px;color:#153b65;font-size:9px}
        .maarif-target-place-grid small{margin-top:3px;color:#8191a4;font-size:7px}
        .maarif-target-empty{margin:0;color:#8191a4;font-size:9px}
        @media(min-width:1024px){[data-maarif-rebuild="true"] [data-p4-map-layout]{grid-template-columns:minmax(0,70.5%) minmax(360px,29.5%)!important}}
        @media(max-width:1023px){
          [data-maarif-rebuild="true"] [data-p4-map-layout]{display:block!important;height:auto!important;min-height:0!important;overflow:visible!important;background:#fff!important}
          [data-maarif-rebuild="true"] [data-p4-map-canvas]{height:56svh!important;min-height:430px!important}
          .maarif-target-rail{position:relative;display:block;width:100%;height:auto;max-height:none;overflow:visible;border-left:0;border-top:1px solid #e1e8f1}
          .maarif-target-hero{height:150px;margin:12px 12px 0;border-radius:18px}
          .maarif-target-body{padding:16px 16px 26px}
          .maarif-target-heading h1{font-size:38px}
          .maarif-target-tagline{font-size:15px}
          .maarif-target-copy{font-size:11px}
          .maarif-target-stat-grid strong{font-size:18px}
        }
        @media(max-width:560px){
          [data-maarif-rebuild="true"] [data-p4-map-canvas]{height:54svh!important;min-height:420px!important}
          .maarif-target-hero{height:128px;margin:10px 10px 0}
          .maarif-target-hero figcaption{left:10px;right:10px}.maarif-target-hero figcaption a{display:none}
          .maarif-target-body{padding:14px 14px 24px}
          .maarif-target-heading h1{font-size:36px}
          .maarif-target-tabs button{font-size:10px}
          .maarif-target-stat-grid{grid-template-columns:repeat(2,1fr);gap:0}
          .maarif-target-stat-grid div{border-right:1px solid #e8eef5;border-bottom:1px solid #e8eef5}
          .maarif-target-stat-grid div:nth-child(2n){border-right:0}.maarif-target-stat-grid div:nth-last-child(-n+2){border-bottom:0}
          .maarif-target-place-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
          .maarif-target-place-visual{height:60px}
          .maarif-target-primary-action,.maarif-target-secondary-action{min-height:46px}
        }
      `}</style>
    </aside>
  );
}
