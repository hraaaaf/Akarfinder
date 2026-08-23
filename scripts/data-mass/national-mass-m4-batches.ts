import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { M4MinimalExternalIndexSeed } from "./national-mass-m4-plan";

const PLAN_INPUT = "artifacts/mass-index/m4-national-ingest-plan.json";
const RECEIPT_OUTPUT = "artifacts/mass-index/m4-batch-receipt.json";
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 100;
const ROLLBACK_CHUNK = 100;
const CERTIFIED_COHORT = 965;

type PlanInsert = {
  canonicalUrl: string;
  seed: M4MinimalExternalIndexSeed;
};

type M4Plan = {
  schemaVersion: string;
  mode: string;
  summary: {
    sourceSpecificValid: number;
    insertNative: number;
    preserveExisting: number;
  };
  inserts: PlanInsert[];
  invariants: {
    databaseWrites: number;
    existingSeedsMutated: number;
    persistedMetadataIsNull: boolean;
    persistedExternalIndexScope: string;
  };
};

type InsertedSeed = {
  id: string;
  canonical_url: string;
  source_domain: string;
  seed_provider: string;
  freshness_status: string;
  metadata: unknown;
};

async function writeReceipt(path: string, payload: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function exactCount(db: ReturnType<typeof createClient>, table: string) {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

function parseBatchSize() {
  const raw = process.env.MASS_INDEX_M4_BATCH_SIZE;
  const value = raw ? Number(raw) : DEFAULT_BATCH_SIZE;
  if (!Number.isInteger(value) || value < 1 || value > MAX_BATCH_SIZE) {
    throw new Error("M4_BATCH_SIZE_INVALID");
  }
  return value;
}

async function rollbackAll(
  db: ReturnType<typeof createClient>,
  insertedIds: string[],
) {
  for (let index = 0; index < insertedIds.length; index += ROLLBACK_CHUNK) {
    const ids = insertedIds.slice(index, index + ROLLBACK_CHUNK);
    if (ids.length === 0) continue;
    const { error } = await db.from("source_offer_seeds").delete().in("id", ids);
    if (error) throw error;
  }
}

async function main() {
  if (process.env.MASS_INDEX_M4_BATCH_WRITE !== "1") throw new Error("M4_BATCH_WRITE_FLAG_REQUIRED");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");

  const inputPath = resolve(process.env.MASS_INDEX_M4_OUTPUT || PLAN_INPUT);
  const receiptPath = resolve(process.env.MASS_INDEX_M4_BATCH_RECEIPT || RECEIPT_OUTPUT);
  const plan = JSON.parse(await readFile(inputPath, "utf8")) as M4Plan;

  if (plan.schemaVersion !== "MASS_INDEX_M4_NATIONAL_PLAN_V2" || plan.mode !== "read_only") {
    throw new Error("M4_BATCH_INVALID_PLAN");
  }
  if (plan.invariants.databaseWrites !== 0 || plan.invariants.existingSeedsMutated !== 0) {
    throw new Error("M4_BATCH_PLAN_INVARIANT_FAILED");
  }
  if (!plan.invariants.persistedMetadataIsNull ||
      plan.invariants.persistedExternalIndexScope !== "CANONICAL_URL_SOURCE_DOMAIN_PROVENANCE_ONLY") {
    throw new Error("M4_BATCH_SCOPE_DRIFT");
  }
  if (plan.summary.sourceSpecificValid !== CERTIFIED_COHORT) throw new Error("M4_BATCH_CERTIFIED_COHORT_DRIFT");
  if (plan.summary.insertNative !== plan.inserts.length) throw new Error("M4_BATCH_PLAN_ACCOUNTING_DRIFT");
  if (plan.summary.insertNative + plan.summary.preserveExisting !== CERTIFIED_COHORT) {
    throw new Error("M4_BATCH_COHORT_ACCOUNTING_DRIFT");
  }
  if (plan.summary.preserveExisting < 10) throw new Error("M4_BATCH_CANARY_BASELINE_MISSING");
  if (plan.inserts.some((row) =>
    row.seed.metadata !== null ||
    row.seed.freshness_status !== "seed_only" ||
    !["openserp", "serper_mass_harvest"].includes(row.seed.seed_provider))) {
    throw new Error("M4_BATCH_MINIMAL_SEED_DRIFT");
  }

  const uniqueUrls = new Set(plan.inserts.map((row) => row.canonicalUrl));
  if (uniqueUrls.size !== plan.inserts.length) throw new Error("M4_BATCH_DUPLICATE_URL");

  const batchSize = parseBatchSize();
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const before = {
    sourceOfferSeeds: await exactCount(db, "source_offer_seeds"),
    thinIndexDocuments: await exactCount(db, "thin_index_search_documents"),
  };

  const inserted: InsertedSeed[] = [];
  const insertedIds: string[] = [];
  let rolledBack = false;

  try {
    for (let index = 0; index < plan.inserts.length; index += batchSize) {
      const batch = plan.inserts.slice(index, index + batchSize);
      const urls = batch.map((row) => row.canonicalUrl);

      const { data: conflicts, error: conflictError } = await db
        .from("source_offer_seeds")
        .select("canonical_url")
        .in("canonical_url", urls);
      if (conflictError) throw conflictError;
      if ((conflicts ?? []).length > 0) throw new Error(`M4_BATCH_RACE_CONFLICT:${index / batchSize + 1}`);

      const { data, error } = await db
        .from("source_offer_seeds")
        .insert(batch.map((row) => row.seed))
        .select("id,canonical_url,source_domain,seed_provider,freshness_status,metadata");
      if (error) throw error;
      const rows = (data ?? []) as InsertedSeed[];
      if (rows.length !== batch.length) throw new Error(`M4_BATCH_INSERT_COUNT_MISMATCH:${index / batchSize + 1}`);

      const seedIds = rows.map((row) => row.id);
      inserted.push(...rows);
      insertedIds.push(...seedIds);

      for (const row of rows) {
        if (row.metadata !== null) throw new Error(`M4_BATCH_METADATA_DRIFT:${row.canonical_url}`);
        if (row.freshness_status !== "seed_only") throw new Error(`M4_BATCH_FRESHNESS_DRIFT:${row.canonical_url}`);
        const expected = batch.find((candidate) => candidate.canonicalUrl === row.canonical_url);
        if (!expected ||
            expected.seed.source_domain !== row.source_domain ||
            expected.seed.seed_provider !== row.seed_provider) {
          throw new Error(`M4_BATCH_PROVENANCE_DRIFT:${row.canonical_url}`);
        }
      }

      const { data: thinRows, error: thinError } = await db
        .from("thin_index_search_documents")
        .select("seed_id")
        .in("seed_id", seedIds);
      if (thinError) throw thinError;
      if ((thinRows ?? []).length !== 0) throw new Error(`M4_BATCH_THIN_INDEX_LEAK:${index / batchSize + 1}`);
    }

    const after = {
      sourceOfferSeeds: await exactCount(db, "source_offer_seeds"),
      thinIndexDocuments: await exactCount(db, "thin_index_search_documents"),
    };

    if (inserted.length !== plan.inserts.length) throw new Error("M4_BATCH_FINAL_INSERT_COUNT_DRIFT");
    if (after.sourceOfferSeeds - before.sourceOfferSeeds !== inserted.length) throw new Error("M4_BATCH_SEED_DELTA_DRIFT");
    if (after.thinIndexDocuments - before.thinIndexDocuments !== 0) throw new Error("M4_BATCH_THIN_DELTA_DRIFT");

    await writeReceipt(receiptPath, {
      schemaVersion: "MASS_INDEX_M4_BATCH_RECEIPT_V1",
      status: "verified",
      certifiedCohort: CERTIFIED_COHORT,
      batchSize,
      batches: Math.ceil(plan.inserts.length / batchSize),
      preservedExisting: plan.summary.preserveExisting,
      before,
      after,
      insertedCount: inserted.length,
      insertedByDomain: Object.entries(inserted.reduce<Record<string, number>>((acc, row) => {
        acc[row.source_domain] = (acc[row.source_domain] ?? 0) + 1;
        return acc;
      }, {})).sort(([a], [b]) => a.localeCompare(b)),
      insertedByProvider: Object.entries(inserted.reduce<Record<string, number>>((acc, row) => {
        acc[row.seed_provider] = (acc[row.seed_provider] ?? 0) + 1;
        return acc;
      }, {})).sort(([a], [b]) => a.localeCompare(b)),
      rolledBack: false,
      invariants: {
        metadataNull: true,
        thinIndexExcluded: true,
        existingSeedsMutated: 0,
        providerRelabels: 0,
        publicSearchActivationChanges: 0,
        fullRunCompensatingRollbackOnFailure: true,
      },
    });
  } catch (error) {
    try {
      if (insertedIds.length > 0) {
        await rollbackAll(db, insertedIds);
        rolledBack = true;
      }

      for (let index = 0; index < insertedIds.length; index += ROLLBACK_CHUNK) {
        const ids = insertedIds.slice(index, index + ROLLBACK_CHUNK);
        if (ids.length === 0) continue;
        const { data: remainingSeeds, error: seedVerifyError } = await db
          .from("source_offer_seeds")
          .select("id")
          .in("id", ids);
        if (seedVerifyError) throw seedVerifyError;
        if ((remainingSeeds ?? []).length !== 0) throw new Error("M4_BATCH_ROLLBACK_SEED_RESIDUE");

        const { data: remainingThin, error: thinVerifyError } = await db
          .from("thin_index_search_documents")
          .select("seed_id")
          .in("seed_id", ids);
        if (thinVerifyError) throw thinVerifyError;
        if ((remainingThin ?? []).length !== 0) throw new Error("M4_BATCH_ROLLBACK_THIN_RESIDUE");
      }

      const rollbackAfter = {
        sourceOfferSeeds: await exactCount(db, "source_offer_seeds"),
        thinIndexDocuments: await exactCount(db, "thin_index_search_documents"),
      };
      await writeReceipt(receiptPath, {
        schemaVersion: "MASS_INDEX_M4_BATCH_RECEIPT_V1",
        status: "failed_rolled_back",
        error: String(error),
        insertedBeforeRollback: inserted.length,
        rolledBack,
        before,
        rollbackAfter,
      });
    } catch (rollbackError) {
      await writeReceipt(receiptPath, {
        schemaVersion: "MASS_INDEX_M4_BATCH_RECEIPT_V1",
        status: "rollback_failed",
        originalError: String(error),
        rollbackError: String(rollbackError),
        insertedBeforeRollback: inserted.length,
        rolledBack: false,
        before,
      });
      throw rollbackError;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
