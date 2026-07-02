// REAL-VISUALS-AND-LISTING-BOUNDARY-1
// Draws the line between listings AkarFinder can present as a full internal
// fiche (partner/authorized/unknown-default sources) and third-party indexed
// listings (Mubawab, Agenz, LogicImmo — "limited_preview") or audit-only
// signals (Avito — "market_signal_only"), which must never look or behave
// like a proprietary AkarFinder listing.

import type { Listing } from "./types";

// display_depth is computed by deriveSourceDisplayPolicy() in map-db-listing.ts.
// Absent/undefined => partner, own inventory, or an unlisted/unknown source =>
// full internal detail preserved (no behavior change for anything not
// explicitly flagged as third-party indexed).
export function canHaveInternalDetail(listing: Listing): boolean {
  return (
    listing.display_depth !== "limited_preview" &&
    listing.display_depth !== "market_signal_only"
  );
}

export function isPartnerAuthorized(listing: Listing): boolean {
  return canHaveInternalDetail(listing);
}

// Contact/engagement actions (WhatsApp, visit request, "demander plus
// d'informations") imply AkarFinder can broker the transaction. Never true
// for third-party indexed content — mirrors can_show_contact from
// computeSearchResultDisplayPolicy(), defaulting to true only when the field
// was never computed (e.g. mock listings not backed by a DB row).
export function canShowContactActions(listing: Listing): boolean {
  return listing.can_show_contact !== false;
}
