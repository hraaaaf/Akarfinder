import { projectExternalIndexSeed, type ExternalIndexSeedRow } from "./external-index-seed";
import type { UniversalCandidatePromotionRow } from "./universal-candidate-promotion";

export type ExistingSourceOfferSeedIdentity = {
  canonical_url: string;
  source_domain: string;
  seed_provider: string;
};

export type ExternalIndexSeedWritePlanRow =
  | {
      action: "INSERT_NATIVE";
      canonicalUrl: string;
      seed: ExternalIndexSeedRow;
      existingSeed: null;
    }
  | {
      action: "PRESERVE_EXISTING";
      canonicalUrl: string;
      seed: null;
      existingSeed: ExistingSourceOfferSeedIdentity;
    };

export type ExternalIndexSeedWritePlanSummary = {
  acceptedCanonicalUrls: number;
  insertNative: number;
  preserveExisting: number;
  insertByProvider: Record<string, number>;
  preservedByExistingProvider: Record<string, number>;
};

export function buildExternalIndexSeedWritePlan(
  manifestRows: UniversalCandidatePromotionRow[],
  existingSeeds: ExistingSourceOfferSeedIdentity[],
): ExternalIndexSeedWritePlanRow[] {
  const existingByCanonicalUrl = new Map(existingSeeds.map((seed) => [seed.canonical_url, seed]));
  const seen = new Set<string>();
  const plan: ExternalIndexSeedWritePlanRow[] = [];

  for (const row of manifestRows) {
    if (row.promotionStatus !== "EXTERNAL_INDEX_CANDIDATE") continue;
    if (!row.canonicalUrl) throw new Error("MASS_INDEX_M2_ACCEPTED_CANONICAL_URL_REQUIRED");
    if (seen.has(row.canonicalUrl)) throw new Error("MASS_INDEX_M2_DUPLICATE_CANONICAL_IN_MANIFEST");
    seen.add(row.canonicalUrl);

    const existingSeed = existingByCanonicalUrl.get(row.canonicalUrl);
    if (existingSeed) {
      plan.push({
        action: "PRESERVE_EXISTING",
        canonicalUrl: row.canonicalUrl,
        seed: null,
        existingSeed,
      });
      continue;
    }

    plan.push({
      action: "INSERT_NATIVE",
      canonicalUrl: row.canonicalUrl,
      seed: projectExternalIndexSeed(row),
      existingSeed: null,
    });
  }

  return plan.sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl));
}

export function summarizeExternalIndexSeedWritePlan(
  plan: ExternalIndexSeedWritePlanRow[],
): ExternalIndexSeedWritePlanSummary {
  const insertByProvider: Record<string, number> = {};
  const preservedByExistingProvider: Record<string, number> = {};
  let insertNative = 0;
  let preserveExisting = 0;

  for (const row of plan) {
    if (row.action === "INSERT_NATIVE") {
      insertNative += 1;
      insertByProvider[row.seed.seed_provider] = (insertByProvider[row.seed.seed_provider] ?? 0) + 1;
    } else {
      preserveExisting += 1;
      preservedByExistingProvider[row.existingSeed.seed_provider] =
        (preservedByExistingProvider[row.existingSeed.seed_provider] ?? 0) + 1;
    }
  }

  return {
    acceptedCanonicalUrls: plan.length,
    insertNative,
    preserveExisting,
    insertByProvider: Object.fromEntries(Object.entries(insertByProvider).sort(([a], [b]) => a.localeCompare(b))),
    preservedByExistingProvider: Object.fromEntries(
      Object.entries(preservedByExistingProvider).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}
