import type { Listing } from "@/lib/listings/types";

export type CanonicalPropertyId = string;

export type PropertySelectionState = {
  canonicalPropertyId: CanonicalPropertyId | null;
  representativeListingId: string | null;
  interaction: "idle" | "hover" | "selected";
  origin: "list" | "map" | "preview" | null;
};

export const EMPTY_PROPERTY_SELECTION: PropertySelectionState = {
  canonicalPropertyId: null,
  representativeListingId: null,
  interaction: "idle",
  origin: null,
};

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

/**
 * UX identity only. This does not create or mutate DATA canonicalization.
 * A certified duplicate group may represent one potential property. When no
 * certified group exists, the listing remains its own presentation identity.
 */
export function getCanonicalPropertyId(listing: Pick<Listing, "id" | "duplicate_group_id">): CanonicalPropertyId {
  const duplicateGroupId = listing.duplicate_group_id?.trim();
  return duplicateGroupId
    ? `property-group:${normalizeIdentifier(duplicateGroupId)}`
    : `listing:${normalizeIdentifier(listing.id)}`;
}

export function selectProperty(
  listing: Pick<Listing, "id" | "duplicate_group_id">,
  origin: Exclude<PropertySelectionState["origin"], null>,
): PropertySelectionState {
  return {
    canonicalPropertyId: getCanonicalPropertyId(listing),
    representativeListingId: listing.id,
    interaction: "selected",
    origin,
  };
}

export function hoverProperty(
  listing: Pick<Listing, "id" | "duplicate_group_id">,
  origin: "list" | "map",
): PropertySelectionState {
  return {
    canonicalPropertyId: getCanonicalPropertyId(listing),
    representativeListingId: listing.id,
    interaction: "hover",
    origin,
  };
}

export function clearPropertyHover(current: PropertySelectionState): PropertySelectionState {
  if (current.interaction === "selected") return current;
  return EMPTY_PROPERTY_SELECTION;
}

export function isListingInSelectedProperty(
  listing: Pick<Listing, "id" | "duplicate_group_id">,
  selection: PropertySelectionState,
): boolean {
  return selection.canonicalPropertyId != null && getCanonicalPropertyId(listing) === selection.canonicalPropertyId;
}

/** Presentation selection must never become a ranking signal. */
export function propertySelectionChangesRanking(): false {
  return false;
}
