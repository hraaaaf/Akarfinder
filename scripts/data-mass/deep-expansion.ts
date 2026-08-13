import type { CandidateClassification, ReservoirCandidate } from "./reservoir-qualification";

export type DeepExpansionPattern =
  | "DABA_HEX_DETAIL"
  | "MARRAKECHREALTY_STATUS_SLUG"
  | "YAKEEY_ID_SUFFIX"
  | "SOUQCITY_LISTING_ID"
  | "SOUQCITY_AD_ID"
  | "JIBRIL_BIENS_SLUG"
  | "SW_PROPRIETE_SLUG"
  | "ATLAS_PROPERTY_SLUG"
  | "LOCO_IMMOBILIERS_SLUG";

function normalizedDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function pathname(rawUrl: string): string {
  try {
    return new URL(rawUrl).pathname.toLowerCase().replace(/\/+$/, "") || "/";
  } catch {
    return rawUrl.toLowerCase().split("?")[0]?.replace(/\/+$/, "") || rawUrl.toLowerCase();
  }
}

export function detectDeepExpansionPattern(candidate: Pick<ReservoirCandidate, "sourceDomain" | "url">): DeepExpansionPattern | null {
  const domain = normalizedDomain(candidate.sourceDomain);
  const path = pathname(candidate.url);

  if (domain === "dabaannonce.ma" && /^\/(vente-immobiliere|location-immobiliere|locations?)\/[^/]+\/[^/]+-[0-9a-f]{8}$/i.test(path)) return "DABA_HEX_DETAIL";
  if (domain === "marrakechrealty.com" && /^\/(vente|location)\/[^/]+$/i.test(path)) return "MARRAKECHREALTY_STATUS_SLUG";
  if (domain === "yakeey.com" && /^\/fr-ma\/(acheter|louer)-[^/]+-[a-z]{2}[0-9]{6}$/i.test(path)) return "YAKEEY_ID_SUFFIX";
  if (domain === "souqcity.ma" && /^\/(public\/(fr|en)\/)?listing-id[0-9]+$/i.test(path)) return "SOUQCITY_LISTING_ID";
  if (domain === "souqcity.ma" && /^\/ad\/[0-9]+\/.+$/i.test(path)) return "SOUQCITY_AD_ID";
  if (domain === "jibril.immo" && /^\/biens\/[^/]+$/i.test(path)) return "JIBRIL_BIENS_SLUG";
  if (domain === "swimmobilier.com" && /^\/propriete\/[^/]+$/i.test(path)) return "SW_PROPRIETE_SLUG";
  if (domain === "atlasimmobilier.com" && /^\/property\/[^/]+$/i.test(path)) return "ATLAS_PROPERTY_SLUG";
  if (domain === "loco.ma" && /^\/immobiliers\/[^/]+$/i.test(path)) return "LOCO_IMMOBILIERS_SLUG";
  return null;
}

export type DeepExpansionResult = CandidateClassification & {
  deepExpansionPattern: DeepExpansionPattern | null;
  upgradedByMassX2: boolean;
};

export function applyDeepExpansion(
  candidate: ReservoirCandidate,
  base: CandidateClassification,
): DeepExpansionResult {
  const pattern = detectDeepExpansionPattern(candidate);
  const canUpgrade = Boolean(
    pattern &&
    base.likelyRealEstate &&
    base.geographyScope === "MOROCCO_LIKELY" &&
    base.pageKind === "AMBIGUOUS",
  );

  if (!canUpgrade) return { ...base, deepExpansionPattern: pattern, upgradedByMassX2: false };

  return {
    ...base,
    pageKind: "LIKELY_LISTING_DETAIL",
    reasons: [...base.reasons, `MASS_X2_${pattern}`],
    deepExpansionPattern: pattern,
    upgradedByMassX2: true,
  };
}
