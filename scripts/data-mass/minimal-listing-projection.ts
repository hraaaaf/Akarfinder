import {
  buildMinimalListing,
  isPolicyAdmissible,
  type MinimalListingRegistryRow,
} from "./minimal-listing-index-policy";

export type ExistingListingProjectionInput = {
  sourceKind: "listing_source";
  propertyListingId: number;
  sourceOfferId: number;
  listingUrl: string | null;
  title: string | null;
  propertyType: string | null;
  city: string | null;
  district: string | null;
  priceMad: number | null;
  surfaceM2: number | null;
  thumbnailUrl: string | null;
  descriptionSnippet: string | null;
};

export function normalizeSourceDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.trim().toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

function reliableStructuralSignal(input: ExistingListingProjectionInput): string | null {
  const title = input.title?.trim();
  if (title) return title;
  const propertyType = input.propertyType?.trim();
  return propertyType || null;
}

export function projectExistingListingRepresentation(
  input: ExistingListingProjectionInput,
  policy: MinimalListingRegistryRow,
  now = new Date(),
) {
  if (input.sourceKind !== "listing_source") throw new Error("LISTING_SOURCE_REQUIRED");
  if (!Number.isInteger(input.propertyListingId) || input.propertyListingId <= 0) {
    throw new Error("PROPERTY_LISTING_ID_REQUIRED");
  }
  if (!Number.isInteger(input.sourceOfferId) || input.sourceOfferId <= 0) {
    throw new Error("SOURCE_OFFER_ID_REQUIRED");
  }
  if (!isPolicyAdmissible(policy, now)) throw new Error("SOURCE_POLICY_NOT_ADMISSIBLE");

  const sourceDomain = normalizeSourceDomain(input.listingUrl);
  const titleOrStructuralSignal = reliableStructuralSignal(input);

  const minimal = buildMinimalListing(
    {
      canonicalUrl: input.listingUrl,
      sourceDomain,
      titleOrStructuralSignal,
      geography: input.district?.trim() || input.city?.trim() || null,
      price: input.priceMad,
      surface: input.surfaceM2,
      photoUrl: input.thumbnailUrl,
      description: input.descriptionSnippet,
    },
    policy,
    now,
  );

  return {
    propertyListingId: input.propertyListingId,
    sourceOfferId: input.sourceOfferId,
    ...minimal,
  };
}
