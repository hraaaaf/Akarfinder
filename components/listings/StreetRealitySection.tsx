import type { StreetRealityModel } from "@/lib/geo/street-reality";

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1_000) return `${Math.max(0, Math.round(distanceMeters))} m`;
  return `${(distanceMeters / 1_000).toFixed(1).replace(".", ",")} km`;
}

function formatCapturedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-MA", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function StreetRealitySection({ model }: { model?: StreetRealityModel | null }) {
  if (!model || model.visibility === "hidden" || model.assets.length === 0) return null;

  return (
    <section data-street-reality="ann-l7" className="border-b border-slate-200 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#0B63CE]">Street Reality</p>
          <h2 className="mt-1 text-[1.15rem] font-extrabold tracking-[-0.03em] text-deepblue">Vue de rue à proximité</h2>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-slate-500">
            {model.visibility === "full"
              ? "Contexte street-level autour de la localisation du bien. Ces images ne sont pas des photos du logement."
              : "Contexte street-level du quartier. La position du bien n’est pas utilisée comme localisation exacte."}
          </p>
        </div>
        <div className="text-right text-[10.5px] font-semibold text-slate-400">
          <p>{model.attribution}</p>
          <p>Rayon public ≤ {model.maxDistanceMeters} m</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {model.assets.map((asset, index) => {
          const capturedAt = formatCapturedAt(asset.capturedAt);
          const card = (
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_18px_rgba(7,27,51,0.05)]">
              <div className="aspect-[16/10] bg-slate-100">
                {asset.thumbnailUrl ? (
                  // Provider thumbnails are ephemeral context imagery. They are rendered directly, never persisted by this component.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.thumbnailUrl}
                    alt={`Vue de rue à proximité ${index + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-[12px] font-bold text-slate-400">
                    Aperçu indisponible — ouvrir la vue source
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-extrabold text-deepblue">À {formatDistance(asset.distanceMeters)} du point de référence</p>
                  <p className="mt-0.5 text-[10.5px] font-semibold text-slate-400">
                    {capturedAt ? `Capture ${capturedAt}` : "Date de capture non fournie"}
                  </p>
                </div>
                {asset.viewerUrl ? <span aria-hidden="true" className="shrink-0 text-lg text-[#0B63CE]">↗</span> : null}
              </div>
            </article>
          );

          return asset.viewerUrl ? (
            <a
              key={asset.id}
              href={asset.viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ouvrir la vue de rue à proximité ${index + 1} chez ${model.attribution ?? "le provider"}`}
              className="block rounded-2xl outline-none ring-[#0B63CE] focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              {card}
            </a>
          ) : <div key={asset.id}>{card}</div>;
        })}
      </div>

      <p className="mt-3 text-[10.5px] leading-4 text-slate-400">
        {model.referenceKind === "property"
          ? "Distance mesurée entre la capture et la géographie exacte qualifiée de l’annonce."
          : "Distance mesurée depuis le point de contexte du quartier, pas depuis le bien."}
      </p>
    </section>
  );
}
