import type { NeighborhoodGeometry } from "@/lib/geo/neighborhood-geometry-registry";

const EARTH_RADIUS_M = 6_371_008.8;
const DEG_TO_RAD = Math.PI / 180;

type Position = readonly [longitude: number, latitude: number];
type Ring = readonly Position[];

function signedSphericalRingAreaM2(ring: Ring): number {
  if (ring.length < 4) return 0;
  let sum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [lon1, lat1] = ring[index];
    const [lon2, lat2] = ring[index + 1];
    sum += (lon2 - lon1) * DEG_TO_RAD * (2 + Math.sin(lat1 * DEG_TO_RAD) + Math.sin(lat2 * DEG_TO_RAD));
  }
  return (sum * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2;
}

function polygonAreaM2(rings: readonly Ring[]): number {
  if (rings.length === 0) return 0;
  const outer = Math.abs(signedSphericalRingAreaM2(rings[0]));
  const holes = rings.slice(1).reduce((total, ring) => total + Math.abs(signedSphericalRingAreaM2(ring)), 0);
  return Math.max(0, outer - holes);
}

export function geometryAreaM2(geometry: NeighborhoodGeometry): number {
  if (geometry.type === "Polygon") return polygonAreaM2(geometry.coordinates);
  return geometry.coordinates.reduce((total, polygon) => total + polygonAreaM2(polygon), 0);
}

export function geometryAreaKm2(geometry: NeighborhoodGeometry): number {
  return geometryAreaM2(geometry) / 1_000_000;
}
