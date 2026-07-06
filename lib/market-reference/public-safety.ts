import type {
  DistrictReference,
  PublicLifestyleSummary,
  ReferencePricePoint,
} from "@/lib/market-reference/types";

const FORBIDDEN_PRICE_KEYS = new Set([
  "value_low",
  "value_median",
  "value_high",
  "evidence_ref",
  "confidence",
]);

export function canExposePricePointToPublic(
  pricePoint: ReferencePricePoint,
): boolean {
  return pricePoint.public_safe && !pricePoint.internal_only;
}

export function assertNoUnsafePublicPriceExposure(payload: unknown): void {
  const visited = new Set<unknown>();

  function walk(value: unknown, path: string): void {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    if (visited.has(value)) {
      return;
    }
    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
      return;
    }

    const objectValue = value as Record<string, unknown>;

    for (const [key, nestedValue] of Object.entries(objectValue)) {
      if (FORBIDDEN_PRICE_KEYS.has(key)) {
        throw new Error(`Unsafe public price exposure detected at ${path}.${key}`);
      }
      walk(nestedValue, `${path}.${key}`);
    }
  }

  walk(payload, "payload");
}

export function filterPublicSafeReference(
  districtReference: DistrictReference,
): null {
  if (districtReference.internal_only) {
    return null;
  }

  return null;
}

export function getPublicLifestyleSummary(
  districtReference: DistrictReference,
): PublicLifestyleSummary {
  const lifestyleIndicators = Object.fromEntries(
    Object.entries(districtReference.lifestyle_indicators)
      .filter(([, indicator]) => indicator.public_safe)
      .map(([key, indicator]) => [key, indicator.label]),
  );

  const summary: PublicLifestyleSummary = {
    city: districtReference.city,
    district: districtReference.district,
    disclaimer: districtReference.public_disclaimer,
    lifestyle_indicators: lifestyleIndicators,
  };

  assertNoUnsafePublicPriceExposure(summary);

  return summary;
}
