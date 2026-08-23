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
    let frame = 0;
    let current: MapLibreMap | null = null;
    const syncReady = () => {
      if (!cancelled && current) setMapReady(Boolean(current.isStyleLoaded()));
    };
    const detach = () => {
      if (!current) return;
      current.off("styledata", syncReady);
      current.off("style.load", syncReady);
    };
    const findMap = () => {
      if (cancelled) return;
      current = (window as NationalMapWindow).__AKARFINDER_NATIONAL_MAP__ ?? null;
      if (!current) {
        frame = window.requestAnimationFrame(findMap);
        return;
      }
      setMap(current);
      syncReady();
      current.on("styledata", syncReady);
      current.on("style.load", syncReady);
    };
    findMap();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
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
