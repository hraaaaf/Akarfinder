import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { M4MinimalExternalIndexSeed } from "./national-mass-m4-plan";

const PLAN_INPUT = "artifacts/mass-index/m4-national-ingest-plan.json";
const RECEIPT_OUTPUT = "artifacts/mass-index/m4-canary-receipt.json";

type CanaryRow = {
  canonicalUrl: string;
  sourceDomain: string;
  seedProvider: string;
  seed: M4MinimalExternalIndexSeed;
};

type M4Plan = {
  schemaVersion: string;
  mode: string;
  canary: CanaryRow[];
  invariants: {
    databaseWrites: number;
    existingSeedsMutated: number;
    canaryMaxRows: number;
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

type ThinRow = {
  seed_id: string;
  canonical_url: string;
  seed_provider: string;
  vertical_classification: string | null;
  document_kind: string | null;
  display_eligibility: string | null;
};

async function writeReceipt(path: string, payload: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  if (process.env.MASS_INDEX_M4_CANARY_WRITE !== "1") throw new Error("M4_CANARY_WRITE_FLAG_REQUIRED");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");

  const inputPath = resolve(process.env.MASS_INDEX_M4_OUTPUT || PLAN_INPUT);
  const receiptPath = resolve(process.env.MASS_INDEX_M4_CANARY_RECEIPT || RECEIPT_OUTPUT);
  const plan = JSON.parse(await readFile(inputPath, "utf8")) as M4Plan;

  if (plan.schemaVersion !== "MASS_INDEX_M4_NATIONAL_PLAN_V2" || plan.mode !== "read_only") {
    throw new Error("M4_CANARY_INVALID_PLAN");
  }
  if (plan.invariants.databaseWrites !== 0 || plan.invariants.existingSeedsMutated !== 0) {
    throw new Error("M4_CANARY_PLAN_INVARIANT_FAILED");
  }
  if (!plan.invariants.persistedMetadataIsNull || plan.invariants.persistedExternalIndexScope !== "CANONICAL_URL_SOURCE_DOMAIN_PROVENANCE_ONLY") {
    throw new Error("M4_CANARY_SCOPE_DRIFT");
  }
  if (plan.canary.length === 0 || plan.canary.length > plan.invariants.canaryMaxRows || plan.canary.length > 10) {
    throw new Error("M4_CANARY_SIZE_INVALID");
  }
  if (plan.canary.some((row) => row.seed.metadata !== null)) throw new Error("M4_CANARY_METADATA_NOT_NULL");

  const uniqueUrls = new Set(plan.canary.map((row) => row.canonicalUrl));
  if (uniqueUrls.size !== plan.canary.length) throw new Error("M4_CANARY_DUPLICATE_URL");

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const canonicalUrls = [...uniqueUrls];
  const { count: beforeSeedCount, error: beforeSeedError } = await db
    .from("source_offer_seeds")
    .select("*", { count: "exact", head: true });
  if (beforeSeedError) throw beforeSeedError;
  const { count: beforeThinCount, error: beforeThinError } = await db
    .from("thin_index_search_documents")
    .select("*", { count: "exact", head: true });
  if (beforeThinError) throw beforeThinError;

  const { data: conflicts, error: conflictError } = await db
    .from("source_offer_seeds")
    .select("canonical_url")
    .in("canonical_url", canonicalUrls);
  if (conflictError) throw conflictError;
  if ((conflicts ?? []).length > 0) throw new Error("M4_CANARY_RACE_CONFLICT");

  const inserted: InsertedSeed[] = [];
  let rolledBack = false;
  try {
    const { data, error } = await db
      .from("source_offer_seeds")
      .insert(plan.canary.map((row) => row.seed))
      .select("id,canonical_url,source_domain,seed_provider,freshness_status,metadata");
    if (error) throw error;
    inserted.push(...((data ?? []) as InsertedSeed[]));
    if (inserted.length !== plan.canary.length) throw new Error("M4_CANARY_INSERT_COUNT_MISMATCH");

    for (const row of inserted) {
      if (row.freshness_status !== "seed_only") throw new Error(`M4_CANARY_FRESHNESS_DRIFT:${row.canonical_url}`);
      if (row.metadata !== null) throw new Error(`M4_CANARY_METADATA_DRIFT:${row.canonical_url}`);
      const expected = plan.canary.find((candidate) => candidate.canonicalUrl === row.canonical_url);
      if (!expected || expected.sourceDomain !== row.source_domain || expected.seedProvider !== row.seed_provider) {
        throw new Error(`M4_CANARY_PROVENANCE_DRIFT:${row.canonical_url}`);
      }
    }

    const seedIds = inserted.map((row) => row.id);
    const { data: thinData, error: thinError } = await db
      .from("thin_index_search_documents")
      .select("seed_id,canonical_url,seed_provider,vertical_classification,document_kind,display_eligibility")
      .in("seed_id", seedIds);
    if (thinError) throw thinError;
    const thinRows = (thinData ?? []) as ThinRow[];
    if (thinRows.length !== inserted.length) throw new Error("M4_CANARY_THIN_COUNT_MISMATCH");

    for (const row of thinRows) {
      if (row.vertical_classification !== "real_estate_likely") throw new Error(`M4_CANARY_VERTICAL_DRIFT:${row.canonical_url}`);
      if (row.document_kind !== "LISTING") throw new Error(`M4_CANARY_DOCUMENT_KIND_DRIFT:${row.canonical_url}`);
      if (row.display_eligibility === "public" || row.display_eligibility === "public_search") {
        throw new Error(`M4_CANARY_PUBLIC_ACTIVATION:${row.canonical_url}`);
      }
    }

    const { count: afterSeedCount, error: afterSeedError } = await db
      .from("source_offer_seeds")
      .select("*", { count: "exact", head: true });
    if (afterSeedError) throw afterSeedError;
    const { count: afterThinCount, error: afterThinError } = await db
      .from("thin_index_search_documents")
      .select("*", { count: "exact", head: true });
    if (afterThinError) throw afterThinError;

    if ((afterSeedCount ?? 0) - (beforeSeedCount ?? 0) !== inserted.length) throw new Error("M4_CANARY_SEED_COUNT_DRIFT");
    if ((afterThinCount ?? 0) - (beforeThinCount ?? 0) !== inserted.length) throw new Error("M4_CANARY_THIN_DELTA_DRIFT");

    await writeReceipt(receiptPath, {
      schemaVersion: "MASS_INDEX_M4_CANARY_RECEIPT_V1",
      status: "verified",
      before: { sourceOfferSeeds: beforeSeedCount ?? 0, thinIndexDocuments: beforeThinCount ?? 0 },
      after: { sourceOfferSeeds: afterSeedCount ?? 0, thinIndexDocuments: afterThinCount ?? 0 },
      inserted,
      thinRows,
      rolledBack: false,
      invariants: {
        metadataNull: true,
        existingSeedsMutated: 0,
        providerRelabels: 0,
        publicSearchActivationChanges: 0,
      },
    });
  } catch (error) {
    if (inserted.length > 0) {
      const { error: rollbackError } = await db.from("source_offer_seeds").delete().in("id", inserted.map((row) => row.id));
      if (rollbackError) {
        await writeReceipt(receiptPath, {
          schemaVersion: "MASS_INDEX_M4_CANARY_RECEIPT_V1",
          status: "rollback_failed",
          inserted,
          originalError: String(error),
          rollbackError: String(rollbackError),
          rolledBack: false,
        });
        throw rollbackError;
      }
      rolledBack = true;
    }
    await writeReceipt(receiptPath, {
      schemaVersion: "MASS_INDEX_M4_CANARY_RECEIPT_V1",
      status: "failed_rolled_back",
      inserted,
      error: String(error),
      rolledBack,
    });
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
