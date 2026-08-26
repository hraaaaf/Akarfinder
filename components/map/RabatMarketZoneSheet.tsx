"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Info, MapPin, Search, X } from "lucide-react";
import { getNeighborhoodBySlug } from "@/lib/map/canonical-neighborhood-data";
import type { RabatIntelligenceGeoJson } from "@/lib/map/intelligence-payload";
import type { IntelligenceMode, ReliabilityState } from "@/lib/map/intelligence-scale";
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

function reliabilityLabel(value: ReliabilityState) {
  if (value === "strong") return "Forte";
  if (value === "moderate") return "Modérée";
  if (value === "limited") return "Limitée";
  return "Insuffisante";
}

function zonePolygonPoints(geometry: IntelligenceFeature["geometry"]): string | null {
  const ring = geometry.type === "Polygon" ? geometry.coordinates[0] : geometry.coordinates[0]?.[0];
  if (!ring || ring.length < 3) return null;
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, Number.EPSILON);
  const spanY = Math.max(maxY - minY, Number.EPSILON);
  return ring
    .map(([x, y]) => {
      const px = 8 + ((x - minX) / spanX) * 84;
      const py = 8 + (1 - (y - minY) / spanY) * 44;
      return `${px.toFixed(2)},${py.toFixed(2)}`;
    })
    .join(" ");
}

export function RabatMarketZoneSheet({
  feature,
  mode,
  modeLabel,
  metricLabel,
  searchHref,
  navigationState,
  onNavigationChange,
}: RabatMarketZoneSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const district = navigationState.district;
  const neighborhood = district ? getNeighborhoodBySlug("rabat", district) : null;
  const neighborhoodHref = neighborhood
    ? `/quartiers/${neighborhood.citySlug}/${neighborhood.neighborhoodSlug}`
    : null;
  const proximityHighlights = neighborhood?.proximityHighlights.slice(0, 2) ?? [];
  const lifestyleTags = neighborhood?.lifestyleTags.slice(0, 3) ?? [];
  const metrics = feature.properties.marketMetrics;
  const previewPoints = zonePolygonPoints(feature.geometry);
  const priceLabel = metrics.priceMedianMadM2 == null
    ? "Données insuff."
    : `${Math.round(metrics.priceMedianMadM2).toLocaleString("fr-FR")} DH/m²`;
  const densityLabel = metrics.listingDensityKm2 == null
    ? "Données insuff."
    : `${metrics.listingDensityKm2.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/km²`;
  const mobileSheetClass = expanded
    ? "max-h-[min(74svh,620px)] overflow-y-auto"
    : "max-h-[150px] overflow-hidden";
  const mobileDetailsClass = expanded ? "block" : "hidden sm:block";
  const mobilePrimaryGridClass = expanded ? "grid" : "hidden sm:grid";
  const mobilePrimaryFlexClass = expanded ? "flex" : "hidden sm:flex";
  const mobilePrimaryLinkClass = expanded ? "inline-flex" : "hidden sm:inline-flex";

  return (
    <aside
      className={`absolute inset-x-3 bottom-[90px] z-30 rounded-2xl border border-border-strong/70 bg-card/96 p-4 shadow-panel backdrop-blur-xl ${mobileSheetClass} sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:max-h-[min(68svh,540px)] sm:w-[360px] sm:overflow-y-auto`}
      aria-label={`Zone ${feature.properties.displayName}`}
      data-akarfinder-rich-zone-sheet
      data-akarfinder-zone-sheet-state={expanded ? "expanded" : "collapsed"}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mx-auto -mt-1 mb-2 flex h-7 w-20 flex-col items-center justify-center gap-1 rounded-full text-muted-foreground sm:hidden"
        aria-expanded={expanded}
        aria-label={expanded ? "Réduire la fiche de zone" : "Afficher les détails de la zone"}
        data-akarfinder-zone-sheet-toggle
      >
        <span className="h-1 w-10 rounded-full bg-border-strong" aria-hidden="true" />
        <span className="text-[8px] font-extrabold uppercase tracking-[0.08em]">{expanded ? "Réduire" : "Détails"}</span>
      </button>

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

      <div className={`mt-3 grid-cols-3 gap-2 ${mobilePrimaryGridClass}`} data-akarfinder-zone-kpi-grid>
        <div className={`rounded-xl border p-2 ${mode === "price" ? "border-brand-primary/45 bg-brand-primary-soft/55" : "border-border bg-surface/85"}`}>
          <p className="text-[8px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Prix médian / m²</p>
          <p className="mt-1 break-words text-[11px] font-extrabold leading-4 text-foreground">{priceLabel}</p>
        </div>
        <div className={`rounded-xl border p-2 ${mode === "density" ? "border-brand-primary/45 bg-brand-primary-soft/55" : "border-border bg-surface/85"}`}>
          <p className="text-[8px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Densité</p>
          <p className="mt-1 break-words text-[11px] font-extrabold leading-4 text-foreground">{densityLabel}</p>
        </div>
        <div className={`rounded-xl border p-2 ${mode === "listings" ? "border-brand-primary/45 bg-brand-primary-soft/55" : "border-border bg-surface/85"}`}>
          <p className="text-[8px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Annonces</p>
          <p className="mt-1 text-[11px] font-extrabold leading-4 text-foreground">{metrics.listingCount.toLocaleString("fr-FR")}</p>
        </div>
      </div>

      <div className={`mt-2 items-center justify-between gap-2 rounded-lg bg-surface-muted/70 px-2.5 py-2 text-[9px] ${mobilePrimaryFlexClass}`} data-akarfinder-live-zone-metric>
        <span className="font-extrabold text-brand-primary">Vue {modeLabel}</span>
        <span className="truncate font-bold text-foreground">{metricLabel}</span>
        <span className="shrink-0 font-semibold text-muted-foreground">n={feature.properties.sampleCount}</span>
      </div>

      <Link
        href={searchHref}
        className={`mt-3 min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-[12px] font-extrabold text-white shadow-accent hover:bg-brand-primary-hover ${mobilePrimaryLinkClass}`}
      >
        <Search size={14} aria-hidden="true" />
        Rechercher dans cette zone
      </Link>

      <div className={mobileDetailsClass} data-akarfinder-zone-sheet-details>
        <div className="mt-3 grid grid-cols-[92px_1fr] gap-3 rounded-xl border border-brand-primary/15 bg-brand-primary-soft/40 p-2.5" data-akarfinder-zone-polygon-preview>
          <div className="grid h-16 place-items-center overflow-hidden rounded-lg bg-surface">
            {previewPoints ? (
              <svg viewBox="0 0 100 60" className="h-full w-full" role="img" aria-label={`Polygone de la zone ${feature.properties.displayName}`}>
                <polygon points={previewPoints} className="fill-brand-primary/20 stroke-brand-primary" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
            ) : (
              <MapPin size={22} className="text-brand-primary" aria-hidden="true" />
            )}
          </div>
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Zone sélectionnée</p>
            <p className="mt-1 text-[11px] font-extrabold text-foreground">{feature.properties.displayName}</p>
            <p className="mt-1 text-[9px] font-semibold leading-4 text-muted-foreground">
              {feature.properties.areaKm2.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km² · géométrie certifiée
            </p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-[9px]" data-akarfinder-zone-data-quality>
          <div className="rounded-lg border border-border bg-surface/85 p-2">
            <p className="font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Confiance des données</p>
            <p className="mt-1 font-extrabold text-foreground">{reliabilityLabel(metrics.priceReliability)}</p>
            <p className="mt-0.5 font-semibold text-muted-foreground">n prix={metrics.priceSampleCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface/85 p-2">
            <p className="font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Tendance 6 mois</p>
            <p className="mt-1 font-bold text-muted-foreground">Indisponible</p>
            <p className="mt-0.5 leading-3.5 text-muted-foreground">Historique insuffisant</p>
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-border bg-surface/85 p-2 text-[9px]" data-akarfinder-dominant-categories>
          <p className="font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Catégories dominantes</p>
          <p className="mt-1 font-bold text-muted-foreground">Données insuffisantes pour une classification certifiée</p>
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
      </div>
    </aside>
  );
}
