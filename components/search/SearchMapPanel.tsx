"use client";

// MAP-EXPERIENCE-REDESIGN-MCP-1 — repères ville/zone premium blanc/bleu.
// Ne représente jamais une densité d'annonces : taille de repère uniforme,
// pas de tiering par volume de biens, pas de compteur d'annonces affiché.
import { useId } from "react";
import { getCityCoord, normalizeCityKey, CITY_MARKER, CITY_MARKER_ACTIVE } from "@/lib/search/city-coords";
import { MOROCCO_PATH, MOROCCO_VIEWBOX } from "@/lib/search/morocco-path";

export type CityCount = { city: string; count: number };

type SearchMapPanelProps = {
  cityCounts: CityCount[];
  otherCount: number;
  activeCity: string;
  onSelectCity: (city: string) => void;
  stats: { total: number; citiesCovered: number; avgIndex: number | null; updatedLabel: string };
  className?: string;
};

export function SearchMapPanel({
  cityCounts, activeCity, onSelectCity, className = "",
}: SearchMapPanelProps) {
  const uid = useId().replace(/:/g, "");
  const displayCity = activeCity === "all" ? "Maroc" : activeCity;
  const pins = cityCounts
    .map((c) => ({ ...c, coord: getCityCoord(c.city) }))
    .filter((c): c is CityCount & { coord: { x: number; y: number } } => c.coord !== null);

  const primaryLabels = new Set(["casablanca", "marrakech", "tanger", "agadir", "fes"]);
  const mobileLabels = new Set(["casablanca", "marrakech", "agadir"]);
  const activeCoord = activeCity !== "all" ? getCityCoord(activeCity) : null;

  return (
    <aside className={`overflow-hidden rounded-2xl border border-[#e4e9f2] bg-white shadow-[0_18px_50px_rgba(15,35,65,0.08)] ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-[#eef2f8] bg-[#f8fafc] px-5 py-4">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">Repères ville</p>
          <h2 className="mt-1 text-[1.3rem] font-extrabold tracking-[-0.03em] text-[#071B33]">{displayCity}</h2>
          <p className="mt-0.5 text-[12.5px] font-semibold text-slate-500">
            Explorez les zones pour cette recherche
          </p>
        </div>
        <span className="rounded-full border border-[#e4e9f2] bg-white px-3 py-1.5 text-[10.5px] font-bold text-slate-500">Carte indicative</span>
      </div>

      <div className="relative min-h-[480px] overflow-hidden lg:min-h-[640px]">
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #eef4ff 0%, #f7f9fc 55%, #ffffff 100%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(45% 35% at 56% 26%, rgba(37,99,235,0.10), transparent 70%)" }} />

        <svg
          viewBox={MOROCCO_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ height: "90%", aspectRatio: "1 / 1" }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`landr-${uid}`} cx="0.45" cy="0.32" r="0.85">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#eef4ff" />
              <stop offset="100%" stopColor="#e2eaf7" />
            </radialGradient>
          </defs>

          <path d={MOROCCO_PATH} fill={`url(#landr-${uid})`} stroke="#2563EB" strokeWidth="3" strokeOpacity="0.35" />
          <path d={MOROCCO_PATH} fill="none" stroke="#0f2d52" strokeWidth="1" strokeOpacity="0.08" />
        </svg>

        {activeCoord ? (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
            style={{ left: `${activeCoord.x}%`, top: `${activeCoord.y}%`, width: 120, height: 120, background: "radial-gradient(circle, rgba(155,120,56,0.28), transparent 70%)" }}
          />
        ) : null}

        {pins.map((pin) => {
          const isActive = activeCity !== "all" && pin.city.toLowerCase() === activeCity.toLowerCase();
          const style = isActive ? CITY_MARKER_ACTIVE : CITY_MARKER;
          const cityKey = normalizeCityKey(pin.city);
          const showLabelMobile = isActive || mobileLabels.has(cityKey);
          const showLabelDesktopOnly = !showLabelMobile && primaryLabels.has(cityKey);
          return (
            <button
              key={pin.city}
              type="button"
              onClick={() => onSelectCity(pin.city)}
              aria-label={`Explorer les repères à ${pin.city}`}
              className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none"
              style={{ left: `${pin.coord.x}%`, top: `${pin.coord.y}%` }}
            >
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md transition-opacity duration-200"
                style={{ width: style.size * 1.8, height: style.size * 1.8, backgroundColor: style.glow, opacity: isActive ? 0.9 : 0.5 }}
              />
              <span
                className="relative grid place-items-center rounded-full ring-2 ring-white transition-transform duration-200 group-hover:scale-110"
                style={{ width: style.size, height: style.size, backgroundColor: style.color, boxShadow: "0 2px 8px rgba(15,35,65,0.25)" }}
              />
              <span
                className={`pointer-events-none absolute left-1/2 top-[calc(100%+5px)] -translate-x-1/2 whitespace-nowrap rounded-md bg-[#071B33] px-2 py-0.5 text-[9.5px] font-extrabold tracking-[0.02em] text-white shadow-sm transition-opacity duration-150 ${showLabelMobile ? "opacity-100" : showLabelDesktopOnly ? "opacity-0 sm:opacity-100 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                {pin.city}
              </span>
            </button>
          );
        })}

        <div className="absolute left-3 top-3 z-10 rounded-xl border border-[#e4e9f2] bg-white/90 p-2 backdrop-blur sm:left-4 sm:top-4 sm:p-2.5">
          <ul className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-1.5">
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: CITY_MARKER.color }} />
              <span className="text-[10.5px] font-semibold text-slate-600">Ville disponible</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: CITY_MARKER_ACTIVE.color }} />
              <span className="text-[10.5px] font-semibold text-slate-600">Ville sélectionnée</span>
            </li>
          </ul>
        </div>

        <div className="absolute bottom-3 left-3 right-3 z-10 rounded-xl border border-[#e4e9f2] bg-white/95 px-4 py-2.5 backdrop-blur sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-2xl sm:px-5 sm:py-3">
          <p className="text-[11px] leading-4 text-slate-500">
            Repères indicatifs · cliquez une ville pour filtrer les résultats.
          </p>
        </div>
      </div>
    </aside>
  );
}
