"use client";

// SEARCH-RELOOKING-1 — Carte de recherche dark premium.
// Carte stylisée (SVG Maroc + clusters par ville), AUCUNE dépendance carte externe.
// Les pins sont positionnés via lib/search/city-coords (coords documentées),
// jamais au hasard. Les villes sans coordonnées sont comptées hors carte.

import { getCityCoord, getClusterTier, CLUSTER_TIERS } from "@/lib/search/city-coords";

export type CityCount = { city: string; count: number };

type SearchMapPanelProps = {
  cityCounts: CityCount[];
  otherCount: number;
  activeCity: string;
  onSelectCity: (city: string) => void;
  stats: {
    total: number;
    citiesCovered: number;
    avgIndex: number | null;
    updatedLabel: string;
  };
  className?: string;
};

export function SearchMapPanel({
  cityCounts,
  otherCount,
  activeCity,
  onSelectCity,
  stats,
  className = "",
}: SearchMapPanelProps) {
  const displayCity = activeCity === "all" ? "Maroc" : activeCity;
  const pins = cityCounts
    .map((c) => ({ ...c, coord: getCityCoord(c.city) }))
    .filter((c): c is CityCount & { coord: { x: number; y: number } } => c.coord !== null)
    .sort((a, b) => a.count - b.count); // gros clusters au-dessus

  return (
    <aside
      className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_18px_50px_rgba(2,10,24,0.4)] backdrop-blur-md ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-4">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-400">
            Carte de recherche
          </p>
          <h2 className="mt-1 text-[1.3rem] font-extrabold tracking-[-0.03em] text-white">
            {displayCity}
          </h2>
          <p className="mt-0.5 text-[12.5px] font-semibold text-white/55">
            {stats.total} annonce{stats.total > 1 ? "s" : ""} analysée{stats.total > 1 ? "s" : ""}
          </p>
        </div>
        <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[10.5px] font-bold text-white/55">
          Carte indicative
        </span>
      </div>

      {/* Map zone */}
      <div className="relative min-h-[420px] overflow-hidden bg-[#040d1f] lg:min-h-[560px]">
        {/* Ambient glow + grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_34%,rgba(194,163,104,0.16),transparent_40%),linear-gradient(160deg,#04101f,#0a2547)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:30px_30px]" />

        {/* Morocco silhouette — beige discret */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/maps/morocco-official.svg"
          alt="Carte indicative du Maroc — repères simplifiés"
          className="absolute left-1/2 top-1/2 h-[88%] -translate-x-1/2 -translate-y-1/2 object-contain"
          style={{ filter: "brightness(0) invert(0.82) sepia(0.45) saturate(1.3) hue-rotate(355deg)", opacity: 0.18 }}
        />

        {/* Cluster pins */}
        {pins.map((pin) => {
          const tier = getClusterTier(pin.count);
          const isActive = activeCity !== "all" && pin.city.toLowerCase() === activeCity.toLowerCase();
          return (
            <button
              key={pin.city}
              type="button"
              onClick={() => onSelectCity(pin.city)}
              aria-label={`Voir les biens à ${pin.city} (${pin.count})`}
              className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none"
              style={{ left: `${pin.coord.x}%`, top: `${pin.coord.y}%` }}
            >
              {/* Halo */}
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md transition-opacity duration-200 group-hover:opacity-90"
                style={{ width: tier.size * 1.7, height: tier.size * 1.7, backgroundColor: tier.glow, opacity: isActive ? 0.9 : 0.5 }}
              />
              {/* Pin */}
              <span
                className="relative grid place-items-center rounded-full font-extrabold text-[#05101f] shadow-[0_4px_14px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover:scale-110"
                style={{
                  width: tier.size,
                  height: tier.size,
                  backgroundColor: tier.color,
                  border: isActive ? "2px solid #fff" : "2px solid rgba(255,255,255,0.8)",
                  fontSize: Math.max(10, tier.size * 0.36),
                }}
              >
                {pin.count}
              </span>
              {/* Label */}
              <span
                className={`absolute left-1/2 top-[calc(100%+3px)] -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-[0.02em] backdrop-blur-sm transition ${
                  isActive
                    ? "bg-[#071B33] text-white shadow-[0_0_12px_rgba(194,163,104,0.5)]"
                    : "bg-[#071B33]/80 text-white/85 group-hover:text-white"
                }`}
              >
                {pin.city}
              </span>
            </button>
          );
        })}

        {/* Legend */}
        <div className="absolute left-4 top-4 rounded-xl border border-white/12 bg-[#040d1f]/85 p-3 backdrop-blur">
          <p className="mb-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-white/45">Volume</p>
          <ul className="space-y-1">
            {CLUSTER_TIERS.map((t) => (
              <li key={t.label} className="flex items-center gap-2 text-[10.5px] font-semibold text-white/65">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                {t.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Repères footer */}
        <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/12 bg-[#040d1f]/85 p-3 text-white backdrop-blur sm:grid-cols-4">
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

      {/* Hors carte */}
      {otherCount > 0 ? (
        <div className="border-t border-white/10 bg-white/[0.02] px-5 py-3">
          <p className="text-[11.5px] text-white/45">
            <span className="font-extrabold text-white/70">{otherCount}</span> bien
            {otherCount > 1 ? "s" : ""} dans d&apos;autres villes (non localisées sur la carte).
          </p>
        </div>
      ) : null}
    </aside>
  );
}
