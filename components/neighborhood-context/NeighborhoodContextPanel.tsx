import { MapPin } from "lucide-react";
import { LIVING_HERE_CATEGORY_LABELS } from "@/lib/geo/living-here";
import type { NeighborhoodContextReadModelV1 } from "@/lib/neighborhood-context/read-model";
import {
  formatNeighborhoodContextObservedAt,
  neighborhoodCoverageDescription,
  neighborhoodCoverageLabel,
} from "@/lib/neighborhood-context/presentation";

type NeighborhoodContextPanelProps = {
  model: NeighborhoodContextReadModelV1 | null;
  city: string;
  neighborhood: string;
  variant?: "compact" | "detail";
  className?: string;
};

function coverageTone(status: NeighborhoodContextReadModelV1["coverage_status"] | "unavailable") {
  if (status === "covered") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "insufficient") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function NeighborhoodContextPanel({
  model,
  city,
  neighborhood,
  variant = "detail",
  className = "",
}: NeighborhoodContextPanelProps) {
  const coverage = model?.coverage_status ?? "unavailable";
  const anchors = model?.anchors ?? [];
  const visibleAnchors = anchors.slice(0, variant === "compact" ? 3 : 5);
  const observedAt = formatNeighborhoodContextObservedAt(model?.source.observed_at);
  const attribution = Array.from(new Set(anchors.map((anchor) => anchor.attribution).filter(Boolean)));

  return (
    <section
      data-neighborhood-context-converged={model?.canonical_neighborhood_id ?? "unavailable"}
      data-neighborhood-context-coverage={coverage}
      data-neighborhood-context-anchor-count={anchors.length}
      data-neighborhood-context-poi-ids={anchors.map((anchor) => anchor.poi_id).join(",")}
      className={`rounded-2xl border border-slate-200 bg-white ${variant === "compact" ? "p-4" : "p-4 sm:p-5"} ${className}`}
      aria-label={`Vivre ici à ${neighborhood}, ${city}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B63CE]">Vivre ici · repères vérifiés</p>
          <p className="mt-1 text-[14px] font-extrabold text-[#0B2545]">{neighborhood}, {city}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.08em] ${coverageTone(coverage)}`}>
          {neighborhoodCoverageLabel(coverage)} · {anchors.length}
        </span>
      </div>

      {visibleAnchors.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {visibleAnchors.map((anchor) => (
            <div
              key={anchor.poi_id}
              data-neighborhood-context-poi={anchor.poi_id}
              className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-[#0B63CE]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-extrabold text-[#0B2545]">{anchor.name}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                  {LIVING_HERE_CATEGORY_LABELS[anchor.category]}
                  {anchor.territorial_wording ? ` · ${anchor.territorial_wording}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3">
          <p className="text-[11px] font-bold text-slate-600">{neighborhoodCoverageDescription(coverage)}</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-400">AkarFinder n’ajoute aucun repère lorsque la preuve fraîche manque.</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] font-semibold text-slate-400">
        {observedAt ? <span>Observation : {observedAt}</span> : null}
        {attribution.length > 0 ? <span>Source : {attribution.slice(0, 2).join(" · ")}</span> : null}
        {anchors.length > visibleAnchors.length ? <span>{anchors.length - visibleAnchors.length} autre{anchors.length - visibleAnchors.length > 1 ? "s" : ""} repère{anchors.length - visibleAnchors.length > 1 ? "s" : ""}</span> : null}
      </div>
    </section>
  );
}
