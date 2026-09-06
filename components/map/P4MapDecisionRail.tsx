"use client";

import Link from "next/link";
import { Building2, Layers3, MapPin, Search, ShieldCheck, Trees } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { resolveCityEntity, resolveNeighborhoodEntity } from "@/lib/geo/geo-entity-registry";
import {
  buildMapHref,
  buildMapSearchHref,
  mapNavigationStateFromUrlSearchParams,
  withMapLocation,
} from "@/lib/map/map-navigation-state";
import { getPremiumMarketIntelligenceProvider } from "@/lib/map/premium-map-city-registry";

const FLAGSHIP_CITIES = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"] as const;

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
  const title = cityName === "Maroc" ? "Où vivre au Maroc ?" : `Vivre à ${contextName}`;

  return (
    <aside
      className="p4-map-decision-rail"
      data-p4-map-decision-rail
      data-vivre-ici-premium-context
      aria-label="Vivre ici : territoire, vie locale et biens"
    >
      <div className="p4-sheet-handle" aria-hidden="true" />

      <header className="p4-premium-context-header">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-brand-primary">
          Vivre ici {cityName !== "Maroc" ? `› ${cityName}` : "› Maroc"}
        </p>
        <h2 className="mt-1 text-[clamp(20px,2vw,28px)] font-extrabold tracking-[-0.035em] text-foreground">
          {title}
        </h2>
        <p className="mt-1.5 text-[11px] leading-[1.55] text-muted-foreground">
          {districtEntity
            ? `${districtEntity.canonical_name} dans son contexte : repères de vie locale disponibles et accès aux biens sans fausse précision.`
            : cityName === "Maroc"
              ? "Comparez les territoires disponibles, puis descendez vers les villes, quartiers et biens avec une précision explicitement qualifiée."
              : "Explorez les quartiers, les repères disponibles et les biens de la zone sans inventer de proximité ni de position."}
        </p>
      </header>

      <nav className="p4-premium-tabs" aria-label="Contexte Vivre ici">
        <span aria-current="page">Aperçu</span>
        <span>Vie locale</span>
        {provider === "rabat-market-intelligence" ? <span>Prix</span> : null}
        <Link href={searchHref}>Biens</Link>
      </nav>

      <section className="p4-premium-signal-grid" aria-label="Repères disponibles">
        <div>
          <Layers3 size={16} aria-hidden="true" />
          <strong>{districtEntity ? "Quartier" : "Territoire"}</strong>
          <span>{districtEntity?.canonical_name ?? cityName}</span>
        </div>
        <div>
          <MapPin size={16} aria-hidden="true" />
          <strong>Vie locale</strong>
          <span>Selon disponibilité</span>
        </div>
        <div>
          <Trees size={16} aria-hidden="true" />
          <strong>Repères</strong>
          <span>Sourcés uniquement</span>
        </div>
        <div>
          <ShieldCheck size={16} aria-hidden="true" />
          <strong>Biens</strong>
          <span>Exact exigé pour un pin</span>
        </div>
      </section>

      <section className="p4-premium-market-card" data-p4-map-data-contract>
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-brand-primary">
            {provider === "rabat-market-intelligence" ? "Marché observé" : "Données de marché"}
          </p>
          <p className="mt-1 text-[12px] font-extrabold text-foreground">
            {provider === "rabat-market-intelligence" ? "Indicateurs disponibles" : "Non publiées pour cette vue"}
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[8.5px] font-extrabold text-muted-foreground">
          {provider === "rabat-market-intelligence" ? "Observé" : "Fail closed"}
        </span>
        <p className="col-span-full text-[9.5px] leading-4 text-muted-foreground">
          Aucun prix, temps de trajet, distance ou proximité précise n’est affiché sans source validée.
        </p>
      </section>

      {cityName === "Maroc" ? (
        <div className="p4-premium-city-list" aria-label="Villes phares">
          {FLAGSHIP_CITIES.map((city) => {
            const active = city === cityName;
            const href = buildMapHref(withMapLocation(navigationState, city));
            return (
              <Link
                key={city}
                href={href}
                className={active ? "is-active" : undefined}
              >
                {city}
              </Link>
            );
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
