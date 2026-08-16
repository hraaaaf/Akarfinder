export type ListingInventoryProvenance = "market" | "AkarFinder-owned" | "partner";

export type TrustedPartnerAuthority = {
  validation_status: string | null | undefined;
  activation_status: string | null | undefined;
  source_authorization_status: string | null | undefined;
};

export type ProvenanceInventoryItem = {
  property_listing_id: number;
  market_zone_id: string | null;
  provenance: ListingInventoryProvenance;
};

export type ZoneInventoryComparison = {
  market_zone_id: string;
  market_listing_count: number;
  akarfinder_owned_count: number;
  partner_count: number;
};

/**
 * Ownership is the authority for "AkarFinder-owned". Partner provenance is a
 * stricter refinement and requires the existing professional publication gates.
 * Unknown/unverified ownership stays fail-closed instead of being inferred.
 */
export function classifyVerifiedInventoryProvenance(input: {
  ownership_verified: boolean;
  partner_authority?: TrustedPartnerAuthority | null;
}): Exclude<ListingInventoryProvenance, "market"> | null {
  if (!input.ownership_verified) return null;

  const authority = input.partner_authority;
  const isAuthorizedPartner =
    authority?.validation_status === "validated" &&
    authority.activation_status === "active" &&
    authority.source_authorization_status === "confirmed";

  return isAuthorizedPartner ? "partner" : "AkarFinder-owned";
}

export function filterInventoryByProvenance<T extends ProvenanceInventoryItem>(
  items: readonly T[],
  provenance: ListingInventoryProvenance,
): T[] {
  return items.filter((item) => item.provenance === provenance);
}

export function aggregateInventoryByZoneAndProvenance(
  items: readonly ProvenanceInventoryItem[],
): ReadonlyMap<string, Readonly<Record<ListingInventoryProvenance, number>>> {
  const mutable = new Map<string, Record<ListingInventoryProvenance, number>>();

  for (const item of items) {
    if (!item.market_zone_id) continue;
    const counts = mutable.get(item.market_zone_id) ?? {
      market: 0,
      "AkarFinder-owned": 0,
      partner: 0,
    };
    counts[item.provenance] += 1;
    mutable.set(item.market_zone_id, counts);
  }

  return mutable;
}

/**
 * Market metrics remain an immutable, separately supplied C2/C3 input.
 * Changing inventory provenance can only change the own/partner columns.
 */
export function compareZoneMarketToOwnedInventory(input: {
  market_zone_id: string;
  market_listing_count: number;
  inventory: readonly ProvenanceInventoryItem[];
}): ZoneInventoryComparison {
  const scoped = input.inventory.filter((item) => item.market_zone_id === input.market_zone_id);
  return {
    market_zone_id: input.market_zone_id,
    market_listing_count: input.market_listing_count,
    akarfinder_owned_count: scoped.filter((item) => item.provenance === "AkarFinder-owned").length,
    partner_count: scoped.filter((item) => item.provenance === "partner").length,
  };
}
