"use client";

import Link from "next/link";
import { ArrowUpRight, Info, MapPin, Search, X } from "lucide-react";
import { getNeighborhoodBySlug } from "@/lib/map/canonical-neighborhood-data";
import type { RabatIntelligenceGeoJson } from "@/lib/map/intelligence-payload";
import type { IntelligenceMode } from "@/lib/map/intelligence-scale";
import { withMapLocation, type MapNavigationState } from "@/lib/map/map-navigation-state";

type IntelligenceFeature = RabatIntelligenceGeoJson["features"][number];

type RabatMarketZoneSheetProps = {
  feature: IntelligenceFeature;
  mode: IntelligenceMode;
  modeLabel: string;
  metricLabel: string;
  searchHref: string;
  navigationState: MapNavigationState;
  onNavigationChange: (nextState: MapNavigationState) => void;
};

export function RabatMarketZoneSheet({
  feature,
  mode,
  modeLabel,
  metricLabel,
  searchHref,
  navigationState,
  onNavigationChange,
}: RabatMarketZoneSheetProps) {
  const district = navigationState.district;
  const neighborhood = district ? getNeighborhoodBySlug("rabat", district) : null;
  const neighborhoodHref = neighborhood
    ? `/quartiers/${neighborhood.citySlug}/${neighborhood.neighborhoodSlug}`
    : null;
  const proximityHighlights = neighborhood?.proximityHighlights.slice(0, 2) ?? [];
  const lifestyleTags = neighborhood?.lifestyleTags.slice(0, 3) ?? [];

  return (
    <aside
      className="absolute inset-x-3 bottom-3 z-30 max-h-[min(68svh,540px)] overflow-y-auto rounded-2xl border border-border-strong/70 bg-card/96 p-4 shadow-panel backdrop-blur-xl sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:w-[360px]"
      aria-label={`Zone ${feature.properties.displayName}`}
      data-akarfinder-rich-zone-sheet
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand-primary">Market zone AkarFinder · Rabat</p>
          <h2 className="mt-1 text-[18px] font-extrabold tracking-[-0.02em] text-foreground">{feature.properties.displayName}</h2>
        </div>
        <button
          type="button"
          onClick={() => onNavigationChange(withMapLocation(navigationState, "rabat"))}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted-foreground"
          aria-label="Fermer la zone"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-brand-primary/15 bg-brand-primary-soft/55 p-3" data-akarfinder-live-zone-metric>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-brand-primary">{modeLabel}</p>
        <p className="mt-1 text-[17px] font-extrabold text-foreground">{metricLabel}</p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-bold text-muted-foreground">
          <span className="rounded-full bg-surface px-2 py-1">n={feature.properties.sampleCount}</span>
          {mode === "price" ? (
            <span className="rounded-full bg-surface px-2 py-1">Fiabilité {feature.properties.reliability ?? "insufficient"}</span>
          ) : null}
          <span className="rounded-full bg-surface px-2 py-1">
            {feature.properties.areaKm2.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km²
          </span>
        </div>
      </div>

      {neighborhood && (lifestyleTags.length > 0 || proximityHighlights.length > 0) ? (
        <section className="mt-3 rounded-xl border border-border bg-surface/85 p-3" aria-label={`Contexte quartier ${neighborhood.neighborhood}`} data-akarfinder-neighborhood-context>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Contexte quartier</p>
              <p className="mt-0.5 text-[11px] font-extrabold text-foreground">{neighborhood.neighborhood}</p>
            </div>
            <span className="rounded-full bg-surface-muted px-2 py-1 text-[8.5px] font-bold text-muted-foreground">référentiel AkarFinder</span>
          </div>

          {lifestyleTags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Repères de style de vie">
              {lifestyleTags.map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-card px-2 py-1 text-[9px] font-bold text-text-secondary">{tag}</span>
              ))}
            </div>
          ) : null}

          {proximityHighlights.length > 0 ? (
            <div className="mt-2 grid gap-1.5">
              {proximityHighlights.map((highlight) => (
                <div key={highlight} className="flex items-start gap-2 text-[9.5px] font-semibold leading-4 text-text-secondary">
                  <MapPin size={11} className="mt-0.5 shrink-0 text-brand-primary" aria-hidden="true" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <Link
        href={searchHref}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-[12px] font-extrabold text-white shadow-accent hover:bg-brand-primary-hover"
      >
        <Search size={14} aria-hidden="true" />
        Rechercher dans cette zone
      </Link>

      {neighborhoodHref ? (
        <Link
          href={neighborhoodHref}
          className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border-strong bg-surface px-3 py-2 text-[10.5px] font-extrabold text-foreground hover:border-brand-primary/40"
        >
          Voir la fiche quartier
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      ) : null}

      <div className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-[9px] leading-4 text-muted-foreground">
        <Info size={12} className="mt-0.5 shrink-0 text-brand-primary" aria-hidden="true" />
        <p>Zone analytique immobilière AkarFinder, non frontière administrative officielle. Les valeurs sont observées, jamais interpolées.</p>
      </div>
    </aside>
  );
}
