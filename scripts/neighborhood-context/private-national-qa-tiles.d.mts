export type QaGeoJsonFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    osmId: string; name: string; category: string; sourceUrl: string;
    positionType: "osm-node" | "indicative-area-point";
    currentlyOpen: null; officialQuarterMembership: null;
  };
};
export type QaNationalViewport = {
  schema: "AKARFINDER_OSM_INDICATIVE_LANDMARKS_V1"; ok: true;
  state: "PRIVATE_CANDIDATE_NO_DB_OR_UI_WRITE";
  label: string; source: string; attribution: string; license: string;
  licenseUrl: string; sourceSha256: string;
  officialNeighborhoodMembershipCertified: false;
  businessOperatingStatusCertified: false; entrancePrecisionCertified: false;
  features: QaGeoJsonFeature[];
};
export const SCHEMA: string;
export const CATEGORIES: readonly string[];
export function parseQaBbox(value: string): number[];
export function queryPrivateNationalQaPack(
  directory: string, expectedSha: string, bbox: number[], limit?: number,
): Promise<QaNationalViewport>;
