"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { LivingHereModel, LivingHerePoi } from "@/lib/geo/living-here";

type LivingHereMapProps = {
  model: LivingHereModel;
  pois: LivingHerePoi[];
  selectedMinutes: 5 | 10 | 15 | null;
  styleUrl: string | null;
};

export function LivingHereMap({ model, pois, selectedMinutes, styleUrl }: LivingHereMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || !styleUrl || !model.origin.coordinate) return;
    let disposed = false;
    let map: import("maplibre-gl").Map | null = null;

    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !containerRef.current || !model.origin.coordinate) return;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: [model.origin.coordinate.longitude, model.origin.coordinate.latitude],
        zoom: model.origin.exact ? 14.2 : 13.2,
        attributionControl: true,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        if (!map || !model.origin.coordinate) return;
        map.addSource("ann-l6-pois", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: pois.map((poi) => ({
              type: "Feature",
              properties: { id: poi.id, name: poi.name, category: poi.category },
              geometry: { type: "Point", coordinates: [poi.coordinate.longitude, poi.coordinate.latitude] },
            })),
          },
        });
        map.addLayer({
          id: "ann-l6-pois",
          type: "circle",
          source: "ann-l6-pois",
          paint: { "circle-radius": 6, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff", "circle-color": "#0B63CE" },
        });

        if (model.origin.exact) {
          map.addSource("ann-l6-origin", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: { kind: "listing" },
              geometry: { type: "Point", coordinates: [model.origin.coordinate.longitude, model.origin.coordinate.latitude] },
            },
          });
          map.addLayer({
            id: "ann-l6-origin",
            type: "circle",
            source: "ann-l6-origin",
            paint: { "circle-radius": 9, "circle-stroke-width": 3, "circle-stroke-color": "#ffffff", "circle-color": "#0B1F3A" },
          });
        }

        if (selectedMinutes != null) {
          const isochrone = model.isochrones.find((item) => item.minutes === selectedMinutes && item.mode === "walking");
          if (isochrone?.geojson && typeof isochrone.geojson === "object") {
            map.addSource("ann-l6-isochrone", { type: "geojson", data: isochrone.geojson as never });
            map.addLayer({
              id: "ann-l6-isochrone-fill",
              type: "fill",
              source: "ann-l6-isochrone",
              paint: { "fill-color": "#0B63CE", "fill-opacity": 0.12 },
            });
            map.addLayer({
              id: "ann-l6-isochrone-line",
              type: "line",
              source: "ann-l6-isochrone",
              paint: { "line-color": "#0B63CE", "line-width": 2 },
            });
          }
        }
      });
    }).catch(() => undefined);

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [model, pois, selectedMinutes, styleUrl]);

  if (!styleUrl) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500">
        Carte interactive indisponible pour le moment. Les lieux vérifiés restent visibles dans la liste.
      </div>
    );
  }

  return <div ref={containerRef} className="min-h-[320px] w-full overflow-hidden rounded-2xl border border-slate-200" aria-label="Carte interactive des lieux à proximité" />;
}
