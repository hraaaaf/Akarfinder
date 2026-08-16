export type PriceObservation = {
  observedAt: string;
  displayedPriceMad: number;
  sourceOfferId: number;
  sourceName: string;
};

export type PriceHistoryPoint = {
  observedAt: string;
  displayedPriceMad: number;
  sourceOfferId: number;
  sourceName: string;
};

export type PriceHistoryModel = {
  status: "available" | "unavailable";
  points: PriceHistoryPoint[];
  observationCount: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
};

export type EstimatePublicationPolicy = {
  policyVersion: string;
  minimumHoldoutSampleSize: number;
  maximumMapePct: number;
  maximumMedianAbsoluteErrorPct: number;
};

export type EstimateValidationMetrics = {
  holdoutSampleSize: number;
  mapePct: number;
  medianAbsoluteErrorPct: number;
};

export type AkarEstimateCandidate = {
  valueMad: number;
  lowMad: number;
  highMad: number;
  confidence: number;
  modelVersion: string;
  modelDate: string;
  segment: string;
  trainingSampleSize: number;
  validation: EstimateValidationMetrics;
  publicationPolicy: EstimatePublicationPolicy;
};

export type CertifiedAkarEstimate = AkarEstimateCandidate & {
  status: "certified";
};

function validIsoDate(value: string): boolean {
  return value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

export function buildObservedPriceHistory(observations: PriceObservation[]): PriceHistoryModel {
  const points = observations
    .filter((item) =>
      validIsoDate(item.observedAt) &&
      Number.isFinite(item.displayedPriceMad) &&
      item.displayedPriceMad > 0 &&
      Number.isSafeInteger(item.sourceOfferId) &&
      item.sourceOfferId > 0 &&
      item.sourceName.trim().length > 0,
    )
    .map((item) => ({ ...item, sourceName: item.sourceName.trim() }))
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));

  const unique = new Map<string, PriceHistoryPoint>();
  for (const point of points) {
    const key = `${point.sourceOfferId}|${point.observedAt}|${point.displayedPriceMad}`;
    unique.set(key, point);
  }
  const deduped = [...unique.values()].sort((a, b) => a.observedAt.localeCompare(b.observedAt));

  if (deduped.length === 0) {
    return {
      status: "unavailable",
      points: [],
      observationCount: 0,
      firstObservedAt: null,
      lastObservedAt: null,
    };
  }

  return {
    status: "available",
    points: deduped,
    observationCount: deduped.length,
    firstObservedAt: deduped[0]?.observedAt ?? null,
    lastObservedAt: deduped.at(-1)?.observedAt ?? null,
  };
}

export function certifyAkarEstimate(candidate: AkarEstimateCandidate): CertifiedAkarEstimate | null {
  const policy = candidate.publicationPolicy;
  const validation = candidate.validation;
  const rangeValid =
    Number.isFinite(candidate.lowMad) &&
    Number.isFinite(candidate.valueMad) &&
    Number.isFinite(candidate.highMad) &&
    candidate.lowMad > 0 &&
    candidate.lowMad <= candidate.valueMad &&
    candidate.valueMad <= candidate.highMad;
  const confidenceValid = Number.isFinite(candidate.confidence) && candidate.confidence >= 0 && candidate.confidence <= 1;
  const metadataValid =
    candidate.modelVersion.trim().length > 0 &&
    candidate.segment.trim().length > 0 &&
    validIsoDate(candidate.modelDate) &&
    Number.isSafeInteger(candidate.trainingSampleSize) &&
    candidate.trainingSampleSize > 0;
  const policyValid =
    policy.policyVersion.trim().length > 0 &&
    Number.isSafeInteger(policy.minimumHoldoutSampleSize) &&
    policy.minimumHoldoutSampleSize > 0 &&
    Number.isFinite(policy.maximumMapePct) &&
    policy.maximumMapePct >= 0 &&
    Number.isFinite(policy.maximumMedianAbsoluteErrorPct) &&
    policy.maximumMedianAbsoluteErrorPct >= 0;
  const validationValid =
    Number.isSafeInteger(validation.holdoutSampleSize) &&
    validation.holdoutSampleSize >= policy.minimumHoldoutSampleSize &&
    Number.isFinite(validation.mapePct) &&
    validation.mapePct >= 0 &&
    validation.mapePct <= policy.maximumMapePct &&
    Number.isFinite(validation.medianAbsoluteErrorPct) &&
    validation.medianAbsoluteErrorPct >= 0 &&
    validation.medianAbsoluteErrorPct <= policy.maximumMedianAbsoluteErrorPct;

  if (!rangeValid || !confidenceValid || !metadataValid || !policyValid || !validationValid) return null;
  return { ...candidate, status: "certified" };
}
