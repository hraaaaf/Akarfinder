import { redactSensitiveText } from "../../lib/openserp-ingestion/utils";
import type { UniversalCandidatePromotionRow } from "./universal-candidate-promotion";

export type NativeExternalIndexSeedProvider = "public_sitemap" | "serper_mass_harvest" | "openserp";

export const EXTERNAL_INDEX_TITLE_MAX_CHARS = 200;
export const EXTERNAL_INDEX_SNIPPET_MAX_CHARS = 320;
export const EXTERNAL_INDEX_QUERY_MAX_CHARS = 200;

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
      city: string | null;
      property_type: null;
      intent: "sale" | "rent" | null;
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

const SOCIAL_CONTACT_RE = /\b(?:instagram|insta|facebook|tiktok|telegram)\b\s*[:@]?\s*@?[A-Za-z0-9._-]+/gi;
const SOCIAL_CONTACT_TEST_RE = /\b(?:instagram|insta|facebook|tiktok|telegram)\b\s*[:@]?\s*@?[A-Za-z0-9._-]+/i;
const HANDLE_RE = /(^|[\s(])@[A-Za-z0-9._-]{2,}/g;
const HANDLE_TEST_RE = /(^|[\s(])@[A-Za-z0-9._-]{2,}/;

function truncateAtWord(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  const clipped = value.slice(0, maxChars + 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return (lastSpace >= Math.floor(maxChars * 0.7) ? clipped.slice(0, lastSpace) : value.slice(0, maxChars)).trim();
}

export function sanitizeExternalIndexText(
  value: string | null | undefined,
  maxChars: number,
): string | null {
  if (!value?.trim()) return null;
  const redacted = redactSensitiveText(value);
  if (redacted.secret_hits > 0) return null;
  const cleaned = (redacted.value ?? "")
    .replace(SOCIAL_CONTACT_RE, " ")
    .replace(HANDLE_RE, "$1")
    .replace(/\s*[-:|,;]+\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return truncateAtWord(cleaned, maxChars);
}

export function isExternalIndexSafeCanonicalUrl(value: string): boolean {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Keep the raw value; malformed escapes are handled by the normal URL gate upstream.
  }
  const redacted = redactSensitiveText(decoded);
  if (
    redacted.phone_hits > 0 ||
    redacted.whatsapp_hits > 0 ||
    redacted.personal_email_hits > 0 ||
    redacted.secret_hits > 0
  ) {
    return false;
  }
  return !SOCIAL_CONTACT_TEST_RE.test(decoded) && !HANDLE_TEST_RE.test(decoded);
}

function canonicalIntent(signal: string): "sale" | "rent" | null {
  if (signal === "SALE") return "sale";
  if (signal === "RENT") return "rent";
  return null;
}

export function chooseNativeExternalIndexSeedProvider(providers: string[]): NativeExternalIndexSeedProvider {
  const observed = new Set(providers.map((provider) => provider.trim().toLowerCase()).filter(Boolean));
  const selected = PROVIDER_PRIORITY.find((provider) => observed.has(provider));
  if (!selected) throw new Error("MASS_INDEX_M2_UNSUPPORTED_PROVIDER");
  return selected;
}

export function projectExternalIndexSeed(row: UniversalCandidatePromotionRow): ExternalIndexSeedRow {
  if (row.promotionStatus !== "EXTERNAL_INDEX_CANDIDATE") {
    throw new Error("MASS_INDEX_M2_ACCEPTED_CANDIDATE_REQUIRED");
  }
  if (!row.canonicalUrl || !row.classification) {
    throw new Error("MASS_INDEX_M2_CANONICAL_CLASSIFICATION_REQUIRED");
  }
  if (!row.firstSeenAt || !row.lastSeenAt) {
    throw new Error("MASS_INDEX_M2_OBSERVATION_WINDOW_REQUIRED");
  }
  if (!isExternalIndexSafeCanonicalUrl(row.canonicalUrl)) {
    throw new Error("MASS_INDEX_M2_SENSITIVE_CANONICAL_URL");
  }
  if (row.classification.pageKind !== "LIKELY_LISTING_DETAIL" || row.classification.geographyScope !== "MOROCCO_LIKELY" || !row.classification.likelyRealEstate) {
    throw new Error("MASS_INDEX_M2_CLASSIFICATION_GATE_FAILED");
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
        title: sanitizeExternalIndexText(row.title, EXTERNAL_INDEX_TITLE_MAX_CHARS),
        snippet: sanitizeExternalIndexText(row.snippet, EXTERNAL_INDEX_SNIPPET_MAX_CHARS),
        query: sanitizeExternalIndexText(row.discoveryQuery, EXTERNAL_INDEX_QUERY_MAX_CHARS),
        city: row.classification.detectedCities[0] ?? null,
        property_type: null,
        intent: canonicalIntent(row.classification.transactionSignal),
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
