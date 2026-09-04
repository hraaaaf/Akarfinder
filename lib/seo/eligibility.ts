// SEO-ELIGIBILITY-GATE-V1
// Pure, deterministic contract shared by SEO routes/sitemap and server evidence loaders.
// This is an availability/indexability floor, NOT a statistical market certification.

export type SeoIntentSlug = "acheter" | "louer";

export type CanonicalSeoPropertyType =
  | "apartment"
  | "villa"
  | "land"
  | "office"
  | "commercial"
  | "riad";

export type SeoInventoryEvidence = {
  listingCount: number;
  sourceCount: number;
};

export type SeoEligibilityReason =
  | "eligible"
  | "insufficient_stock"
  | "insufficient_sources"
  | "inventory_unavailable";

export type SeoEligibilityDecision = SeoInventoryEvidence & {
  eligible: boolean;
  reason: SeoEligibilityReason;
};

export const SEO_INVENTORY_GATE_V1 = Object.freeze({
  minListings: 20,
  minSources: 3,
});

const INTENT_ALIASES: Record<SeoIntentSlug, readonly string[]> = {
  acheter: ["sale", "buy", "achat"],
  louer: ["rent", "location"],
};

const PROPERTY_TYPE_ALIASES: Record<CanonicalSeoPropertyType, readonly string[]> = {
  apartment: ["apartment", "appartement"],
  villa: ["villa"],
  land: ["land", "terrain"],
  office: ["office", "bureau"],
  commercial: ["commercial", "local commercial", "local_commercial"],
  riad: ["riad"],
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeEvidenceCount(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

export function canonicalizeSeoIntent(value: string): SeoIntentSlug | null {
  const normalized = normalizeToken(value);
  if (normalized === "acheter" || INTENT_ALIASES.acheter.includes(normalized)) return "acheter";
  if (normalized === "louer" || INTENT_ALIASES.louer.includes(normalized)) return "louer";
  return null;
}

export function getInventoryIntentVariants(intent: SeoIntentSlug): readonly string[] {
  return INTENT_ALIASES[intent];
}

export function canonicalizeSeoPropertyType(value: string): CanonicalSeoPropertyType | null {
  const normalized = normalizeToken(value);
  for (const [canonical, aliases] of Object.entries(PROPERTY_TYPE_ALIASES) as [CanonicalSeoPropertyType, readonly string[]][]) {
    if (canonical === normalized || aliases.includes(normalized)) return canonical;
  }
  return null;
}

export function getInventoryPropertyTypeVariants(propertyType: CanonicalSeoPropertyType): readonly string[] {
  return PROPERTY_TYPE_ALIASES[propertyType];
}

export function unavailableSeoInventoryDecision(): SeoEligibilityDecision {
  return {
    eligible: false,
    reason: "inventory_unavailable",
    listingCount: 0,
    sourceCount: 0,
  };
}

export function evaluateSeoInventoryEvidence(
  evidence: SeoInventoryEvidence,
  gate: Readonly<{ minListings: number; minSources: number }> = SEO_INVENTORY_GATE_V1,
): SeoEligibilityDecision {
  const listingCount = normalizeEvidenceCount(evidence.listingCount);
  const sourceCount = normalizeEvidenceCount(evidence.sourceCount);
  const minListings = normalizeEvidenceCount(gate.minListings);
  const minSources = normalizeEvidenceCount(gate.minSources);

  if (listingCount === null || sourceCount === null || minListings === null || minSources === null) {
    return unavailableSeoInventoryDecision();
  }
  if (listingCount < minListings) {
    return { eligible: false, reason: "insufficient_stock", listingCount, sourceCount };
  }
  if (sourceCount < minSources) {
    return { eligible: false, reason: "insufficient_sources", listingCount, sourceCount };
  }
  return { eligible: true, reason: "eligible", listingCount, sourceCount };
}
