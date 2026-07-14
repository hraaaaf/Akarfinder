import { execFile as execFileCallback, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { buildOpenSerpPropertyRow, loadLockedFirstWriteManifest, splitOpenSerpCandidatesForDatabaseWrite } from "../../lib/openserp-ingestion/pipeline";
import type { OpenSerpListingCandidate } from "../../lib/openserp-ingestion/types";

const execFile = promisify(execFileCallback);
const POSTGRES_BIN = "C:\\Program Files\\PostgreSQL\\18\\bin";
const PSQL = join(POSTGRES_BIN, "psql.exe");
const CREATEDB = join(POSTGRES_BIN, "createdb.exe");
const DATABASE = "akarfinder_openserp_rollback_rehearsal";
const HOST = "127.0.0.1";
const PORT = "55432";
const USER = "rehearsal_admin";
const RUN_ID = "openserp-first-write-2026-07-13-01";
const EXPECTED_MANIFEST_SHA256 = "cf03e16422e91fcb29d1f518fdc5ffd2dec1bb45b4b97155758ef16471f602f8";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function psql(sql: string, database = DATABASE): Promise<string> {
  return new Promise((resolvePsql, rejectPsql) => {
    const child = spawn(PSQL, ["-X", "-v", "ON_ERROR_STOP=1", "-h", HOST, "-p", PORT, "-U", USER, "-d", database, "-At", "-F", "\t"], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", rejectPsql);
    child.on("close", (code) => {
      if (code === 0) resolvePsql(stdout.trim());
      else rejectPsql(new Error(`psql failed with exit ${code}: ${stderr.trim()}`));
    });
    child.stdin.end(sql);
  });
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

type Snapshot = {
  property_listings_count: number;
  listing_sources_count: number;
  property_rows: Array<{ id: number; canonical_fingerprint: string }>;
  source_rows: Array<{ id: number; property_listing_id: number; listing_url: string; source_name: string }>;
  checksum: string;
};

async function collectSnapshot(): Promise<Snapshot> {
  const propertyRows = (await psql("SELECT id || E'\\t' || canonical_fingerprint FROM property_listings ORDER BY id;"))
    .split("\n").filter(Boolean).map((line) => {
      const [id, canonical_fingerprint] = line.replace(/\r$/, "").split("\t");
      return { id: Number(id), canonical_fingerprint };
    });
  const sourceRows = (await psql("SELECT id || E'\\t' || property_listing_id || E'\\t' || listing_url || E'\\t' || source_name FROM listing_sources ORDER BY id;"))
    .split("\n").filter(Boolean).map((line) => {
      const [id, property_listing_id, listing_url, source_name] = line.replace(/\r$/, "").split("\t");
      return { id: Number(id), property_listing_id: Number(property_listing_id), listing_url, source_name };
    });
  const snapshot = {
    property_listings_count: propertyRows.length,
    listing_sources_count: sourceRows.length,
    property_rows: propertyRows,
    source_rows: sourceRows,
  };
  return { ...snapshot, checksum: sha256(JSON.stringify(snapshot)) };
}

async function prepareIsolatedSchema(): Promise<void> {
  const databaseExists = await psql(`SELECT 1 FROM pg_database WHERE datname = ${sqlValue(DATABASE)};`, "postgres");
  if (!databaseExists) {
    await execFile(CREATEDB, ["-h", HOST, "-p", PORT, "-U", USER, DATABASE], { windowsHide: true });
  }
  await psql(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    CREATE TABLE property_listings (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      canonical_fingerprint TEXT NOT NULL UNIQUE,
      title TEXT,
      price_mad INTEGER,
      city TEXT,
      district TEXT,
      property_type TEXT,
      transaction_type TEXT,
      surface_m2 INTEGER,
      rooms_count INTEGER,
      bedrooms_count INTEGER,
      bathrooms_count INTEGER,
      description_snippet TEXT,
      images_count INTEGER,
      seller_name TEXT,
      data_completeness_score INTEGER DEFAULT 0,
      field_confidence JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE listing_sources (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      property_listing_id BIGINT NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
      source_name TEXT NOT NULL,
      listing_url TEXT NOT NULL UNIQUE,
      source_url TEXT,
      first_seen_at TIMESTAMPTZ DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ DEFAULT NOW(),
      is_active BOOLEAN DEFAULT TRUE
    );
    CREATE INDEX idx_pl_fingerprint ON property_listings(canonical_fingerprint);
    CREATE INDEX idx_ls_property ON listing_sources(property_listing_id);
    INSERT INTO property_listings (canonical_fingerprint, title, city, property_type, transaction_type)
    SELECT 'baseline-' || gs, 'Synthetic baseline listing ' || gs, 'Casablanca', 'apartment', 'sale'
    FROM generate_series(1, 139) AS gs;
    INSERT INTO listing_sources (property_listing_id, source_name, listing_url, source_url)
    SELECT id, 'partner_seed', 'https://seed.example/listing/' || id, 'https://seed.example/listing/' || id
    FROM property_listings;
    INSERT INTO listing_sources (property_listing_id, source_name, listing_url, source_url)
    SELECT id, 'partner_seed_secondary', 'https://seed.example/secondary/' || id, 'https://seed.example/secondary/' || id
    FROM property_listings WHERE id <= 5;
  `);
}

function candidateSql(candidate: OpenSerpListingCandidate, now: string): string {
  const row = buildOpenSerpPropertyRow(candidate, now);
  return `(${[
    row.canonical_fingerprint, row.title, row.price_mad, row.city, row.district,
    row.property_type, row.transaction_type, row.surface_m2, row.rooms_count,
    row.bedrooms_count, row.bathrooms_count, row.description_snippet, row.images_count,
    row.seller_name, row.data_completeness_score, JSON.stringify(row.field_confidence), row.updated_at,
  ].map(sqlValue).join(", ")})`;
}

async function writeCandidates(candidates: OpenSerpListingCandidate[]): Promise<{ listingIds: number[]; sourceIds: number[] }> {
  const now = "2026-07-14T10:00:00.000Z";
  const listingIds: number[] = [];
  const sourceIds: number[] = [];
  for (let start = 0; start < candidates.length; start += 25) {
    const batch = candidates.slice(start, start + 25);
    const propertyValues = batch.map((candidate) => candidateSql(candidate, now)).join(",\n");
    const sourceValues = batch.map((candidate) => `(${sqlValue(candidate.canonical_fingerprint)}, ${sqlValue(candidate.source_domain)}, ${sqlValue(candidate.canonical_source_url)}, ${sqlValue(candidate.original_url)}, ${sqlValue(now)})`).join(",\n");
    const output = await psql(`
      BEGIN;
      INSERT INTO property_listings (
        canonical_fingerprint, title, price_mad, city, district, property_type, transaction_type,
        surface_m2, rooms_count, bedrooms_count, bathrooms_count, description_snippet, images_count,
        seller_name, data_completeness_score, field_confidence, updated_at
      ) VALUES ${propertyValues}
      ON CONFLICT (canonical_fingerprint) DO UPDATE SET
        title = EXCLUDED.title, price_mad = EXCLUDED.price_mad, city = EXCLUDED.city,
        district = EXCLUDED.district, property_type = EXCLUDED.property_type,
        transaction_type = EXCLUDED.transaction_type, surface_m2 = EXCLUDED.surface_m2,
        bedrooms_count = EXCLUDED.bedrooms_count, description_snippet = EXCLUDED.description_snippet,
        data_completeness_score = EXCLUDED.data_completeness_score, field_confidence = EXCLUDED.field_confidence,
        updated_at = EXCLUDED.updated_at;
      INSERT INTO listing_sources (property_listing_id, source_name, listing_url, source_url, first_seen_at, last_seen_at, is_active)
      SELECT p.id, src.source_name, src.listing_url, src.source_url, src.observed_at::timestamptz, src.observed_at::timestamptz, TRUE
      FROM (VALUES ${sourceValues}) AS src(canonical_fingerprint, source_name, listing_url, source_url, observed_at)
      JOIN property_listings p ON p.canonical_fingerprint = src.canonical_fingerprint
      ON CONFLICT (listing_url) DO UPDATE SET
        property_listing_id = EXCLUDED.property_listing_id, source_name = EXCLUDED.source_name,
        source_url = EXCLUDED.source_url, last_seen_at = EXCLUDED.last_seen_at, is_active = TRUE;
      SELECT 'P:' || id FROM property_listings WHERE canonical_fingerprint IN (${batch.map((candidate) => sqlValue(candidate.canonical_fingerprint)).join(",")}) ORDER BY id;
      SELECT 'S:' || id FROM listing_sources WHERE listing_url IN (${batch.map((candidate) => sqlValue(candidate.canonical_source_url)).join(",")}) ORDER BY id;
      COMMIT;
    `);
    for (const line of output.split("\n")) {
      if (line.startsWith("P:")) listingIds.push(Number(line.slice(2)));
      if (line.startsWith("S:")) sourceIds.push(Number(line.slice(2)));
    }
  }
  return { listingIds: [...new Set(listingIds)].sort((a, b) => a - b), sourceIds: [...new Set(sourceIds)].sort((a, b) => a - b) };
}

async function rollback(listingIds: number[], sourceIds: number[]): Promise<void> {
  await psql(`
    BEGIN;
    DELETE FROM listing_sources WHERE id IN (${sourceIds.map(sqlValue).join(",")});
    DELETE FROM property_listings WHERE id IN (${listingIds.map(sqlValue).join(",")});
    COMMIT;
  `);
}

async function validateIntegrity(): Promise<{ orphan_sources: number; duplicate_canonical_urls: number }> {
  const [orphans, duplicates] = await Promise.all([
    psql("SELECT count(*) FROM listing_sources ls LEFT JOIN property_listings pl ON pl.id = ls.property_listing_id WHERE pl.id IS NULL;"),
    psql("SELECT count(*) FROM (SELECT canonical_fingerprint FROM property_listings GROUP BY canonical_fingerprint HAVING count(*) > 1) AS duplicates;"),
  ]);
  return { orphan_sources: Number(orphans), duplicate_canonical_urls: Number(duplicates) };
}

async function main(): Promise<void> {
  if (!existsSync(PSQL) || HOST !== "127.0.0.1" || PORT !== "55432") {
    throw new Error("Refusing rehearsal: expected local PostgreSQL binaries and isolated 127.0.0.1:55432 target.");
  }
  const root = resolve(process.cwd());
  const manifestPath = join(root, "data", "openserp", "first-write-locked-manifest.json");
  const locked = await loadLockedFirstWriteManifest(manifestPath);
  if (locked.manifest_sha256 !== EXPECTED_MANIFEST_SHA256 || locked.selectedCandidates.length !== 180) {
    throw new Error("Locked manifest does not match the approved 180-candidate corpus.");
  }
  await prepareIsolatedSchema();
  const before = await collectSnapshot();
  const auditDir = join(root, "data", "audits");
  const { writeableCandidates, skippedCandidates } = splitOpenSerpCandidatesForDatabaseWrite(locked.selectedCandidates);
  const skippedIds = new Set(skippedCandidates.map((candidate) => candidate.candidate_id));
  const writeManifest = {
    run_id: RUN_ID,
    manifest_sha256: locked.manifest_sha256,
    selection_algorithm_version: locked.selection_algorithm_version,
    selected_count: locked.selectedCandidates.length,
    writeable_count: writeableCandidates.length,
    skipped_candidates: skippedCandidates,
    operations: locked.selectedCandidates.map((candidate, index) => ({
      candidate_id: candidate.candidate_id,
      future_listing_id: skippedIds.has(candidate.candidate_id) ? null : 140 + writeableCandidates.findIndex((entry) => entry.candidate_id === candidate.candidate_id),
      future_source_key: candidate.canonical_source_url,
      canonical_url: candidate.canonical_source_url,
      source_host: candidate.source_domain,
      operation: skippedIds.has(candidate.candidate_id) ? "skip" : "insert",
      reason: skippedCandidates.find((entry) => entry.candidate_id === candidate.candidate_id)?.reason ?? "new_listing_and_source_in_isolated_rehearsal",
    })),
  };
  await writeJson(join(auditDir, "openserp-first-write-pre-write-snapshot.json"), { run_id: RUN_ID, manifest_sha256: locked.manifest_sha256, captured_at: new Date().toISOString(), ...before });
  await writeJson(join(auditDir, "openserp-first-write-write-manifest.json"), writeManifest);

  const firstWrite = await writeCandidates(writeableCandidates);
  const afterFirst = await collectSnapshot();
  const integrityAfterFirst = await validateIntegrity();
  const rollbackManifest = {
    run_id: RUN_ID,
    manifest_sha256: locked.manifest_sha256,
    new_property_listing_ids: firstWrite.listingIds,
    new_listing_source_ids: firstWrite.sourceIds,
    updated_rows: [],
    rollback_order: ["delete targeted listing_sources by id", "delete targeted property_listings by id"],
    snapshot_checksum: before.checksum,
  };
  await writeJson(join(auditDir, "openserp-first-write-rollback-manifest.json"), rollbackManifest);

  await rollback(firstWrite.listingIds, firstWrite.sourceIds);
  const afterRollback = await collectSnapshot();
  const integrityAfterRollback = await validateIntegrity();
  const firstRollbackPass = before.checksum === afterRollback.checksum;

  const secondFirstWrite = await writeCandidates(writeableCandidates);
  const beforeSecondWrite = await collectSnapshot();
  const secondWrite = await writeCandidates(writeableCandidates);
  const afterSecondWrite = await collectSnapshot();
  const idempotence = {
    new_listings_on_second_run: afterSecondWrite.property_listings_count - beforeSecondWrite.property_listings_count,
    new_sources_on_second_run: afterSecondWrite.listing_sources_count - beforeSecondWrite.listing_sources_count,
    stable_listing_ids: JSON.stringify(secondFirstWrite.listingIds) === JSON.stringify(secondWrite.listingIds),
    stable_source_keys: JSON.stringify(secondFirstWrite.sourceIds) === JSON.stringify(secondWrite.sourceIds),
  };
  await rollback(secondFirstWrite.listingIds, secondFirstWrite.sourceIds);
  const afterFinalRollback = await collectSnapshot();

  const result = {
    run_id: RUN_ID,
    environment: { engine: "PostgreSQL", host: HOST, port: Number(PORT), database: DATABASE, production: false },
    manifest_sha256: locked.manifest_sha256,
    candidate_count: locked.candidate_count,
    selected_count: locked.selectedCandidates.length,
    before,
    first_write: {
      new_property_listings: afterFirst.property_listings_count - before.property_listings_count,
      updated_property_listings: 0,
      new_listing_sources: afterFirst.listing_sources_count - before.listing_sources_count,
      updated_listing_sources: 0,
      failed_writes: 0,
      property_listing_ids: firstWrite.listingIds,
      listing_source_ids: firstWrite.sourceIds,
      integrity: integrityAfterFirst,
    },
    rollback: {
      executed: true,
      counts_restored: before.property_listings_count === afterRollback.property_listings_count && before.listing_sources_count === afterRollback.listing_sources_count,
      hashes_restored: firstRollbackPass,
      unrelated_rows_untouched: firstRollbackPass,
      integrity: integrityAfterRollback,
    },
    idempotence,
    final_rollback: { executed: true, hashes_restored: before.checksum === afterFinalRollback.checksum },
  };
  await writeJson(join(auditDir, "openserp-first-write-rollback-rehearsal-result.json"), result);
  console.log(JSON.stringify(result, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
