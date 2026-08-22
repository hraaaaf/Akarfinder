import type { UniversalCandidatePromotionRow } from "./universal-candidate-promotion";

export type NativeExternalIndexSeedProvider = "public_sitemap" | "serper_mass_harvest" | "openserp";

export type ExternalIndexSeedEvidence = {
  title?: string | null;
  snippet?: string | null;
  query?: string | null;
};

export type ExternalIndexSeedRow = {
  canonical_url: string;
  source_domain: string;
  seed_provider: NativeExternalIndexSeedProvider;
  first_observed_at: string;
  last_observed_at: string;
  observation_count: number;
  freshness_status: "seed_only";
  fresh_last_seen_at: null;
  fresh_channels: string[];
  metadata: {
    external_index: {
      promotion_version: "MASS_INDEX_M2_V1";
      title: string | null;
      snippet: string | null;
      query: string | null;
      discovery_providers: string[];
      page_kind: string;
      geography_scope: string;
      detected_cities: string[];
      transaction_signal: string;
      real_estate_score: number;
    };
  };
};

const PROVIDER_PRIORITY: NativeExternalIndexSeedProvider[] = [
  "public_sitemap",
  "serper_mass_harvest",
  "openserp",
];

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function chooseNativeExternalIndexSeedProvider(providers: string[]): NativeExternalIndexSeedProvider {
  const observed = new Set(providers.map((provider) => provider.trim().toLowerCase()).filter(Boolean));
  const selected = PROVIDER_PRIORITY.find((provider) => observed.has(provider));
  if (!selected) throw new Error("MASS_INDEX_M2_UNSUPPORTED_PROVIDER");
  return selected;
}

export function projectExternalIndexSeed(
  row: UniversalCandidatePromotionRow,
  evidence: ExternalIndexSeedEvidence = {},
): ExternalIndexSeedRow {
  if (row.promotionStatus !== "EXTERNAL_INDEX_CANDIDATE") {
    throw new Error("MASS_INDEX_M2_ACCEPTED_CANDIDATE_REQUIRED");
  }
  if (!row.canonicalUrl || !row.classification) {
    throw new Error("MASS_INDEX_M2_CANONICAL_CLASSIFICATION_REQUIRED");
  }
  if (!row.firstSeenAt || !row.lastSeenAt) {
    throw new Error("MASS_INDEX_M2_OBSERVATION_WINDOW_REQUIRED");
  }

  const seedProvider = chooseNativeExternalIndexSeedProvider(row.providers);
  if (!row.providers.map((provider) => provider.toLowerCase()).includes(seedProvider)) {
    throw new Error("MASS_INDEX_M2_PROVIDER_RELABEL_DETECTED");
  }

  return {
    canonical_url: row.canonicalUrl,
    source_domain: row.sourceDomain,
    seed_provider: seedProvider,
    first_observed_at: row.firstSeenAt,
    last_observed_at: row.lastSeenAt,
    observation_count: Math.max(1, row.rawRows),
    freshness_status: "seed_only",
    fresh_last_seen_at: null,
    fresh_channels: [],
    metadata: {
      external_index: {
        promotion_version: "MASS_INDEX_M2_V1",
        title: clean(evidence.title),
        snippet: clean(evidence.snippet),
        query: clean(evidence.query),
        discovery_providers: [...new Set(row.providers.map((provider) => provider.trim().toLowerCase()).filter(Boolean))].sort(),
        page_kind: row.classification.pageKind,
        geography_scope: row.classification.geographyScope,
        detected_cities: [...row.classification.detectedCities].sort(),
        transaction_signal: row.classification.transactionSignal,
        real_estate_score: row.classification.realEstateScore,
      },
    },
  };
}
