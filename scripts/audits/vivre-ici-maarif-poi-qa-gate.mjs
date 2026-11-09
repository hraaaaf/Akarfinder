import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const MAARIF_QA_SCHEMA = "AKARFINDER_MAARIF_POI_QA_PARTIAL_V1";
const REF = Object.freeze({ lat: 33.5898, lon: -7.644, maxDistanceM: 1800 });
const CATEGORIES = Object.freeze({
  clinic: "santé", pharmacy: "santé", school: "éducation",
  supermarket: "courses", transport: "transports", park: "parcs et sport",
  sports: "parcs et sport", shopping: "commerces",
});

function distanceM(lat, lon) {
  const r = Math.PI / 180;
  const dLat = (lat - REF.lat) * r, dLon = (lon - REF.lon) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(REF.lat * r) *
    Math.cos(lat * r) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
function validDate(value, now) {
  const millis = Date.parse(value ?? "");
  return Number.isFinite(millis) && millis > 0 && millis <= now.getTime();
}
function coordinatesOk(item) {
  return Number.isFinite(item.latitude) && Number.isFinite(item.longitude) &&
    item.latitude >= -90 && item.latitude <= 90 &&
    item.longitude >= -180 && item.longitude <= 180;
}
function candidateIdentity(item) {
  const id = item?.id;
  return typeof id === "string" && /^(node|way|relation)\/[1-9]\d*$/.test(id);
}

/**
 * Private evidence gate, intentionally NOT a publication gate.
 * OSM extract freshness is NOT independent confirmation a business is still operating.
 * This module is never imported by the UI or neighborhood read-model.
 */
export function assessMaarifPrivatePoiSnapshot(snapshot, now = new Date()) {
  const findings = [];
  const reviewFlags = [];
  if (!snapshot || typeof snapshot !== "object") {
    return { ok: false, publishable: false, findings: ["invalid_snapshot"], reviewFlags, stats: null };
  }
  if (snapshot.schema !== MAARIF_QA_SCHEMA) findings.push("schema");
  if (snapshot.status !== "PARTIAL_SAMPLE_NOT_PUBLISHABLE") findings.push("status_must_be_private");
  if (snapshot.no_database_write !== true || snapshot.no_ui_publication !== true) findings.push("private_guards");
  if (typeof snapshot.source !== "string" || !snapshot.source.includes("OpenStreetMap")) findings.push("source_not_osm");
  if (!validDate(snapshot.generated_at, now)) findings.push("snapshot_generated_at");
  if (!Array.isArray(snapshot.osm_snapshot_dates) ||
      !snapshot.osm_snapshot_dates.length ||
      snapshot.osm_snapshot_dates.some((d) => !validDate(d, now))) {
    findings.push("source_snapshot_dates");
  }
  if (!Array.isArray(snapshot.candidates)) findings.push("missing_candidates");
  const candidates = Array.isArray(snapshot.candidates) ? snapshot.candidates : [];
  const byCategory = {};
  const uniqueIds = new Set();
  const checked = [];
  let claimedNameAddressCorroborated = 0;
  let withinRadius = 0;
  for (const [index, item] of candidates.entries()) {
    const key = candidateIdentity(item) ? item.id : "index:" + index;
    if (!candidateIdentity(item)) { findings.push("invalid_osm_id:" + index); continue; }
    if (uniqueIds.has(key)) findings.push("duplicate_osm_id:" + key);
    uniqueIds.add(key);
    if (typeof item.name_osm !== "string" || !item.name_osm.trim()) findings.push("missing_name:" + key);
    if (!coordinatesOk(item)) { findings.push("invalid_coordinates:" + key); continue; }
    if (!(item.category in CATEGORIES)) findings.push("unsupported_category:" + key);
    if (item.osm_url !== "https://www.openstreetmap.org/" + key) findings.push("source_url:" + key);
    const distance = distanceM(item.latitude, item.longitude);
    if (distance <= REF.maxDistanceM) withinRadius++;
    else reviewFlags.push("outside_reference_radius:" + key);
    const claimed = item.independent_name_address_check === "name_address_corrob";
    if (claimed) {
      claimedNameAddressCorroborated++;
      if (typeof item.independent_source_url !== "string" ||
          !/^https:\/\//.test(item.independent_source_url)) {
        findings.push("secondary_claim_without_url:" + key);
      }
    }
    // A secondary directory listing is not a current operation, precise GPS or legal boundary proof.
    for (const flag of ["current_operation_verified", "position_precision_independently_verified", "within_central_quartier_certified"]) {
      if (item[flag] !== false) findings.push("forbidden_publishability_claim:" + key + ":" + flag);
    }
    if (typeof item.distance_from_center_m === "number" &&
        Math.abs(item.distance_from_center_m - distance) > 5) findings.push("distance_mismatch:" + key);
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    checked.push(item);
  }
  const closePairs = [];
  for (let i = 0; i < checked.length; i++) {
    for (let j = i + 1; j < checked.length; j++) {
      const a = checked[i], b = checked[j];
      if (a.id === b.id) continue;
      const distance = 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(
        Math.sin((b.latitude - a.latitude) * Math.PI / 360) ** 2 +
        Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) *
        Math.sin((b.longitude - a.longitude) * Math.PI / 360) ** 2
      )));
      if (distance <= 50) closePairs.push({ a: a.id, b: b.id, separation_m: Math.round(distance * 10) / 10 });
    }
  }
  if (snapshot.total_candidates !== candidates.length) findings.push("reported_count_mismatch");
  if (candidates.length === 0) reviewFlags.push("empty_candidate_sample");
  if (claimedNameAddressCorroborated < candidates.length) reviewFlags.push("secondary_corroboration_incomplete");
  if (closePairs.length) reviewFlags.push("spatial_duplicates_to_review");
  if (!Object.hasOwn(byCategory, "transport")) reviewFlags.push("transport_not_sampled");
  if (!Object.hasOwn(byCategory, "park") && !Object.hasOwn(byCategory, "sports")) reviewFlags.push("parks_sport_not_sampled");
  // Deliberately never mark this private sample publishable, even when structurally valid.
  return {
    ok: findings.length === 0,
    publishable: false,
    certification: "QA_ONLY_NON_EXHAUSTIVE",
    sourceTimestampIsBusinessVerification: false,
    findings,
    reviewFlags,
    stats: {
      candidateCount: candidates.length,
      counts: Object.fromEntries(Object.entries(byCategory).sort()),
      withinReferenceRadius: withinRadius,
      claimedNameAddressCorroborated,
      independentOperationVerified: 0,
      independentCoordinatesVerified: 0,
      centralQuarterBoundaryMembershipCertified: 0,
      possibleClosePairs: closePairs,
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const inputIndex = argv.indexOf("--input");
  const outputIndex = argv.indexOf("--output");
  if (inputIndex < 0 || !argv[inputIndex + 1] || outputIndex < 0 || !argv[outputIndex + 1]) {
    console.error("Usage: node scripts/audits/vivre-ici-maarif-poi-qa-gate.mjs --input <private-snapshot.json> --output <qa-report.json>");
    process.exitCode = 2;
  } else {
    try {
      const inputPath = resolve(argv[inputIndex + 1]);
      const outputPath = resolve(argv[outputIndex + 1]);
      const snapshot = JSON.parse(await readFile(inputPath, "utf8"));
      const result = assessMaarifPrivatePoiSnapshot(snapshot);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, JSON.stringify({
        input: "private QA evidence (raw POI data deliberately omitted)",
        generatedAt: new Date().toISOString(),
        ...result,
      }, null, 2) + "\n", "utf8");
      console.log(JSON.stringify({ ...result, output: outputPath }));
      if (!result.ok) process.exitCode = 1;
    } catch (error) {
      console.error("Private QA gate failed:", error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
