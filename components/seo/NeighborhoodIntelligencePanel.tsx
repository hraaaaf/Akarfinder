import { NeighborhoodContextPanel } from "@/components/neighborhood-context/NeighborhoodContextPanel";
import { getNeighborhoodContextReadModelBySlugs } from "@/lib/neighborhood-context/read-model";
import type { NeighborhoodMetadata } from "@/lib/seo-neighborhood-pages/types";

const CONFIDENCE_LABEL: Record<"high" | "medium" | "low", string> = {
  high: "Confiance élevée",
  medium: "Confiance moyenne",
  low: "Confiance limitée",
};

export function NeighborhoodIntelligencePanel({ neighborhood }: { neighborhood: NeighborhoodMetadata }) {
  const intelligence = neighborhood.intelligence;
  const contextModel = getNeighborhoodContextReadModelBySlugs(neighborhood.citySlug, neighborhood.slug);
  if (!intelligence && !contextModel) return null;

  return (
    <section className="border-y border-slate-200 bg-slate-50 px-4 py-10" aria-labelledby="quartier-intelligence-title">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">Repères quartier</p>
          <h2 id="quartier-intelligence-title" className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-[#0B1F3A]">
            {neighborhood.displayName} en quelques repères
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Données indicatives issues des référentiels vérifiés AkarFinder. Une information absente n’est jamais inventée.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {intelligence?.priceLabel ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Repère prix</p>
              <p className="mt-2 text-xl font-extrabold text-[#0B1F3A]">{intelligence.priceLabel}</p>
              {intelligence.pricePeriod ? <p className="mt-1 text-xs text-slate-500">{intelligence.pricePeriod}</p> : null}
              {intelligence.confidence ? <p className="mt-2 text-xs font-bold text-[#0B63CE]">{CONFIDENCE_LABEL[intelligence.confidence]}</p> : null}
            </article>
          ) : null}

          <div className="md:col-span-2">
            <NeighborhoodContextPanel
              model={contextModel}
              city={neighborhood.cityDisplayName}
              neighborhood={neighborhood.displayName}
              variant="compact"
              className="h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
