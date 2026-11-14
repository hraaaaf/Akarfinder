import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MAARIF_TARGET_PILOT_BOUNDARY as B } from "../../../lib/map/maarif-osm-arrondissement-shadow.js";
import { MAARIF_HISTORICAL_CENTRAL_SECTOR_REFERENCE as SECTOR } from "../../../lib/map/maarif-historical-sector-reference.js";
import { MAARIF_AUC_2026_ARRONDISSEMENT_PLAN_REFERENCE as PLAN2026 } from "../../../lib/map/maarif-auc-2026-plan-reference.js";
import { MAARIF_QA_REFERENCE_POINTS as QACENTERS } from "../../../lib/map/maarif-qa-reference-centers.js";

test("Maârif relation is an explicit unreviewed OSM shadow, never the central quarter", () => {
  assert.equal(B.status, "shadow-reference");
  assert.equal(B.reviewed, false);
  assert.equal(B.publicationStatus, "shadow");
  assert.equal(B.sourceEntityId, 2801474);
  assert.equal(B.licenseId, "ODbL-1.0");
  assert.equal(B.geometry.type, "Polygon");
});

test("shadow geometry is closed, geographically plausible and near AUC's 1240 ha arrondissement", () => {
  const rings = B.geometry.coordinates;
  assert.equal(rings.length, 1);
  const points = rings[0];
  assert.equal(points.length, 220);
  assert.deepEqual(points[0], points.at(-1));
  const meanLat = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const meterLng = 111320 * Math.cos(meanLat * Math.PI / 180);
  const meterLat = 111320;
  let doubleArea = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1,y1] = points[i], [x2,y2] = points[i+1];
    for (const v of [x1,x2]) assert.ok(v > -7.85 && v < -7.45);
    for (const v of [y1,y2]) assert.ok(v > 33.4 && v < 33.75);
    doubleArea += (x1 * y2 - x2 * y1) * meterLng * meterLat;
  }
  const hectares = Math.abs(doubleArea) / 2 / 10000;
  assert.ok(hectares > 1120 && hectares < 1370, "OSM/AUC area diverged: "+hectares);
});

test("web router denies shadow preview by default and checks shadow metadata", () => {
  const router = readFileSync("components/map/NationalMapRouter.tsx", "utf8");
  assert.match(router, /NEXT_PUBLIC_VIVRE_ICI_ADMIN_SHADOW_PREVIEW === "true"/);
  assert.match(router, /MAARIF_TARGET_PILOT_BOUNDARY\.reviewed === false/);
  assert.match(router, /MAARIF_TARGET_PILOT_BOUNDARY\.publicationStatus === "shadow"/);
  assert.match(router, /isMaarifReference && allowShadowAdministrativePreview/);
});

test("OSM preview is always labelled indicative, not published as government-certified", () => {
  const source = readFileSync("components/map/MapLibreNeighborhood3D.tsx", "utf8");
  assert.match(source, /"fill-opacity": 0\.1/);
  assert.match(source, /layout:\s*\{\s*visibility:\s*"none"\s*\}/);
  assert.match(source, /Contour OSM indicatif/i);
  assert.match(source, /non certifié par la commune/);
  assert.match(source, /ne représente pas la limite du quartier central/);
  assert.match(source, /© OpenStreetMap contributors · ODbL/);
});

test("AUC historical central sector (103 ha) cannot inherit arrondissement geometry (1240 ha)", () => {
  assert.equal(B.geographicScope, "arrondissement");
  assert.equal(B.areaHectaresApprox, 1240);
  assert.equal(B.centralSectorBoundaryClaim, false);
  assert.equal(SECTOR.geographicScope, "historical-central-sector");
  assert.equal(SECTOR.areaHectaresApprox, 103);
  assert.ok(B.areaHectaresApprox / SECTOR.areaHectaresApprox > 10);
  assert.equal(SECTOR.geometry, null, "No real central-sector polygon has been certified");
  assert.equal(SECTOR.sigCertified, false);
  assert.equal(SECTOR.current2026BoundaryVerified, false);
  assert.equal(SECTOR.publicationStatus, "textual-reference-only");
  assert.equal(SECTOR.sourcePrintedPage, 10);
  assert.match(SECTOR.sourceUrl, /auc\.ma\/wp-content\/uploads\/2020\/05\/RAPPORT-JUSTIFICATIF-MAARIF\.pdf/);
  assert.deepEqual(SECTOR.axes.south, ["Boulevard Brahim Roudani"]);
});

test("router refuses to substitute central Maârif quartier for OSM arrondissement shadow", () => {
  const router = readFileSync("components/map/NationalMapRouter.tsx", "utf8");
  assert.match(router, /MAARIF_TARGET_PILOT_BOUNDARY\.geographicScope === "arrondissement"/);
  assert.match(router, /MAARIF_TARGET_PILOT_BOUNDARY\.centralSectorBoundaryClaim === false/);
  assert.match(router, /MAARIF_TARGET_PILOT_BOUNDARY\.publicationStatus === "shadow"/);
  assert.match(router, /isMaarifReference && allowShadowAdministrativePreview/);
});
test("AUC 2026 plan is verified arrondissement planning raster, never a 103-ha central boundary", () => {
  assert.equal(PLAN2026.sourceRole, "arrondissement-urban-planning-reference");
  assert.equal(PLAN2026.planNumber, "AUC 01/2026");
  assert.equal(PLAN2026.homologationDecree, "2.26.658");
  assert.equal(PLAN2026.bulletinOfficielPublication, "2026-10-01");
  assert.equal(PLAN2026.pdfBytes, 59646409);
  assert.match(PLAN2026.pdfSha256, /^[a-f0-9]{64}$/);
  assert.equal(PLAN2026.printedScaleDenominator, 5000);
  assert.equal(PLAN2026.publicationSourceGeometry, null);
  assert.equal(PLAN2026.centralSectorBoundaryCertified, false);
  assert.equal(PLAN2026.projectedCoordinateReferenceVerified, false);
  assert.equal(PLAN2026.is2026CentralSectorPolygon, false);
  assert.equal(PLAN2026.publishedMapBoundaryAllowed, false);
  assert.equal(PLAN2026.attributionAndReuseReviewed, false);
  assert.equal(SECTOR.geometry, null);
  assert.equal(B.centralSectorBoundaryClaim, false);
});
test("two distinct QA centers do not imply central Maârif membership or a new geofence", () => {
  assert.equal(QACENTERS.originalRadiusSample.radiusMeters, 1800);
  assert.equal(QACENTERS.originalRadiusSample.sourceCandidateCountOnPinnedPbf,415);
  assert.equal(QACENTERS.originalRadiusSample.geofenceEligible,false);
  assert.equal(QACENTERS.osmCommunityQuarterPoint.osmId,"node/2186618782");
  assert.equal(QACENTERS.osmCommunityQuarterPoint.osmPlaceTag,"quarter");
  assert.equal(QACENTERS.osmCommunityQuarterPoint.isCertifiedBoundarySource,false);
  assert.equal(QACENTERS.osmCommunityQuarterPoint.geometry,null);
  assert.ok(QACENTERS.qaOnlyComparison.distanceBetweenPointsMetersApprox>950);
  assert.ok(QACENTERS.qaOnlyComparison.distanceBetweenPointsMetersApprox<975);
  assert.equal(QACENTERS.qaOnlyComparison.firstSampleCountOutside1800mOfOsmQuarterPoint,76);
  assert.equal(QACENTERS.qaOnlyComparison.subsetOnly,true);
  assert.equal(QACENTERS.centralSectorPolygon,null);
  assert.equal(QACENTERS.mapPublishingAllowed,false);
});


test("AUC Sept 2026 ArcGIS service is explicitly raster-only, never central-sector GeoJSON", () => {
  const service = PLAN2026.aucSeptember2026ArcgisService;
  assert.match(service.url, /^https:\/\/carto\.auc\.ma\/server\/rest\/services\/DOCUMENTS_URBANISME\//);
  assert.equal(service.portalItemId, "5fff1840bbce45f5a709f33c2e7d3fba");
  assert.equal(service.inspectedAt, "2026-11-10");
  assert.equal(service.layerCount, 1);
  assert.equal(service.layer.id, 1);
  assert.match(service.layer.name, /\.tif$/);
  assert.equal(service.layer.type, "Raster Layer");
  assert.equal(service.layer.geometryType, null);
  assert.equal(service.serviceSpatialReferenceWkid, 102191);
  assert.equal(service.serviceSpatialReferenceLabel, "Nord_Maroc_Degree");
  assert.equal(service.mapsToEpsg26191WithoutExplicitTransformation, false);
  assert.equal(service.centralSectorVectorLayerFound, false);
  assert.equal(service.verifiedCentralSectorGeometry, null);
  assert.equal(service.reuseRightsVerified, false);
  assert.equal(service.publishedMapBoundaryAllowed, false);
  assert.equal(PLAN2026.projectedCoordinateReferenceVerified, false);
  assert.equal(SECTOR.geometry, null);
});
