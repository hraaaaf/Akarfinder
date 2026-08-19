"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useTheme } from "@/components/theme/ThemeProvider";
import { applyAkarFinderBasemapTreatment } from "@/lib/map/akarfinder-territorial-style";

const LIGHT_TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_TILE_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function styleForTheme(theme: string | undefined) {
  return theme === "dark" ? DARK_TILE_STYLE : LIGHT_TILE_STYLE;
}

type NeighborhoodMiniMapProps = {
  lat: number;
  lng: number;
  label: string;
  city: string;
  mapHref: string;
};

export function NeighborhoodMiniMap({ lat, lng, label, city, mapHref }: NeighborhoodMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    setReady(false);

    void import("maplibre-gl").then(({ Map, Marker: MapMarker }) => {
      if (cancelled || !containerRef.current) return;

      const map = new Map({
        container: containerRef.current,
        style: styleForTheme(theme),
        center: [lng, lat],
        zoom: 13.2,
        interactive: false,
        fadeDuration: 0,
        attributionControl: false,
      });
      mapRef.current = map;

      map.once("style.load", () => {
        if (cancelled) return;
        applyAkarFinderBasemapTreatment(map, theme);
      });
      map.once("idle", () => {
        if (!cancelled) setReady(true);
      });

      const markerElement = document.createElement("div");
      markerElement.className = "grid h-8 w-8 place-items-center rounded-full border-4 border-white bg-brand-primary shadow-lg";
      markerElement.setAttribute("aria-hidden", "true");
      markerElement.innerHTML = '<span class="block h-2.5 w-2.5 rounded-full bg-white"></span>';
      markerRef.current = new MapMarker({ element: markerElement, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);
    });

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng, theme]);

  return (
    <section
      className="relative h-[190px] overflow-hidden rounded-2xl border border-border/25 bg-surface-muted shadow-sm sm:h-[230px]"
      aria-label={`Repère cartographique ${label}, ${city}`}
      aria-busy={!ready}
      data-akarfinder-neighborhood-map-preview
      data-map-ready={ready ? "true" : "false"}
    >
      <div
        ref={containerRef}
        className={`absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none ${ready ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      />
      {!ready ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(219,234,254,0.55),rgba(248,250,252,0.92),rgba(226,232,240,0.55))]" aria-hidden="true" />
      ) : null}

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/92 px-3 py-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.11em] text-brand-primary shadow-sm backdrop-blur">
          <MapPin size={12} aria-hidden="true" />
          Repère quartier
        </span>
      </div>

      <div
        className="absolute right-2 top-2 z-10 max-w-[124px] rounded-md border border-white/75 bg-white/90 px-1.5 py-1 text-right text-[7px] font-semibold leading-[1.25] text-slate-600 shadow-sm backdrop-blur"
        data-akarfinder-map-attribution
      >
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="block hover:text-brand-primary"
        >
          © OpenStreetMap contributors
        </a>
        <a
          href="https://openfreemap.org"
          target="_blank"
          rel="noreferrer"
          className="block text-[6.5px] text-slate-500 hover:text-brand-primary"
        >
          OpenFreeMap
        </a>
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
        <div className="min-w-0 rounded-xl border border-white/75 bg-white/94 px-3 py-2 shadow-sm backdrop-blur">
          <p className="truncate text-[12px] font-extrabold text-foreground">{label}</p>
          <p className="truncate text-[9.5px] font-semibold text-muted-foreground">{city}</p>
        </div>
        <Link
          href={mapHref}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary px-3 py-2 text-[10.5px] font-extrabold text-white shadow-accent hover:bg-brand-primary-hover"
        >
          Ouvrir la carte
        </Link>
      </div>
    </section>
  );
}
