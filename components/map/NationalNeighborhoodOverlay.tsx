"use client";

import Link from "next/link";
import { Layers3, MapPin, Search, ShieldCheck, Trees, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";

const SOURCE = "akarfinder-national-neighborhood-points";
const HITS = "akarfinder-national-neighborhood-hits";
const DOTS = "akarfinder-national-neighborhood-dots";
const ACTIVE = "akarfinder-national-neighborhood-active";
const LABELS = "akarfinder-national-neighborhood-labels";
const ACCENT = "#0B63CE";

export type NationalNeighborhood = {
  slug: string;
  name: string;
  center: { lng: number; lat: number } | null;
  sourceKinds: Array<"barid_postal_neighborhood" | "osm_neighborhood_label">;
  boundaryStatus: "not_claimed";
  publicationStatus: "label_candidate";
};

type Props = {
  map: MapLibreMap | null;
  mapReady: boolean;
  citySlug: string;
  cityName: string;
  neighborhoods: NationalNeighborhood[];
  centeredNeighborhoodCount: number;
  certifiedNeighborhoodBoundaryCount: number;
  theme?: string;
  selectedDistrictSlug?: string | null;
  onSelectDistrict?: (slug: string) => void;
};

function pointCollection(neighborhoods: NationalNeighborhood[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: neighborhoods.flatMap((item) => item.center ? [{
      type: "Feature" as const,
      id: item.slug,
      properties: { slug: item.slug, name: item.name },
      geometry: { type: "Point" as const, coordinates: [item.center.lng, item.center.lat] },
    }] : []),
  };
}

function emptyFilter(): unknown[] {
  return ["==", ["get", "slug"], "__none__"];
}

function removeLayers(map: MapLibreMap) {
  for (const id of [LABELS, ACTIVE, DOTS, HITS]) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}

function normalizedSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function cleanLabel(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function searchHref(cityName: string, neighborhoodName: string) {
  return `/search?city=${encodeURIComponent(cityName)}&district=${encodeURIComponent(cleanLabel(neighborhoodName))}`;
}

export function NationalNeighborhoodOverlay({
  map,
  mapReady,
  citySlug,
  cityName,
  neighborhoods,
  centeredNeighborhoodCount,
  certifiedNeighborhoodBoundaryCount,
  theme,
  selectedDistrictSlug,
  onSelectDistrict,
}: Props) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const selectedRef = useRef<string | null>(null);

  useEffect(() => { selectedRef.current = selectedSlug; }, [selectedSlug]);
  useEffect(() => {
    setHoverSlug(null);
    setQuery("");
  }, [citySlug]);

  const bySlug = useMemo(() => new Map(neighborhoods.map((item) => [item.slug, item] as const)), [neighborhoods]);
  useEffect(() => {
    const nextSelectedSlug = selectedDistrictSlug && bySlug.has(selectedDistrictSlug) ? selectedDistrictSlug : null;
    selectedRef.current = nextSelectedSlug;
    setSelectedSlug(nextSelectedSlug);
  }, [bySlug, selectedDistrictSlug]);
  const selected = selectedSlug ? bySlug.get(selectedSlug) ?? null : null;
  const suggestions = useMemo(() => {
    const needle = normalizedSearchText(query);
    if (needle.length < 2) return [];
    return neighborhoods.filter((item) => normalizedSearchText(item.name).includes(needle)).slice(0, 6);
  }, [neighborhoods, query]);

  useEffect(() => {
    if (!map || !mapReady) return;
    removeLayers(map);
    map.addSource(SOURCE, { type: "geojson", data: pointCollection(neighborhoods) });
    map.addLayer({
      id: HITS,
      type: "circle",
      source: SOURCE,
      paint: { "circle-radius": 16, "circle-color": ACCENT, "circle-opacity": 0.01 },
    });
    map.addLayer({
      id: DOTS,
      type: "circle",
      source: SOURCE,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2.5, 12, 4.5],
        "circle-color": ACCENT,
        "circle-opacity": 0.82,
        "circle-stroke-color": theme === "dark" ? "#071426" : "#FFFFFF",
        "circle-stroke-width": 1.2,
      },
    });
    map.addLayer({
      id: ACTIVE,
      type: "circle",
      source: SOURCE,
      filter: emptyFilter() as never,
      paint: {
        "circle-radius": 10,
        "circle-color": ACCENT,
        "circle-opacity": 0.16,
        "circle-stroke-color": ACCENT,
        "circle-stroke-width": 2.4,
      },
    });
    map.addLayer({
      id: LABELS,
      type: "symbol",
      source: SOURCE,
      minzoom: 9,
      layout: {
        "text-field": ["get", "name"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 9, 12, 11.5, 15, 13],
        "text-offset": [0, 1.15],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "symbol-sort-key": ["case", ["==", ["get", "slug"], "maarif"], -1, 1],
      },
      paint: {
        "text-color": theme === "dark" ? "#E8F2FF" : "#123250",
        "text-halo-color": theme === "dark" ? "#071426" : "#FFFFFF",
        "text-halo-width": 1.8,
      },
    });

    const setActive = (slug: string | null) => {
      if (map.getLayer(ACTIVE)) map.setFilter(ACTIVE, (slug ? ["==", ["get", "slug"], slug] : emptyFilter()) as never);
    };
    const renderedSlug = (event: MapMouseEvent) => {
      let nearestSlug: string | null = null;
      let nearestDistance = Infinity;
      for (const item of neighborhoods) {
        if (!item.center) continue;
        const projected = map.project([item.center.lng, item.center.lat]);
        const distance = Math.hypot(projected.x - event.point.x, projected.y - event.point.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSlug = item.slug;
        }
      }
      const touchLike = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
      const maxCenterDistance = touchLike ? 24 : 18;
      if (nearestSlug && nearestDistance <= maxCenterDistance) return nearestSlug;

      const feature = map.queryRenderedFeatures(event.point, { layers: [HITS] })[0];
      return typeof feature?.properties?.slug === "string" ? feature.properties.slug : null;
    };
    const onMove = (event: MapMouseEvent) => {
      const slug = renderedSlug(event);
      setHoverSlug(slug);
      setActive(slug ?? selectedRef.current);
      map.getCanvas().style.cursor = slug ? "pointer" : "";
    };
    const onClick = (event: MapMouseEvent) => {
      const slug = renderedSlug(event);
      if (!slug) return;
      selectedRef.current = slug;
      setSelectedSlug(slug);
      setActive(slug);
      onSelectDistrict?.(slug);
    };
    const onLeave = () => {
      setHoverSlug(null);
      setActive(selectedRef.current);
      map.getCanvas().style.cursor = "";
    };

    map.on("mousemove", onMove);
    map.on("click", onClick);
    map.getCanvas().addEventListener("mouseleave", onLeave);
    return () => {
      map.off("mousemove", onMove);
      map.off("click", onClick);
      map.getCanvas().removeEventListener("mouseleave", onLeave);
      if (map.getStyle()) removeLayers(map);
    };
  }, [map, mapReady, neighborhoods, onSelectDistrict, theme]);

  useEffect(() => {
    if (!map || !mapReady || !map.getLayer(ACTIVE)) return;
    const active = hoverSlug ?? selectedSlug;
    map.setFilter(ACTIVE, (active ? ["==", ["get", "slug"], active] : emptyFilter()) as never);
  }, [hoverSlug, map, mapReady, selectedSlug]);

  const chooseSuggestion = (item: NationalNeighborhood) => {
    setSelectedSlug(item.slug);
    selectedRef.current = item.slug;
    setQuery(item.name);
    onSelectDistrict?.(item.slug);
    if (item.center && map) {
      map.easeTo({ center: [item.center.lng, item.center.lat], zoom: Math.max(map.getZoom(), 12.2), duration: 550 });
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20" data-akarfinder-national-neighborhood-overlay data-city={citySlug}>
      <div className="pointer-events-auto absolute left-3 right-3 top-[172px] lg:left-auto lg:right-4 lg:top-4 lg:w-[340px]">
        <div className="relative rounded-[18px] border border-white/80 bg-white/95 p-2.5 shadow-[0_14px_38px_rgba(15,35,66,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0A1A2F]/95">
          <label className="sr-only" htmlFor={`neighborhood-search-${citySlug}`}>Rechercher un quartier à {cityName}</label>
          <div className="flex items-center gap-2">
            <Search size={15} className="shrink-0 text-brand-primary" aria-hidden="true" />
            <input
              id={`neighborhood-search-${citySlug}`}
              aria-label={`Rechercher un quartier à ${cityName}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un quartier…"
              className="min-w-0 flex-1 bg-transparent text-[12px] font-bold text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche" className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><X size={13} /></button> : null}
          </div>
          {suggestions.length ? (
            <div className="mt-2 max-h-48 overflow-auto border-t border-border pt-1.5">
              {suggestions.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  data-akarfinder-neighborhood-suggestion={item.slug}
                  onClick={() => chooseSuggestion(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-brand-primary-soft"
                >
                  <span className="truncate text-[11px] font-extrabold text-foreground">{item.name}</span>
                  <span className="shrink-0 text-[9px] font-bold text-muted-foreground">{item.center ? "repère" : "label"}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[72px] left-3 rounded-full border border-white/80 bg-white/88 px-2.5 py-1 text-[8.5px] font-bold text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#0A1A2F]/88 dark:text-slate-300 sm:bottom-4 sm:left-auto sm:right-4">
        {centeredNeighborhoodCount.toLocaleString("fr-FR")} repères · {certifiedNeighborhoodBoundaryCount} contour quartier publié
      </div>

      {selected ? (
        <aside
          className="pointer-events-auto absolute inset-x-3 bottom-[220px] rounded-[22px] border border-white/85 bg-white/96 p-3.5 shadow-[0_18px_48px_rgba(15,35,66,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0A1A2F]/96 sm:inset-x-auto sm:bottom-[200px] sm:left-4 sm:w-[350px] lg:bottom-4"
          data-akarfinder-neighborhood-preview={selected.slug}
          aria-label={`Quartier sélectionné ${selected.name}`}
        >
          <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand-primary"><MapPin size={11} aria-hidden="true" />Vivre ici · quartier</p>
          <h2 className="mt-1 text-[22px] font-extrabold tracking-[-0.035em] text-foreground">Vivre à {selected.name}</h2>
          <p className="mt-1 text-[10.5px] font-semibold leading-4 text-muted-foreground">
            {selected.center ? "Repère cartographique sourcé." : "Repère cartographique indisponible."} Aucun contour de quartier n’est publié pour cette vue.
          </p>

          <nav className="mt-3 grid grid-cols-3 border-b border-border text-center text-[10px] font-extrabold text-muted-foreground" aria-label={`Contexte de ${selected.name}`}>
            <span className="border-b-2 border-brand-primary px-2 pb-2 text-brand-primary">Aperçu</span>
            <span className="px-2 pb-2">Vie locale</span>
            <Link href={searchHref(cityName, selected.name)} className="px-2 pb-2">Biens</Link>
          </nav>

          <div className="mt-3 grid grid-cols-3 gap-2" data-vivre-ici-neighborhood-truth-grid>
            <div className="rounded-[14px] border border-border bg-surface-subtle p-2.5 text-center">
              <Layers3 size={16} className="mx-auto text-brand-primary" aria-hidden="true" />
              <strong className="mt-1 block text-[9.5px] text-foreground">Repère</strong>
              <span className="block text-[8px] font-semibold text-muted-foreground">{selected.center ? "Sourcé" : "Indisponible"}</span>
            </div>
            <div className="rounded-[14px] border border-border bg-surface-subtle p-2.5 text-center">
              <Trees size={16} className="mx-auto text-emerald-600" aria-hidden="true" />
              <strong className="mt-1 block text-[9.5px] text-foreground">Vie locale</strong>
              <span className="block text-[8px] font-semibold text-muted-foreground">Via les filtres</span>
            </div>
            <div className="rounded-[14px] border border-border bg-surface-subtle p-2.5 text-center">
              <ShieldCheck size={16} className="mx-auto text-brand-primary" aria-hidden="true" />
              <strong className="mt-1 block text-[9.5px] text-foreground">Biens</strong>
              <span className="block text-[8px] font-semibold text-muted-foreground">Pin exact requis</span>
            </div>
          </div>

          <Link href={searchHref(cityName, selected.name)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-primary px-4 text-[11.5px] font-extrabold text-white shadow-accent">
            Voir les biens à {selected.name}
          </Link>
        </aside>
      ) : null}
    </div>
  );
}
