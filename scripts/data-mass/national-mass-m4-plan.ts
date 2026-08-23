import { redactSensitiveText } from "../../lib/openserp-ingestion/utils";
import {
  chooseNativeExternalIndexSeedProvider,
  type NativeExternalIndexSeedProvider,
} from "./external-index-seed";
import { isM3SourceSpecificListingUrl } from "./source-factory-m3-adapter";
import type { UniversalCandidatePromotionRow } from "./universal-candidate-promotion";

export const M4_WAVE1_DOMAINS = [
  "marocannonces.com",
  "domio.ma",
  "sakane.ma",
  "1000-annonces.com",
  "housing.place",
  "expat.com",
  "milkiya.ma",
] as const;

export type M4Wave1Domain = (typeof M4_WAVE1_DOMAINS)[number];

export type M4ExistingSeedIdentity = {
  canonical_url: string;
  source_domain: string;
  seed_provider: string;
};

export type M4MinimalExternalIndexSeed = {
  canonical_url: string;
  source_domain: string;
  seed_provider: NativeExternalIndexSeedProvider;
  first_observed_at: string;
  last_observed_at: string;
  observation_count: number;
  metadata: null;
  freshness_status: "seed_only";
  fresh_last_seen_at: null;
  fresh_channels: string[];
};

export type M4WritePlanRow =
  | {
      action: "INSERT_NATIVE";
      canonicalUrl: string;
      seed: M4MinimalExternalIndexSeed;
      existingSeed: null;
    }
  | {
      action: "PRESERVE_EXISTING";
      canonicalUrl: string;
      seed: null;
      existingSeed: M4ExistingSeedIdentity;
    };

export type M4DomainSummary = {
  sourceDomain: M4Wave1Domain;
  canonicalCandidates: number;
  m1Accepted: number;
  sourceSpecificDetail: number;
  safetyRejected: number;
  sourceSpecificValid: number;
  insertNative: number;
  preserveExisting: number;
};

export type M4PlanSummary = {
  canonicalCandidates: number;
  m1Accepted: number;
  sourceSpecificDetail: number;
  safetyRejected: number;
  sourceSpecificValid: number;
  insertNative: number;
  preserveExisting: number;
  byDomain: M4DomainSummary[];
  byProvider: Record<string, number>;
};

const M4_NATIVE_PROVIDERS = new Set<NativeExternalIndexSeedProvider>([
  "openserp",
  "serper_mass_harvest",
]);

const INTERNATIONAL_PHONE_RE = /(?:\+|00)?212[\s.-]?[5-7](?:[\s.-]?\d){8}/;
const SOCIAL_CONTACT_RE = /\b(?:whatsapp|instagram|insta|facebook|tiktok|telegram)\b|(^|[\s(])@[A-Za-z0-9._-]{2,}/i;

export function isM4SafeCanonicalUrl(value: string): boolean {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Keep raw input. The URL classifier upstream remains authoritative for malformed URLs.
  }
  const redacted = redactSensitiveText(decoded);
  return redacted.phone_hits === 0 &&
    redacted.whatsapp_hits === 0 &&
    redacted.personal_email_hits === 0 &&
    redacted.secret_hits === 0 &&
    !INTERNATIONAL_PHONE_RE.test(decoded) &&
    !SOCIAL_CONTACT_RE.test(decoded);
}

function isM4SourceSpecificDetail(row: UniversalCandidatePromotionRow): boolean {
  return row.promotionStatus === "EXTERNAL_INDEX_CANDIDATE" &&
    Boolean(row.canonicalUrl) &&
    isM3SourceSpecificListingUrl(row.sourceDomain, row.canonicalUrl!);
}

export function filterM4Wave1Manifest(
  rows: UniversalCandidatePromotionRow[],
): UniversalCandidatePromotionRow[] {
  const allowed = new Set<string>(M4_WAVE1_DOMAINS);
  return rows
    .filter((row) => allowed.has(row.sourceDomain))
    .filter(isM4SourceSpecificDetail)
    .filter((row) => isM4SafeCanonicalUrl(row.canonicalUrl!))
    .sort((a, b) => (a.canonicalUrl ?? "").localeCompare(b.canonicalUrl ?? ""));
}

export function projectM4MinimalSeed(row: UniversalCandidatePromotionRow): M4MinimalExternalIndexSeed {
  if (row.promotionStatus !== "EXTERNAL_INDEX_CANDIDATE" || !row.canonicalUrl || !row.classification) {
    throw new Error("M4_ACCEPTED_CLASSIFIED_CANDIDATE_REQUIRED");
  }
  if (!row.firstSeenAt || !row.lastSeenAt) throw new Error("M4_OBSERVATION_WINDOW_REQUIRED");
  if (!isM3SourceSpecificListingUrl(row.sourceDomain, row.canonicalUrl)) {
    throw new Error("M4_SOURCE_SPECIFIC_DETAIL_REQUIRED");
  }
  if (!isM4SafeCanonicalUrl(row.canonicalUrl)) throw new Error("M4_SENSITIVE_CANONICAL_URL");

  const seedProvider = chooseNativeExternalIndexSeedProvider(row.providers);
  if (!M4_NATIVE_PROVIDERS.has(seedProvider)) throw new Error(`M4_NON_NATIVE_PROVIDER:${seedProvider}`);

  return {
    canonical_url: row.canonicalUrl,
    source_domain: row.sourceDomain,
    seed_provider: seedProvider,
    first_observed_at: row.firstSeenAt,
    last_observed_at: row.lastSeenAt,
    observation_count: Math.max(1, row.rawRows),
    metadata: null,
    freshness_status: "seed_only",
    fresh_last_seen_at: null,
    fresh_channels: [],
  };
}

export function buildM4NationalWritePlan(
  rows: UniversalCandidatePromotionRow[],
  existingSeeds: M4ExistingSeedIdentity[],
): M4WritePlanRow[] {
  const existingByCanonical = new Map(existingSeeds.map((seed) => [seed.canonical_url, seed]));
  const filtered = filterM4Wave1Manifest(rows);
  const seen = new Set<string>();
  const plan: M4WritePlanRow[] = [];

  for (const row of filtered) {
    const canonicalUrl = row.canonicalUrl!;
    if (seen.has(canonicalUrl)) throw new Error("M4_DUPLICATE_CANONICAL_IN_MANIFEST");
    seen.add(canonicalUrl);
    const existingSeed = existingByCanonical.get(canonicalUrl);
    if (existingSeed) {
      plan.push({ action: "PRESERVE_EXISTING", canonicalUrl, seed: null, existingSeed });
      continue;
    }
    plan.push({
      action: "INSERT_NATIVE",
      canonicalUrl,
      seed: projectM4MinimalSeed(row),
      existingSeed: null,
    });
  }

  return plan.sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl));
}

export function selectM4RoundRobinCanary(plan: M4WritePlanRow[], maxRows = 10) {
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 10) throw new Error("M4_CANARY_BUDGET_INVALID");
  const byDomain = new Map<string, Extract<M4WritePlanRow, { action: "INSERT_NATIVE" }>[]>()
  for (const row of plan) {
    if (row.action !== "INSERT_NATIVE") continue;
    const list = byDomain.get(row.seed.source_domain) ?? [];
    list.push(row);
    byDomain.set(row.seed.source_domain, list);
  }
  for (const list of byDomain.values()) list.sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl));

  const cursors = new Map<string, number>();
  const selected: Extract<M4WritePlanRow, { action: "INSERT_NATIVE" }>[] = [];
  while (selected.length < maxRows) {
    let added = false;
    for (const domain of M4_WAVE1_DOMAINS) {
      const list = byDomain.get(domain) ?? [];
      const index = cursors.get(domain) ?? 0;
      const row = list[index];
      if (!row) continue;
      selected.push(row);
      cursors.set(domain, index + 1);
      added = true;
      if (selected.length >= maxRows) break;
    }
    if (!added) break;
  }
  return selected;
}

export function summarizeM4Plan(
  sourceManifest: UniversalCandidatePromotionRow[],
  plan: M4WritePlanRow[],
): M4PlanSummary {
  const byDomain = M4_WAVE1_DOMAINS.map((sourceDomain) => {
    const domainRows = sourceManifest.filter((row) => row.sourceDomain === sourceDomain);
    const m1Accepted = domainRows.filter((row) => row.promotionStatus === "EXTERNAL_INDEX_CANDIDATE");
    const sourceSpecificDetail = m1Accepted.filter(
      (row) => Boolean(row.canonicalUrl) && isM3SourceSpecificListingUrl(sourceDomain, row.canonicalUrl!),
    );
    const sourceSpecificValid = sourceSpecificDetail.filter((row) => isM4SafeCanonicalUrl(row.canonicalUrl!));
    const domainPlan = plan.filter((row) =>
      row.action === "INSERT_NATIVE"
        ? row.seed.source_domain === sourceDomain
        : row.existingSeed.source_domain === sourceDomain,
    );
    return {
      sourceDomain,
      canonicalCandidates: domainRows.length,
      m1Accepted: m1Accepted.length,
      sourceSpecificDetail: sourceSpecificDetail.length,
      safetyRejected: sourceSpecificDetail.length - sourceSpecificValid.length,
      sourceSpecificValid: sourceSpecificValid.length,
      insertNative: domainPlan.filter((row) => row.action === "INSERT_NATIVE").length,
      preserveExisting: domainPlan.filter((row) => row.action === "PRESERVE_EXISTING").length,
    } satisfies M4DomainSummary;
  });

  const sourceSpecificDetail = sourceManifest.filter(isM4SourceSpecificDetail);
  const sourceSpecificValid = filterM4Wave1Manifest(sourceManifest);
  const inserts = plan.filter((row): row is Extract<M4WritePlanRow, { action: "INSERT_NATIVE" }> => row.action === "INSERT_NATIVE");
  const byProvider: Record<string, number> = {};
  for (const row of inserts) byProvider[row.seed.seed_provider] = (byProvider[row.seed.seed_provider] ?? 0) + 1;

  return {
    canonicalCandidates: sourceManifest.length,
    m1Accepted: sourceManifest.filter((row) => row.promotionStatus === "EXTERNAL_INDEX_CANDIDATE").length,
    sourceSpecificDetail: sourceSpecificDetail.length,
    safetyRejected: sourceSpecificDetail.length - sourceSpecificValid.length,
    sourceSpecificValid: sourceSpecificValid.length,
    insertNative: inserts.length,
    preserveExisting: plan.length - inserts.length,
    byDomain,
    byProvider: Object.fromEntries(Object.entries(byProvider).sort(([a], [b]) => a.localeCompare(b))),
  };
}
