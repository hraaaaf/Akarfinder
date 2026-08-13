export type PromotionDomain = {
  sourceDomain: string;
  massQueue: string;
  likelyMoroccoListingDetailUrls: number;
};

export type PromotionRow = PromotionDomain & {
  promotionStatus: "POLICY_ADMISSIBLE" | "POLICY_BLOCKED";
};

export function buildCandidatePromotionManifest(domains: PromotionDomain[]): PromotionRow[] {
  return domains
    .filter((row) => Number(row.likelyMoroccoListingDetailUrls) > 0)
    .map((row) => ({
      ...row,
      promotionStatus: row.massQueue === "POLICY_COMPATIBLE_TAIL"
        ? "POLICY_ADMISSIBLE" as const
        : "POLICY_BLOCKED" as const,
    }))
    .sort((a, b) =>
      b.likelyMoroccoListingDetailUrls - a.likelyMoroccoListingDetailUrls ||
      a.sourceDomain.localeCompare(b.sourceDomain),
    );
}

export function summarizeCandidatePromotion(rows: PromotionRow[]) {
  const policyAdmissible = rows.filter((row) => row.promotionStatus === "POLICY_ADMISSIBLE");
  const policyBlocked = rows.filter((row) => row.promotionStatus === "POLICY_BLOCKED");
  const sum = (items: PromotionRow[]) => items.reduce((total, row) => total + row.likelyMoroccoListingDetailUrls, 0);
  return {
    candidateUrlRepresentations: sum(rows),
    policyAdmissibleUrlRepresentations: sum(policyAdmissible),
    policyBlockedUrlRepresentations: sum(policyBlocked),
    candidateDomains: rows.length,
    policyAdmissibleDomains: policyAdmissible.length,
    policyBlockedDomains: policyBlocked.length,
  } as const;
}
