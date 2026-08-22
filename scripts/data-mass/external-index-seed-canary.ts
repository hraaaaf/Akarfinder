import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { ExternalIndexSeedRow } from "./external-index-seed";

const PLAN_INPUT = "artifacts/mass-index/m2-external-index-write-plan.json";
const RECEIPT_OUTPUT = "artifacts/mass-index/m2-external-index-canary-receipt.json";

type CanaryPlan = {
  schemaVersion: string;
  mode: string;
  invariants: {
    databaseWrites: number;
    existingSeedsMutated: number;
    duplicateCanonicalWritesPlanned: number;
    canaryMaxRows: number;
  };
  canary: Array<{
    canonicalUrl: string;
    sourceDomain: string;
    seedProvider: string;
    seed: ExternalIndexSeedRow;
  }>;
};

type InsertedSeed = {
  id: string;
  canonical_url: string;
  source_domain: string;
  seed_provider: string;
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
  if (process.env.MASS_INDEX_CANARY_WRITE !== "1") throw new Error("MASS_INDEX_CANARY_WRITE_FLAG_REQUIRED");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");

  const inputPath = resolve(process.env.MASS_INDEX_M2_WRITE_PLAN_OUTPUT || PLAN_INPUT);
  const receiptPath = resolve(process.env.MASS_INDEX_M2_CANARY_RECEIPT || RECEIPT_OUTPUT);
  const plan = JSON.parse(await readFile(inputPath, "utf8")) as CanaryPlan;

  if (plan.schemaVersion !== "MASS_INDEX_M2_WRITE_PLAN_V1" || plan.mode !== "read_only") {
    throw new Error("MASS_INDEX_M2_INVALID_WRITE_PLAN");
  }
  if (plan.invariants.databaseWrites !== 0 || plan.invariants.existingSeedsMutated !== 0 || plan.invariants.duplicateCanonicalWritesPlanned !== 0) {
    throw new Error("MASS_INDEX_M2_WRITE_PLAN_INVARIANT_FAILED");
  }
  if (plan.canary.length === 0 || plan.canary.length > plan.invariants.canaryMaxRows) {
    throw new Error("MASS_INDEX_M2_CANARY_SIZE_INVALID");
  }

  const uniqueUrls = new Set(plan.canary.map((row) => row.canonicalUrl));
  if (uniqueUrls.size !== plan.canary.length) throw new Error("MASS_INDEX_M2_CANARY_DUPLICATE_URL");

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const canonicalUrls = [...uniqueUrls];

  const { data: conflicts, error: conflictError } = await db
    .from("source_offer_seeds")
    .select("canonical_url")
    .in("canonical_url", canonicalUrls);
  if (conflictError) throw conflictError;
  if ((conflicts ?? []).length > 0) throw new Error("MASS_INDEX_M2_CANARY_RACE_CONFLICT");

  const inserted: InsertedSeed[] = [];
  let rolledBack = false;
  try {
    const { data, error } = await db
      .from("source_offer_seeds")
      .insert(plan.canary.map((row) => row.seed))
      .select("id,canonical_url,source_domain,seed_provider");
    if (error) throw error;
    inserted.push(...((data ?? []) as InsertedSeed[]));
    if (inserted.length !== plan.canary.length) throw new Error("MASS_INDEX_M2_CANARY_INSERT_COUNT_MISMATCH");

    await writeReceipt(receiptPath, {
      schemaVersion: "MASS_INDEX_M2_CANARY_RECEIPT_V1",
      status: "inserted_pending_verification",
      inserted,
      rolledBack: false,
    });

    const seedIds = inserted.map((row) => row.id);
    const { data: thinData, error: thinError } = await db
      .from("thin_index_search_documents")
      .select("seed_id,canonical_url,seed_provider,vertical_classification,document_kind,display_eligibility")
      .in("seed_id", seedIds);
    if (thinError) throw thinError;
    const thinRows = (thinData ?? []) as ThinRow[];
    if (thinRows.length !== inserted.length) throw new Error("MASS_INDEX_M2_CANARY_THIN_COUNT_MISMATCH");

    for (const row of thinRows) {
      if (row.vertical_classification !== "real_estate_likely") throw new Error("MASS_INDEX_M2_CANARY_VERTICAL_CLASSIFICATION_FAILED");
      if (row.document_kind !== "LISTING") throw new Error("MASS_INDEX_M2_CANARY_DOCUMENT_KIND_FAILED");
      if (!plan.canary.some((candidate) => candidate.canonicalUrl === row.canonical_url && candidate.seedProvider === row.seed_provider)) {
        throw new Error("MASS_INDEX_M2_CANARY_PROVIDER_OR_URL_MISMATCH");
      }
    }

    await writeReceipt(receiptPath, {
      schemaVersion: "MASS_INDEX_M2_CANARY_RECEIPT_V1",
      status: "verified",
      inserted,
      thinRows,
      rolledBack: false,
      invariants: {
        existingSeedsMutated: 0,
        providerRelabels: 0,
        publicSearchActivationChanges: 0,
      },
    });
  } catch (error) {
    if (inserted.length > 0) {
      const { error: rollbackError } = await db
        .from("source_offer_seeds")
        .delete()
        .in("id", inserted.map((row) => row.id));
      if (rollbackError) {
        await writeReceipt(receiptPath, {
          schemaVersion: "MASS_INDEX_M2_CANARY_RECEIPT_V1",
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
      schemaVersion: "MASS_INDEX_M2_CANARY_RECEIPT_V1",
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
