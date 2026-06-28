"use client";

// SEARCH-MAP-RELOOKING-2 — Carte de recherche dark premium "type Mapbox".
// Rendu géographique : landmass Maroc remplie + côte dorée + graticule clippé
// sur les terres (pas de grille dashboard, pas de silhouette plate).
// Clusters gold élégants, labels masqués par défaut (hover/actif), halos doux.
// AUCUNE dépendance carte externe. Pins uniquement sur villes à coords validées.

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

  // SEARCH-RELOOKING-1B — labels des villes principales BIEN SÉPARÉES visibles par
  // défaut (placement prouvable). Rabat/Tétouan/Salé/Témara (zone côtière dense) en
  // hover/actif seul pour éviter le chevauchement.
  const PRIMARY_LABELS = new Set(["casablanca", "marrakech", "tanger", "agadir", "fes"]);

  const activeCoord = activeCity !== "all" ? getCityCoord(activeCity) : null;

  return (
    <aside className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_18px_50px_rgba(2,10,24,0.4)] backdrop-blur-md ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-4">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-400">Carte de recherche</p>
          <h2 className="mt-1 text-[1.3rem] font-extrabold tracking-[-0.03em] text-white">{displayCity}</h2>
          <p className="mt-0.5 text-[12.5px] font-semibold text-white/55">
            {stats.total} annonce{stats.total > 1 ? "s" : ""} analysée{stats.total > 1 ? "s" : ""}
          </p>
        </div>
        <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[10.5px] font-bold text-white/55">Carte indicative</span>
      </div>

      {/* Map zone */}
      <div className="relative min-h-[420px] overflow-hidden lg:min-h-[560px]">
        {/* Eau / fond océan-navy */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 60% 30%, #0a2038 0%, #061528 45%, #04101f 100%)" }} />
        {/* Lueur ambiante or très douce */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(40% 32% at 56% 26%, rgba(194,163,104,0.10), transparent 70%)" }} />

        {/* Landmass géographique (inline, contrôlée) */}
        <svg
          viewBox={MOROCCO_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ height: "90%", aspectRatio: "1 / 1" }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`landr-${uid}`} cx="0.45" cy="0.32" r="0.85">
              <stop offset="0%" stopColor="#1c3b5c" />
              <stop offset="55%" stopColor="#122c49" />
              <stop offset="100%" stopColor="#0c1f37" />
            </radialGradient>
            <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="26" result="b" />
              <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.76  0 0 0 0 0.64  0 0 0 0 0.41  0 0 0 0.6 0" />
            </filter>
            <clipPath id={`clip-${uid}`}>
              <path d={MOROCCO_PATH} />
            </clipPath>
          </defs>

          {/* Halo doux autour du pays */}
          <path d={MOROCCO_PATH} fill="#C2A368" filter={`url(#glow-${uid})`} opacity="0.5" />
          {/* Terre */}
          <path d={MOROCCO_PATH} fill={`url(#landr-${uid})`} stroke="#C2A368" strokeWidth="3.5" strokeOpacity="0.55" />
          {/* Graticule clippé sur les terres (lignes de relief subtiles) */}
          <g clipPath={`url(#clip-${uid})`} stroke="#ffffff" strokeOpacity="0.045" strokeWidth="2">
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 200} x2="2000" y2={i * 200} />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 200} y1="0" x2={i * 200} y2="2000" />
            ))}
          </g>
          {/* Liseré côtier intérieur subtil */}
          <path d={MOROCCO_PATH} fill="none" stroke="#cfe0f5" strokeWidth="1" strokeOpacity="0.12" />
        </svg>

        {/* Halo de la ville active (derrière les pins) */}
        {activeCoord ? (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
            style={{ left: `${activeCoord.x}%`, top: `${activeCoord.y}%`, width: 130, height: 130, background: "radial-gradient(circle, rgba(228,203,130,0.4), transparent 70%)" }}
          />
        ) : null}

        {/* Clusters */}
        {pins.map((pin) => {
          const tier = getClusterTier(pin.count);
          const isActive = activeCity !== "all" && pin.city.toLowerCase() === activeCity.toLowerCase();
          const showLabel = isActive || PRIMARY_LABELS.has(normalizeCityKey(pin.city));
          return (
            <button
              key={pin.city}
              type="button"
              onClick={() => onSelectCity(pin.city)}
              aria-label={`Voir les biens à ${pin.city} (${pin.count})`}
              className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none"
              style={{ left: `${pin.coord.x}%`, top: `${pin.coord.y}%` }}
            >
              {/* Halo doux */}
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-lg transition-opacity duration-200"
                style={{ width: tier.size * 2.1, height: tier.size * 2.1, backgroundColor: tier.glow, opacity: isActive ? 0.85 : 0.4 }}
              />
              {/* Pastille */}
              <span
                className="relative grid place-items-center rounded-full font-extrabold shadow-[0_3px_12px_rgba(0,0,0,0.4)] ring-1 ring-white/40 transition-transform duration-200 group-hover:scale-110"
                style={{ width: tier.size, height: tier.size, backgroundColor: tier.color, color: tier.text, fontSize: Math.max(9.5, tier.size * 0.34), boxShadow: isActive ? "0 0 0 2px rgba(255,255,255,0.85), 0 4px 14px rgba(0,0,0,0.45)" : undefined }}
              >
                {pin.count}
              </span>
              {/* Label — villes principales visibles, petites en survol */}
              <span
                className={`pointer-events-none absolute left-1/2 top-[calc(100%+5px)] -translate-x-1/2 whitespace-nowrap rounded-md bg-[#050f1f]/90 px-2 py-0.5 text-[10px] font-extrabold tracking-[0.02em] text-white ring-1 ring-white/10 backdrop-blur-sm transition-opacity duration-150 ${showLabel ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                {pin.city}
              </span>
            </button>
          );
        })}

        {/* Légende */}
        <div className="absolute left-4 top-4 z-10 rounded-xl border border-white/10 bg-[#050f1f]/80 p-3 backdrop-blur">
          <p className="mb-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-white/40">Volume</p>
          <ul className="space-y-1">
            {CLUSTER_TIERS.map((t) => (
              <li key={t.label} className="flex items-center gap-2 text-[10.5px] font-semibold text-white/60">
                <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/30" style={{ backgroundColor: t.color }} />
                {t.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Repères footer */}
        <div className="absolute bottom-4 left-4 right-4 z-10 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#050f1f]/80 p-3 text-white backdrop-blur sm:grid-cols-4">
          {[
            { k: "Annonces", v: String(stats.total) },
            { k: "Villes couvertes", v: String(stats.citiesCovered) },
            { k: "Indice moyen", v: stats.avgIndex != null ? `${stats.avgIndex}/100` : "—" },
            { k: "Mise à jour", v: stats.updatedLabel },
          ].map((s) => (
            <div key={s.k}>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-white/40">{s.k}</p>
              <p className="mt-0.5 text-[13px] font-extrabold text-white">{s.v}</p>
            </div>
          ))}
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
