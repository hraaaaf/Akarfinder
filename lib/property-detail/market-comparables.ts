export const MARKET_COMPARABLE_MAX_AGE_DAYS = 90;
export const MARKET_COMPARABLE_MIN_SAMPLE = 3;
export const MARKET_COMPARABLE_MAX_PUBLIC = 6;
export const MARKET_COMPARABLE_MAX_SURFACE_DELTA_RATIO = 0.35;

export type ComparableTransaction = "buy" | "rent" | "new";
export type CertifiedMarketPosition = "below_distribution" | "within_distribution" | "above_distribution";

export type MarketComparableTarget = {
  listingId: string;
  city: string;
  neighborhood: string | null;
  propertyType: string;
  transactionType: ComparableTransaction;
  priceMad: number | null;
  surfaceM2: number | null;
};

export type MarketComparableCandidate = {
  listingId: string;
  propertyClusterId: string;
  clusterVerified: boolean;
  city: string;
  neighborhood: string | null;
  propertyType: string;
  transactionType: ComparableTransaction;
  displayedPriceMad: number | null;
  surfaceM2: number | null;
  observedAt: string;
  sourceCount: number;
  sourceAttribution: string[];
};

export type CertifiedComparable = {
  listingId: string;
  propertyClusterId: string;
  scope: "neighborhood" | "city";
  displayedPriceMad: number;
  surfaceM2: number;
  pricePerM2: number;
  observedAt: string;
  sourceCount: number;
  sourceAttribution: string[];
  surfaceDeltaRatio: number | null;
};

export type MarketComparableDistribution = {
  sampleCount: number;
  comparableStockCount: number;
  minPricePerM2: number;
  p25PricePerM2: number;
  medianPricePerM2: number;
  p75PricePerM2: number;
  maxPricePerM2: number;
  targetPricePerM2: number | null;
  targetPosition: CertifiedMarketPosition | null;
  targetGapToMedianPct: number | null;
};

export type MarketComparableSet = {
  status: "certified" | "unavailable";
  reason:
    | "certified"
    | "target_invalid"
    | "insufficient_verified_sample";
  scope: "neighborhood" | "city" | null;
  observedAt: string | null;
  sampleCount: number;
  distribution: MarketComparableDistribution | null;
  comparables: CertifiedComparable[];
};

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function positiveFinite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validObservedAt(value: string, now: Date): string | null {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp) || timestamp > now.getTime()) return null;
  const ageMs = now.getTime() - timestamp;
  if (ageMs > MARKET_COMPARABLE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000) return null;
  return new Date(timestamp).toISOString();
}

function normalizedAttribution(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function surfaceDeltaRatio(targetSurface: number | null, candidateSurface: number): number | null {
  if (!positiveFinite(targetSurface)) return null;
  return Math.abs(candidateSurface - targetSurface) / targetSurface;
}

function candidateMatchesBase(target: MarketComparableTarget, candidate: MarketComparableCandidate): boolean {
  if (candidate.listingId === target.listingId) return false;
  if (!candidate.clusterVerified || !candidate.propertyClusterId.trim()) return false;
  if (candidate.transactionType !== target.transactionType) return false;
  if (normalize(candidate.city) !== normalize(target.city)) return false;
  if (normalize(candidate.propertyType) !== normalize(target.propertyType)) return false;
  if (!positiveFinite(candidate.displayedPriceMad) || !positiveFinite(candidate.surfaceM2)) return false;
  if (candidate.sourceCount < 1 || normalizedAttribution(candidate.sourceAttribution).length === 0) return false;
  const delta = surfaceDeltaRatio(target.surfaceM2, candidate.surfaceM2);
  return delta == null || delta <= MARKET_COMPARABLE_MAX_SURFACE_DELTA_RATIO;
}

function buildComparable(
  target: MarketComparableTarget,
  candidate: MarketComparableCandidate,
  scope: "neighborhood" | "city",
  observedAt: string,
): CertifiedComparable {
  const price = candidate.displayedPriceMad as number;
  const surface = candidate.surfaceM2 as number;
  const delta = surfaceDeltaRatio(target.surfaceM2, surface);
  return {
    listingId: candidate.listingId,
    propertyClusterId: candidate.propertyClusterId,
    scope,
    displayedPriceMad: price,
    surfaceM2: surface,
    pricePerM2: Math.round((price / surface) * 100) / 100,
    observedAt,
    sourceCount: candidate.sourceCount,
    sourceAttribution: normalizedAttribution(candidate.sourceAttribution),
    surfaceDeltaRatio: delta == null ? null : Math.round(delta * 10_000) / 10_000,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function quantile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * percentile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildDistribution(
  values: CertifiedComparable[],
  target: MarketComparableTarget,
): MarketComparableDistribution {
  const prices = values.map((item) => item.pricePerM2);
  const p25PricePerM2 = round2(quantile(prices, 0.25));
  const medianPricePerM2 = round2(quantile(prices, 0.5));
  const p75PricePerM2 = round2(quantile(prices, 0.75));
  const targetPricePerM2 = positiveFinite(target.priceMad) && positiveFinite(target.surfaceM2)
    ? round2(target.priceMad / target.surfaceM2)
    : null;
  const targetPosition: CertifiedMarketPosition | null = targetPricePerM2 == null
    ? null
    : targetPricePerM2 < p25PricePerM2
      ? "below_distribution"
      : targetPricePerM2 > p75PricePerM2
        ? "above_distribution"
        : "within_distribution";
  const targetGapToMedianPct = targetPricePerM2 == null || medianPricePerM2 <= 0
    ? null
    : round2(((targetPricePerM2 - medianPricePerM2) / medianPricePerM2) * 100);

  return {
    sampleCount: values.length,
    comparableStockCount: values.length,
    minPricePerM2: round2(Math.min(...prices)),
    p25PricePerM2,
    medianPricePerM2,
    p75PricePerM2,
    maxPricePerM2: round2(Math.max(...prices)),
    targetPricePerM2,
    targetPosition,
    targetGapToMedianPct,
  };
}

function rankComparables(target: MarketComparableTarget, values: CertifiedComparable[]): CertifiedComparable[] {
  const targetPricePerM2 = positiveFinite(target.priceMad) && positiveFinite(target.surfaceM2)
    ? target.priceMad / target.surfaceM2
    : median(values.map((item) => item.pricePerM2));

  return [...values].sort((a, b) => {
    const aSurface = a.surfaceDeltaRatio ?? 0;
    const bSurface = b.surfaceDeltaRatio ?? 0;
    if (aSurface !== bSurface) return aSurface - bSurface;
    if (targetPricePerM2 != null) {
      const aPriceGap = Math.abs(a.pricePerM2 - targetPricePerM2);
      const bPriceGap = Math.abs(b.pricePerM2 - targetPricePerM2);
      if (aPriceGap !== bPriceGap) return aPriceGap - bPriceGap;
    }
    return b.observedAt.localeCompare(a.observedAt) || a.listingId.localeCompare(b.listingId);
  });
}

function unavailable(
  reason: "target_invalid" | "insufficient_verified_sample",
  sampleCount: number,
): MarketComparableSet {
  return {
    status: "unavailable",
    reason,
    scope: null,
    observedAt: null,
    sampleCount,
    distribution: null,
    comparables: [],
  };
}

export function buildCertifiedComparableSet(input: {
  target: MarketComparableTarget;
  candidates: MarketComparableCandidate[];
  now?: Date;
}): MarketComparableSet {
  const { target, candidates } = input;
  const now = input.now ?? new Date();
  if (
    !target.listingId.trim() ||
    !normalize(target.city) ||
    !normalize(target.propertyType)
  ) {
    return unavailable("target_invalid", 0);
  }

  const targetNeighborhood = normalize(target.neighborhood);
  const eligible = candidates.flatMap((candidate) => {
    if (!candidateMatchesBase(target, candidate)) return [];
    const observedAt = validObservedAt(candidate.observedAt, now);
    if (!observedAt) return [];
    const neighborhoodMatch = targetNeighborhood && normalize(candidate.neighborhood) === targetNeighborhood;
    return [{ candidate, observedAt, neighborhoodMatch: Boolean(neighborhoodMatch) }];
  });

  const neighborhood = targetNeighborhood
    ? eligible.filter((item) => item.neighborhoodMatch)
    : [];
  const chosen = neighborhood.length >= MARKET_COMPARABLE_MIN_SAMPLE
    ? { scope: "neighborhood" as const, values: neighborhood }
    : { scope: "city" as const, values: eligible };

  const dedupedByCluster = new Map<string, CertifiedComparable>();
  for (const item of chosen.values) {
    const comparable = buildComparable(target, item.candidate, chosen.scope, item.observedAt);
    const existing = dedupedByCluster.get(comparable.propertyClusterId);
    if (!existing || comparable.observedAt > existing.observedAt) {
      dedupedByCluster.set(comparable.propertyClusterId, comparable);
    }
  }
  const ranked = rankComparables(target, [...dedupedByCluster.values()]);
  if (ranked.length < MARKET_COMPARABLE_MIN_SAMPLE) {
    return unavailable("insufficient_verified_sample", ranked.length);
  }

  const publicComparables = ranked.slice(0, MARKET_COMPARABLE_MAX_PUBLIC);
  return {
    status: "certified",
    reason: "certified",
    scope: chosen.scope,
    observedAt: ranked.reduce((latest, item) => item.observedAt > latest ? item.observedAt : latest, ranked[0]!.observedAt),
    sampleCount: ranked.length,
    distribution: buildDistribution(ranked, target),
    comparables: publicComparables,
  };
}
