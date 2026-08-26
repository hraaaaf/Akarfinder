"use client";

import { useMemo, useState } from "react";
import { ExactPropertyMeasurementsSection } from "@/components/listings/ExactPropertyMeasurementsSection";
import { LivingHereMap } from "@/components/listings/LivingHereMap";
import {
  LIVING_HERE_CATEGORY_LABELS,
  type LivingHereCategory,
  type LivingHereModel,
  type LivingHereRoute,
} from "@/lib/geo/living-here";
import {
  hasLivingHereNeighborhoodContext,
  type LivingHereContextPoi,
} from "@/lib/geo/living-here-context";
import {
  formatNeighborhoodContextObservedAt,
  neighborhoodCoverageDescription,
  neighborhoodCoverageLabel,
} from "@/lib/neighborhood-context/presentation";

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.max(1, Math.round(distanceMeters))} m`;
  return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10_000 ? 0 : 1).replace(".", ",")} km`;
}

function routeLabel(route: LivingHereRoute): string {
  const minutes = Math.max(1, Math.round(route.durationSeconds / 60));
  const mode = route.mode === "walking" ? `${minutes} min à pied` : `${minutes} min en voiture`;
  return `${mode} · ${formatDistance(route.distanceMeters)}`;
}

function observedLabel(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${parsed.getUTCFullYear()}`;
}

export function LivingHereSection({
  model,
  mapStyleUrl,
}: {
  model: LivingHereModel | null;
  mapStyleUrl: string | null;
}) {
  const [category, setCategory] = useState<LivingHereCategory | "all">("all");
  const [minutes, setMinutes] = useState<5 | 10 | 15 | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(model?.pois.map((poi) => poi.category) ?? [])),
    [model],
  );
  const visiblePois = useMemo(
    () => model?.pois.filter((poi) => category === "all" || poi.category === category).slice(0, 18) ?? [],
    [category, model],
  );

  if (!model || model.visibility === "hidden") return null;
  const contextModel = hasLivingHereNeighborhoodContext(model) ? model : null;
  const neighborhoodContext = contextModel?.neighborhoodContext ?? null;
  if (model.pois.length === 0 && !neighborhoodContext && !contextModel?.exactPropertyMeasurements) return null;

  const availableIsochrones = model.origin.exact
    ? Array.from(new Set(model.isochrones.filter((item) => item.mode === "walking").map((item) => item.minutes)))
    : [];
  const contextObservedAt = formatNeighborhoodContextObservedAt(neighborhoodContext?.sourceObservedAt);

  return (
    <section
      data-announcement-living-here="ann-l6"
      data-neighborhood-context-converged={neighborhoodContext?.canonicalNeighborhoodId ?? undefined}
      data-neighborhood-context-coverage={neighborhoodContext?.coverageStatus ?? undefined}
      data-neighborhood-context-anchor-count={neighborhoodContext?.anchorCount ?? undefined}
      data-neighborhood-context-poi-ids={neighborhoodContext ? model.pois.map((poi) => poi.id).join(",") : undefined}
      className="border-b border-slate-200 py-7"
    >
      <div
        data-neighborhood-context-surface={neighborhoodContext ? "nci" : undefined}
        data-neighborhood-context-converged={neighborhoodContext?.canonicalNeighborhoodId ?? undefined}
        data-neighborhood-context-coverage={neighborhoodContext?.coverageStatus ?? undefined}
        data-neighborhood-context-anchor-count={neighborhoodContext?.anchorCount ?? undefined}
        data-neighborhood-context-poi-ids={neighborhoodContext ? model.pois.map((poi) => poi.id).join(",") : undefined}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
              {model.origin.exact ? "Depuis ce bien exact" : "Contexte quartier · NCI"}
            </p>
            <h2 className="mt-1 text-[1.35rem] font-extrabold tracking-[-0.035em] text-deepblue">Vivre ici</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-500">
              {model.origin.exact
                ? "Lieux réels autour du bien. Les durées et distances affichées proviennent uniquement d’un routage mesuré."
                : neighborhoodContext
                  ? "Repères du quartier issus du même read-model NCI que la Carte, la homepage et les pages quartier. Aucun temps de trajet n’est produit depuis un centroïde."
                  : "Contexte quartier indisponible. Aucun temps de trajet ni repère n’est inventé."}
            </p>
          </div>
          {neighborhoodContext ? (
            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">
              {neighborhoodCoverageLabel(neighborhoodContext.coverageStatus)} · {neighborhoodContext.anchorCount} repère{neighborhoodContext.anchorCount > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">
              {model.pois.length} lieux vérifiés
            </span>
          )}
        </div>

        {model.pois.length > 0 ? (
          <>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrer les lieux par catégorie">
              <button
                type="button"
                onClick={() => setCategory("all")}
                aria-pressed={category === "all"}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-[12px] font-extrabold ${category === "all" ? "border-[#0B63CE] bg-[#0B63CE] text-white" : "border-slate-200 bg-white text-deepblue"}`}
              >
                Tout
              </button>
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                  className={`min-h-11 shrink-0 rounded-full border px-4 text-[12px] font-extrabold ${category === item ? "border-[#0B63CE] bg-[#0B63CE] text-white" : "border-slate-200 bg-white text-deepblue"}`}
                >
                  {LIVING_HERE_CATEGORY_LABELS[item]}
                </button>
              ))}
            </div>

            {availableIsochrones.length > 0 ? (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Isochrones à pied">
                <span className="shrink-0 text-[11px] font-bold text-slate-500">Zone à pied</span>
                <button type="button" onClick={() => setMinutes(null)} aria-pressed={minutes === null} className={`min-h-11 shrink-0 rounded-full border px-3 text-[12px] font-bold ${minutes === null ? "border-deepblue bg-deepblue text-white" : "border-slate-200 bg-white text-deepblue"}`}>Aucune</button>
                {availableIsochrones.map((value) => (
                  <button key={value} type="button" onClick={() => setMinutes(value)} aria-pressed={minutes === value} className={`min-h-11 shrink-0 rounded-full border px-3 text-[12px] font-bold ${minutes === value ? "border-deepblue bg-deepblue text-white" : "border-slate-200 bg-white text-deepblue"}`}>{value} min</button>
                ))}
              </div>
            ) : null}

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(310px,0.85fr)]">
              <LivingHereMap model={model} pois={visiblePois} selectedMinutes={minutes} styleUrl={mapStyleUrl} />

              <div className="max-h-[440px] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                <ul className="divide-y divide-slate-200">
                  {visiblePois.map((poi) => {
                    const observed = observedLabel(poi.observedAt);
                    const contextPoi = neighborhoodContext ? poi as LivingHereContextPoi : null;
                    return (
                      <li key={poi.id} data-neighborhood-context-poi={contextPoi?.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-extrabold text-deepblue">{poi.name}</p>
                            <p className="mt-1 text-[11px] font-bold text-slate-500">
                              {poi.categoryLabel}{contextPoi?.territorialWording ? ` · ${contextPoi.territorialWording}` : ""}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">Vérifié</span>
                        </div>
                        {model.canShowPreciseRouteTimes && poi.routes.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {poi.routes.map((route) => (
                              <span key={`${poi.id}-${route.mode}`} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#0B63CE]">
                                {routeLabel(route)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-2 text-[10.5px] leading-4 text-slate-400">
                          {poi.attribution}{observed ? ` · observé le ${observed}` : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
            <p className="text-[12px] font-extrabold text-deepblue">
              {neighborhoodContext ? neighborhoodCoverageDescription(neighborhoodContext.coverageStatus) : "Aucun lieu vérifié disponible"}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">La section reste fail-closed tant qu’une preuve fraîche n’est pas disponible.</p>
          </div>
        )}

        {model.attribution.length > 0 ? (
          <p className="mt-3 text-[10.5px] leading-4 text-slate-400">
            Sources cartographiques : {model.attribution.join(" · ")}{contextObservedAt ? ` · observation NCI ${contextObservedAt}` : ""}
          </p>
        ) : null}
      </div>

      <ExactPropertyMeasurementsSection model={contextModel?.exactPropertyMeasurements ?? null} />
    </section>
  );
}
