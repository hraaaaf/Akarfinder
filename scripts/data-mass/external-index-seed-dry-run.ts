import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { projectExternalIndexSeed } from "./external-index-seed";
import type { UniversalCandidatePromotionRow } from "./universal-candidate-promotion";

const INPUT = "artifacts/mass-index/m1-universal-candidate-promotion.json";
const OUTPUT = "artifacts/mass-index/m2-external-index-seed-dry-run.json";

type ManifestPayload = {
  mode: string;
  manifest: UniversalCandidatePromotionRow[];
};

async function main() {
  const inputPath = resolve(process.env.MASS_INDEX_M1_OUTPUT || INPUT);
  const outputPath = resolve(process.env.MASS_INDEX_M2_OUTPUT || OUTPUT);
  const payload = JSON.parse(await readFile(inputPath, "utf8")) as ManifestPayload;
  if (payload.mode !== "read_only") throw new Error("MASS_INDEX_M2_REQUIRES_READ_ONLY_M1_MANIFEST");

  const accepted = payload.manifest.filter((row) => row.promotionStatus === "EXTERNAL_INDEX_CANDIDATE");
  const projected = accepted.map(projectExternalIndexSeed);
  const byProvider: Record<string, number> = {};
  let providerRelabels = 0;
  let listingClassificationViolations = 0;

  for (let index = 0; index < projected.length; index += 1) {
    const seed = projected[index]!;
    const source = accepted[index]!;
    byProvider[seed.seed_provider] = (byProvider[seed.seed_provider] ?? 0) + 1;
    if (!source.providers.map((provider) => provider.toLowerCase()).includes(seed.seed_provider)) providerRelabels += 1;
    if (seed.metadata.external_index.page_kind !== "LIKELY_LISTING_DETAIL" || seed.metadata.external_index.geography_scope !== "MOROCCO_LIKELY") {
      listingClassificationViolations += 1;
    }
  }

  const result = {
    schemaVersion: "MASS_INDEX_M2_EXTERNAL_INDEX_SEED_DRY_RUN_V1",
    mode: "read_only",
    summary: {
      acceptedManifestRows: accepted.length,
      projectedSeeds: projected.length,
      byProvider: Object.fromEntries(Object.entries(byProvider).sort(([a], [b]) => a.localeCompare(b))),
    },
    invariants: {
      databaseWrites: 0,
      sourceNetworkRequests: 0,
      publicSearchActivations: 0,
      providerRelabels,
      listingClassificationViolations,
    },
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
