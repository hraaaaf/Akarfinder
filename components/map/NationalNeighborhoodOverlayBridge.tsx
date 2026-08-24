"use client";

import { useEffect, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useTheme } from "@/components/theme/ThemeProvider";
import { NationalNeighborhoodOverlay, type NationalNeighborhood } from "@/components/map/NationalNeighborhoodOverlay";

const NEIGHBORHOOD_SOURCE = "akarfinder-national-neighborhood-points";

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
  const [styleEpoch, setStyleEpoch] = useState(0);
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
    setStyleEpoch(0);
    if (!citySlug) return;

    let cancelled = false;
    let findFrame = 0;
    let current: MapLibreMap | null = null;

    const syncLoadedStyle = () => {
      if (cancelled || !current || !current.isStyleLoaded()) return;
      setMap(current);
      setMapReady(true);
      // setStyle() drops custom sources/layers. Only force a fresh overlay mount
      // when the loaded style genuinely no longer owns the N2 source. This avoids
      // turning ordinary style/source lifecycle events into a teardown/remount loop.
      if (!current.getSource(NEIGHBORHOOD_SOURCE)) setStyleEpoch((value) => value + 1);
    };
    const detach = () => {
      if (current) current.off("style.load", syncLoadedStyle);
    };
    const findMap = () => {
      if (cancelled) return;
      current = (window as NationalMapWindow).__AKARFINDER_NATIONAL_MAP__ ?? null;
      if (!current) {
        findFrame = window.requestAnimationFrame(findMap);
        return;
      }
      current.on("style.load", syncLoadedStyle);
      syncLoadedStyle();
    };
    findMap();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(findFrame);
      detach();
    };
  }, [citySlug]);

  if (!citySlug || !payload) return null;

  return (
    <NationalNeighborhoodOverlay
      key={`${payload.place.slug}:${styleEpoch}`}
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
