import {
  MOROCCO_REFERENCE_DATASET,
  MOROCCO_REFERENCE_FORBIDDEN_PUBLIC_CLAIMS,
} from "@/lib/market-reference/morocco-reference-data";
import type {
  DistrictReference,
  MoroccoReferenceDataset,
  ReferenceConfidence,
  ReferencePricePoint,
  ReferenceSourceType,
} from "@/lib/market-reference/types";

const KEBAB_CASE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CONFIDENCE_ORDER: Record<ReferenceConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const SOURCE_URL_CONFIDENCE_CAP: Partial<
  Record<ReferenceSourceType, ReferenceConfidence>
> = {
  portal_listing_prices: "low",
  manual_review: "medium",
};

export interface DatasetValidationResult {
  ok: boolean;
  errors: string[];
}

export function isNormalizedReferenceId(id: string): boolean {
  return KEBAB_CASE_ID_PATTERN.test(id);
}

export function isConfidenceAllowedForPricePoint(
  pricePoint: ReferencePricePoint,
): boolean {
  if (pricePoint.source_url !== null) {
    return true;
  }

  const cap = SOURCE_URL_CONFIDENCE_CAP[pricePoint.source_type];
  if (!cap) {
    return true;
  }

  return CONFIDENCE_ORDER[pricePoint.confidence] <= CONFIDENCE_ORDER[cap];
}

function validatePricePoint(
  pricePoint: ReferencePricePoint,
  districtId: string,
): string[] {
  const errors: string[] = [];

  if (pricePoint.public_safe) {
    errors.push(`${districtId}: price point must keep public_safe=false`);
  }

  if (!pricePoint.internal_only) {
    errors.push(`${districtId}: price point must keep internal_only=true`);
  }

  if (pricePoint.source_url === null && !pricePoint.evidence_ref) {
    errors.push(`${districtId}: source_url=null requires evidence_ref`);
  }

  if (!isConfidenceAllowedForPricePoint(pricePoint)) {
    errors.push(
      `${districtId}: confidence exceeds cap for ${pricePoint.source_type} without source_url`,
    );
  }

  if (
    !Number.isFinite(pricePoint.value_low) ||
    !Number.isFinite(pricePoint.value_median) ||
    !Number.isFinite(pricePoint.value_high)
  ) {
    errors.push(`${districtId}: price values must be finite numbers`);
  }

  if (
    pricePoint.value_low > pricePoint.value_median ||
    pricePoint.value_median > pricePoint.value_high
  ) {
    errors.push(`${districtId}: price values must be ordered low<=median<=high`);
  }

  return errors;
}

function validateDistrictReference(district: DistrictReference): string[] {
  const errors: string[] = [];

  if (!district.internal_only) {
    errors.push(`${district.id}: district_reference must stay internal_only=true`);
  }

  if (!district.public_disclaimer.trim()) {
    errors.push(`${district.id}: public_disclaimer is required`);
  }

  for (const pricePoint of district.prices) {
    errors.push(...validatePricePoint(pricePoint, district.id));
  }

  for (const [indicatorKey, indicator] of Object.entries(
    district.lifestyle_indicators,
  )) {
    if (!indicator.label.trim()) {
      errors.push(`${district.id}:${indicatorKey}: lifestyle label is required`);
    }
  }

  return errors;
}

export function validateMoroccoReferenceDataset(
  dataset: MoroccoReferenceDataset = MOROCCO_REFERENCE_DATASET,
): DatasetValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const city of dataset.cities) {
    if (ids.has(city.id)) {
      errors.push(`duplicate id: ${city.id}`);
    }
    ids.add(city.id);

    if (!isNormalizedReferenceId(city.id)) {
      errors.push(`city id not normalized: ${city.id}`);
    }

    if (!city.internal_only) {
      errors.push(`city must stay internal_only=true: ${city.id}`);
    }

    if (city.buy_apartment_mad_m2_range.public_safe) {
      errors.push(`city buy range must keep public_safe=false: ${city.id}`);
    }

    if (city.rent_apartment_mad_m2_month_range.public_safe) {
      errors.push(`city rent range must keep public_safe=false: ${city.id}`);
    }
  }

  for (const district of dataset.district_reference) {
    if (ids.has(district.id)) {
      errors.push(`duplicate id: ${district.id}`);
    }
    ids.add(district.id);

    if (!isNormalizedReferenceId(district.id)) {
      errors.push(`district id not normalized: ${district.id}`);
    }

    errors.push(...validateDistrictReference(district));
  }

  const forbiddenTerms = new Set(
    dataset.forbidden_public_claims.map((entry) => entry.term),
  );

  for (const requiredTerm of MOROCCO_REFERENCE_FORBIDDEN_PUBLIC_CLAIMS) {
    if (!forbiddenTerms.has(requiredTerm.term)) {
      errors.push(`missing forbidden public claim: ${requiredTerm.term}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function assertValidMoroccoReferenceDataset(
  dataset: MoroccoReferenceDataset = MOROCCO_REFERENCE_DATASET,
): void {
  const result = validateMoroccoReferenceDataset(dataset);
  if (!result.ok) {
    throw new Error(
      `Invalid Morocco reference dataset:\n${result.errors.join("\n")}`,
    );
  }
}

assertValidMoroccoReferenceDataset();
