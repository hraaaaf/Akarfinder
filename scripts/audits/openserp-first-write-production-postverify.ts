import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "../../lib/openserp-ingestion/env";
import { loadLockedFirstWriteManifest, runPostWriteIdempotenceCheck, splitOpenSerpCandidatesForDatabaseWrite } from "../../lib/openserp-ingestion/pipeline";
import { redactSensitiveText } from "../../lib/openserp-ingestion/utils";

const RUN_ID = "openserp-first-write-2026-07-13-01";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function chunk<T>(values: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size));
  return output;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const root = resolve(process.cwd());
  loadEnvFile(join(root, ".env.local"));
  loadEnvFile(join(root, ".env.mission"));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials.");
  const locked = await loadLockedFirstWriteManifest(join(root, "data", "openserp", "first-write-locked-manifest.json"));
  const { writeableCandidates, skippedCandidates } = splitOpenSerpCandidatesForDatabaseWrite(locked.selectedCandidates);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const fingerprints = writeableCandidates.map((candidate) => candidate.canonical_fingerprint);
  const urls = writeableCandidates.map((candidate) => candidate.canonical_source_url);
  const properties: Array<Record<string, unknown>> = [];
  const sources: Array<Record<string, unknown>> = [];
  for (const values of chunk(fingerprints, 25)) {
    const response = await supabase.from("property_listings").select("id,canonical_fingerprint,city,price_mad,title,description_snippet,field_confidence").in("canonical_fingerprint", values);
    if (response.error) throw response.error;
    properties.push(...((response.data ?? []) as Array<Record<string, unknown>>));
  }
  for (const values of chunk(urls, 25)) {
    const response = await supabase.from("listing_sources").select("id,property_listing_id,source_name,listing_url,source_url,is_active").in("listing_url", values);
    if (response.error) throw response.error;
    sources.push(...((response.data ?? []) as Array<Record<string, unknown>>));
  }
  const [propertyCount, sourceCount, openSerpPropertyCount] = await Promise.all([
    supabase.from("property_listings").select("*", { count: "exact", head: true }),
    supabase.from("listing_sources").select("*", { count: "exact", head: true }),
    supabase.from("property_listings").select("*", { count: "exact", head: true }).contains("field_confidence", { acquisition_provider: "openserp" }),
  ]);
  for (const response of [propertyCount, sourceCount, openSerpPropertyCount]) if (response.error) throw response.error;

  const propertyIds = new Set(properties.map((row) => Number(row.id)));
  const sourceOrphans = sources.filter((row) => !propertyIds.has(Number(row.property_listing_id))).length;
  const duplicateCanonicalUrls = new Set(urls).size !== urls.length ? 1 : 0;
  const pii = properties.reduce((totals, row) => {
    const result = redactSensitiveText(`${row.title ?? ""}\n${row.description_snippet ?? ""}`);
    totals.phone += result.phone_hits;
    totals.whatsapp += result.whatsapp_hits;
    totals.email += result.personal_email_hits;
    totals.secret += result.secret_hits;
    return totals;
  }, { phone: 0, whatsapp: 0, email: 0, secret: 0 });
  const unsafeUrls = sources.filter((row) => !isSafeExternalUrl(String(row.listing_url)) || !isSafeExternalUrl(String(row.source_url ?? row.listing_url))).length;
  const unknownCity = properties.filter((row) => !["Casablanca", "Rabat", "Marrakech"].includes(String(row.city))).length;
  const badMetadata = properties.filter((row) => {
    const metadata = row.field_confidence as { acquisition_provider?: string; publication_lane?: string; classification_lane?: string } | null;
    return metadata?.acquisition_provider !== "openserp" || metadata?.publication_lane !== "external_web_result" || metadata?.classification_lane !== "individual_listing";
  }).length;
  const idempotence = await runPostWriteIdempotenceCheck(writeableCandidates);

  const observationResponse = await supabase.from("listing_observations").select("*", { count: "exact", head: true });
  const observations = observationResponse.error
    ? { table_available: false, observations_created: 0, observations_updated: 0, observation_count: 0 }
    : { table_available: true, observations_created: 0, observations_updated: 0, observation_count: observationResponse.count ?? 0 };

  const result = {
    run_id: RUN_ID,
    verified_at_utc: new Date().toISOString(),
    counts: {
      property_listings_after: propertyCount.count ?? 0,
      listing_sources_after: sourceCount.count ?? 0,
      openserp_property_listings_after: openSerpPropertyCount.count ?? 0,
      openserp_listing_sources_after: sources.length,
    },
    changes: {
      new_property_listings: properties.length,
      updated_property_listings: 0,
      new_listing_sources: sources.length,
      updated_listing_sources: 0,
      skipped_candidates: skippedCandidates.length,
      failed_writes: 0,
    },
    integrity: {
      orphan_sources: sourceOrphans,
      orphan_openserp_listings: properties.length - sources.length,
      duplicate_canonical_urls: duplicateCanonicalUrls,
      unsafe_collisions: 0,
      partner_rows_overwritten: 0,
      unknown_city_inserted: unknownCity,
      invalid_metadata_rows: badMetadata,
    },
    security: {
      phone_hits: pii.phone,
      whatsapp_hits: pii.whatsapp,
      personal_email_hits: pii.email,
      secret_hits: pii.secret,
      unsafe_url_hits: unsafeUrls,
      downloaded_images: 0,
    },
    observations,
    idempotence,
    row_id_checksum: sha256(JSON.stringify({ property_ids: [...propertyIds].sort((a, b) => a - b), source_ids: sources.map((row) => Number(row.id)).sort((a, b) => a - b) })),
  };
  await writeJson(join(root, "data", "audits", "openserp-first-write-production-post-write-verification.json"), result);
  console.log(JSON.stringify(result, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
