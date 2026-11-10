"use client";

import Link from "next/link";
import { Building2, MapPin, Search, ShieldCheck, Trees } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resolveCityEntity, resolveNeighborhoodEntity } from "@/lib/geo/geo-entity-registry";
import type { NeighborhoodContextReadModelV1 } from "@/lib/neighborhood-context/read-model";
import type { LivingHereCategory } from "@/lib/geo/living-here";
import { mapPoiCategoryLabel } from "@/lib/neighborhood-context/map-poi-presentation";
import {
  buildMapHref,
  buildMapSearchHref,
  mapNavigationStateFromUrlSearchParams,
  withMapLocation,
} from "@/lib/map/map-navigation-state";

const FLAGSHIP_CITIES = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"] as const;
// J11-C2 QA display contract: indicative national OSM pins are distinct from
// the richer, independently sourced neighborhood evidence in this sidebar.
const QA_INDICATIVE_OSM = process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_VIVRE_ICI_QA_NATIONAL_POI === "true";

const DISTRICT_HERO_MEDIA = {
  "casablanca:maarif": {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Parfumerie_jura%2C_Ma%C3%A2rif%2C_Casablanca.jpg/1280px-Parfumerie_jura%2C_Ma%C3%A2rif%2C_Casablanca.jpg",
    alt: "Place publique derrière la rue Abou Zaid Addadoussi à Maârif, Casablanca",
    credit: "Sam Nabi · CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Parfumerie_jura,_Ma%C3%A2rif,_Casablanca.jpg",
  },
} as const;

const DAILY_CONTEXT_CATEGORIES = [
  { key: "education", label: "Écoles" },
  { key: "groceries", label: "Courses" },
  { key: "health", label: "Santé" },
  { key: "transport", label: "Transports" },
  { key: "green_sport", label: "Parcs & sport" },
  { key: "shopping", label: "Commerces" },
] as const satisfies readonly { key: LivingHereCategory; label: string }[];

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
  const searchHref = buildMapSearchHref(navigationState);
  const contextName = districtEntity?.canonical_name ?? cityName;
  const title = cityName === "Maroc" ? "Où vivre au Maroc ?" : contextName;
  const [localContext, setLocalContext] = useState<NeighborhoodContextReadModelV1 | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setSheetExpanded(false);
  }, [navigationState.city, navigationState.district]);

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
  // Only public read-model anchors can populate the daily evidence cards.
  // Private OSM QA candidates never enter this component.
  const dailyCategorySummary = DAILY_CONTEXT_CATEGORIES.map((category) => ({
    ...category,
    count: localContext?.anchors.filter((anchor) => anchor.category === category.key).length ?? 0,
  }));
  const contextIntro = districtEntity
    ? localContext?.anchor_count
      ? `${districtEntity.canonical_name} : ${localContext.anchor_count} repère${localContext.anchor_count > 1 ? "s" : ""} public${localContext.anchor_count > 1 ? "s" : ""} sourcé${localContext.anchor_count > 1 ? "s" : ""}. Les biens ne sont cartographiés que lorsqu’une position exacte vérifiée est disponible.`
      : QA_INDICATIVE_OSM
        ? "Carte : repères OSM indicatifs si chargés. Fiche : données de vie quotidienne enrichies non disponibles. Ni ouverture ni appartenance au quartier certifiées."
        : localContext
          ? `Aucun repère suffisamment récent n’est actuellement disponible pour ${districtEntity.canonical_name}. Les lieux seront présentés après vérification de leurs sources.`
          : `Les repères de ${districtEntity.canonical_name} ne sont affichés que lorsqu’ils disposent de sources récentes et vérifiables.`
    : cityName === "Maroc"
      ? "Explorez les territoires disponibles, puis descendez vers les villes et quartiers avec une précision explicitement qualifiée."
      : `Explorez ${cityName} et ses quartiers avec des repères sourcés uniquement.`;

  return (
    <aside
      ref={railRef}
      className="p4-map-decision-rail"
      data-p4-map-decision-rail
      data-vivre-ici-premium-context
      data-j11c-qa-rail={QA_INDICATIVE_OSM ? "true" : "false"}
      data-sheet-expanded={sheetExpanded ? "true" : "false"}
      aria-label="Vivre ici : territoire, vie locale et biens"
    >
      <button
        type="button"
        className="p4-sheet-handle p4-sheet-toggle"
        onClick={() => setSheetExpanded((value) => !value)}
        aria-controls="vivre-ici-sheet-extra"
        aria-expanded={sheetExpanded}
        aria-label={sheetExpanded ? "Réduire la fiche quartier" : "Afficher la fiche détaillée"}
      >
        <span aria-hidden="true">{sheetExpanded ? "⌄" : "⌃"}</span>
      </button>

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
            <span>{localContext?.anchor_count ? "Repères publics sourcés" : QA_INDICATIVE_OSM ? "Repères OSM indicatifs · QA locale" : "Repères récents indisponibles"}</span>
            <span>Positions immobilières exactes uniquement</span>
          </div>
        ) : null}
      </header>

      {districtEntity && localContext?.anchor_count === 0 ? (
        <p className="p4-premium-empty-evidence" role="status">
          {QA_INDICATIVE_OSM
            ? "La fiche ne dispose pas de repères enrichis. Les points OSM de la carte, lorsqu’ils chargent, sont uniquement indicatifs."
            : `Aucun repère suffisamment récent n’est actuellement disponible pour ${districtEntity.canonical_name}.`}
        </p>
      ) : null}

      <div id="vivre-ici-sheet-extra" data-l2c-extra>
      {districtEntity ? (
        <section className="mt-4 rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }} aria-labelledby="vivre-ici-quotidien" data-l2b-daily-context>
          <h3 id="vivre-ici-quotidien" className="text-[15px] font-extrabold">Vie quotidienne</h3>
          <p className="mt-1.5 text-[11px] leading-5" style={{ color: "var(--text-secondary)" }}>
            {localContext
              ? localContext.anchor_count > 0
                ? "Transports, écoles, santé et commerces : seuls les lieux effectivement documentés figurent ci-dessous."
                : QA_INDICATIVE_OSM
                  ? "Les catégories ci-dessous concernent le contexte détaillé non disponible. Les repères OSM de la carte sont indicatifs."
                  : "Aucun lieu suffisamment récent n’est disponible pour décrire le quotidien de ce quartier."
              : QA_INDICATIVE_OSM
                ? "Contexte détaillé indisponible ; les repères OSM de la carte sont indicatifs."
                : "Les informations de proximité ne sont pas disponibles actuellement."}
          </p>
          <details className="p4-daily-evidence-details" data-vivre-ici-daily-details>
            <summary>Afficher les 6 catégories <span aria-hidden="true">⌄</span></summary>
          <ul className="p4-daily-evidence-grid" data-vivre-ici-daily-grid aria-label="Catégories du quotidien et couverture des sources">
            {dailyCategorySummary.map((category) => (
              <li key={category.key} data-daily-category={category.key} data-daily-state={category.count > 0 ? "sourced" : "unavailable"}>
                <span>{category.label}</span>
                <strong>{category.count > 0
                  ? `${category.count} repère${category.count > 1 ? "s" : ""} sourcé${category.count > 1 ? "s" : ""}`
                  : "Non documenté"}</strong>
              </li>
            ))}
          </ul>
          <p data-daily-evidence-disclaimer>
            Une rubrique non documentée ne prouve pas l’absence de lieux dans le quartier. Les repères sont contextuels, sans délimitation certifiée ni estimation de trajet.
          </p>
          </details>
        </section>
      ) : null}

      {districtEntity && localContext && localContext.anchor_count > 0 ? (
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
          <strong>Exigée</strong>
          <span>Position vérifiée nécessaire pour un pin</span>
        </div>
      </section>
      ) : null}

      {districtEntity && localCategoryLabels.length ? (
        <p className="p4-premium-category-line">
          {localCategoryLabels.join(" · ")}
        </p>
      ) : null}

      {districtEntity && localAnchors.length ? (
        <section className="p4-premium-local-guide" aria-label={`Repères sourcés à ${districtEntity.canonical_name}`} data-vivre-ici-local-guide>
          <div className="p4-premium-local-guide-heading">
            <div>
              <p>Vie quotidienne documentée</p>
              <h3>Lieux identifiés dans le contexte du quartier</h3>
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

      <section className="p4-premium-market-card" data-p4-map-data-contract data-l2b-living-context aria-labelledby="vivre-ici-cadre">
        <div>
          <p className="p4-premium-market-eyebrow">Sources et couverture</p>
          <h3 id="vivre-ici-cadre" className="p4-premium-market-title">Cadre de vie</h3>
        </div>
        <p className="p4-premium-market-copy">
          {districtEntity && localContext?.coverage_status === "covered"
            ? "Des repères locaux récents et documentés sont disponibles, avec leur provenance."
            : districtEntity && localContext?.coverage_status === "partial" && localContext.anchor_count > 0
              ? "La couverture locale est partielle. Les informations manquantes ne sont pas extrapolées."
              : QA_INDICATIVE_OSM && districtEntity
                ? "Cadre de vie enrichi non disponible. Les repères OSM affichés par la carte ne certifient ni activité ni périmètre."
                : "Les éléments de cadre de vie sont insuffisamment documentés ou indisponibles dans cette vue."}
        </p>
        <p className="mt-2 text-[10px] leading-4" style={{ color: "var(--text-secondary)" }}>
          Les prix de quartier ne sont pas publiés sans source actuelle vérifiable. Aucun score de qualité de vie ni temps de trajet n’est estimé.
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

      </div>

      <section className="mt-4" aria-labelledby="vivre-ici-biens" data-l2b-listings>
        <h3 id="vivre-ici-biens" className="mb-2 text-[15px] font-extrabold">Biens</h3>
        <div className="p4-premium-actions">
        <Link
          href={searchHref}
          className="p4-premium-primary-action"
        >
          <Search size={15} aria-hidden="true" />
          {districtEntity ? `Rechercher des biens à ${districtEntity.canonical_name}` : `Voir les biens de ${cityName === "Maroc" ? "la zone" : cityName}`}
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
      </section>
    </aside>
  );
}
