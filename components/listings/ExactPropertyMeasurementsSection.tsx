import type { LivingHereModel, LivingHereRoute } from "@/lib/geo/living-here";

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.max(1, Math.round(distanceMeters))} m`;
  return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10_000 ? 0 : 1).replace(".", ",")} km`;
}

function routeLabel(route: LivingHereRoute): string {
  const minutes = Math.max(1, Math.round(route.durationSeconds / 60));
  const mode = route.mode === "walking" ? `${minutes} min à pied` : `${minutes} min en voiture`;
  return `${mode} · ${formatDistance(route.distanceMeters)}`;
}

export function ExactPropertyMeasurementsSection({ model }: { model: LivingHereModel | null }) {
  if (!model || !model.origin.exact || !model.canShowPreciseRouteTimes) return null;
  const measuredPois = model.pois.filter((poi) => poi.routes.length > 0).slice(0, 6);
  if (measuredPois.length === 0) return null;

  const attribution = Array.from(new Set([
    ...model.attribution,
    ...measuredPois.flatMap((poi) => poi.routes.map((route) => route.attribution)),
  ].filter(Boolean)));

  return (
    <div
      data-exact-property-measurements="ann-l6"
      className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/45 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">Depuis ce bien exact</p>
          <h3 className="mt-1 text-[1rem] font-extrabold tracking-[-0.025em] text-deepblue">Distances & temps mesurés</h3>
          <p className="mt-1 max-w-2xl text-[12px] leading-5 text-slate-500">
            Ces mesures utilisent les coordonnées exactes de l’annonce et restent séparées du contexte quartier NCI.
          </p>
        </div>
        <span className="w-fit rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[10.5px] font-bold text-[#0B63CE]">
          {measuredPois.length} lieu{measuredPois.length > 1 ? "x" : ""} mesuré{measuredPois.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {measuredPois.map((poi) => (
          <article key={poi.id} data-exact-property-measurement-poi={poi.id} className="rounded-xl border border-blue-100 bg-white p-3.5">
            <p className="truncate text-[13px] font-extrabold text-deepblue">{poi.name}</p>
            <p className="mt-1 text-[10.5px] font-bold text-slate-500">{poi.categoryLabel}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {poi.routes.map((route) => (
                <span
                  key={`${poi.id}-${route.mode}`}
                  className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10.5px] font-bold text-[#0B63CE]"
                >
                  {routeLabel(route)}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      {attribution.length > 0 ? (
        <p className="mt-3 text-[10px] leading-4 text-slate-400">Mesures : {attribution.join(" · ")}</p>
      ) : null}
    </div>
  );
}
