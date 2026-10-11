#!/usr/bin/env node
// Read-only national candidate inventory. Never promotes source labels to neighborhoods.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dataRoot = join(root, "lib/map/national-territory-data");
const outputRoot = join(root, "data/audits/national-neighborhood-coverage");
const sourceArtifact = "carte-national-territory-registry-v5-32634250993";

function packedChunk(name) {
  const text = readFileSync(join(dataRoot, name + ".ts"), "utf8");
  const match = text.match(/const chunk = "([A-Za-z0-9+/=]+)";/);
  if (!match) throw new Error("Missing packed chunk: " + name);
  return match[1];
}

function key(value) {
  return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();
}

// Mirrors the national runtime parent lookup exactly (which is Latin-only).
function parentKey(value) {
  return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function validCenter(lng, lat) {
  return Number.isFinite(lng) && Number.isFinite(lat)
    && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

function loadRegistered() {
  const src = readFileSync(join(root, "lib/geo/geo-entity-registry.ts"), "utf8");
  const part = src.split("export const GEO_NEIGHBORHOODS:")[1]?.split("export function normalizeGeoText")[0];
  if (!part) throw new Error("Missing canonical neighborhood registry");
  const rows = [...part.matchAll(/\{[^{}]*?id: "([^"]+)"[^{}]*?canonical_name: "([^"]+)"[^{}]*?aliases: \[([^\]]*)\][^{}]*?city_slug: "([^"]+)"[^{}]*?validation_status: "([^"]+)"[^{}]*?map_eligible: (true|false)[^{}]*?\}/g)]
    .map((m) => ({
      id: m[1], name: m[2], aliases: [...m[3].matchAll(/"([^"]+)"/g)].map((x) => x[1]),
      city: m[4], status: m[5], mapEligible: m[6] === "true",
    }));
  if (rows.length === 0) throw new Error("Canonical registry parser returned zero rows");
  return rows;
}

function main() {
  const places = JSON.parse(gunzipSync(Buffer.from(packedChunk("places-0"), "base64")).toString("utf8"));
  const packed = Array.from({ length: 8 }, (_, i) => packedChunk("neighborhoods-n2-" + i)).join("");
  const groups = JSON.parse(brotliDecompressSync(Buffer.from(packed, "base64")).toString("utf8"));
  const registered = loadRegistered();
  if (!Array.isArray(places) || !groups || typeof groups !== "object") throw new Error("Invalid source containers");

  const placesByParent = new Map();
  for (const place of places) {
    const parent = parentKey(place.name);
    if (!placesByParent.has(parent)) placesByParent.set(parent, []);
    placesByParent.get(parent).push(place);
  }

  const knownByCity = new Map();
  for (const row of registered.filter((item) => item.mapEligible && item.status === "validated")) {
    if (!knownByCity.has(row.city)) knownByCity.set(row.city, new Set());
    for (const name of [row.name, ...row.aliases]) knownByCity.get(row.city).add(key(name));
  }

  const byParent = [];
  let nationalRows = 0;
  let nationalValidCenters = 0;
  let nationalMissingCenters = 0;
  let nationalInvalidCenters = 0;
  let nationalOsms = 0;
  let nationalBarids = 0;
  let nationalDuplicateNames = 0;
  const allNationalNameKeys = new Set();

  for (const [parent, rows] of Object.entries(groups)) {
    if (!Array.isArray(rows)) throw new Error("Invalid neighborhood rows for parent " + parent);
    const matches = placesByParent.get(parent) || [];
    const place = matches.length === 1 ? matches[0] : null;
    const canonicalNames = place ? knownByCity.get(place.slug) || new Set() : new Set();
    let valid = 0, missing = 0, invalid = 0, osm = 0, barid = 0;
    let unregisteredCenteredRows = 0;
    const names = new Set();
    const newCenteredNameKeys = new Set();
    const allNameKeys = new Set();
    for (const row of rows) {
      if (!Array.isArray(row) || row.length !== 4 || typeof row[0] !== "string") {
        throw new Error("Invalid packed row for parent " + parent);
      }
      const [name, lng, lat, flags] = row;
      if (!Number.isInteger(flags) || flags < 1 || flags > 3) throw new Error("Unknown source flag for " + name);
      if (flags & 1) osm++;
      if (flags & 2) barid++;
      const normalized = key(name);
      allNameKeys.add(normalized);
      allNationalNameKeys.add(parent + "|" + normalized);
      if (lng === null && lat === null) {
        missing++;
        continue;
      }
      if (!validCenter(lng, lat)) {
        invalid++;
        continue;
      }
      valid++;
      names.add(normalized);
      if (place && !canonicalNames.has(normalized)) {
        unregisteredCenteredRows++;
        newCenteredNameKeys.add(normalized);
      }
    }
    nationalRows += rows.length;
    nationalValidCenters += valid;
    nationalMissingCenters += missing;
    nationalInvalidCenters += invalid;
    nationalOsms += osm;
    nationalBarids += barid;
    nationalDuplicateNames += rows.length - allNameKeys.size;

    byParent.push({
      parentKey: parent,
      matchedPlaceSlug: place?.slug ?? null,
      matchedPlaceName: place?.name ?? null,
      placeMatchCount: matches.length,
      sourceLabels: rows.length,
      validCenters: valid,
      missingCenters: missing,
      invalidCenters: invalid,
      osmSourceLabels: osm,
      baridSourceLabels: barid,
      normalizedNameCandidates: allNameKeys.size,
      duplicateNormalizedLabels: rows.length - allNameKeys.size,
      centeredNameKeys: names.size,
      unregisteredCenteredLabelRows: unregisteredCenteredRows,
      unregisteredCenteredNameKeys: newCenteredNameKeys.size,
      certifiedNeighborhoodsInCity: place ? registered.filter((r) => r.city === place.slug && r.status === "validated" && r.mapEligible).length : 0,
    });
  }

  const byCity = byParent.filter((r) => r.matchedPlaceSlug).sort((a, b) => b.validCenters - a.validCenters || a.parentKey.localeCompare(b.parentKey));
  const certifiedCities = [...knownByCity.keys()].sort();
  const registeredCityStats = certifiedCities.map((city) => {
    const row = byCity.find((r) => r.matchedPlaceSlug === city);
    return {
      city,
      registeredMapNeighborhoods: registered.filter((r) => r.city === city && r.mapEligible && r.status === "validated").length,
      sourceLabels: row?.sourceLabels ?? null,
      validCenters: row?.validCenters ?? null,
      uniqueCenteredCandidateNames: row?.centeredNameKeys ?? null,
      unregisteredCenteredCandidateNames: row?.unregisteredCenteredNameKeys ?? null,
      sourceLookupFound: Boolean(row),
    };
  });

  const summary = {
    sourceArtifact,
    source: "embedded HCP/Barid/OSM V5 labels, not certified neighborhoods or boundaries",
    cityPlaceCount: places.length,
    parentGroupCount: byParent.length,
    parentMatchedUniquePlaces: byParent.filter((p) => p.placeMatchCount === 1).length,
    parentWithoutPlaceMatch: byParent.filter((p) => p.placeMatchCount === 0).length,
    parentAmbiguousPlaceMatch: byParent.filter((p) => p.placeMatchCount > 1).length,
    sourceLabelRows: nationalRows,
    validCenterRows: nationalValidCenters,
    missingCenterRows: nationalMissingCenters,
    invalidCenterRows: nationalInvalidCenters,
    osmSourceRows: nationalOsms,
    baridSourceRows: nationalBarids,
    duplicateNormalizedNamesWithinParent: nationalDuplicateNames,
    distinctNormalizedParentNameKeys: allNationalNameKeys.size,
    registeredCanonicalNeighborhoods: registered.length,
    registeredMapEligibleNeighborhoods: registered.filter((r) => r.mapEligible && r.status === "validated").length,
    registeredMapEligibleCities: certifiedCities.length,
    publishedNeighborhoodBoundaryCount: 0,
    interpretation: "Candidate coordinates are source-backed map labels; not distinct validated districts, valid polygons, or immediate promotions.",
  };

  if (summary.sourceLabelRows !== summary.validCenterRows + summary.missingCenterRows + summary.invalidCenterRows) {
    throw new Error("National center accounting mismatch");
  }
  if (summary.registeredMapEligibleNeighborhoods !== 17 || summary.registeredCanonicalNeighborhoods !== 23) {
    throw new Error("Existing canonical registered baseline changed; review inventory assumptions");
  }
  mkdirSync(outputRoot, { recursive: true });
  const report = {
    ...summary,
    registeredCityStats,
    top20ParentGroupsByValidCenters: byParent.slice().sort((a, b) => b.validCenters - a.validCenters).slice(0, 20),
    unmatchedParentGroups: byParent.filter((x) => x.placeMatchCount !== 1),
    byParent: byParent.sort((a, b) => a.parentKey.localeCompare(b.parentKey)),
  };
  writeFileSync(join(outputRoot, "report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
  const columns = [
    "parentKey", "matchedPlaceSlug", "matchedPlaceName", "placeMatchCount", "sourceLabels",
    "validCenters", "missingCenters", "invalidCenters", "osmSourceLabels", "baridSourceLabels",
    "normalizedNameCandidates", "duplicateNormalizedLabels", "centeredNameKeys",
    "unregisteredCenteredLabelRows", "unregisteredCenteredNameKeys", "certifiedNeighborhoodsInCity",
  ];
  const csv = [columns.join(",")];
  for (const row of report.byParent) {
    csv.push(columns.map((col) => JSON.stringify(row[col] ?? "")).join(","));
  }
  writeFileSync(join(outputRoot, "by-parent.csv"), csv.join("\n") + "\n", "utf8");

  console.log(JSON.stringify({ summary, registeredCityStats, top10: report.top20ParentGroupsByValidCenters.slice(0, 10), unmatchedParentGroups: report.unmatchedParentGroups }, null, 2));
  if (summary.parentAmbiguousPlaceMatch) {
    console.error("WARNING: Some parent-city names are ambiguous and must not be auto-associated");
  }
}

main();
