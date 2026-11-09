import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MAARIF_TARGET_PILOT_BOUNDARY as B } from "../../../lib/map/maarif-osm-arrondissement-shadow.js";

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
