"use client";

import { useId } from "react";
import { getCityCoord, getClusterTier, CLUSTER_TIERS, normalizeCityKey } from "@/lib/search/city-coords";
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
  cityCounts, otherCount, activeCity, onSelectCity, stats, className = "",
}: SearchMapPanelProps) {
  const uid = useId().replace(/:/g, "");
  const displayCity = activeCity === "all" ? "Maroc" : activeCity;
  const pins = cityCounts
    .map((c) => ({ ...c, coord: getCityCoord(c.city) }))
    .filter((c): c is CityCount & { coord: { x: number; y: number } } => c.coord !== null)
    .sort((a, b) => a.count - b.count);

  const primaryLabels = new Set(["casablanca", "marrakech", "tanger", "agadir", "fes"]);
  const mobileLabels = new Set(["casablanca", "marrakech", "agadir"]);
  const activeCoord = activeCity !== "all" ? getCityCoord(activeCity) : null;

  return (
    <aside className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_18px_50px_rgba(2,10,24,0.4)] backdrop-blur-md ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-4">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[#93C5FD]">Carte de recherche</p>
          <h2 className="mt-1 text-[1.3rem] font-extrabold tracking-[-0.03em] text-white">{displayCity}</h2>
          <p className="mt-0.5 text-[12.5px] font-semibold text-white/55">
            {stats.total} annonce{stats.total > 1 ? "s" : ""} analysée{stats.total > 1 ? "s" : ""}
          </p>
        </div>
        <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[10.5px] font-bold text-white/55">Carte indicative</span>
      </div>

      <div className="relative min-h-[480px] overflow-hidden lg:min-h-[640px]">
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 60% 30%, #0a2038 0%, #061528 45%, #04101f 100%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(40% 32% at 56% 26%, rgba(96,165,250,0.18), transparent 70%)" }} />

        <svg
          viewBox={MOROCCO_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ height: "90%", aspectRatio: "1 / 1" }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`landr-${uid}`} cx="0.45" cy="0.32" r="0.85">
              <stop offset="0%" stopColor="#18406f" />
              <stop offset="55%" stopColor="#102d4f" />
              <stop offset="100%" stopColor="#0b213c" />
            </radialGradient>
            <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="26" result="b" />
              <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.38  0 0 0 0 0.65  0 0 0 0 0.98  0 0 0 0.65 0" />
            </filter>
            <clipPath id={`clip-${uid}`}>
              <path d={MOROCCO_PATH} />
            </clipPath>
          </defs>

          <path d={MOROCCO_PATH} fill="#60A5FA" filter={`url(#glow-${uid})`} opacity="0.45" />
          <path d={MOROCCO_PATH} fill={`url(#landr-${uid})`} stroke="#60A5FA" strokeWidth="3.5" strokeOpacity="0.6" />
          <g clipPath={`url(#clip-${uid})`} stroke="#ffffff" strokeOpacity="0.045" strokeWidth="2">
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 200} x2="2000" y2={i * 200} />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 200} y1="0" x2={i * 200} y2="2000" />
            ))}
          </g>
          <path d={MOROCCO_PATH} fill="none" stroke="#dbeafe" strokeWidth="1" strokeOpacity="0.12" />
        </svg>

        {activeCoord ? (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
            style={{ left: `${activeCoord.x}%`, top: `${activeCoord.y}%`, width: 130, height: 130, background: "radial-gradient(circle, rgba(96,165,250,0.42), transparent 70%)" }}
          />
        ) : null}

        {pins.map((pin) => {
          const tier = getClusterTier(pin.count);
          const isActive = activeCity !== "all" && pin.city.toLowerCase() === activeCity.toLowerCase();
          const cityKey = normalizeCityKey(pin.city);
          const showLabelMobile = isActive || mobileLabels.has(cityKey);
          const showLabelDesktopOnly = !showLabelMobile && primaryLabels.has(cityKey);
          return (
            <button
              key={pin.city}
              type="button"
              onClick={() => onSelectCity(pin.city)}
              aria-label={`Voir les biens à ${pin.city} (${pin.count})`}
              className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none"
              style={{ left: `${pin.coord.x}%`, top: `${pin.coord.y}%` }}
            >
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-lg transition-opacity duration-200"
                style={{ width: tier.size * 2.1, height: tier.size * 2.1, backgroundColor: tier.glow, opacity: isActive ? 0.85 : 0.4 }}
              />
              <span
                className="relative grid place-items-center rounded-full font-extrabold shadow-[0_3px_12px_rgba(0,0,0,0.4)] ring-1 ring-white/40 transition-transform duration-200 group-hover:scale-110"
                style={{ width: tier.size, height: tier.size, backgroundColor: tier.color, color: tier.text, fontSize: Math.max(9.5, tier.size * 0.34), boxShadow: isActive ? "0 0 0 2px rgba(255,255,255,0.85), 0 4px 14px rgba(0,0,0,0.45)" : undefined }}
              >
                {pin.count}
              </span>
              <span
                className={`pointer-events-none absolute left-1/2 top-[calc(100%+5px)] -translate-x-1/2 whitespace-nowrap rounded-md bg-[#050f1f]/90 px-2 py-0.5 text-[9.5px] font-extrabold tracking-[0.02em] text-white ring-1 ring-white/10 backdrop-blur-sm transition-opacity duration-150 ${showLabelMobile ? "opacity-100" : showLabelDesktopOnly ? "opacity-0 sm:opacity-100 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                {pin.city}
              </span>
            </button>
          );
        })}

        <div className="absolute left-3 top-3 z-10 rounded-xl border border-white/10 bg-[#050f1f]/85 p-2 backdrop-blur sm:left-4 sm:top-4 sm:p-3">
          <p className="mb-1.5 hidden text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-white/40 sm:block">Volume</p>
          <ul className="flex items-center gap-1.5 sm:flex-col sm:items-start sm:gap-0 sm:space-y-1">
            {CLUSTER_TIERS.map((tier) => (
              <li key={tier.label} className="flex items-center gap-1.5 sm:gap-2">
                <span className="inline-block h-2 w-2 rounded-full ring-1 ring-white/30 sm:h-2.5 sm:w-2.5" style={{ backgroundColor: tier.color }} />
                <span className="hidden text-[10.5px] font-semibold text-white/60 sm:inline">{tier.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center gap-3 rounded-xl border border-white/10 bg-[#050f1f]/85 px-4 py-2.5 text-white backdrop-blur sm:bottom-4 sm:left-4 sm:right-4 sm:gap-5 sm:rounded-2xl sm:px-5 sm:py-3">
          <div className="shrink-0">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/35 sm:text-[9.5px]">Annonces</p>
            <p className="mt-0.5 text-[12px] font-extrabold text-white sm:text-[13px]">{stats.total}</p>
          </div>
          <div className="shrink-0 border-l border-white/10 pl-3 sm:pl-5">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/35 sm:text-[9.5px]">Villes</p>
            <p className="mt-0.5 text-[12px] font-extrabold text-white sm:text-[13px]">{stats.citiesCovered}</p>
          </div>
          {stats.avgIndex != null ? (
            <div className="shrink-0 border-l border-white/10 pl-3 sm:pl-5">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/35 sm:text-[9.5px]">Score moy.</p>
              <p className="mt-0.5 text-[12px] font-extrabold text-white sm:text-[13px]">{stats.avgIndex}/100</p>
            </div>
          ) : null}
          <div className="ml-auto shrink-0 text-right">
            <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#93C5FD]/75 sm:text-[9px]">AkarFinder</p>
            <p className="mt-0.5 text-[8.5px] font-medium text-white/35 sm:text-[9.5px]">Carte indicative</p>
          </div>
        </div>
      </div>

      {otherCount > 0 ? (
        <div className="border-t border-white/10 bg-white/[0.02] px-5 py-3">
          <p className="text-[11.5px] text-white/45">
            <span className="font-extrabold text-white/70">{otherCount}</span> bien{otherCount > 1 ? "s" : ""} dans d&apos;autres villes (non localisées sur la carte).
          </p>
        </div>
      ) : null}
    </aside>
  );
}
