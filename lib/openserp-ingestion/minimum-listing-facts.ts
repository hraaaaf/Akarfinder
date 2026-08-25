export type MinimumListingFactsInput = {
  classification_reasons: readonly string[];
  extracted: {
    city: string | null;
    district: string | null;
    price_mad: number | null;
  };
};

// Keep this aligned with national-writer.ts's persisted-price safety ceiling.
// A minimum-facts override must only rely on a price that will remain trusted
// after the writer's existing sanitization step.
export const MINIMUM_LISTING_PRICE_CEILING_MAD = 30_000_000;

export function hasMinimumListingFacts(classified: MinimumListingFactsInput): boolean {
  const city = classified.extracted.city?.trim() ?? "";
  const district = classified.extracted.district?.trim() ?? "";
  const price = classified.extracted.price_mad;

  // `extractAttributes()` may fall back to query geography. For this override
  // we require evidence that the district itself was present in the indexed
  // result (title/snippet/URL), otherwise a query filter could masquerade as a
  // listing fact. `explicit_district` carries both district and its city.
  const hasExplicitDistrict = classified.classification_reasons.includes("explicit_district");
  const hasExplicitPrice = classified.classification_reasons.includes("price_signal");
  const hasTrustedPrice =
    price !== null &&
    Number.isFinite(price) &&
    price > 0 &&
    price <= MINIMUM_LISTING_PRICE_CEILING_MAD;

  return Boolean(city && district && hasExplicitDistrict && hasExplicitPrice && hasTrustedPrice);
}
