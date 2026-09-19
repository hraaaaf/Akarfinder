"use client";

import { useEffect, useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { LandmarkArtwork } from "@/components/map/LandmarkArtwork";
import { GEO_NEIGHBORHOODS } from "@/lib/geo/geo-entity-registry";
import {
  getLandmarkPresentation,
  selectLandmarksForCityView,
} from "@/lib/geo/territory-landmark-presentation";
import {
  layoutLandmarkCards,
  type LandmarkPlaced,
  type LandmarkReservedRect,
} from "@/lib/geo/territory-landmark-layout";
import {
  VERIFIED_LANDMARKS,
  type VerifiedLandmarkEntry,
} from "@/lib/geo/territory-landmark-registry";

type Props = {
  map: MapLibreMap | null;
  mapReady: boolean;
  citySlug: string | null;
};

const CASABLANCA_SIGNAL_TARGET_IDS = new Set([
  "landmark_casablanca_maarif_twin_center",
  "landmark_casablanca_maarif_stade_mohammed_v",
  "landmark_casablanca_ain_diab_morocco_mall",
  "landmark_casablanca_finance_city_cfc_tower",
  "landmark_casablanca_finance_city_anfa_park",
  "landmark_casablanca_bourgogne_lycee_lyautey",
  "landmark_casablanca_racine_institut_juan_ramon_jimenez",
  "landmark_casablanca_bouskoura_forest",
]);

function cityEntries(citySlug: string | null): VerifiedLandmarkEntry[] {
  if (!citySlug) return [];
  return VERIFIED_LANDMARKS.filter((entry) => entry.entity.citySlug === citySlug);
}

function sidebarEntries(entries: readonly VerifiedLandmarkEntry[], citySlug: string): VerifiedLandmarkEntry[] {
  const scoped = citySlug === "casablanca"
    ? entries.filter((entry) => CASABLANCA_SIGNAL_TARGET_IDS.has(entry.entity.id))
    : [...entries];

  return scoped
    .sort((a, b) => {
      const pa = getLandmarkPresentation(a);
      const pb = getLandmarkPresentation(b);
      return pb.visualPriority - pa.visualPriority;
    })
    .slice(0, citySlug === "casablanca" ? 8 : 10);
}

function districtLabel(entry: VerifiedLandmarkEntry): string {
  return GEO_NEIGHBORHOODS.find((district) => district.id === entry.entity.parentId)?.canonical_name
    ?? entry.entity.districtSlug.replace(/-/g, " ");
}

function lineGeometry(placed: LandmarkPlaced) {
  const x1 = placed.x;
  const y1 = placed.y;
  const x2 = Math.max(placed.cardX, Math.min(placed.cardX + placed.width, x1));
  const y2 = Math.max(placed.cardY, Math.min(placed.cardY + placed.height, y1));
  return { x1, y1, x2, y2 };
}

export function LandmarkCityOverlay({ map, mapReady, citySlug }: Props) {
  const entries = useMemo(() => cityEntries(citySlug), [citySlug]);
  const [placed, setPlaced] = useState<LandmarkPlaced[]>([]);
  const [zoom, setZoom] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    if (!map || !mapReady || !citySlug || entries.length === 0) {
      setPlaced([]);
      return;
    }

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const canvas = map.getCanvas();
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const currentZoom = map.getZoom();
        setZoom(currentZoom);
        setViewportWidth(width);

        const visible = selectLandmarksForCityView(entries, currentZoom, width);
        const anchors = visible.flatMap((entry) => {
          const coordinates = entry.entity.coordinates;
          if (!coordinates) return [];
          const point = map.project([coordinates.lng, coordinates.lat]);
          if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return [];
          if (point.x < -60 || point.y < -60 || point.x > width + 60 || point.y > height + 60) return [];
          return [{ entry, x: point.x, y: point.y }];
        });

        const reserved: LandmarkReservedRect[] = [];
        if (width >= 1024) {
          reserved.push(
            { x: 10, y: 10, width: Math.min(440, width * 0.42), height: 150 },
            { x: 0, y: height - 44, width, height: 44 },
          );
        } else if (width >= 640) {
          reserved.push(
            { x: 10, y: 10, width: Math.min(430, width - 20), height: 150 },
            { x: 0, y: height - 132, width, height: 132 },
          );
        } else {
          reserved.push(
            { x: 8, y: 8, width: width - 16, height: 150 },
            { x: 0, y: height - 120, width, height: 120 },
          );
        }

        setPlaced(layoutLandmarkCards({
          anchors,
          viewportWidth: width,
          viewportHeight: height,
          reserved,
        }));
      });
    };

    update();
    map.on("move", update);
    map.on("zoom", update);
    map.on("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      map.off("move", update);
      map.off("zoom", update);
      map.off("resize", update);
    };
  }, [citySlug, entries, map, mapReady]);

  if (!citySlug || entries.length === 0) return null;

  const sortedEntries = sidebarEntries(entries, citySlug);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[18]" data-landmark-overlay data-landmark-city={citySlug}>
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          {placed.map((item) => {
            const line = lineGeometry(item);
            return (
              <line
                key={item.entry.entity.id}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#071B33"
                strokeOpacity=".48"
                strokeWidth="1.7"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {placed.map((item) => {
          const presentation = getLandmarkPresentation(item.entry);
          const iconic = presentation.tier === "iconic";
          return (
            <div key={item.entry.entity.id}>
              <span
                className="absolute z-[21] rounded-full border-[4px] border-white bg-[#071B33] shadow-[0_0_0_5px_rgba(11,99,206,0.18),0_3px_10px_rgba(7,27,51,0.24)]"
                style={{
                  left: item.x,
                  top: item.y,
                  width: iconic ? 17 : 15,
                  height: iconic ? 17 : 15,
                  transform: "translate(-50%, -50%)",
                }}
                data-landmark-pin={item.entry.entity.landmarkSlug}
                aria-hidden="true"
              />
              <div
                className="absolute"
                style={{
                  left: item.cardX,
                  top: item.cardY,
                  width: item.width,
                  height: item.height,
                }}
                data-landmark-card={item.entry.entity.landmarkSlug}
                data-landmark-tier={presentation.tier}
              >
              <div
                className={
                  iconic
                    ? "flex h-full overflow-hidden rounded-[14px] border border-[#071B33]/15 bg-white/[0.97] shadow-[0_12px_30px_rgba(7,27,51,0.14)]"
                    : "flex h-full overflow-hidden rounded-[12px] border border-[#071B33]/10 bg-white/[0.92] shadow-[0_8px_20px_rgba(7,27,51,0.10)]"
                }
              >
                <div className="h-full w-[43%] shrink-0 overflow-hidden bg-[#F7FAFF]">
                  <LandmarkArtwork
                    artworkKey={presentation.artworkKey}
                    className="h-full w-full object-cover"
                    decorative
                  />
                </div>
                <div className="min-w-0 flex-1 self-center px-2 py-1.5">
                  <p className={iconic ? "truncate text-[10.5px] font-black leading-tight text-[#071B33]" : "truncate text-[9.5px] font-extrabold leading-tight text-[#071B33]"}>
                    {item.entry.entity.canonicalName}
                  </p>
                  <p className="mt-0.5 truncate text-[8px] font-bold text-slate-500">
                    {districtLabel(item.entry)}
                  </p>
                </div>
              </div>
              </div>
            </div>
          );
        })}
      </div>

      <aside
        className="absolute right-3 top-3 z-[19] hidden w-[364px] rounded-[24px] border border-white/85 bg-white/[0.98] p-4 shadow-[0_18px_48px_rgba(7,27,51,0.11)] backdrop-blur-xl lg:block"
        aria-label="Repères de la ville"
        data-landmark-sidebar
      >
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#0B63CE]">Repères de la ville</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-black tracking-[-0.035em] text-[#071B33]">
              {citySlug === "casablanca" ? "Repères de Casablanca" : "Repères territoriaux"}
            </h2>
            <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">
              Les lieux les plus reconnaissables apparaissent d’abord.
            </p>
          </div>
          <span className="rounded-full bg-[#EEF6FF] px-2.5 py-1 text-[9px] font-black text-[#0B63CE]">
            {placed.length}/{sortedEntries.length}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {sortedEntries.map((entry) => {
            const presentation = getLandmarkPresentation(entry);
            const visible = placed.some((item) => item.entry.entity.id === entry.entity.id);
            return (
              <div
                key={entry.entity.id}
                className={visible ? "flex items-center gap-2.5 rounded-2xl border border-[#DCE8F5] bg-white p-2" : "flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-2 opacity-55"}
                data-landmark-sidebar-item={entry.entity.landmarkSlug}
              >
                <div className="h-12 w-[72px] shrink-0 overflow-hidden rounded-xl bg-[#F7FAFF]">
                  <LandmarkArtwork artworkKey={presentation.artworkKey} className="h-full w-full" decorative />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10.5px] font-black text-[#071B33]">{entry.entity.canonicalName}</p>
                  <p className="mt-0.5 truncate text-[8.5px] font-bold text-slate-500">{districtLabel(entry)}</p>
                </div>
                <span
                  className={
                    presentation.tier === "iconic"
                      ? "rounded-full bg-[#071B33] px-2 py-1 text-[8px] font-black text-white"
                      : presentation.tier === "major"
                        ? "rounded-full bg-[#DCEBFF] px-2 py-1 text-[8px] font-black text-[#0B63CE]"
                        : "rounded-full bg-[#E7F6F2] px-2 py-1 text-[8px] font-black text-[#28755B]"
                  }
                >
                  {presentation.tierLabel}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 rounded-2xl bg-[#F3F7FB] px-3 py-2 text-[8.5px] font-bold leading-4 text-slate-500">
          Zoom {zoom.toFixed(1)} · les repères secondaires apparaissent progressivement pour éviter les collisions.
        </p>
      </aside>

      <div className="absolute inset-x-3 bottom-3 z-[19] flex gap-2 overflow-x-auto rounded-[18px] border border-white/80 bg-white/[0.95] p-2 shadow-[0_14px_34px_rgba(7,27,51,0.12)] backdrop-blur-xl lg:hidden" data-landmark-mobile-rail>
        {sortedEntries.slice(0, viewportWidth < 640 ? 4 : 6).map((entry) => {
          const presentation = getLandmarkPresentation(entry);
          return (
            <div key={entry.entity.id} className="flex min-w-[150px] items-center gap-2 rounded-xl border border-[#DCE8F5] bg-white p-1.5">
              <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-[#F7FAFF]">
                <LandmarkArtwork artworkKey={presentation.artworkKey} className="h-full w-full" decorative />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[9px] font-black text-[#071B33]">{entry.entity.canonicalName}</p>
                <p className="mt-0.5 text-[7.5px] font-bold text-slate-500">{presentation.tierLabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
