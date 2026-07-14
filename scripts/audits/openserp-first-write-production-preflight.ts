import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "../../lib/openserp-ingestion/env";
import { loadLockedFirstWriteManifest, splitOpenSerpCandidatesForDatabaseWrite } from "../../lib/openserp-ingestion/pipeline";
import { redactSensitiveText } from "../../lib/openserp-ingestion/utils";
import type { OpenSerpListingCandidate } from "../../lib/openserp-ingestion/types";

const RUN_ID = "openserp-first-write-2026-07-13-01";
const EXPECTED_MANIFEST_SHA256 = "cf03e16422e91fcb29d1f518fdc5ffd2dec1bb45b4b97155758ef16471f602f8";

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

function findPii(candidate: OpenSerpListingCandidate): string[] {
  const merged = `${candidate.title}\n${candidate.snippet}\n${candidate.original_url}\n${candidate.canonical_source_url}`;
  const result = redactSensitiveText(merged);
  const hits: string[] = [];
  if (result.phone_hits) hits.push("phone");
  if (result.whatsapp_hits) hits.push("whatsapp");
  if (result.personal_email_hits) hits.push("personal_email");
  if (result.secret_hits) hits.push("secret_keyword");
  return hits;
}

async function main(): Promise<void> {
  const root = resolve(process.cwd());
  loadEnvFile(join(root, ".env.local"));
  loadEnvFile(join(root, ".env.mission"));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase production credentials in local mission environment.");
  const hostname = new URL(url).hostname;
  if (!hostname.endsWith(".supabase.co") || hostname.includes("localhost") || hostname.startsWith("127.")) {
    throw new Error("Refusing preflight: Supabase target is not an unambiguous hosted production project.");
  }

  const locked = await loadLockedFirstWriteManifest(join(root, "data", "openserp", "first-write-locked-manifest.json"));
  if (locked.manifest_sha256 !== EXPECTED_MANIFEST_SHA256 || locked.first_write_run_id !== RUN_ID || locked.selected_count !== 180) {
    throw new Error("Locked manifest does not match the approved production write corpus.");
  }
  const { writeableCandidates, skippedCandidates } = splitOpenSerpCandidatesForDatabaseWrite(locked.selectedCandidates);
  if (writeableCandidates.length !== 177 || skippedCandidates.length !== 3) {
    throw new Error("The approved three INTEGER exclusions are not preserved.");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const fingerprints = writeableCandidates.map((candidate) => candidate.canonical_fingerprint);
  const urls = writeableCandidates.map((candidate) => candidate.canonical_source_url);

  const [propertyCount, sourceCount, openSerpCount] = await Promise.all([
    supabase.from("property_listings").select("*", { count: "exact", head: true }),
    supabase.from("listing_sources").select("*", { count: "exact", head: true }),
    supabase.from("property_listings").select("*", { count: "exact", head: true }).contains("field_confidence", { acquisition_provider: "openserp" }),
  ]);
  for (const response of [propertyCount, sourceCount, openSerpCount]) if (response.error) throw response.error;

  const existingProperties: Array<Record<string, unknown>> = [];
  const existingSources: Array<Record<string, unknown>> = [];
  for (const values of chunk(fingerprints, 25)) {
    const response = await supabase.from("property_listings").select("id,canonical_fingerprint,title,field_confidence,updated_at").in("canonical_fingerprint", values);
    if (response.error) throw response.error;
    existingProperties.push(...((response.data ?? []) as Array<Record<string, unknown>>));
  }
  for (const values of chunk(urls, 25)) {
    const response = await supabase.from("listing_sources").select("id,property_listing_id,source_name,listing_url,source_url,last_seen_at,is_active").in("listing_url", values);
    if (response.error) throw response.error;
    existingSources.push(...((response.data ?? []) as Array<Record<string, unknown>>));
  }

  const propertyByFingerprint = new Map(existingProperties.map((row) => [String(row.canonical_fingerprint), row]));
  const sourceByUrl = new Map(existingSources.map((row) => [String(row.listing_url), row]));
  const dangerousCollisions: Array<{ candidate_id: string; reason: string }> = [];
  const operations = writeableCandidates.map((candidate) => {
    const property = propertyByFingerprint.get(candidate.canonical_fingerprint);
    const source = sourceByUrl.get(candidate.canonical_source_url);
    if (property || source) {
      dangerousCollisions.push({ candidate_id: candidate.candidate_id, reason: "existing_listing_or_source_requires_manual_review" });
    }
    const operation = property || source ? "collision" : "insert";
    return {
      candidate_id: candidate.candidate_id,
      canonical_url: candidate.canonical_source_url,
      source_host: candidate.source_domain,
      city: candidate.extracted.city,
      price_mad: candidate.extracted.price_mad,
      planned_listing_id: property?.id ?? null,
      planned_source_id: source?.id ?? null,
      operation,
      reason: operation === "insert" ? "new_listing_and_source" : "existing_row_detected",
      normalized_row_checksum: sha256(JSON.stringify({
        candidate_id: candidate.candidate_id,
        canonical_fingerprint: candidate.canonical_fingerprint,
        canonical_url: candidate.canonical_source_url,
        city: candidate.extracted.city,
        price_mad: candidate.extracted.price_mad,
      })),
    };
  });
  const piiHits = writeableCandidates.flatMap(findPii);
  const unsafeUrls = writeableCandidates.filter((candidate) => !isSafeExternalUrl(candidate.original_url) || !isSafeExternalUrl(candidate.canonical_source_url));
  if (dangerousCollisions.length || piiHits.length || unsafeUrls.length) {
    throw new Error(`Preflight blocked: collisions=${dangerousCollisions.length}, pii=${piiHits.length}, unsafe_urls=${unsafeUrls.length}`);
  }

  const cityDistribution = Object.fromEntries(["Casablanca", "Rabat", "Marrakech"].map((city) => [city, writeableCandidates.filter((candidate) => candidate.extracted.city === city).length]));
  const sourceDistribution = Object.fromEntries([...new Set(writeableCandidates.map((candidate) => candidate.source_domain))].sort().map((domain) => [domain, writeableCandidates.filter((candidate) => candidate.source_domain === domain).length]));
  const snapshot = {
    run_id: RUN_ID,
    captured_at_utc: new Date().toISOString(),
    environment: { logical_name: "production", host_redacted: `${hostname.slice(0, 8)}...${hostname.slice(-12)}`, project_ref_redacted: hostname.split(".")[0].slice(0, 5) + "..." },
    manifest_source_sha256: locked.manifest_sha256,
    counts: {
      property_listings: propertyCount.count ?? 0,
      listing_sources: sourceCount.count ?? 0,
      openserp_property_listings: openSerpCount.count ?? 0,
      openserp_listing_sources: 0,
    },
    potentially_touched_existing_properties: existingProperties,
    potentially_touched_existing_sources: existingSources,
    operations,
    integer_exclusions: skippedCandidates,
  };
  const snapshotChecksum = sha256(JSON.stringify(snapshot));
  const writeManifest = {
    run_id: RUN_ID,
    manifest_source_sha256: locked.manifest_sha256,
    snapshot_production_sha256: snapshotChecksum,
    candidate_count: locked.candidate_count,
    selected_count: locked.selected_count,
    executable_count: writeableCandidates.length,
    write_cap: 177,
    planned_inserts: operations.filter((operation) => operation.operation === "insert").length,
    planned_updates: 0,
    planned_skips: skippedCandidates.length,
    integer_exclusions: skippedCandidates,
    operations,
  };
  const writeManifestChecksum = sha256(JSON.stringify(writeManifest));
  const rollbackManifest = {
    run_id: RUN_ID,
    manifest_source_sha256: locked.manifest_sha256,
    snapshot_production_sha256: snapshotChecksum,
    write_manifest_sha256: writeManifestChecksum,
    created_listing_fingerprints: writeableCandidates.map((candidate) => candidate.canonical_fingerprint),
    created_source_urls: writeableCandidates.map((candidate) => candidate.canonical_source_url),
    created_listing_ids: [],
    created_source_ids: [],
    updated_rows: [],
    rollback_order: ["delete created listing_sources by returned IDs or exact listing URLs", "delete created property_listings by returned IDs or exact fingerprints"],
    foreign_key_dependency: "listing_sources.property_listing_id -> property_listings.id",
  };

  const auditDir = join(root, "data", "audits");
  await writeJson(join(auditDir, "openserp-first-write-production-pre-write-snapshot.json"), { ...snapshot, checksum: snapshotChecksum });
  await writeJson(join(auditDir, "openserp-first-write-production-write-manifest.json"), { ...writeManifest, checksum: writeManifestChecksum });
  await writeJson(join(auditDir, "openserp-first-write-production-rollback-manifest.json"), { ...rollbackManifest, checksum: sha256(JSON.stringify(rollbackManifest)) });
  console.log(JSON.stringify({
    target: snapshot.environment,
    counts: snapshot.counts,
    executable_count: writeableCandidates.length,
    planned_inserts: writeManifest.planned_inserts,
    planned_updates: writeManifest.planned_updates,
    planned_skips: writeManifest.planned_skips,
    collisions: dangerousCollisions.length,
    pii_hits: piiHits.length,
    unsafe_url_hits: unsafeUrls.length,
    snapshot_sha256: snapshotChecksum,
    write_manifest_sha256: writeManifestChecksum,
    rollback_manifest_sha256: sha256(JSON.stringify(rollbackManifest)),
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
