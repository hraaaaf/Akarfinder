// REAL-PROXIMITY-ENGINE-1 — "Vie autour du bien" block
// Accepts RealProximityProfile from computeRealProximityProfile().
// All data is indicative — never claim real-time accuracy.

import type { RealProximityProfile, RealPoiType } from "@/lib/proximity/proximity-types";
import { basisToSourceLabel, confidenceLabel } from "@/lib/proximity/proximity-engine";

const POI_EMOJI: Record<RealPoiType, string> = {
  transport:     "🚌",
  school:        "🎓",
  supermarket:   "🏪",
  mosque:        "🕌",
  clinic:        "🏥",
  pharmacy:      "💊",
  train_station: "🚂",
  beach:         "🏖️",
  market:        "🛒",
  cafe:          "☕",
  park:          "🌿",
  bank:          "🏦",
  parking:       "🅿️",
  other:         "📍",
};

// Confidence pill colors
const CONFIDENCE_COLORS: Record<RealProximityProfile["confidence"], string> = {
  high:   "bg-[#dcfce7] text-[#166534]",
  medium: "bg-[#fef9c3] text-[#854d0e]",
  low:    "bg-[#f1f5f9] text-[#475569]",
};

type ProximityBlockProps = {
  profile: RealProximityProfile;
};

export function ProximityBlock({ profile }: ProximityBlockProps) {
  const { items, confidence, basis, disclaimer } = profile;

  // Empty state
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f1f5f9] text-xl" aria-hidden="true">
            🗺️
          </span>
          <h2 className="text-[1.15rem] font-extrabold tracking-[-0.03em] text-deepblue">
            Vie autour du bien
          </h2>
        </div>
        <p className="mt-3 text-[13.5px] text-gray-500">
          Données de proximité non disponibles pour ce secteur.
        </p>
        <p className="mt-2 text-[11.5px] text-gray-400">{disclaimer}</p>
      </div>
    );
  }

  const confidencePillClass = CONFIDENCE_COLORS[confidence];
  const basisLabel = basisToSourceLabel(basis);
  const confLabel = confidenceLabel(confidence);

  return (
    <div className="rounded-2xl border border-[#eadfca] bg-white p-5 pb-6 shadow-[0_6px_22px_rgba(7,27,51,0.04)] sm:pb-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eff6ff] text-xl" aria-hidden="true">
            🗺️
          </span>
          <h2 className="text-[1.15rem] font-extrabold tracking-[-0.03em] text-deepblue">
            Vie autour du bien
          </h2>
        </div>

        {/* Confidence badge */}
        <div className="rounded-xl border border-[#c7dff7] bg-[#f0f7ff] px-3 py-2 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1a4a8a]">
            Repères cartographiques
          </p>
          <p className="mt-0.5 text-[1.1rem] font-extrabold leading-none text-deepblue">
            {items.length}
          </p>
          <p className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${confidencePillClass}`}>
            {confLabel}
          </p>
        </div>
      </div>

      <p className="mt-1 text-[12px] text-gray-400">
        {basisLabel}
      </p>

      {/* Items grid */}
      <div className="mt-4 grid grid-cols-1 gap-2 pb-2 sm:grid-cols-2 sm:pb-0">
        {items.map((item) => (
          <div
            key={`${item.type}-${item.label}`}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#fafafa] px-3.5 py-3"
          >
            <span className="flex items-center gap-2.5 text-[13px] font-semibold text-gray-700">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[1.1rem] shadow-[0_1px_4px_rgba(0,0,0,0.07)]"
                aria-hidden="true"
              >
                {POI_EMOJI[item.type]}
              </span>
              <span className="leading-snug">
                <span className="block">{item.label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${CONFIDENCE_COLORS[item.confidence]}`}>
                  {item.source === "gps_computed" ? "GPS" : item.source === "osm_static" ? "OSM" : "indicatif"}
                </span>
              </span>
            </span>
            <span className="ml-2 shrink-0 text-right">
              <span className={`block text-[12px] font-semibold ${item.walking_minutes != null ? "text-deepblue font-extrabold text-[13.5px]" : "italic text-gray-500"}`}>
                {item.display_label}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <div className="mt-4 space-y-1 border-t border-[#f0e6d2] pt-3">
        <p className="text-[11.5px] font-semibold text-gray-500">
          {disclaimer}
        </p>
        <p className="text-[11px] text-gray-400">
          Données issues d'OpenStreetMap (dataset statique). Aucun appel temps réel.
        </p>
      </div>
    </div>
  );
}
