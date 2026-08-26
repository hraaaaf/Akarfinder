import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { LIVING_HERE_CATEGORY_LABELS } from "@/lib/geo/living-here";
import { getNeighborhoods, type NeighborhoodPoint } from "@/lib/map/canonical-neighborhood-data";
import { neighborhoodCoverageLabel } from "@/lib/neighborhood-context/presentation";
import {
  buildNeighborhoodContextRuntimeCatalog,
  type NeighborhoodContextReadModelV1,
} from "@/lib/neighborhood-context/read-model";

const FEATURED_IDS = ["rabat-agdal", "casablanca-maarif", "marrakech-gueliz"] as const;

function neighborhoodHref(point: NeighborhoodPoint) {
  return `/immobilier/${point.citySlug}/${point.neighborhoodSlug}`;
}

function coverageTone(status: NeighborhoodContextReadModelV1["coverage_status"] | "unavailable") {
  if (status === "covered") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "insufficient") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function NeighborhoodCard({ point, context }: { point: NeighborhoodPoint; context: NeighborhoodContextReadModelV1 | null }) {
  const coverage = context?.coverage_status ?? "unavailable";
  const categories = context?.categories.slice(0, 3) ?? [];
  const anchors = context?.anchors ?? [];

  return (
    <Link
      href={neighborhoodHref(point)}
      data-home-neighborhood-card
      data-neighborhood-context-converged={context?.canonical_neighborhood_id ?? "unavailable"}
      data-neighborhood-context-coverage={coverage}
      data-neighborhood-context-anchor-count={anchors.length}
      data-neighborhood-context-poi-ids={anchors.map((anchor) => anchor.poi_id).join(",")}
      className="group flex h-full min-w-0 flex-col rounded-[1.35rem] border border-[#DCE8F5] bg-white p-5 shadow-[0_12px_36px_rgba(11,31,58,0.06)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:shadow-[0_18px_46px_rgba(11,99,206,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 motion-reduce:transform-none sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#0B63CE]">{point.city}</p>
          <h3 className="mt-1.5 text-[1.45rem] font-extrabold tracking-[-0.035em] text-[#0B1F3A]">{point.neighborhood}</h3>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EEF6FF] text-[#0B63CE] transition group-hover:bg-[#0B63CE] group-hover:text-white">
          <ArrowRight size={17} strokeWidth={2.3} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.08em] ${coverageTone(coverage)}`}>
          {neighborhoodCoverageLabel(coverage)}
        </span>
        <span className="text-[11px] font-extrabold text-[#0B1F3A]">{anchors.length} repère{anchors.length > 1 ? "s" : ""} vérifié{anchors.length > 1 ? "s" : ""}</span>
      </div>

      {categories.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((category) => (
            <span key={category} className="rounded-full border border-[#DCE8F5] bg-[#F8FBFF] px-2.5 py-1 text-[10px] font-semibold text-slate-600">
              {LIVING_HERE_CATEGORY_LABELS[category]}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[10.5px] font-semibold leading-5 text-slate-500">Aucun repère frais certifié disponible. Rien n’est complété artificiellement.</p>
      )}

      <div className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4">
        <TrendingUp size={15} className="mt-0.5 shrink-0 text-[#0B63CE]" aria-hidden="true" />
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Repère prix</p>
          <p className="mt-1 text-[11px] font-bold leading-5 text-[#0B1F3A]">{point.priceSignal.label}</p>
        </div>
      </div>

      <span className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-4 text-[12px] font-extrabold text-[#0B63CE]">
        Explorer {point.neighborhood}
        <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
      </span>
    </Link>
  );
}

export function SignatureMapSection() {
  const neighborhoods = getNeighborhoods();
  const contextCatalog = buildNeighborhoodContextRuntimeCatalog();
  const featured = FEATURED_IDS
    .map((id) => neighborhoods.find((point) => point.id === id))
    .filter((point): point is NeighborhoodPoint => Boolean(point));

  if (featured.length === 0) return null;

  return (
    <section data-home-neighborhood-intelligence="nci-l5" className="bg-[#F7FAFE] py-10 sm:py-14 lg:py-16">
      <Container>
        <div className="mx-auto max-w-[1240px]">
          <div className="max-w-[720px]">
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.2em] text-[#0B63CE]">Vivre ici</p>
            <h2 className="mt-2 text-[1.8rem] font-extrabold leading-[1.05] tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.35rem]">
              Comprendre le quartier avant de visiter
            </h2>
            <p className="mt-2 max-w-[650px] text-[0.88rem] leading-6 text-slate-600 sm:text-[0.96rem]">
              Repères vérifiés et couverture réellement disponible, sans transformer des slogans de quartier en faits de proximité.
            </p>
          </div>

          <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
            {featured.map((point) => {
              const context = contextCatalog.find((entry) => entry.city_slug === point.citySlug && entry.neighborhood_slug === point.neighborhoodSlug) ?? null;
              return (
                <div key={point.id} className="w-[82vw] max-w-[340px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                  <NeighborhoodCard point={point} context={context} />
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
