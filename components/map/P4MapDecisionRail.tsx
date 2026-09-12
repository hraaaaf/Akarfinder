"use client";

import Link from "next/link";
import { Building2, MapPin, Search, ShieldCheck, Trees } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resolveCityEntity, resolveNeighborhoodEntity } from "@/lib/geo/geo-entity-registry";
import type { NeighborhoodContextReadModelV1 } from "@/lib/neighborhood-context/read-model";
import { mapPoiCategoryLabel } from "@/lib/neighborhood-context/map-poi-presentation";
import {
  buildMapHref,
  buildMapSearchHref,
  mapNavigationStateFromUrlSearchParams,
  withMapLocation,
} from "@/lib/map/map-navigation-state";
import { getPremiumMarketIntelligenceProvider } from "@/lib/map/premium-map-city-registry";

const FLAGSHIP_CITIES = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"] as const;

const DISTRICT_HERO_MEDIA = {
  "casablanca:maarif": {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Parfumerie_jura%2C_Ma%C3%A2rif%2C_Casablanca.jpg/1280px-Parfumerie_jura%2C_Ma%C3%A2rif%2C_Casablanca.jpg",
    alt: "Place publique derrière la rue Abou Zaid Addadoussi à Maârif, Casablanca",
    credit: "Sam Nabi · CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Parfumerie_jura,_Ma%C3%A2rif,_Casablanca.jpg",
  },
} as const;

type ContextPayload =
  | { status: "ok"; context: NeighborhoodContextReadModelV1 }
  | { status: "not_found" | "invalid_request" | "unavailable"; [key: string]: unknown };

export function P4MapDecisionRail() {
  const searchParams = useSearchParams();
  const navigationState = useMemo(
    () => mapNavigationStateFromUrlSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const cityEntity = navigationState.city === "all" ? null : resolveCityEntity(navigationState.city);
  const cityName = cityEntity?.canonical_name ?? (navigationState.city === "all" ? "Maroc" : navigationState.city);
  const districtEntity = cityEntity && navigationState.district
    ? resolveNeighborhoodEntity(cityEntity.canonical_name, navigationState.district)
    : null;
  const districtHeroKey = cityEntity && districtEntity ? `${cityEntity.slug}:${districtEntity.slug}` : null;
  const districtHero = districtHeroKey
    ? DISTRICT_HERO_MEDIA[districtHeroKey as keyof typeof DISTRICT_HERO_MEDIA] ?? null
    : null;
  const provider = getPremiumMarketIntelligenceProvider(navigationState.city);
  const searchHref = buildMapSearchHref(navigationState);
  const contextName = districtEntity?.canonical_name ?? cityName;
  const title = cityName === "Maroc" ? "Où vivre au Maroc ?" : contextName;
  const [localContext, setLocalContext] = useState<NeighborhoodContextReadModelV1 | null>(null);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setLocalContext(null);
    if (!cityEntity || !districtEntity) return;

    const controller = new AbortController();
    void fetch(`/api/geo/neighborhood-context?city=${encodeURIComponent(cityEntity.slug)}&district=${encodeURIComponent(districtEntity.slug)}`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json() as ContextPayload;
        if (!response.ok || payload.status !== "ok") return null;
        return payload.context;
      })
      .then((context) => {
        if (!controller.signal.aborted) setLocalContext(context);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLocalContext(null);
      });

    return () => controller.abort();
  }, [cityEntity?.slug, districtEntity?.slug]);

  useEffect(() => {
    railRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [navigationState.city, navigationState.district, localContext]);

  const localAnchors = localContext?.anchors.slice(0, 4) ?? [];
  const localCategoryLabels = localContext
    ? Array.from(new Set(localContext.categories.map((category) => mapPoiCategoryLabel(category))))
    : [];
  const contextIntro = districtEntity
    ? localContext
      ? `${districtEntity.canonical_name} se découvre ici à travers ${localContext.anchor_count} repère${localContext.anchor_count > 1 ? "s" : ""} public${localContext.anchor_count > 1 ? "s" : ""} sourcé${localContext.anchor_count > 1 ? "s" : ""}. Les biens ne sont cartographiés que lorsqu’une position exacte vérifiée est disponible.`
      : `Découvrez ${districtEntity.canonical_name} par ses repères publics sourcés. Les biens ne sont cartographiés que lorsqu’une position exacte vérifiée est disponible.`
    : cityName === "Maroc"
      ? "Explorez les territoires disponibles, puis descendez vers les villes et quartiers avec une précision explicitement qualifiée."
      : `Explorez ${cityName} et ses quartiers avec des repères sourcés uniquement.`;

  return (
    <aside
      ref={railRef}
      className="p4-map-decision-rail"
      data-p4-map-decision-rail
      data-vivre-ici-premium-context
      aria-label="Vivre ici : territoire, vie locale et biens"
    >
      <div className="p4-sheet-handle" aria-hidden="true" />

      {districtHero ? (
        <figure className="relative -mx-6 -mt-6 mb-4 hidden h-[136px] overflow-hidden bg-[#d7e3e1] lg:block" data-p4-neighborhood-hero>
          <img src={districtHero.src} alt={districtHero.alt} className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" aria-hidden="true" />
          <figcaption className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 text-[8px] font-semibold text-white">
            <span className="rounded-full bg-black/35 px-2 py-1 backdrop-blur-sm">{districtEntity?.canonical_name}</span>
            <a href={districtHero.source} target="_blank" rel="noreferrer" className="rounded-full bg-black/35 px-2 py-1 backdrop-blur-sm hover:bg-black/45">
              {districtHero.credit}
            </a>
          </figcaption>
        </figure>
      ) : null}

      <header className="p4-premium-context-header">
        <p className="p4-premium-kicker">
          {districtEntity ? `${cityName} · Quartier` : "Vivre ici"}
        </p>
        <h2>{title}</h2>
        {districtEntity ? <p className="p4-premium-context-location">Vivre, comprendre, puis chercher</p> : null}
        <p className="p4-premium-lede">{contextIntro}</p>
        {districtEntity ? (
          <div className="p4-premium-proofline" aria-label="Règles de fiabilité">
            <span>Repères publics sourcés</span>
            <span>Positions immobilières exactes uniquement</span>
          </div>
        ) : null}
      </header>

      <nav className="p4-premium-tabs" aria-label="Contexte Vivre ici">
        <span aria-current="page">Vue d’ensemble</span>
        <span>Vie locale</span>
        {provider === "rabat-market-intelligence" ? <span>Prix</span> : null}
        <Link href={searchHref}>Biens</Link>
      </nav>

      <section className="p4-premium-signal-grid" aria-label="Repères disponibles">
        <div>
          <MapPin size={16} aria-hidden="true" />
          <strong>{localContext ? localContext.anchor_count : "—"}</strong>
          <span>Repères sourcés</span>
        </div>
        <div>
          <Trees size={16} aria-hidden="true" />
          <strong>{localContext ? localCategoryLabels.length : "—"}</strong>
          <span>Catégories observées</span>
        </div>
        <div>
          <ShieldCheck size={16} aria-hidden="true" />
          <strong>Exact</strong>
          <span>Position requise pour un pin</span>
        </div>
      </section>

      {districtEntity && localCategoryLabels.length ? (
        <p className="p4-premium-category-line">
          {localCategoryLabels.join(" · ")}
        </p>
      ) : null}

      {districtEntity && localAnchors.length ? (
        <section className="p4-premium-local-guide" aria-label={`Repères sourcés à ${districtEntity.canonical_name}`} data-vivre-ici-local-guide>
          <div className="p4-premium-local-guide-heading">
            <div>
              <p>À proximité</p>
              <h3>Ce que l’on peut réellement repérer</h3>
            </div>
            <span>{localContext?.anchor_count ?? localAnchors.length}</span>
          </div>
          <div className="p4-premium-local-guide-list">
            {localAnchors.map((anchor) => (
              <article key={anchor.poi_id}>
                <span>{mapPoiCategoryLabel(anchor.category)}</span>
                <strong>{anchor.name}</strong>
                <small>{anchor.territorial_wording}</small>
              </article>
            ))}
          </div>
          <p className="p4-premium-local-guide-source">
            Repères sourcés et datés dans le contexte quartier. Aucune proximité n’est extrapolée.
          </p>
        </section>
      ) : null}

      <section className="p4-premium-market-card" data-p4-map-data-contract>
        <div>
          <p className="p4-premium-market-eyebrow">
            {provider === "rabat-market-intelligence" ? "Marché observé" : "Données de marché"}
          </p>
          <p className="p4-premium-market-title">
            {provider === "rabat-market-intelligence" ? "Indicateurs disponibles" : "Pas de prix de quartier publié sans source validée"}
          </p>
        </div>
        <p className="p4-premium-market-copy">
          AkarFinder laisse volontairement une information absente plutôt que de la remplacer par une estimation.
        </p>
      </section>

      {cityName === "Maroc" ? (
        <div className="p4-premium-city-list" aria-label="Villes phares">
          {FLAGSHIP_CITIES.map((city) => {
            const href = buildMapHref(withMapLocation(navigationState, city));
            return <Link key={city} href={href}>{city}</Link>;
          })}
        </div>
      ) : null}

      <div className="p4-premium-actions">
        <Link
          href={searchHref}
          className="p4-premium-primary-action"
        >
          <Search size={15} aria-hidden="true" />
          {districtEntity ? `Voir les biens disponibles à ${districtEntity.canonical_name}` : `Voir les biens de ${cityName === "Maroc" ? "la zone" : cityName}`}
        </Link>
        {districtEntity?.seo_eligible && cityEntity ? (
          <Link
            href={`/quartiers/${cityEntity.slug}/${districtEntity.slug}`}
            className="p4-premium-secondary-action"
          >
            <Building2 size={13} aria-hidden="true" /> Voir la fiche quartier
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
