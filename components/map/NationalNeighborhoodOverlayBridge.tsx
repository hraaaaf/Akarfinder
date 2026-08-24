"use client";

import { useEffect, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useTheme } from "@/components/theme/ThemeProvider";
import { NationalNeighborhoodOverlay, type NationalNeighborhood } from "@/components/map/NationalNeighborhoodOverlay";

type CityNeighborhoodPayload = {
  status: "ok";
  view: "city";
  place: { slug: string; name: string };
  neighborhoods: NationalNeighborhood[];
  meta: {
    centeredNeighborhoodCount: number;
    certifiedNeighborhoodBoundaryCount: number;
  };
};

type Props = { citySlug: string | null };
type NationalMapWindow = Window & { __AKARFINDER_NATIONAL_MAP__?: MapLibreMap };

export function NationalNeighborhoodOverlayBridge({ citySlug }: Props) {
  const [payload, setPayload] = useState<CityNeighborhoodPayload | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setPayload(null);
    if (!citySlug) return;
    const controller = new AbortController();
    void fetch(`/api/geo/national-territories?city=${encodeURIComponent(citySlug)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`territory ${response.status}`);
        return response.json() as Promise<CityNeighborhoodPayload>;
      })
      .then((next) => {
        if (next.view === "city" && next.place.slug === citySlug) setPayload(next);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setPayload(null);
      });
    return () => controller.abort();
  }, [citySlug]);

  useEffect(() => {
    setMap(null);
    setMapReady(false);
    if (!citySlug) return;

    let cancelled = false;
    let findFrame = 0;
    let readyFrame = 0;
    let current: MapLibreMap | null = null;

    // setStyle() removes custom sources/layers. A style.load event therefore
    // needs an observable false -> true transition so the overlay effect
    // cleans up stale handlers and mounts its source/layers onto the new style.
    const pulseStyleReady = () => {
      if (cancelled) return;
      setMapReady(false);
      window.cancelAnimationFrame(readyFrame);
      readyFrame = window.requestAnimationFrame(() => {
        if (!cancelled && current && Boolean(current.isStyleLoaded())) setMapReady(true);
      });
    };
    const detach = () => {
      if (!current) return;
      current.off("style.load", pulseStyleReady);
    };
    const findMap = () => {
      if (cancelled) return;
      current = (window as NationalMapWindow).__AKARFINDER_NATIONAL_MAP__ ?? null;
      if (!current) {
        findFrame = window.requestAnimationFrame(findMap);
        return;
      }
      setMap(current);
      current.on("style.load", pulseStyleReady);
      if (Boolean(current.isStyleLoaded())) setMapReady(true);
    };
    findMap();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(findFrame);
      window.cancelAnimationFrame(readyFrame);
      detach();
    };
  }, [citySlug]);

  if (!citySlug || !payload) return null;

  return (
    <NationalNeighborhoodOverlay
      map={map}
      mapReady={mapReady}
      citySlug={payload.place.slug}
      cityName={payload.place.name}
      neighborhoods={payload.neighborhoods}
      centeredNeighborhoodCount={payload.meta.centeredNeighborhoodCount}
      certifiedNeighborhoodBoundaryCount={payload.meta.certifiedNeighborhoodBoundaryCount}
      theme={theme}
    />
  );
}
