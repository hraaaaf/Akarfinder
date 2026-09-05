"use client";

import Link from "next/link";
import { Building2, Layers3, MapPin, Search } from "lucide-react";
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
  const title = cityName === "Maroc" ? "Où vivre au Maroc ?" : `Vivre à ${cityName}`;

  return (
    <aside
      className="p4-map-decision-rail"
      data-p4-map-decision-rail
      aria-label="Vivre ici : territoire, vie locale et biens"
    >
      <div className="p4-sheet-handle" aria-hidden="true" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-brand-primary">Vivre ici · AkarFinder</p>
          <h2 className="mt-1 truncate text-[19px] font-extrabold tracking-[-0.025em] text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-[10.5px] leading-4 text-muted-foreground">
            {districtEntity
              ? `${districtEntity.canonical_name} · quartier, repères disponibles et biens dans le même contexte.`
              : "Explorez les quartiers, le marché observé et les lieux du quotidien disponibles avant de voir les biens."}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[8.5px] font-extrabold text-muted-foreground">
          Territoire
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Parcours Vivre ici">
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10px] font-extrabold text-foreground">
          <Layers3 size={12} aria-hidden="true" /> Quartiers
        </span>
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10px] font-extrabold text-foreground">
          <MapPin size={12} aria-hidden="true" /> Vie locale
        </span>
        <Link href={searchHref} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-primary px-3 text-[10px] font-extrabold text-white shadow-sm">
          <Building2 size={12} aria-hidden="true" /> Biens
        </Link>
      </div>

      <div className="mt-3 rounded-2xl border border-brand-primary/15 bg-brand-primary-soft/45 p-3" data-p4-map-data-contract>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-brand-primary">
          {provider === "rabat-market-intelligence" ? "Marché observé" : "Repères disponibles"}
        </p>
        <p className="mt-1 text-[11px] font-extrabold text-foreground">
          {provider === "rabat-market-intelligence"
            ? "Prix · Densité · Annonces"
            : "Territoire · quartiers · positions certifiées"}
        </p>
        <p className="mt-1 text-[9.5px] leading-4 text-muted-foreground">
          Aucune valeur, limite, position ou proximité précise n’est inventée lorsqu’elle n’est pas certifiée.
        </p>
      </div>

      <div className="mt-3 hidden gap-1.5 overflow-x-auto lg:flex" aria-label="Villes phares">
        {FLAGSHIP_CITIES.map((city) => {
          const active = city === cityName;
          const href = buildMapHref(withMapLocation(navigationState, city));
          return (
            <Link
              key={city}
              href={href}
              className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[9px] font-extrabold transition ${active ? "border-brand-primary bg-brand-primary text-white" : "border-border bg-surface text-text-secondary hover:border-brand-primary/30"}`}
            >
              {city}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 lg:mt-4">
        <Link
          href={searchHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-[11.5px] font-extrabold text-white shadow-accent transition hover:bg-brand-primary-hover"
        >
          <Search size={14} aria-hidden="true" /> Voir les biens de cette zone
        </Link>
        {districtEntity?.seo_eligible && cityEntity ? (
          <Link
            href={`/quartiers/${cityEntity.slug}/${districtEntity.slug}`}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-[10.5px] font-extrabold text-foreground"
          >
            <MapPin size={13} aria-hidden="true" /> Voir la fiche quartier
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
