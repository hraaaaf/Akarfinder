import type { Listing, NearbyPlace } from "@/lib/listings/types";

// Listing enrichment must never fabricate historical observations or comparable
// properties. Missing data remains missing until a real source/canonical service
// provides it.

export type ListingEnrichment = {
  marketMinPerM2: number | null;
  marketMaxPerM2: number | null;
  marketPosition: "coherent" | "high" | "low" | "unknown";
  initialPrice: number | null;
  currentPrice: number | null;
  priceChangePercent: number | null;
  listedAtLabel: string;
  updatedAtLabel: string;
  neighborhoodSummary: string;
  nearbyPlaces: NearbyPlace[];
  remoteBuyingNotes: string;
};

const citySaleReferencePerM2: Record<string, number> = {
  Casablanca: 14000,
  Rabat: 15000,
  Tanger: 11000,
  Marrakech: 9500,
  Agadir: 9000,
  Fes: 8000,
  Kenitra: 8000,
  Mohammedia: 11000,
};

const coastalCities = new Set(["Casablanca", "Tanger", "Agadir", "Mohammedia"]);
const residentialBuyTypes = new Set(["Appartement", "Villa", "Studio", "Maison"]);

function round(n: number, step = 100) {
  return Math.round(n / step) * step;
}

function deriveMarket(listing: Listing) {
  const isResidentialBuy =
    listing.transaction_type === "buy" && residentialBuyTypes.has(listing.property_type);

  const ref = citySaleReferencePerM2[listing.city];

  if (isResidentialBuy && ref) {
    const marketMinPerM2 = round(ref * 0.88);
    const marketMaxPerM2 = round(ref * 1.12);
    let marketPosition: ListingEnrichment["marketPosition"] = "coherent";
    if (listing.price_per_m2 == null) marketPosition = "unknown";
    else if (listing.price_per_m2 > ref * 1.1) marketPosition = "high";
    else if (listing.price_per_m2 < ref * 0.9) marketPosition = "low";
    return { marketMinPerM2, marketMaxPerM2, marketPosition };
  }

  if (listing.price_per_m2 == null) {
    return {
      marketMinPerM2: null,
      marketMaxPerM2: null,
      marketPosition: "unknown" as const,
    };
  }

  return {
    marketMinPerM2: round(listing.price_per_m2 * 0.88),
    marketMaxPerM2: round(listing.price_per_m2 * 1.12),
    marketPosition: "coherent" as const,
  };
}

function deriveHistory(listing: Listing) {
  return {
    // Historical price fields are authoritative only when explicitly carried by
    // the listing/source. We never infer a fake former price from the current one.
    initialPrice: listing.initial_price ?? null,
    currentPrice: listing.current_price ?? listing.price ?? null,
    priceChangePercent: listing.price_change_percent ?? null,
    listedAtLabel: listing.listed_at_label ?? "Date de publication indisponible",
    updatedAtLabel:
      listing.updated_at_label ?? listing.freshness_label ?? "Dernière mise à jour indisponible",
  };
}

// NEIGHBORHOOD-PROXIMITY-AUDIT-1: these profiles are indicative heuristics only.
// No GPS, no OSM, no external API. Minutes are NOT measured distances.
// Display must use qualitative labels, never raw minutes.
const proximityProfiles: Record<string, number[]> = {
  "Finance City": [4, 8, 6, 5, 11, 16],
  "Maârif": [3, 6, 2, 4, 7, 13],
  "Hay Riad": [7, 5, 4, 6, 9, 14],
  Agdal: [5, 7, 3, 5, 8, 6],
  Malabata: [6, 9, 7, 4, 12, 10],
  "Route de l'Ourika": [12, 14, 10, 8, 18, 20],
  Founty: [8, 6, 5, 7, 10, 9],
  "Ville Nouvelle": [4, 5, 3, 3, 8, 11],
  "Maâmora": [9, 8, 7, 6, 13, 12],
  Parc: [5, 6, 4, 5, 9, 13],
  Bouskoura: [10, 12, 9, 7, 15, 17],
};

const defaultProfile = [6, 7, 5, 5, 10, 13];

function toQualitativeLabel(minutes: number): string {
  if (minutes <= 5) return "à proximité";
  if (minutes <= 10) return "dans le secteur";
  if (minutes <= 15) return "accessible";
  return "à vérifier";
}

function deriveNearbyPlaces(listing: Listing): NearbyPlace[] {
  const t = proximityProfiles[listing.neighborhood] ?? defaultProfile;

  const places: NearbyPlace[] = [
    { label: "Transport en commun", time: toQualitativeLabel(t[0]), icon: "transport" },
    { label: "École / établissement", time: toQualitativeLabel(t[1]), icon: "school" },
    { label: "Supermarché", time: toQualitativeLabel(t[2]), icon: "shop" },
    { label: "Mosquée", time: toQualitativeLabel(t[3]), icon: "mosque" },
    { label: "Clinique / pharmacie", time: toQualitativeLabel(t[4]), icon: "health" },
  ];

  if (coastalCities.has(listing.city)) {
    places.push({ label: "Plage / corniche", time: toQualitativeLabel(t[5]), icon: "coast" });
  } else {
    places.push({ label: "Gare", time: toQualitativeLabel(t[5]), icon: "station" });
  }

  return places;
}

function deriveNeighborhoodSummary(listing: Listing) {
  return (
    `${listing.neighborhood} (${listing.city}) est un secteur recherché pour ` +
    `${listing.property_type.toLowerCase()}s, avec commerces, transport et services à proximité. ` +
    `Repères de quartier indicatifs, à confirmer lors de la visite.`
  );
}

function deriveRemoteBuyingNotes(listing: Listing) {
  if (listing.is_mre_friendly) {
    return (
      "Lecture adaptée à un achat à distance : contact WhatsApp disponible, " +
      "source analysée, quartier identifiable et prix/m² visible."
    );
  }
  return "Quelques éléments restent à confirmer avant un achat à distance (contact, disponibilité, documents).";
}

// REAL-DATA-INTEGRITY-CLEANUP-1: Similar listings are intentionally hidden until
// a canonical DB-backed similarity service provides real candidates. The former
// heuristic accepted mockListings and could surface synthetic cards on public pages.
export function getSimilarListings(_listing: Listing, _all: Listing[], _limit = 3): Listing[] {
  return [];
}

export function getListingEnrichment(listing: Listing): ListingEnrichment {
  const market = deriveMarket(listing);
  const history = deriveHistory(listing);

  return {
    marketMinPerM2: listing.market_min_price_per_m2 ?? market.marketMinPerM2,
    marketMaxPerM2: listing.market_max_price_per_m2 ?? market.marketMaxPerM2,
    marketPosition: listing.market_position ?? market.marketPosition,

    initialPrice: history.initialPrice,
    currentPrice: history.currentPrice,
    priceChangePercent: history.priceChangePercent,
    listedAtLabel: history.listedAtLabel,
    updatedAtLabel: history.updatedAtLabel,

    neighborhoodSummary: listing.neighborhood_summary ?? deriveNeighborhoodSummary(listing),
    nearbyPlaces: listing.nearby_places ?? deriveNearbyPlaces(listing),

    remoteBuyingNotes: listing.remote_buying_notes ?? deriveRemoteBuyingNotes(listing),
  };
}
