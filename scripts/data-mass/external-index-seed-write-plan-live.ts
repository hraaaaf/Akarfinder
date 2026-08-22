import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  buildExternalIndexSeedWritePlan,
  summarizeExternalIndexSeedWritePlan,
  type ExistingSourceOfferSeedIdentity,
} from "./external-index-seed-write-plan";
import type { UniversalCandidatePromotionRow } from "./universal-candidate-promotion";

const M1_INPUT = "artifacts/mass-index/m1-universal-candidate-promotion.json";
const OUTPUT = "artifacts/mass-index/m2-external-index-write-plan.json";
const BATCH_SIZE = 1000;
const CANARY_PER_PROVIDER = 5;

type ManifestPayload = {
  mode: string;
  manifest: UniversalCandidatePromotionRow[];
};

type SourceOfferSeedRow = ExistingSourceOfferSeedIdentity & {
  created_at: string;
};

async function fetchExistingSeeds(db: ReturnType<typeof createClient>) {
  const snapshotCutoff = new Date().toISOString();
  const rows: ExistingSourceOfferSeedIdentity[] = [];
  let cursor: string | null = null;
  let pages = 0;

  for (;;) {
    const baseQuery = db
      .from("source_offer_seeds")
      .select("canonical_url,source_domain,seed_provider,created_at")
      .lte("created_at", snapshotCutoff)
      .order("canonical_url", { ascending: true })
      .limit(BATCH_SIZE);
    const query = cursor ? baseQuery.gt("canonical_url", cursor) : baseQuery;
    const { data, error } = await query;
    if (error) throw error;

    const page = (data ?? []) as SourceOfferSeedRow[];
    rows.push(...page.map(({ canonical_url, source_domain, seed_provider }) => ({
      canonical_url,
      source_domain,
      seed_provider,
    })));
    pages += 1;
    if (page.length < BATCH_SIZE) break;

    const nextCursor = page.at(-1)?.canonical_url;
    if (!nextCursor || nextCursor === cursor) throw new Error("MASS_INDEX_M2_SEED_KEYSET_CURSOR_STALLED");
    cursor = nextCursor;
  }

  return { rows, snapshotCutoff, pages };
}

function selectCanary(plan: ReturnType<typeof buildExternalIndexSeedWritePlan>) {
  const inserts = plan.filter((row) => row.action === "INSERT_NATIVE");
  const selected = [] as Array<{
    canonicalUrl: string;
    sourceDomain: string;
    seedProvider: string;
    seed: NonNullable<(typeof inserts)[number]["seed"]>;
  }>;

  for (const provider of ["openserp", "serper_mass_harvest"] as const) {
    const providerRows = inserts
      .filter((row) => row.action === "INSERT_NATIVE" && row.seed.seed_provider === provider)
      .sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl))
      .slice(0, CANARY_PER_PROVIDER);
    for (const row of providerRows) {
      if (row.action !== "INSERT_NATIVE") continue;
      selected.push({
        canonicalUrl: row.canonicalUrl,
        sourceDomain: row.seed.source_domain,
        seedProvider: row.seed.seed_provider,
        seed: row.seed,
      });
    }
  }

  return selected;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");

  const inputPath = resolve(process.env.MASS_INDEX_M1_OUTPUT || M1_INPUT);
  const outputPath = resolve(process.env.MASS_INDEX_M2_WRITE_PLAN_OUTPUT || OUTPUT);
  const payload = JSON.parse(await readFile(inputPath, "utf8")) as ManifestPayload;
  if (payload.mode !== "read_only") throw new Error("MASS_INDEX_M2_REQUIRES_READ_ONLY_M1_MANIFEST");

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const seedSnapshot = await fetchExistingSeeds(db);
  const plan = buildExternalIndexSeedWritePlan(payload.manifest, seedSnapshot.rows);
  const summary = summarizeExternalIndexSeedWritePlan(plan);
  const canary = selectCanary(plan);

  const result = {
    schemaVersion: "MASS_INDEX_M2_WRITE_PLAN_V1",
    mode: "read_only",
    sourceSeedSnapshot: {
      cutoffCreatedAt: seedSnapshot.snapshotCutoff,
      pages: seedSnapshot.pages,
      pagination: "keyset_canonical_url",
      batchSize: BATCH_SIZE,
    },
    summary,
    canary,
    invariants: {
      databaseWrites: 0,
      existingSeedsMutated: 0,
      sourceNetworkRequests: 0,
      duplicateCanonicalWritesPlanned: 0,
      canaryMaxRows: CANARY_PER_PROVIDER * 2,
    },
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    ...result,
    canary: canary.map(({ canonicalUrl, sourceDomain, seedProvider }) => ({ canonicalUrl, sourceDomain, seedProvider })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
