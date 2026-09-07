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

  return (
    <aside
      ref={railRef}
      className="p4-map-decision-rail"
      data-p4-map-decision-rail
      data-vivre-ici-premium-context
      aria-label="Vivre ici : territoire, vie locale et biens"
    >
      <div className="p4-sheet-handle" aria-hidden="true" />

      <header className="p4-premium-context-header">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-brand-primary">
          Vivre ici
        </p>
        <h2 className="mt-1 text-[clamp(22px,2vw,30px)] font-extrabold tracking-[-0.045em] text-foreground">
          {title}
        </h2>
        {districtEntity ? <p className="p4-premium-context-location">{cityName}</p> : null}
        <p className="mt-2 text-[11px] leading-[1.55] text-muted-foreground">
          {districtEntity
            ? `Explorez ${districtEntity.canonical_name} par son contexte urbain et les repères publics réellement disponibles. Les biens restent exclus de la carte sans position exacte vérifiée.`
            : cityName === "Maroc"
              ? "Explorez les territoires disponibles puis descendez vers les villes et quartiers avec une précision explicitement qualifiée."
              : `Explorez ${cityName} et ses quartiers avec des repères sourcés uniquement.`}
        </p>
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
          <strong>Repères</strong>
          <span>{localContext ? `${localContext.anchor_count} sourcé${localContext.anchor_count > 1 ? "s" : ""}` : "Sourcés uniquement"}</span>
        </div>
        <div>
          <Trees size={16} aria-hidden="true" />
          <strong>Vie locale</strong>
          <span>Selon disponibilité</span>
        </div>
        <div>
          <ShieldCheck size={16} aria-hidden="true" />
          <strong>Biens</strong>
          <span>Pin exact requis</span>
        </div>
      </section>

      {districtEntity && localAnchors.length ? (
        <section className="p4-premium-local-guide" aria-label={`Repères sourcés à ${districtEntity.canonical_name}`} data-vivre-ici-local-guide>
          <div className="p4-premium-local-guide-heading">
            <div>
              <p>À proximité</p>
              <h3>Repères réellement observés</h3>
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
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-brand-primary">
            {provider === "rabat-market-intelligence" ? "Marché observé" : "Données de marché"}
          </p>
          <p className="mt-1 text-[12px] font-extrabold text-foreground">
            {provider === "rabat-market-intelligence" ? "Indicateurs disponibles" : "Publication conditionnée à une source validée"}
          </p>
        </div>
        <p className="col-span-full text-[9.5px] leading-4 text-muted-foreground">
          La présentation premium ne remplit jamais les cases manquantes par estimation.
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
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-brand-primary px-4 text-[12px] font-extrabold text-white shadow-accent transition hover:bg-brand-primary-hover"
        >
          <Search size={15} aria-hidden="true" />
          {districtEntity ? `Voir les biens à ${districtEntity.canonical_name}` : `Voir les biens de ${cityName === "Maroc" ? "la zone" : cityName}`}
        </Link>
        {districtEntity?.seo_eligible && cityEntity ? (
          <Link
            href={`/quartiers/${cityEntity.slug}/${districtEntity.slug}`}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] border border-border-strong bg-surface px-4 text-[10.5px] font-extrabold text-foreground"
          >
            <Building2 size={13} aria-hidden="true" /> Voir la fiche quartier
          </Link>
        ) : null}
      </div>
    </aside>
  );
}