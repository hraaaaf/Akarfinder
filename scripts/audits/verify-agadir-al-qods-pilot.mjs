#!/usr/bin/env node
// Read-only source-evidence canary. Explicitly not a map publication or SEO enablement.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = JSON.parse(readFileSync(join(root, "data/geo/pilot-agadir-al-qods-evidence.json"), "utf8"));
const packed = Array.from({ length: 8 }, (_, i) => {
  const source = readFileSync(join(root, "lib/map/national-territory-data/neighborhoods-n2-" + i + ".ts"), "utf8");
  const m = source.match(/const chunk = "([A-Za-z0-9+/=]+)";/);
  if (!m) throw new Error("Missing source chunk " + i);
  return m[1];
}).join("");
const groups = JSON.parse(brotliDecompressSync(Buffer.from(packed, "base64")).toString("utf8"));
const norm = (s) => String(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "");
const groupKey = norm(fixture.citySlug);
const target = norm(fixture.sourceRow.name);
const rows = Object.entries(groups).filter(([name]) => norm(name) === groupKey)
  .flatMap(([, records]) => records.filter((row) => norm(row[0]) === target));
assert.equal(rows.length, 1, "Pilot must uniquely identify an existing source row in Agadir");
const [name, lng, lat, flags] = rows[0];
assert.equal(flags, fixture.sourceRow.sourceFlag);
assert.equal(lng, fixture.sourceRow.longitude);
assert.equal(lat, fixture.sourceRow.latitude);
assert(Math.abs(lat - fixture.independentLocationReference.latitudeRounded) <= fixture.independentLocationReference.matchToleranceDegrees);
assert(Math.abs(lng - fixture.independentLocationReference.longitudeRounded) <= fixture.independentLocationReference.matchToleranceDegrees);
assert.equal(fixture.independentLocationReference.osmTag, "place=suburb");
assert.equal(fixture.independentLocationReference.osmId, 3848139959);
assert.equal(fixture.restrictions.publicationStatus, "hold");
assert.equal(fixture.restrictions.allowAutoPromote, false);
assert.equal(fixture.restrictions.mayRenderBoundary, false);
assert.equal(fixture.verification.passed, "source_label_location_crosscheck");
assert(fixture.corroboratingNameSources.length >= 2);
const geoRegistry = readFileSync(join(root, "lib/geo/geo-entity-registry.ts"), "utf8");
assert(!geoRegistry.includes('id: "district_agadir_al_qods"'), "Pilot cannot silently become canonical");
const report = {
  ok: true, candidateId: fixture.candidateId, citySlug: fixture.citySlug, name,
  lng, lat, sourceFlag: flags, osmNodeId: fixture.independentLocationReference.osmId,
  sourceNameCorroborations: fixture.corroboratingNameSources.length,
  originalFeatureIdStoredInPackedV5: false,
  externalReferenceFeatureId: fixture.independentLocationReference.osmId,
  sourcePointEvidence: "source location and label independently cross-checked",
  notProven: fixture.verification.notPassed,
  publicationStatus: "hold",
  mapEligibleActivated: false,
};
const out = join(root, "data/audits/national-neighborhood-coverage");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "agadir-al-qods-pilot.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify(report, null, 2));
