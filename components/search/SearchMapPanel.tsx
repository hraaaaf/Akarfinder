"use client";

import { useId, useMemo, useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import { MapAtlasLayerSwitcher } from "@/components/search/MapAtlasLayerSwitcher";
import { SearchMapNeighborhoodDock } from "@/components/search/SearchMapNeighborhoodDock";
import { usePropertySelection } from "@/components/search/PropertySelectionProvider";
import { formatPrice } from "@/lib/listings/utils";
import {
  CITY_MARKER,
  CITY_MARKER_ACTIVE,
  getCityCoord,
  normalizeCityKey,
} from "@/lib/search/city-coords";
import { MOROCCO_PATH, MOROCCO_VIEWBOX } from "@/lib/search/morocco-path";
import {
  buildCertifiedPropertyMapPoints,
  hasCertifiedExactCoordinates,
} from "@/lib/ux/certified-property-map";
import {
  DEFAULT_MAP_ATLAS_AVAILABILITY,
  MAP_ATLAS_LAYERS,
  resolveMapAtlasLayer,
  type MapAtlasAvailability,
  type MapAtlasLayer,
} from "@/lib/ux/map-atlas";

export type CityCount = { city: string; count: number };

type SearchMapPanelProps = {
  cityCounts: CityCount[];
  otherCount: number;
  activeCity: string;
  onSelectCity: (city: string) => void;
  stats: { total: number; citiesCovered: number; avgIndex: number | null; updatedLabel: string };
  atlasAvailability?: MapAtlasAvailability;
  className?: string;
};

export function SearchMapPanel({
  cityCounts,
  otherCount,
  activeCity,
  onSelectCity,
  stats,
  atlasAvailability = DEFAULT_MAP_ATLAS_AVAILABILITY,
  className = "",
}: SearchMapPanelProps) {
  const uid = useId().replace(/:/g, "");
  const [requestedLayer, setRequestedLayer] = useState<MapAtlasLayer>("listings");
  const {
    activeListing,
    selection,
    visibleListings,
    hoverListing,
    clearHover,
    selectListing,
    clearSelection,
    isActive,
  } = usePropertySelection();

  const activeLayer = resolveMapAtlasLayer(requestedLayer, atlasAvailability);
  const activeLayerDefinition = MAP_ATLAS_LAYERS.find((layer) => layer.id === activeLayer);
  const exactPropertyPoints = useMemo(
    () => buildCertifiedPropertyMapPoints(visibleListings),
    [visibleListings],
  );
  const selectedCity = activeListing?.city?.trim() || null;
  const visualActiveCity = selectedCity ?? activeCity;
  const displayCity = activeCity === "all" ? "Maroc" : activeCity;
  const pins = cityCounts
    .map((city) => ({ ...city, coord: getCityCoord(city.city) }))
    .filter((city): city is CityCount & { coord: { x: number; y: number } } => city.coord !== null);
  const primaryLabels = new Set(["casablanca", "marrakech", "tanger", "agadir", "fes"]);
  const mobileLabels = new Set(["casablanca", "marrakech", "agadir"]);
  const activeCoord = visualActiveCity !== "all" ? getCityCoord(visualActiveCity) : null;
  const activeHasCertifiedExactCoordinates = activeListing
    ? hasCertifiedExactCoordinates(activeListing)
    : false;

  return (
    <aside className={`overflow-hidden rounded-2xl border border-[#e4e9f2] bg-white shadow-[0_18px_50px_rgba(15,35,65,0.08)] ${className}`}>
      <div className="border-b border-[#eef2f8] bg-[#f8fafc] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">Zones des résultats affichés</p>
            <h2 className="mt-1 text-[1.3rem] font-extrabold tracking-[-0.03em] text-[#071B33]">{displayCity}</h2>
            <p className="mt-0.5 text-[12.5px] font-semibold text-slate-500">
              {stats.total} fiche{stats.total !== 1 ? "s" : ""} indexée{stats.total !== 1 ? "s" : ""} · {stats.citiesCovered} ville{stats.citiesCovered !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="rounded-full border border-[#e4e9f2] bg-white px-3 py-1.5 text-[10.5px] font-bold text-slate-500">Carte indicative</span>
            {exactPropertyPoints.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9.5px] font-extrabold text-emerald-700">
                <LocateFixed size={10} aria-hidden="true" /> {exactPropertyPoints.length} position{exactPropertyPoints.length > 1 ? "s" : ""} exacte{exactPropertyPoints.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-3">
          <MapAtlasLayerSwitcher value={activeLayer} availability={atlasAvailability} onChange={setRequestedLayer} />
          <p className="mt-2 text-[10.5px] leading-4 text-slate-500">{activeLayerDefinition?.description}</p>
        </div>
      </div>

      <div className="relative min-h-[480px] overflow-hidden lg:min-h-[640px]">
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #eef4ff 0%, #f7f9fc 55%, #ffffff 100%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(45% 35% at 56% 26%, rgba(37,99,235,0.10), transparent 70%)" }} />
        <svg viewBox={MOROCCO_VIEWBOX} preserveAspectRatio="xMidYMid meet" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ height: "90%", aspectRatio: "1 / 1" }} aria-hidden="true">
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

        {activeCoord && !activeHasCertifiedExactCoordinates ? (
          <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl" style={{ left: `${activeCoord.x}%`, top: `${activeCoord.y}%`, width: 120, height: 120, background: "radial-gradient(circle, rgba(37,99,235,0.25), transparent 70%)" }} />
        ) : null}

        {pins.map((pin) => {
          const active = visualActiveCity !== "all" && pin.city.toLowerCase() === visualActiveCity.toLowerCase();
          const style = active ? CITY_MARKER_ACTIVE : CITY_MARKER;
          const cityKey = normalizeCityKey(pin.city);
          const showLabelMobile = active || mobileLabels.has(cityKey);
          const showLabelDesktopOnly = !showLabelMobile && primaryLabels.has(cityKey);
          return (
            <button key={pin.city} type="button" onClick={() => onSelectCity(pin.city)} aria-label={`Filtrer les ${pin.count} résultats affichés à ${pin.city}`} aria-pressed={active} className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none" style={{ left: `${pin.coord.x}%`, top: `${pin.coord.y}%` }}>
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md transition-opacity duration-200" style={{ width: style.size * 1.8, height: style.size * 1.8, backgroundColor: style.glow, opacity: active ? 0.9 : 0.5 }} />
              <span className="relative grid place-items-center rounded-full ring-2 ring-white transition-transform duration-200 group-hover:scale-110" style={{ width: style.size, height: style.size, backgroundColor: style.color, boxShadow: "0 2px 8px rgba(15,35,65,0.25)" }}>
                <span className="text-[9px] font-extrabold text-white">{pin.count}</span>
              </span>
              <span className={`pointer-events-none absolute left-1/2 top-[calc(100%+5px)] -translate-x-1/2 whitespace-nowrap rounded-md bg-[#071B33] px-2 py-0.5 text-[9.5px] font-extrabold tracking-[0.02em] text-white shadow-sm transition-opacity duration-150 ${showLabelMobile ? "opacity-100" : showLabelDesktopOnly ? "opacity-0 sm:opacity-100 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                {pin.city} · {pin.count}
              </span>
            </button>
          );
        })}

        {exactPropertyPoints.map((point) => {
          const active = isActive(point.listing);
          return (
            <button key={point.canonicalPropertyId} type="button" onMouseEnter={() => hoverListing(point.listing, "map")} onMouseLeave={clearHover} onFocus={() => hoverListing(point.listing, "map")} onBlur={clearHover} onClick={() => selectListing(point.listing, "map")} aria-label={`Sélectionner ${point.listing.title}, position exacte certifiée`} aria-pressed={active && selection.interaction === "selected"} className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 focus:outline-none" style={{ left: `${5 + point.x * 0.9}%`, top: `${5 + point.y * 0.9}%` }}>
              <span className={`absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/30 blur-md transition ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
              <span className={`relative grid h-5 w-5 place-items-center rounded-full border-2 border-white shadow-[0_3px_10px_rgba(6,78,59,0.35)] transition group-hover:scale-125 ${active ? "scale-125 bg-bronze-500" : "bg-emerald-600"}`}><LocateFixed size={10} className="text-white" aria-hidden="true" /></span>
              <span className={`pointer-events-none absolute left-1/2 top-[calc(100%+6px)] max-w-[190px] -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#071B33] px-2.5 py-1 text-[9.5px] font-bold text-white shadow-lg transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus:opacity-100"}`}>
                {point.listing.neighborhood ? `${point.listing.city}, ${point.listing.neighborhood}` : point.listing.city}
              </span>
            </button>
          );
        })}

        <div className="absolute left-3 top-3 z-10 rounded-xl border border-[#e4e9f2] bg-white/90 p-2 backdrop-blur sm:left-4 sm:top-4 sm:p-2.5">
          <p className="max-w-[230px] text-[10.5px] leading-4 text-slate-600">Les nombres correspondent aux fiches indexées actuellement affichées dans cette recherche. Les petits marqueurs verts correspondent uniquement aux coordonnées exactes certifiées des cartes visibles. Cette carte n'est pas une estimation du volume total du marché.</p>
          {otherCount > 0 ? <p className="mt-1.5 text-[10px] font-semibold text-slate-500">{otherCount} fiche{otherCount > 1 ? "s" : ""} sans repère ville cartographiable.</p> : null}
        </div>

        {activeListing ? (
          <div className="absolute bottom-16 left-3 right-3 z-30 rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-[0_18px_40px_rgba(15,35,65,0.18)] backdrop-blur sm:left-4 sm:right-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-600">{activeHasCertifiedExactCoordinates ? <LocateFixed size={12} aria-hidden="true" /> : <MapPin size={12} aria-hidden="true" />}{selection.interaction === "selected" ? "Propriété sélectionnée" : "Propriété survolée"}</p>
                <p className="mt-1 line-clamp-1 text-[13px] font-extrabold text-[#071B33]">{activeListing.title}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">{activeListing.neighborhood ? `${activeListing.city}, ${activeListing.neighborhood}` : activeListing.city} · {formatPrice(activeListing.price, activeListing.currency)}</p>
              </div>
              {selection.interaction === "selected" ? <button type="button" onClick={clearSelection} aria-label="Retirer la propriété sélectionnée" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"><X size={14} aria-hidden="true" /></button> : null}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-slate-500">{activeHasCertifiedExactCoordinates ? "Coordonnées exactes certifiées par la provenance géographique de cette fiche. La projection sur l’Atlas reste indicative." : "Repère au niveau de la ville uniquement. AkarFinder n’affiche pas de position exacte sans coordonnées certifiées."}</p>
          </div>
        ) : null}

        <div className="absolute bottom-3 left-3 right-3 z-10 rounded-xl border border-[#e4e9f2] bg-white/95 px-4 py-2.5 backdrop-blur sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-2xl sm:px-5 sm:py-3">
          <p className="text-[11px] leading-4 text-slate-500">Cliquez un marqueur exact pour ouvrir l’aperçu, ou une ville pour filtrer · la carte ne modifie ni le classement ni l’éligibilité.</p>
        </div>
      </div>

      <SearchMapNeighborhoodDock />
    </aside>
  );
}
