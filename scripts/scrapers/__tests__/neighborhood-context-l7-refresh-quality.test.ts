import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getAnnL5CertifiedSeedPois } from "@/lib/neighborhood-context/certified-seed";
import { inspectInstitutionalXlsxHeaders, scanInstitutionalSchoolTextCandidates } from "@/lib/neighborhood-context/institutional-xlsx-inspector";
import { MENPS_PRIMARY_2026_RESOURCE_URL, officialCurlArguments, permittedOfficialResource } from "@/scripts/neighborhood-context/l7-probe-official-xlsx";
import {
  INSTITUTIONAL_DATASETS_2026,
  buildInstitutionalAdmissionReport,
  reviewInstitutionalPoiV1,
  type InstitutionalPoiReviewV1,
} from "@/lib/neighborhood-context/institutional-admission";
import { buildNeighborhoodContextNationalBaseline } from "@/lib/neighborhood-context/national-baseline";
import {
  NEIGHBORHOOD_CONTEXT_L7_CANARY_IDS,
  NEIGHBORHOOD_CONTEXT_L7_FRESHNESS_MAX_AGE_MS,
  detectNeighborhoodContextBaselineRegressions,
  getNeighborhoodContextNationalRefreshTargets,
  getNeighborhoodContextQualityCanaries,
  runNeighborhoodContextNationalRefreshBatch,
  validateNeighborhoodContextNationalRefreshReport,
  validateNeighborhoodContextNationalRefreshTargets,
  type NeighborhoodContextRefreshFetchResultV1,
} from "@/lib/neighborhood-context/national-refresh";

const NOW = new Date("2026-08-26T12:00:00.000Z");

const BLOCKED_IDS = [
  "district_casablanca_ain_diab",
  "district_casablanca_bourgogne",
  "district_casablanca_racine",
  "district_rabat_souissi",
];

describe("Neighborhood Context L7-B — national refresh targets", () => {
  it("targets all product-eligible neighborhoods and blocks missing reference points explicitly", () => {
    const targets = getNeighborhoodContextNationalRefreshTargets();
    assert.equal(targets.length, 21);
    assert.equal(targets.filter((target) => target.target_status === "queryable").length, 17);
    assert.deepEqual(
      targets
        .filter((target) => target.target_status === "blocked_missing_reference_point")
        .map((target) => target.canonical_neighborhood_id)
        .sort(),
      BLOCKED_IDS,
    );
    assert.equal(targets.filter((target) => target.target_status === "blocked_missing_reference_point").every((target) => target.query_origin === null), true);
    assert.equal(targets.filter((target) => target.target_status === "queryable").every((target) => target.query_origin !== null), true);
    assert.deepEqual(validateNeighborhoodContextNationalRefreshTargets(targets), []);
  });

  it("inherits the exact 30-day L1 freshness policy", () => {
    assert.equal(NEIGHBORHOOD_CONTEXT_L7_FRESHNESS_MAX_AGE_MS, 30 * 24 * 60 * 60 * 1000);
  });
});

describe("Neighborhood Context L7-B — batch behavior", () => {
  it("never calls the fetcher for blocked targets and fails unavailable targets closed", async () => {
    const called: string[] = [];
    const report = await runNeighborhoodContextNationalRefreshBatch(NOW, async (target) => {
      called.push(target.canonical_neighborhood_id);
      const pois = getAnnL5CertifiedSeedPois(target.canonical_neighborhood_id, NOW);
      const result: NeighborhoodContextRefreshFetchResultV1 = pois.length
        ? {
            status: "available",
            provider_id: "fixture-batch",
            observed_at: pois[0].observed_at,
            endpoint_used: "fixture://l7-b",
            elapsed_ms: 1,
            pois,
            diagnostics: [],
          }
        : {
            status: "unavailable",
            provider_id: "fixture-batch",
            observed_at: null,
            endpoint_used: null,
            elapsed_ms: 1,
            pois: [],
            diagnostics: ["fixture_no_data"],
          };
      return result;
    });

    assert.equal(called.length, 17);
    assert.equal(BLOCKED_IDS.some((id) => called.includes(id)), false);
    assert.equal(report.targets, 21);
    assert.equal(report.queryable_targets, 17);
    assert.equal(report.blocked_targets, 4);
    assert.equal(report.available_targets, 4);
    assert.equal(report.unavailable_targets, 13);
    assert.equal(report.total_pois, 12);
    assert.equal(report.total_anchors, 11);
    assert.deepEqual(validateNeighborhoodContextNationalRefreshReport(report), []);

    const blocked = report.rows.filter((row) => row.refresh_status === "blocked");
    assert.equal(blocked.every((row) => row.poi_count === 0 && row.anchor_count === 0 && row.anchor_evidence.length === 0), true);
    const unavailable = report.rows.filter((row) => row.refresh_status === "unavailable");
    assert.equal(unavailable.every((row) => row.anchor_count === 0 && row.anchor_evidence.length === 0), true);
  });

  it("retains auditable provenance, license, attribution and freshness for every selected anchor", async () => {
    const report = await runNeighborhoodContextNationalRefreshBatch(NOW, async (target) => {
      const pois = getAnnL5CertifiedSeedPois(target.canonical_neighborhood_id, NOW);
      return pois.length
        ? {
            status: "available" as const,
            provider_id: "fixture-batch",
            observed_at: pois[0].observed_at,
            endpoint_used: "fixture://l7-b",
            elapsed_ms: 1,
            pois,
            diagnostics: [],
          }
        : {
            status: "unavailable" as const,
            provider_id: "fixture-batch",
            observed_at: null,
            endpoint_used: null,
            elapsed_ms: 1,
            pois: [],
            diagnostics: [],
          };
    });

    const evidence = report.rows.flatMap((row) => row.anchor_evidence);
    assert.equal(evidence.length, 11);
    assert.equal(evidence.every((entry) => entry.poi_id.startsWith("osm:")), true);
    assert.equal(evidence.every((entry) => Boolean(entry.source_id && entry.attribution && entry.license_policy && entry.observed_at)), true);
    assert.equal(evidence.every((entry) => entry.freshness_status === "fresh"), true);
    assert.equal(evidence.every((entry) => entry.license_policy === "odbl_attribution_required"), true);
    assert.equal(evidence.every((entry) => Boolean(entry.license_url)), true);
    for (const row of report.rows) {
      assert.deepEqual(row.anchor_evidence.map((entry) => entry.poi_id), row.anchor_ids);
    }
  });

  it("keeps radius-only anchors territorially truth-safe", async () => {
    const report = await runNeighborhoodContextNationalRefreshBatch(NOW, async (target) => {
      const pois = getAnnL5CertifiedSeedPois(target.canonical_neighborhood_id, NOW);
      return pois.length
        ? {
            status: "available" as const,
            provider_id: "fixture-batch",
            observed_at: pois[0].observed_at,
            endpoint_used: "fixture://l7-b",
            elapsed_ms: 1,
            pois,
            diagnostics: [],
          }
        : {
            status: "unavailable" as const,
            provider_id: "fixture-batch",
            observed_at: null,
            endpoint_used: null,
            elapsed_ms: 1,
            pois: [],
            diagnostics: [],
          };
    });

    const availableIds = report.rows.filter((row) => row.refresh_status === "available").map((row) => row.canonical_neighborhood_id).sort();
    assert.deepEqual(availableIds, [
      "district_casablanca_maarif",
      "district_marrakech_gueliz",
      "district_rabat_agdal",
      "district_tanger_malabata",
    ]);
    assert.equal(report.rows.find((row) => row.canonical_neighborhood_id === "district_rabat_agdal")?.selection_status, "partial_context");
    assert.equal(report.rows.find((row) => row.canonical_neighborhood_id === "district_tanger_malabata")?.selection_status, "partial_context");
  });
});

describe("Neighborhood Context L7-B — quality and regression", () => {
  it("has five deliberate canaries spanning partial, insufficient, unavailable and blocked without fabricating covered", () => {
    const baseline = buildNeighborhoodContextNationalBaseline(NOW);
    const canaries = getNeighborhoodContextQualityCanaries(baseline);
    assert.equal(canaries.length, NEIGHBORHOOD_CONTEXT_L7_CANARY_IDS.length);
    assert.deepEqual(canaries.map((entry) => entry.canonical_neighborhood_id), [...NEIGHBORHOOD_CONTEXT_L7_CANARY_IDS]);
    assert.equal(canaries.find((entry) => entry.canonical_neighborhood_id === "district_rabat_agdal")?.coverage_status, "partial");
    assert.equal(canaries.find((entry) => entry.canonical_neighborhood_id === "district_tanger_malabata")?.coverage_status, "partial");
    assert.equal(canaries.find((entry) => entry.canonical_neighborhood_id === "district_casablanca_maarif")?.coverage_status, "insufficient");
    assert.equal(canaries.find((entry) => entry.canonical_neighborhood_id === "district_agadir_founty")?.coverage_status, "unavailable");
    assert.equal(canaries.find((entry) => entry.canonical_neighborhood_id === "district_rabat_souissi")?.target_status, "blocked_missing_reference_point");
  });

  it("detects coverage, anchor and fresh-evidence regressions without inventing a threshold", () => {
    const before = buildNeighborhoodContextNationalBaseline(NOW);
    const after = structuredClone(before);
    const agdal = after.neighborhoods.find((row) => row.canonical_neighborhood_id === "district_rabat_agdal");
    assert.ok(agdal);
    agdal.coverage_status = "unavailable";
    agdal.anchor_count = 0;
    agdal.anchors = [];
    agdal.categories = [];
    agdal.fresh_anchor_evidence = false;

    const findings = detectNeighborhoodContextBaselineRegressions(before, after);
    assert.equal(findings.some((finding) => finding.kind === "coverage_degraded" && finding.canonical_neighborhood_id === "district_rabat_agdal"), true);
    assert.equal(findings.some((finding) => finding.kind === "anchor_drop" && finding.canonical_neighborhood_id === "district_rabat_agdal"), true);
    assert.equal(findings.some((finding) => finding.kind === "fresh_evidence_lost" && finding.canonical_neighborhood_id === "district_rabat_agdal"), true);
    assert.deepEqual(detectNeighborhoodContextBaselineRegressions(before, before), []);
  });
});


describe("NCI L5/L7 — 2026 institutional source admission, fail-closed", () => {
  const CHECK_DATE = new Date("2026-11-13T12:00:00.000Z");
  const source = INSTITUTIONAL_DATASETS_2026[0];
  const candidate: InstitutionalPoiReviewV1 = {
    dataset_id: source.id,
    source_entity_id: "synthetic:test-school-1",
    name: "SYNTHETIC TEST ONLY — no real school",
    latitude: 33.99,
    longitude: -6.85,
    individual_verified_at: "2026-11-12T12:00:00.000Z",
    independent_evidence_url: "https://example.org/test-independent-evidence",
    independent_evidence_method: "official_entity_record",
    territorial_relation: "near_certified_reference",
    territorial_proof_url: "https://example.org/test-territorial-proof",
    reviewer_approval_id: "TEST-FAKE-NOT-A-SIGNATURE",
  };

  it("records July 2026 official sources but never treats dataset date as POI freshness", () => {
    const report = buildInstitutionalAdmissionReport(CHECK_DATE);
    assert.equal(report.schema, "NCI_L5_INSTITUTIONAL_ADMISSION_PREFLIGHT_V1");
    assert.equal(report.source_count, 5);
    assert.equal(report.accepted, 0);
    assert.equal(report.source_files_downloaded_and_hashed, 0);
    assert.equal(report.entity_rows_individually_verified, 0);
    assert.equal(report.public_publish_allowed, false);
    assert.equal(report.source_updated_date_is_not_entity_verified_at, true);
    assert.equal(INSTITUTIONAL_DATASETS_2026.filter((entry) =>
      entry.publisher === "MENPS" && entry.dataset_as_of === "2026-07").length, 4);
  });

  it("refuses missing coordinates even if portal metadata and entity date appear fresh", () => {
    const actual = reviewInstitutionalPoiV1(source, { ...candidate, latitude: null }, CHECK_DATE);
    assert.equal(actual.status, "rejected");
    assert.ok(actual.reasons.includes("coordinates_missing_or_outside_morocco"));
    assert.equal(actual.public_publish_allowed, false);
  });

  it("refuses a stale individual observation despite newer catalogue upload", () => {
    const actual = reviewInstitutionalPoiV1(source, {
      ...candidate, individual_verified_at: "2026-09-16T15:00:00.000Z",
    }, CHECK_DATE);
    assert.equal(actual.status, "rejected");
    assert.ok(actual.reasons.includes("individual_observation_stale_or_future"));
  });

  it("never promotes an uninspected source file, even with a synthetic recent row", () => {
    const actual = reviewInstitutionalPoiV1(source, candidate, CHECK_DATE);
    assert.equal(actual.status, "manual_review");
    assert.ok(actual.reasons.includes("source_file_uninspected_or_unhashed"));
    assert.equal(actual.public_publish_allowed, false);
  });

  it("cannot auto-admit even if every field is filled using a fake reviewer ID", () => {
    const reviewed = { ...source, source_file_inspected: true, resource_sha256: "a".repeat(64) };
    const actual = reviewInstitutionalPoiV1(reviewed, candidate, CHECK_DATE);
    assert.equal(actual.status, "manual_review");
    assert.ok(actual.reasons.includes("external_signed_admission_required"));
    assert.equal(actual.public_publish_allowed, false);
  });

  it("treats different www spelling of data.gov.ma as the same non-independent origin", () => {
    const reviewed = { ...source, source_file_inspected: true, resource_sha256: "b".repeat(64) };
    const actual = reviewInstitutionalPoiV1(reviewed, {
      ...candidate, independent_evidence_url: "https://www.data.gov.ma/data/fr/dataset/fixture",
    }, CHECK_DATE);
    assert.equal(actual.status, "manual_review");
    assert.ok(actual.reasons.includes("non_independent_source_host"));
  });

  it("rejects invalid institution URL rather than throwing on URL comparison", () => {
    const invalid = { ...source, dataset_url: "not-a-url" };
    const actual = reviewInstitutionalPoiV1(invalid, candidate, CHECK_DATE);
    assert.equal(actual.status, "rejected");
    assert.ok(actual.reasons.includes("invalid_source_provenance"));
  });
});


// Tiny in-memory ZIP builder: tests the actual XLSX reader without network,
// private files, paid browser services or a local test harness.
function makeStoredXlsx(entries: Record<string, string>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let start = 0;
  for (const [filename, content] of Object.entries(entries)) {
    const name = Buffer.from(filename, "utf8");
    const data = Buffer.from(content, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(start, 42);
    centralParts.push(central, name);
    start += local.length + name.length + data.length;
  }
  const directory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(start, 16);
  return Buffer.concat([...localParts, directory, end]);
}

function fixtureSheet(headers: string[]) {
  return [
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    '<dimension ref="A1:D2"/><sheetData><row r="1">',
    ...headers.map((header, idx) =>
      '<c r="' + String.fromCharCode(65 + idx) + '1" t="inlineStr"><is><t>' + header + '</t></is></c>'),
    '</row></sheetData></worksheet>',
  ].join("");
}

describe("L7 official MENPS XLSX read-only header probe", () => {
  it("recognises potential Latitude/Longitude columns without verifying GPS values", () => {
    const bytes = makeStoredXlsx({ "xl/worksheets/sheet1.xml": fixtureSheet(["Nom", "Latitude", "Longitude", "Commune"]) });
    const result = inspectInstitutionalXlsxHeaders(bytes);
    assert.equal(result.sheet_entries_found, 1);
    assert.equal(result.sampled_row_count, 1);
    assert.equal(result.gps_columns_candidate, true);
    assert.equal(result.coordinates_verified, false);
    assert.equal(result.individual_entity_verified, false);
    assert.deepEqual(result.header_candidates, ["Nom", "Latitude", "Longitude", "Commune"]);
  });

  it("rejects any inference of GPS when source only contains names and cities", () => {
    const bytes = makeStoredXlsx({ "xl/worksheets/sheet1.xml": fixtureSheet(["Nom", "Province", "Ville"]) });
    const result = inspectInstitutionalXlsxHeaders(bytes);
    assert.equal(result.gps_columns_candidate, false);
    assert.equal(result.longitude_header_candidate, null);
  });

  it("fails closed on random bytes or a ZIP without worksheet", () => {
    assert.throws(() => inspectInstitutionalXlsxHeaders(Buffer.from("CSV not Excel")), /invalid_archive_size|zip_eocd_missing/);
    const zip = makeStoredXlsx({ "xl/workbook.xml": "<workbook/>" });
    assert.throws(() => inspectInstitutionalXlsxHeaders(zip), /xlsx_no_worksheet/);
  });

  it("rejects malformed ZIP metadata instead of fabricating a readable header", () => {
    const bytes = makeStoredXlsx({ "xl/worksheets/sheet1.xml": fixtureSheet(["Latitude", "Longitude"]) });
    bytes.writeUInt32LE(0, bytes.length - 22);
    assert.throws(() => inspectInstitutionalXlsxHeaders(bytes), /zip_eocd_missing/);
  });
});


describe("L7 MENPS secure proxy-aware curl fallback (GitHub Actions tests only)", () => {
  it("permits only the official HTTPS XLSX URL and normal www host", () => {
    assert.equal(permittedOfficialResource(MENPS_PRIMARY_2026_RESOURCE_URL), true);
    assert.equal(permittedOfficialResource(MENPS_PRIMARY_2026_RESOURCE_URL.replace("data.gov.ma", "www.data.gov.ma")), true);
    for (const invalid of [
      MENPS_PRIMARY_2026_RESOURCE_URL.replace("https:", "http:"),
      MENPS_PRIMARY_2026_RESOURCE_URL.replace("data.gov.ma", "untrusted.example"),
      MENPS_PRIMARY_2026_RESOURCE_URL.replace(".xlsx", ".csv"),
      "https://data.gov.ma.evil.test/data/fr/dataset/path.xlsx",
      "https://user:pass@data.gov.ma/data/fr/dataset/path.xlsx",
      "file:///etc/passwd",
    ]) {
      assert.equal(permittedOfficialResource(invalid), false, invalid);
      assert.throws(() => officialCurlArguments(invalid), /blocked_untrusted_resource_origin/);
    }
  });

  it("builds a bounded single URL curl request with no insecure flag or automatic redirect", () => {
    const args = officialCurlArguments(MENPS_PRIMARY_2026_RESOURCE_URL);
    assert.equal(args.at(-1), MENPS_PRIMARY_2026_RESOURCE_URL);
    assert.deepEqual(args.slice(args.indexOf("--max-filesize"), args.indexOf("--max-filesize") + 2), ["--max-filesize", String(3 * 1024 * 1024)]);
    assert.deepEqual(args.slice(args.indexOf("--max-time"), args.indexOf("--max-time") + 2), ["--max-time", "18"]);
    assert.equal(args.includes("--location"), false);
    assert.equal(args.includes("-L"), false);
    assert.equal(args.includes("--insecure"), false);
    assert.equal(args.includes("-k"), false);
    assert.equal(args.includes("--retry"), true);
    assert.equal(args.includes("--proto"), true);
  });
});


function makeSchoolTextSheet(rows: string[][]): string {
  const headers = ["NOM_ETABL", "NOM_ETABA", "AdresseL", "AdresseA", "LL_COM", "LL_PROV", "LL_REG"];
  const wrapRow = (values: string[], rowNumber: number) => {
    const cells = values.map((value, idx) => value
      ? '<c r="' + String.fromCharCode(65 + idx) + rowNumber +
        '" t="inlineStr"><is><t>' + value + '</t></is></c>'
      : "").join("");
    return '<row r="' + rowNumber + '">' + cells + '</row>';
  };
  return '<worksheet><sheetData>' +
    wrapRow(headers, 1) + rows.map((row, i) => wrapRow(row, i + 2)).join("") +
    '</sheetData></worksheet>';
}

describe("L7 MENPS school name/address staging scan, no spatial admission", () => {
  it("counts text-only candidate rows and preserves the actual spreadsheet row number", () => {
    const rows = [
      ["TEST-AGDAL", "", "Rue Agdal", "", "Rabat", "Rabat", "Rabat-Sale"],
      ["TEST-OTHER", "", "Rue Centrale", "", "Casablanca", "Casablanca", "Casablanca-Settat"],
      ["TEST-GUELIZ", "", "Avenue Guéliz", "", "Marrakech", "Marrakech", "Marrakech-Safi"],
      ["TEST-MAARIF-NAME", "", "Rue Sans Quartier", "", "Casablanca", "Casablanca", "Casablanca-Settat"],
    ];
    const buffer = makeStoredXlsx({ "xl/worksheets/sheet1.xml": makeSchoolTextSheet(rows) });
    const result = scanInstitutionalSchoolTextCandidates(buffer);
    assert.equal(result.scanned_data_rows, 4);
    assert.equal(result.rows_with_school_name, 4);
    const byCity = Object.fromEntries(result.city_checks.map((x) => [x.city, x]));
    assert.equal(byCity.rabat.administrative_text_matches, 1);
    assert.equal(byCity.rabat.district_address_text_mentions, 1);
    assert.equal(byCity.rabat.samples[0].sheet_row, 2);
    assert.equal(byCity.casablanca.administrative_text_matches, 2);
    assert.equal(byCity.casablanca.district_address_text_mentions, 0);
    assert.equal(byCity.casablanca.samples[0].school_name, "TEST-OTHER");
    assert.equal(byCity.marrakech.district_address_text_mentions, 1);
    assert.equal(result.relation_to_pilot_neighborhood_verified, false);
    assert.equal(result.coordinates_verified, false);
    assert.equal(result.accepted_public_pois, 0);
    assert.equal(result.public_publish_allowed, false);
  });

  it("treats a district name in the school title as insufficient geographic proof", () => {
    const buffer = makeStoredXlsx({ "xl/worksheets/sheet1.xml": makeSchoolTextSheet([
      ["TEST-MAARIF", "", "Rue sans indication de quartier", "", "Casablanca", "Casablanca", "Casablanca-Settat"],
    ]) });
    const result = scanInstitutionalSchoolTextCandidates(buffer);
    const casablanca = result.city_checks.find((item) => item.city === "casablanca");
    assert.equal(casablanca?.district_address_text_mentions, 0);
    assert.equal(casablanca?.samples[0]?.address_mentions_district, false);
    assert.equal(result.public_publish_allowed, false);
  });

  it("refuses a school XLSX without required identity/address/admin columns", () => {
    const buffer = makeStoredXlsx({ "xl/worksheets/sheet1.xml": fixtureSheet(["Name", "Address", "City"]) });
    assert.throws(() => scanInstitutionalSchoolTextCandidates(buffer), /xlsx_required_school_identity_columns_missing/);
  });
});
