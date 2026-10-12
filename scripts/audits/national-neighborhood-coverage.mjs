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

function loadLegacyDictionary() {
  const source = readFileSync(join(root, "lib/geo/district-dictionary.ts"), "utf8");
  const section = source.split("export const MOROCCO_DISTRICTS: CityDistricts = {")[1]?.split("};")[0];
  if (!section) throw new Error("Missing legacy dictionary source");
  const citySlugs = {
    Casablanca: "casablanca", Rabat: "rabat", Marrakech: "marrakech",
    Agadir: "agadir", Tanger: "tanger", "Fès": "fes",
  };
  const byCity = new Map();
  let total = 0;
  for (const match of section.matchAll(/([A-Za-zÀ-ÿ]+):\s*\[([\s\S]*?)\],/gu)) {
    const city = citySlugs[match[1]];
    if (!city) throw new Error("Unknown legacy city: " + match[1]);
    const names = [...match[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    total += names.length;
    byCity.set(city, new Set(names.map(key)));
  }
  if (byCity.size !== 6 || total !== 65) throw new Error("Legacy dictionary baseline changed");
  return byCity;
}

// Spatial shadow check against existing, possibly simplified OSM place polygons.
// An apparent inclusion does NOT certify a neighborhood; an apparent exclusion
// may result from simplified/administrative boundaries and requires manual review.
function ringContains(point, ring) {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (!Array.isArray(a) || !Array.isArray(b)) continue;
    const crossing = (a[1] > point[1]) !== (b[1] > point[1]);
    if (crossing && point[0] < ((b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0])) inside = !inside;
  }
  return inside;
}

function withinGeometry(point, geometry) {
  if (!geometry) return false;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates]
    : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
  return polygons.some((rings) =>
    Array.isArray(rings) && rings.length > 0
    && ringContains(point, rings[0])
    && !rings.slice(1).some((hole) => ringContains(point, hole)));
}

function main() {
  const places = JSON.parse(gunzipSync(Buffer.from(packedChunk("places-0"), "base64")).toString("utf8"));
  const packed = Array.from({ length: 8 }, (_, i) => packedChunk("neighborhoods-n2-" + i)).join("");
  const groups = JSON.parse(brotliDecompressSync(Buffer.from(packed, "base64")).toString("utf8"));
  const registered = loadRegistered();
  const historical = loadLegacyDictionary();
  // Legacy V5 aggregate and N2 decoded label rows may have different semantics.
  // Compare the source's per-place declarations with the static runtime constant.
  const runtime = readFileSync(join(root, "lib/map/national-territory-runtime.server.ts"), "utf8");
  const metaText = runtime.split("export const NATIONAL_TERRITORY_META = {")[1]?.split("} as const")[0];
  const legacyCountMatch = metaText?.match(/neighborhoodCount:\s*(\d+)/);
  if (!legacyCountMatch) throw new Error("Missing static legacy source count metadata");
  const legacyStaticCount = Number(legacyCountMatch[1]);
  if (!places.every((p) => Number.isInteger(p.neighborhoodCount) && p.neighborhoodCount >= 0)) {
    throw new Error("Unexpected V5 per-place neighborhoodCount contract");
  }
  const placeDeclaredCount = places.reduce((sum, place) => sum + place.neighborhoodCount, 0);
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

  const canonicalNonmapByCity = new Map();
  for (const row of registered.filter((item) => item.status === "validated" && !item.mapEligible)) {
    if (!canonicalNonmapByCity.has(row.city)) canonicalNonmapByCity.set(row.city, new Set());
    for (const name of [row.name, ...row.aliases]) canonicalNonmapByCity.get(row.city).add(key(name));
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

  // Diagnose only: no runtime changes or automatic city-parent promotion.
  const orphanParentNormalizedCandidates = byParent.filter((r) => r.placeMatchCount !== 1).map((row) => {
    const candidateMatches = placesByParent.get(parentKey(row.parentKey)) || [];
    return {
      parentKey: row.parentKey,
      centeredRows: row.validCenters,
      candidatePlaceCount: candidateMatches.length,
      candidatePlaceSlug: candidateMatches.length === 1 ? candidateMatches[0].slug : null,
      candidatePlaceName: candidateMatches.length === 1 ? candidateMatches[0].name : null,
      reviewState: candidateMatches.length === 1 ? "normalized_exact_candidate_not_promoted" : "unresolved",
    };
  });

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
    sourceCountDefinitionAudit: {
      legacyStaticCount,
      placeDeclaredCount,
      n2DecodedSourceRowCount: nationalRows,
      staticVsPlaceDeclarationDelta: legacyStaticCount - placeDeclaredCount,
      decodedRowsVsLegacyStaticDelta: nationalRows - legacyStaticCount,
      interpretation: "Independent measurement definitions until producer provenance is confirmed; do not equate rows to unique verified neighborhoods",
    },
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
    orphanParentNormalizedCandidates,
    byParent: byParent.sort((a, b) => a.parentKey.localeCompare(b.parentKey)),
  };
  // Read-only spatial sanity check. This does not alter the runtime parent index.
  const boundaryFeatures = Array.from({ length: 8 }, (_, i) =>
    JSON.parse(gunzipSync(Buffer.from(packedChunk("boundaries-" + i), "base64")).toString("utf8")).features).flat();
  const polygonsBySlug = new Map();
  for (const feature of boundaryFeatures) {
    const slug = feature?.properties?.slug;
    if (typeof slug !== "string" || !slug) continue;
    if (!polygonsBySlug.has(slug)) polygonsBySlug.set(slug, []);
    polygonsBySlug.get(slug).push(feature.geometry);
  }
  const sourceReviewExceptions = [];
  const centeredSourceCandidatesByCity = new Map();
  const priorityCities = new Set(["casablanca", "rabat", "marrakech", "tanger", "agadir", "fes", "kenitra"]);
  const sourceProvenance = "OSM V5 packed center; original OSM feature ID unavailable in packed artifact";
  const spatialShadow = {
    geometrySource: "OSM administrative candidate polygon (simplified), not a certified neighborhood boundary",
    sourceBoundaryFeatures: boundaryFeatures.length,
    assessedCenteredRows: 0,
    parentUnresolvedRows: 0,
    parentMatchedWithoutCityPolygonRows: 0,
    insideCandidateCityPolygonRows: 0,
    outsideCandidateCityPolygonRowsNeedsReview: 0,
    bySourceParent: [],
  };
  for (const [parent, rows] of Object.entries(groups)) {
    const direct = placesByParent.get(parent) || [];
    const proposed = direct.length ? direct : placesByParent.get(parentKey(parent)) || [];
    const place = proposed.length === 1 ? proposed[0] : null;
    const shapes = place ? polygonsBySlug.get(place.slug) || [] : [];
    const record = { parentKey: parent, proposedCitySlug: place?.slug ?? null,
      normalizedFallback: direct.length === 0 && Boolean(place),
      assessed: 0, unresolved: 0, noPolygon: 0, inside: 0, outsideNeedsReview: 0 };
    for (const [name, lng, lat, flags] of rows) {
      if (!validCenter(lng, lat)) continue;
      // Candidate review records are not map-ready and retain the exact source name and coordinates.
      if (place && !record.normalizedFallback && priorityCities.has(place.slug)) {
        const canonicalNames = knownByCity.get(place.slug) || new Set();
        const normalized = key(name);
        if (!canonicalNames.has(normalized)) {
          if (!centeredSourceCandidatesByCity.has(place.slug)) centeredSourceCandidatesByCity.set(place.slug, new Map());
          const group = centeredSourceCandidatesByCity.get(place.slug);
          const category = canonicalNonmapByCity.get(place.slug)?.has(normalized)
            ? "canonical_validated_but_not_map_eligible"
            : historical.get(place.slug)?.has(normalized)
              ? "legacy_dictionary_unreviewed"
              : "source_only_unverified";
          const riskTokens = /(?:^| )(?:residence|residentiel|lot|lotissement|immeuble|complexe|centre commercial|parc|al barid|la poste|maison|village touristique)(?: |$)/;
          const riskSignals = riskTokens.test(normalized) ? ["name_may_be_project_or_poi_not_quartier"] : [];
          const entry = group.get(normalized) || {
            sourceIdentityCategory: category, nameRiskSignals: riskSignals,
            citySlug: place.slug, cityName: place.name, normalizedName: normalized,
            names: [], sourcePoints: [], reviewStatus: "pending_semantic_and_source_identity_review",
            originalOsmFeatureId: null, provenance: sourceProvenance,
            publicationEligible: false,
          };
          if (!entry.names.includes(name)) entry.names.push(name);
          if (riskSignals.length && !entry.nameRiskSignals.includes(riskSignals[0])) entry.nameRiskSignals.push(riskSignals[0]);
          entry.sourcePoints.push({ lng, lat, sourceKinds: [
            ...(flags & 1 ? ["osm_neighborhood_label"] : []),
            ...(flags & 2 ? ["barid_postal_neighborhood"] : []),
          ] });
          group.set(normalized, entry);
        }
      }
      record.assessed++;
      spatialShadow.assessedCenteredRows++;
      if (!place) {
        record.unresolved++; spatialShadow.parentUnresolvedRows++;
        sourceReviewExceptions.push({ type: "unresolved_parent", parentKey: parent, proposedCitySlug: null,
          name, lng, lat, sourceKinds: flags & 1 ? ["osm_neighborhood_label"] : ["barid_postal_neighborhood"],
          originalOsmFeatureId: null, reviewStatus: "hold_manual_identity_review", publicationEligible: false });
      }
      else if (!shapes.length) {
        record.noPolygon++; spatialShadow.parentMatchedWithoutCityPolygonRows++;
        sourceReviewExceptions.push({ type: "missing_city_polygon", parentKey: parent, proposedCitySlug: place.slug,
          name, lng, lat, sourceKinds: flags & 1 ? ["osm_neighborhood_label"] : ["barid_postal_neighborhood"],
          originalOsmFeatureId: null, reviewStatus: "hold_manual_boundary_review", publicationEligible: false });
      }
      else if (shapes.some((shape) => withinGeometry([lng, lat], shape))) {
        record.inside++; spatialShadow.insideCandidateCityPolygonRows++;
      } else {
        record.outsideNeedsReview++; spatialShadow.outsideCandidateCityPolygonRowsNeedsReview++;
        sourceReviewExceptions.push({ type: "outside_candidate_city_polygon", parentKey: parent,
          proposedCitySlug: place.slug, name, lng, lat, sourceKinds: flags & 1 ? ["osm_neighborhood_label"] : ["barid_postal_neighborhood"],
          originalOsmFeatureId: null, reviewStatus: "hold_manual_spatial_review", publicationEligible: false });
      }
    }
    if (record.assessed) spatialShadow.bySourceParent.push(record);
  }
  if (spatialShadow.assessedCenteredRows !== summary.validCenterRows ||
    spatialShadow.parentUnresolvedRows + spatialShadow.parentMatchedWithoutCityPolygonRows +
    spatialShadow.insideCandidateCityPolygonRows + spatialShadow.outsideCandidateCityPolygonRowsNeedsReview !== summary.validCenterRows) {
    throw new Error("Spatial shadow accounting mismatch");
  }
  report.spatialShadow = spatialShadow;
  const candidatesByCity = Array.from(centeredSourceCandidatesByCity.entries())
    .map(([city, names]) => ({
      citySlug: city, candidateNameCount: names.size,
      candidates: Array.from(names.values()).sort((a, b) => a.normalizedName.localeCompare(b.normalizedName)),
    })).sort((a,b) => a.citySlug.localeCompare(b.citySlug));
  const candidateCount = candidatesByCity.reduce((n, city) => n + city.candidateNameCount, 0);
  const expected = registeredCityStats.filter((x) => x.city !== "mohammedia").reduce(
    (n, x) => n + x.unregisteredCenteredCandidateNames, 0);
  if (candidateCount !== expected || candidateCount !== 323) {
    throw new Error("Source candidate inventory drift: " + candidateCount + " expected " + expected);
  }
  if (sourceReviewExceptions.length !== spatialShadow.outsideCandidateCityPolygonRowsNeedsReview +
      spatialShadow.parentUnresolvedRows + spatialShadow.parentMatchedWithoutCityPolygonRows) {
    throw new Error("Source review exception count mismatch");
  }
  const categoryStats = {};
  let projectOrPoiNameRiskCount = 0;
  for (const city of candidatesByCity) {
    for (const entry of city.candidates) {
      categoryStats[entry.sourceIdentityCategory] = (categoryStats[entry.sourceIdentityCategory] ?? 0) + 1;
      if (entry.nameRiskSignals.length) projectOrPoiNameRiskCount++;
    }
  }
  const possibleNearNamePairs = [];
  for (const city of candidatesByCity) {
    for (let i = 0; i < city.candidates.length; i++) {
      for (let j = i + 1; j < city.candidates.length; j++) {
        const a = city.candidates[i], b = city.candidates[j];
        const p = a.sourcePoints[0], q = b.sourcePoints[0];
        const dLat = (p.lat - q.lat) * 111320;
        const dLng = (p.lng - q.lng) * Math.cos(((p.lat + q.lat) / 2) * Math.PI / 180) * 111320;
        const meters = Math.hypot(dLat, dLng);
        if (meters <= 150) {
          possibleNearNamePairs.push({ citySlug: city.citySlug,
            candidateA: a.names[0], candidateB: b.names[0],
            approximateMeters: Math.round(meters),
            reason: "nearby_distinct_source_labels_not_confirmed_aliases",
            autoMergeAllowed: false });
        }
      }
    }
  }
  const candidateReview = {
    sourceArtifact, sourceProvenance, kind: "unverified_centered_source_candidates",
    noSourceFeatureIds: true, candidateNameCount: candidateCount,
    categoryStats, projectOrPoiNameRiskCount,
    nearbyDistinctNamePairsWithin150m: possibleNearNamePairs,
    cities: candidatesByCity,
    releasePolicy: "NOT MAP ELIGIBLE: qualify city and neighborhood identity, actual OSM feature identity, geo evidence, duplicates and scope before rendering",
  };
  report.reviewQueue = { exceptionsCount: sourceReviewExceptions.length, centeredCandidateNameCount: candidateCount,
    candidateCategoryStats: categoryStats, projectOrPoiNameRiskCount,
    potentialNearbyNamePairs: possibleNearNamePairs.length,
    originalOsmFeatureIdsAvailable: false };
  writeFileSync(join(outputRoot, "source-review-exceptions.json"),
    JSON.stringify({ sourceArtifact, total: sourceReviewExceptions.length, rows: sourceReviewExceptions }, null, 2) + "\n", "utf8");
  writeFileSync(join(outputRoot, "centered-candidate-review.json"), JSON.stringify(candidateReview, null, 2) + "\n", "utf8");
  const safeCsv = (value) => {
    const text = String(value ?? "");
    // Avoid spreadsheet formula execution when reviewers open untrusted OSM labels.
    const safe = /^\s*[=+@-]/.test(text) ? "'" + text : text;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  const candidateCsvRows = [
    ["city", "name", "category", "lat", "lng", "source_point_count", "source_review", "risk_flags", "original_osm_feature_id", "published"],
  ];
  for (const city of candidatesByCity) {
    for (const entry of city.candidates) {
      const p = entry.sourcePoints[0];
      candidateCsvRows.push([city.citySlug, entry.names[0], entry.sourceIdentityCategory,
        p.lat, p.lng, entry.sourcePoints.length, entry.reviewStatus,
        entry.nameRiskSignals.join(";"), "", false]);
    }
  }
  writeFileSync(join(outputRoot, "centered-candidate-review.csv"),
    candidateCsvRows.map((row) => row.map(safeCsv).join(",")).join("\n") + "\n", "utf8");

  writeFileSync(join(outputRoot, "source-review-exceptions.csv"),
    ["type,parentKey,proposedCitySlug,name,lng,lat,reviewStatus",
      ...sourceReviewExceptions.map((r) => [r.type, r.parentKey, r.proposedCitySlug, r.name, r.lng, r.lat, r.reviewStatus]
        .map((v) => JSON.stringify(v ?? "")).join(","))].join("\n") + "\n", "utf8");
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

  console.log(JSON.stringify({ summary, registeredCityStats, top10: report.top20ParentGroupsByValidCenters.slice(0, 10), unmatchedParentGroups: report.unmatchedParentGroups, orphanParentNormalizedCandidates: report.orphanParentNormalizedCandidates, spatialShadowTotals: Object.fromEntries(Object.entries(report.spatialShadow).filter(([k]) => k !== "bySourceParent")), spatialShadowTop: report.spatialShadow.bySourceParent.slice().sort((a, b) => b.assessed - a.assessed).slice(0, 20),
    sourceCountDefinitionAudit: summary.sourceCountDefinitionAudit,
    reviewQueue: report.reviewQueue, exceptionRows: sourceReviewExceptions,
    nearNamePairsSample: possibleNearNamePairs.slice(0, 30), candidatesPerCity: candidatesByCity.map(
      (c) => ({ citySlug: c.citySlug, candidateNameCount: c.candidateNameCount,
        pilotReviewSamples: c.candidates.slice(0, 5).map((r) => ({ name: r.names[0],
          center: r.sourcePoints[0], sourceIdentityState: r.reviewStatus })) })) }, null, 2));
  if (summary.parentAmbiguousPlaceMatch) {
    console.error("WARNING: Some parent-city names are ambiguous and must not be auto-associated");
  }
}

main();
