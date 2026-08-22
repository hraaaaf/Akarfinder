import {
  buildExternalIndexSeedWritePlan,
  summarizeExternalIndexSeedWritePlan,
  type ExistingSourceOfferSeedIdentity,
  type ExternalIndexSeedWritePlanRow,
} from "./external-index-seed-write-plan";
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

export type M4DomainSummary = {
  sourceDomain: M4Wave1Domain;
  canonicalCandidates: number;
  m1Accepted: number;
  sourceSpecificValid: number;
  insertNative: number;
  preserveExisting: number;
};

export type M4PlanSummary = {
  canonicalCandidates: number;
  m1Accepted: number;
  sourceSpecificValid: number;
  insertNative: number;
  preserveExisting: number;
  byDomain: M4DomainSummary[];
  byProvider: Record<string, number>;
};

export function filterM4Wave1Manifest(
  rows: UniversalCandidatePromotionRow[],
): UniversalCandidatePromotionRow[] {
  const allowed = new Set<string>(M4_WAVE1_DOMAINS);
  return rows
    .filter((row) => allowed.has(row.sourceDomain))
    .filter((row) => row.promotionStatus === "EXTERNAL_INDEX_CANDIDATE")
    .filter((row) => Boolean(row.canonicalUrl))
    .filter((row) => isM3SourceSpecificListingUrl(row.sourceDomain, row.canonicalUrl!))
    .sort((a, b) => (a.canonicalUrl ?? "").localeCompare(b.canonicalUrl ?? ""));
}

export function buildM4NationalWritePlan(
  rows: UniversalCandidatePromotionRow[],
  existingSeeds: ExistingSourceOfferSeedIdentity[],
): ExternalIndexSeedWritePlanRow[] {
  return buildExternalIndexSeedWritePlan(filterM4Wave1Manifest(rows), existingSeeds);
}

export function selectM4RoundRobinCanary(
  plan: ExternalIndexSeedWritePlanRow[],
  maxRows = 10,
) {
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 10) throw new Error("M4_CANARY_BUDGET_INVALID");
  const byDomain = new Map<string, Extract<ExternalIndexSeedWritePlanRow, { action: "INSERT_NATIVE" }>[]>();
  for (const row of plan) {
    if (row.action !== "INSERT_NATIVE") continue;
    const list = byDomain.get(row.seed.source_domain) ?? [];
    list.push(row);
    byDomain.set(row.seed.source_domain, list);
  }
  for (const list of byDomain.values()) list.sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl));

  const cursors = new Map<string, number>();
  const selected: Extract<ExternalIndexSeedWritePlanRow, { action: "INSERT_NATIVE" }>[] = [];
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
  plan: ExternalIndexSeedWritePlanRow[],
): M4PlanSummary {
  const planSummary = summarizeExternalIndexSeedWritePlan(plan);
  const byDomain = M4_WAVE1_DOMAINS.map((sourceDomain) => {
    const domainRows = sourceManifest.filter((row) => row.sourceDomain === sourceDomain);
    const m1Accepted = domainRows.filter((row) => row.promotionStatus === "EXTERNAL_INDEX_CANDIDATE");
    const sourceSpecificValid = m1Accepted.filter(
      (row) => Boolean(row.canonicalUrl) && isM3SourceSpecificListingUrl(sourceDomain, row.canonicalUrl!),
    );
    const domainPlan = plan.filter((row) =>
      row.action === "INSERT_NATIVE"
        ? row.seed.source_domain === sourceDomain
        : row.existingSeed.source_domain === sourceDomain,
    );
    return {
      sourceDomain,
      canonicalCandidates: domainRows.length,
      m1Accepted: m1Accepted.length,
      sourceSpecificValid: sourceSpecificValid.length,
      insertNative: domainPlan.filter((row) => row.action === "INSERT_NATIVE").length,
      preserveExisting: domainPlan.filter((row) => row.action === "PRESERVE_EXISTING").length,
    } satisfies M4DomainSummary;
  });

  return {
    canonicalCandidates: sourceManifest.length,
    m1Accepted: sourceManifest.filter((row) => row.promotionStatus === "EXTERNAL_INDEX_CANDIDATE").length,
    sourceSpecificValid: filterM4Wave1Manifest(sourceManifest).length,
    insertNative: planSummary.insertNative,
    preserveExisting: planSummary.preserveExisting,
    byDomain,
    byProvider: planSummary.insertByProvider,
  };
}
