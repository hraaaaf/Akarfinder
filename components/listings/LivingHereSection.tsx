"use client";

import { useMemo, useState } from "react";
import { LivingHereMap } from "@/components/listings/LivingHereMap";
import {
  LIVING_HERE_CATEGORY_LABELS,
  type LivingHereCategory,
  type LivingHereModel,
  type LivingHereRoute,
} from "@/lib/geo/living-here";

function routeLabel(route: LivingHereRoute): string {
  const minutes = Math.max(1, Math.round(route.durationSeconds / 60));
  return route.mode === "walking" ? `${minutes} min à pied` : `${minutes} min en voiture`;
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

  if (!model || model.visibility === "hidden" || model.pois.length === 0) return null;

  const availableIsochrones = Array.from(new Set(model.isochrones.filter((item) => item.mode === "walking").map((item) => item.minutes)));

  return (
    <section data-announcement-living-here="ann-l6" className="border-b border-slate-200 py-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">Quartier vérifié</p>
          <h2 className="mt-1 text-[1.35rem] font-extrabold tracking-[-0.035em] text-deepblue">Vivre ici</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-500">
            {model.origin.exact
              ? "Lieux réels autour du bien. Les durées affichées proviennent uniquement d’un routage mesuré."
              : "Contexte du quartier. La position du bien n’étant pas exacte, aucun temps de trajet depuis ce bien n’est affiché."}
          </p>
        </div>
        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">
          {model.pois.length} lieux vérifiés
        </span>
      </div>

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
            {visiblePois.map((poi) => (
              <li key={poi.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-extrabold text-deepblue">{poi.name}</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">{poi.categoryLabel}</p>
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
              </li>
            ))}
          </ul>
        </div>
      </div>

      {model.attribution.length > 0 ? (
        <p className="mt-3 text-[10.5px] leading-4 text-slate-400">Sources : {model.attribution.join(" · ")}</p>
      ) : null}
    </section>
  );
}
