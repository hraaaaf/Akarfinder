// P10C — "Vie autour du bien" block
// Displays indicative proximity data for a listing.
// All data is indicative — never claim real-time accuracy.

import type { ProximityCategory, ProximityPoint } from "@/lib/proximity/types";

const CATEGORY_EMOJI: Record<ProximityCategory, string> = {
  marche_souk: "🛒",
  supermarche:  "🏪",
  hanout:       "🏬",
  taxi:         "🚕",
  transport:    "🚌",
  pharmacie:    "💊",
  ecole:        "🎓",
  mosquee:      "🕌",
  clinique:     "🏥",
  banque:       "🏦",
  parking:      "🅿️",
  cafe:         "☕",
  espace_vert:  "🌿",
};

const ALL_CATEGORIES: ProximityCategory[] = [
  "marche_souk",
  "supermarche",
  "hanout",
  "taxi",
  "transport",
  "pharmacie",
  "ecole",
  "mosquee",
  "clinique",
  "banque",
  "parking",
  "cafe",
  "espace_vert",
];

// Priority categories shown first
const PRIORITY_CATEGORIES: ProximityCategory[] = [
  "transport",
  "taxi",
  "supermarche",
  "pharmacie",
  "ecole",
  "mosquee",
];

const MIN_POINTS = 3;
const SCORE_THRESHOLD_MINUTES = 15;

type ProximityBlockProps = {
  city: string;
  points: ProximityPoint[];
};

function ConfidenceTag({ confidence }: { confidence: ProximityPoint["confidence"] }) {
  const colors: Record<string, string> = {
    "élevé":    "bg-[#dcfce7] text-[#166534]",
    "moyen":    "bg-[#fef9c3] text-[#854d0e]",
    "indicatif": "bg-[#f1f5f9] text-[#475569]",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${colors[confidence] ?? colors["indicatif"]}`}>
      {confidence}
    </span>
  );
}

export function ProximityBlock({ city, points }: ProximityBlockProps) {
  if (points.length < MIN_POINTS) {
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
      </div>
    );
  }

  // Count categories accessible within threshold
  const accessibleCategories = new Set(
    points
      .filter((p) => p.distance_minutes <= SCORE_THRESHOLD_MINUTES)
      .map((p) => p.category)
  ).size;

  const scoreLabel = `${accessibleCategories} / ${ALL_CATEGORIES.length} repères disponibles`;

  // Sort: priority categories first, then rest
  const sortedPoints = [...points].sort((a, b) => {
    const ai = PRIORITY_CATEGORIES.indexOf(a.category);
    const bi = PRIORITY_CATEGORIES.indexOf(b.category);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });

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

        {/* Score vie quotidienne */}
        <div className="rounded-xl border border-[#c7dff7] bg-[#f0f7ff] px-3 py-2 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1a4a8a]">
            Score vie quotidienne AkarFinder
          </p>
          <p className="mt-0.5 text-[1.4rem] font-extrabold leading-none text-deepblue">
            {accessibleCategories}
            <span className="text-[0.9rem] font-bold text-gray-400"> / {ALL_CATEGORIES.length}</span>
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-[#2563eb]">
            {accessibleCategories} repères ≤&nbsp;15&nbsp;min
          </p>
        </div>
      </div>

      <p className="mt-1 text-[12px] text-gray-400">
        {city} — services repérés autour du quartier
      </p>

      {/* Points grid */}
      <div className="mt-4 grid grid-cols-1 gap-2 pb-2 sm:grid-cols-2 sm:pb-0">
        {sortedPoints.map((point) => (
          <div
            key={`${point.category}-${point.label}`}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#fafafa] px-3.5 py-3"
          >
            <span className="flex items-center gap-2.5 text-[13px] font-semibold text-gray-700">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[1.1rem] shadow-[0_1px_4px_rgba(0,0,0,0.07)]"
                aria-hidden="true"
              >
                {CATEGORY_EMOJI[point.category]}
              </span>
              <span className="leading-snug">
                <span className="block">{point.label}</span>
                <ConfidenceTag confidence={point.confidence} />
              </span>
            </span>
            <span className="ml-2 shrink-0 text-right">
              <span className="block text-[13.5px] font-extrabold text-deepblue">
                {point.distance_minutes}&nbsp;min
              </span>
              <span className="block text-[10px] text-gray-400">
                {point.mode}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <div className="mt-4 space-y-1 border-t border-[#f0e6d2] pt-3">
        <p className="text-[11.5px] font-semibold text-gray-500">
          Repères indicatifs à confirmer lors de la visite — données issues d'OpenStreetMap, non vérifiées en temps réel.
        </p>
        <p className="text-[11px] text-gray-400">
          Durées estimées selon le quartier. À confirmer selon adresse exacte.
        </p>
      </div>
    </div>
  );
}
