import type { Listing } from "@/lib/listings/types";

import { isPricePositionReferenceEnabled } from "./price-position-feature";

export type PricePositionPolicyEnv = Pick<
  NodeJS.ProcessEnv,
  | "PRICE_POSITION_REFERENCE_ENABLED"
  | "NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED"
  | "PRICE_POSITION_DISABLED_SOURCES"
  | "PRICE_POSITION_DISABLED_CITIES"
  | "PRICE_POSITION_DISABLED_DISTRICTS"
  | "PRICE_POSITION_DISABLED_PROPERTY_TYPES"
>;

function parseCsvSet(value: string | undefined | null): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

function normalize(value: string | undefined | null): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "'")
    .trim();
}

export function getPricePositionDisabledSources(env: PricePositionPolicyEnv = process.env as unknown as PricePositionPolicyEnv): Set<string> {
  return parseCsvSet(env.PRICE_POSITION_DISABLED_SOURCES);
}

export function getPricePositionDisabledCities(env: PricePositionPolicyEnv = process.env as unknown as PricePositionPolicyEnv): Set<string> {
  return parseCsvSet(env.PRICE_POSITION_DISABLED_CITIES);
}

export function getPricePositionDisabledDistricts(env: PricePositionPolicyEnv = process.env as unknown as PricePositionPolicyEnv): Set<string> {
  return parseCsvSet(env.PRICE_POSITION_DISABLED_DISTRICTS);
}

export function getPricePositionDisabledPropertyTypes(env: PricePositionPolicyEnv = process.env as unknown as PricePositionPolicyEnv): Set<string> {
  return parseCsvSet(env.PRICE_POSITION_DISABLED_PROPERTY_TYPES);
}

export function isPricePositionDisabledForListing(listing: Listing, env: PricePositionPolicyEnv = process.env as unknown as PricePositionPolicyEnv): boolean {
  const disabledSources = getPricePositionDisabledSources(env);
  const disabledCities = getPricePositionDisabledCities(env);
  const disabledDistricts = getPricePositionDisabledDistricts(env);
  const disabledPropertyTypes = getPricePositionDisabledPropertyTypes(env);

  const sourceName = normalize(listing.source_name);
  const city = normalize(listing.city);
  const district = normalize(listing.neighborhood);
  const propertyType = normalize(listing.property_type);

  if (disabledSources.has(sourceName)) return true;
  if (disabledCities.has(city)) return true;
  if (district && disabledDistricts.has(district)) return true;
  if (disabledPropertyTypes.has(propertyType)) return true;

  return false;
}

export function canShowPricePositionForListing(listing: Listing, env: PricePositionPolicyEnv = process.env as unknown as PricePositionPolicyEnv): boolean {
  if (!isPricePositionReferenceEnabled(env as unknown as NodeJS.ProcessEnv)) return false;
  if (isPricePositionDisabledForListing(listing, env)) return false;
  return true;
}
