import fs from "node:fs/promises";
import path from "node:path";

import {
  AVITO_DOMAIN,
  buildAvitoInternalRecoveryReport,
  renderAvitoRecoveryMarkdown,
  type AvitoRegistrySnapshot,
  type AvitoUnavailableRow,
  type GeoAlias,
  type VerticalRule,
} from "../data4/avito-internal-recovery-audit";

const outDir = process.env.DATA_4_1_OUT_DIR ?? ".tmp/data-4-1/results";
const REQUEST_TIMEOUT_MS = 12_000;
const PAGE_SIZE = 1_000;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.1A requires ${name}`);
  return value;
}

function authHeaders(): HeadersInit {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, authorization: `Bearer ${key}` };
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${table} read failed with HTTP ${response.status}`);
  return (await response.json()) as T[];
}

async function restAll<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await restPage<T>(table, {
      ...params,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main(): Promise<void> {
  const [unavailableRows, verticalRules, geoAliases, registryRows] = await Promise.all([
    restAll<AvitoUnavailableRow>("thin_index_normalized_documents_v2", {
      select: "canonical_url,seed_provider,property_type,intent,city,title,snippet,price_mad,surface_m2,normalization_status",
      source_domain: `eq.${AVITO_DOMAIN}`,
      normalization_status: "eq.unavailable",
      order: "canonical_url.asc",
    }),
    restAll<VerticalRule>("source_vertical_category_rules", {
      select: "category_slug,vertical_classification",
      source_domain: `eq.${AVITO_DOMAIN}`,
      order: "category_slug.asc",
    }),
    restAll<GeoAlias>("geo_aliases", {
      select: "normalized_alias",
      order: "normalized_alias.asc",
    }),
    restPage<AvitoRegistrySnapshot>("source_policy_registry", {
      select: "source_domain,authorization_status,acquisition_mode,detail_fetch_policy,content_reuse_policy,display_policy,display_gate,machine_gate,ingestion_gate",
      source_domain: `eq.${AVITO_DOMAIN}`,
      limit: "2",
    }),
  ]);

  if (registryRows.length !== 1) throw new Error(`Expected exactly one Avito Registry row, got ${registryRows.length}`);

  const report = buildAvitoInternalRecoveryReport({
    generatedAt: new Date().toISOString(),
    rows: unavailableRows,
    verticalRules,
    geoAliases,
    registry: registryRows[0]!,
  });

  const proof = {
    schemaVersion: "data-4-1a-avito-internal-recovery-proof-v1",
    generatedAt: report.generatedAt,
    readOnly: report.readOnly,
    sourceNetworkRequests: report.sourceNetworkRequests,
    databaseWrites: report.databaseWrites,
    policyChanges: report.policyChanges,
    unavailableRows: report.summary.unavailableRows,
    canonicalRealEstateRows: report.summary.canonicalRealEstateRows,
    noiseOrNonListingRows: report.summary.noiseOrNonListingRows,
    recoverableCoreRows: report.summary.recoverableCoreRows,
    insufficientExistingEvidenceRows: report.summary.insufficientExistingEvidenceRows,
    withPropertyType: report.summary.withPropertyType,
    withIntent: report.summary.withIntent,
    withGeoAliasMatch: report.summary.withGeoAliasMatch,
    withTypeIntentAndGeo: report.summary.withTypeIntentAndGeo,
    withStoredTitle: report.summary.withStoredTitle,
    withStoredSnippet: report.summary.withStoredSnippet,
    withPrice: report.summary.withPrice,
    withSurface: report.summary.withSurface,
    policyActivableRows: report.summary.policyActivableRows,
    realEstateShare: report.summary.realEstateShare,
    noiseShare: report.summary.noiseShare,
    registryDisplayGate: report.registry.display_gate,
    registryDisplayPolicy: report.registry.display_policy,
  };

  await fs.mkdir(outDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(path.join(outDir, "report.md"), renderAvitoRecoveryMarkdown(report)),
    fs.writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`),
  ]);

  const categoryCsv = [
    ["category", "rows", "recoverable_core", "insufficient"],
    ...report.categories.map((row) => [row.categorySlug, row.rows, row.recoverableCoreRows, row.insufficientRows]),
  ];
  await fs.writeFile(
    path.join(outDir, "categories.csv"),
    `${categoryCsv.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`,
  );

  const classificationCsv = [
    ["canonical_url", "category", "location", "class", "geo_match", "property_type", "intent", "stored_title", "stored_snippet", "price", "surface", "policy_blocked_new_observation"],
    ...report.rows.map((row) => [
      row.canonicalUrl,
      row.categorySlug,
      row.locationSlug,
      row.recoveryClass,
      row.geoAliasMatch,
      row.hasPropertyType,
      row.hasIntent,
      row.hasStoredTitle,
      row.hasStoredSnippet,
      row.hasPrice,
      row.hasSurface,
      row.policyBlockedForNewObservation,
    ]),
  ];
  await fs.writeFile(
    path.join(outDir, "classification.csv"),
    `${classificationCsv.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`,
  );

  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
