"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPinned } from "lucide-react";
import type { CertifiedHeatmapZone, CertifiedLocalHeatmapModel } from "@/lib/ux/certified-local-heatmap";
import { normalizeGeometryAlias } from "@/lib/geo/neighborhood-geometry-registry";

type Position = [number, number];
type PolygonGeometry = { type: "Polygon"; coordinates: Position[][] };
type MultiPolygonGeometry = { type: "MultiPolygon"; coordinates: Position[][][] };
type Geometry = PolygonGeometry | MultiPolygonGeometry;

type GeometryFeature = {
  id: string;
  properties: {
    neighborhoodCanonicalId: string;
    displayName: string;
    aliases: string[];
    sourceEntityId: number;
    sourceUrl: string;
    attribution: string;
  };
  geometry: Geometry;
};

type GeometryCollection = {
  type: "FeatureCollection";
  attribution: string;
  features: GeometryFeature[];
};

type Projector = (position: Position) => [number, number];

const VIEWBOX_WIDTH = 960;
const VIEWBOX_HEIGHT = 620;
const VIEWBOX_PADDING = 28;

const BAND_FILL: Record<CertifiedHeatmapZone["band"], string> = {
  lowest: "#34d399",
  lower: "#84cc16",
  middle: "#f59e0b",
  higher: "#f97316",
  highest: "#f43f5e",
};

function flattenPositions(geometry: Geometry): Position[] {
  return geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
}

function createProjector(features: GeometryFeature[]): Projector {
  const positions = features.flatMap((feature) => flattenPositions(feature.geometry));
  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitudeSpan = Math.max(maxLongitude - minLongitude, Number.EPSILON);
  const latitudeSpan = Math.max(maxLatitude - minLatitude, Number.EPSILON);
  const scale = Math.min(
    (VIEWBOX_WIDTH - VIEWBOX_PADDING * 2) / longitudeSpan,
    (VIEWBOX_HEIGHT - VIEWBOX_PADDING * 2) / latitudeSpan,
  );
  const drawnWidth = longitudeSpan * scale;
  const drawnHeight = latitudeSpan * scale;
  const offsetX = (VIEWBOX_WIDTH - drawnWidth) / 2;
  const offsetY = (VIEWBOX_HEIGHT - drawnHeight) / 2;

  return ([longitude, latitude]) => [
    offsetX + (longitude - minLongitude) * scale,
    VIEWBOX_HEIGHT - offsetY - (latitude - minLatitude) * scale,
  ];
}

function ringPath(ring: Position[], project: Projector): string {
  return ring
    .map((position, index) => {
      const [x, y] = project(position);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ") + " Z";
}

function geometryPath(geometry: Geometry, project: Projector): string {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((ring) => ringPath(ring, project)).join(" ");
  }
  return geometry.coordinates
    .flatMap((polygon) => polygon.map((ring) => ringPath(ring, project)))
    .join(" ");
}

function matchingZone(feature: GeometryFeature, model: CertifiedLocalHeatmapModel): CertifiedHeatmapZone | null {
  const aliases = new Set(
    [feature.properties.displayName, feature.properties.neighborhoodCanonicalId, ...feature.properties.aliases].map(
      normalizeGeometryAlias,
    ),
  );
  return model.zones.find((zone) => zone.neighborhood && aliases.has(normalizeGeometryAlias(zone.neighborhood))) ?? null;
}

function navigateToDistrict(district: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("district", district);
  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState(window.history.state, "", next);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function CasablancaNeighborhoodChoropleth({
  model,
  selectedNeighborhood,
  canaryRequested,
}: {
  model: CertifiedLocalHeatmapModel;
  selectedNeighborhood: string | null;
  canaryRequested: boolean;
}) {
  const [collection, setCollection] = useState<GeometryCollection | null>(null);

  useEffect(() => {
    if (!canaryRequested || normalizeGeometryAlias(model.city) !== "casablanca") {
      setCollection(null);
      return;
    }

    const controller = new AbortController();
    fetch("/api/geo/casablanca-arrondissements?canary=1", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as GeometryCollection;
      })
      .then((payload) => setCollection(payload?.features?.length === 16 ? payload : null))
      .catch(() => {
        if (!controller.signal.aborted) setCollection(null);
      });

    return () => controller.abort();
  }, [canaryRequested, model.city]);

  const projected = useMemo(() => {
    if (!collection) return null;
    const project = createProjector(collection.features);
    return collection.features.map((feature) => ({
      feature,
      path: geometryPath(feature.geometry, project),
      zone: matchingZone(feature, model),
    }));
  }, [collection, model]);

  if (!projected) return null;

  const selectedKey = normalizeGeometryAlias(selectedNeighborhood ?? "");

  return (
    <aside className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white shadow-[0_14px_40px_rgba(15,35,65,0.10)]">
      <div className="flex items-start justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-5 py-4">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-blue-600">Shadow preview · Casablanca</p>
          <h2 className="mt-1 text-[1.05rem] font-extrabold tracking-[-0.02em] text-[#071B33]">Choroplèthe réel des 16 arrondissements</h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full border border-blue-200 bg-white text-blue-600"><MapPinned size={17} aria-hidden="true" /></span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="img"
          aria-label="Limites réelles des seize arrondissements de Casablanca"
          className="h-auto w-full rounded-xl border border-slate-200 bg-slate-50"
        >
          {projected.map(({ feature, path, zone }) => {
            const active = [feature.properties.displayName, feature.properties.neighborhoodCanonicalId, ...feature.properties.aliases]
              .map(normalizeGeometryAlias)
              .includes(selectedKey);
            const fill = zone ? BAND_FILL[zone.band] : "#dbe4ef";
            const label = zone
              ? `${feature.properties.displayName} · ${zone.pricePerM2.toLocaleString("fr-MA")} MAD/m²`
              : `${feature.properties.displayName} · référence de prix non publiée`;
            const district = zone?.neighborhood ?? feature.properties.displayName;
            const activate = () => navigateToDistrict(district);
            return (
              <path
                key={feature.id}
                d={path}
                fill={fill}
                fillOpacity={active ? 0.95 : zone ? 0.72 : 0.58}
                fillRule="evenodd"
                stroke={active ? "#071B33" : "#ffffff"}
                strokeWidth={active ? 5 : 2.2}
                vectorEffect="non-scaling-stroke"
                role="button"
                tabIndex={0}
                aria-label={`Filtrer par ${label}`}
                aria-pressed={active}
                className="cursor-pointer outline-none transition-opacity hover:opacity-90 focus:opacity-90"
                onClick={activate}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activate();
                  }
                }}
              >
                <title>{label}</title>
              </path>
            );
          })}
        </svg>

        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-600">
          <span className="h-3 w-3 rounded-sm bg-emerald-400" aria-hidden="true" /> Plus bas relatif
          <span>→</span>
          <span className="h-3 w-3 rounded-sm bg-rose-500" aria-hidden="true" /> Plus élevé relatif
          <span className="ml-2 h-3 w-3 rounded-sm bg-slate-200" aria-hidden="true" /> Prix non publié
        </div>

        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-[10.5px] leading-4 text-slate-600">
          Limites administratives issues de relations OpenStreetMap auditées. Les couleurs représentent uniquement les références publiques de prix demandé disponibles et ne modifient ni le ranking ni l’éligibilité des annonces. Données © OpenStreetMap contributors, ODbL 1.0.
        </p>
      </div>
    </aside>
  );
}
