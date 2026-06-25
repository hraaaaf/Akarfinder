import type { Listing, NearbyPlace } from "@/lib/listings/types";

// Level 2E — derives Zillow-style enrichment for a listing.
// All values are MOCK and INDICATIVE. If a listing already carries an explicit
// field, it wins; otherwise we derive a graceful, deterministic value so every
// listing renders a complete decision dossier.

export type ListingEnrichment = {
  // Market reference
  marketMinPerM2: number;
  marketMaxPerM2: number;
  marketPosition: "coherent" | "high" | "low";
  // History
  initialPrice: number;
  currentPrice: number;
  priceChangePercent: number;
  listedAtLabel: string;
  updatedAtLabel: string;
  // Neighborhood
  neighborhoodSummary: string;
  nearbyPlaces: NearbyPlace[];
  // Remote buying
  remoteBuyingNotes: string;
};

// Indicative per-city sale reference (MAD/m²) for residential buy listings only.
const citySaleReferencePerM2: Record<string, number> = {
  Casablanca: 14000,
  Rabat: 15000,
  Tanger: 11000,
  Marrakech: 9500,
  Agadir: 9000,
  Fes: 8000,
  Kenitra: 8000,
  Mohammedia: 11000
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

  // For residential buy listings in a known city, compare against the city reference.
  if (isResidentialBuy && ref) {
    const marketMinPerM2 = round(ref * 0.88);
    const marketMaxPerM2 = round(ref * 1.12);
    let marketPosition: ListingEnrichment["marketPosition"] = "coherent";
    if (listing.price_per_m2 > ref * 1.1) marketPosition = "high";
    else if (listing.price_per_m2 < ref * 0.9) marketPosition = "low";
    return { marketMinPerM2, marketMaxPerM2, marketPosition };
  }

  // For rent / offices / land, comparison across the city is misleading.
  // Fall back to a band around the listing's own price/m², position coherent.
  return {
    marketMinPerM2: round(listing.price_per_m2 * 0.88),
    marketMaxPerM2: round(listing.price_per_m2 * 1.12),
    marketPosition: "coherent" as const
  };
}

function deriveHistory(listing: Listing) {
  const updatedAtLabel = listing.updated_at_label ?? listing.freshness_label;

  // New / promoter programs are presented as price-stable.
  if (listing.transaction_type === "new" || listing.source_type === "Promoteur") {
    return {
      initialPrice: listing.price,
      currentPrice: listing.price,
      priceChangePercent: 0,
      listedAtLabel: listing.listed_at_label ?? "Programme suivi",
      updatedAtLabel
    };
  }

  // Lower-reliability listings are presented as having dropped more (often stale/overpriced).
  const dropFactor = listing.reliability_score < 55 ? 1.06 : 1.038;
  const initialPrice = round(listing.price * dropFactor, 1000);
  const currentPrice = listing.price;
  const priceChangePercent =
    Math.round(((currentPrice - initialPrice) / initialPrice) * 1000) / 10;

  return {
    initialPrice,
    currentPrice,
    priceChangePercent,
    listedAtLabel: listing.listed_at_label ?? "Publiée il y a quelques semaines",
    updatedAtLabel
  };
}

// Per-neighborhood indicative minute spreads, varied so the block does not
// read as a uniform template. [transport, school, shop, mosque, health, far]
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
  Bouskoura: [10, 12, 9, 7, 15, 17]
};

const defaultProfile = [6, 7, 5, 5, 10, 13];

function deriveNearbyPlaces(listing: Listing): NearbyPlace[] {
  const t = proximityProfiles[listing.neighborhood] ?? defaultProfile;

  const places: NearbyPlace[] = [
    { label: "Transport en commun", time: `${t[0]} min`, icon: "transport" },
    { label: "École / établissement", time: `${t[1]} min`, icon: "school" },
    { label: "Supermarché", time: `${t[2]} min`, icon: "shop" },
    { label: "Mosquée", time: `${t[3]} min`, icon: "mosque" },
    { label: "Clinique / pharmacie", time: `${t[4]} min`, icon: "health" }
  ];

  if (coastalCities.has(listing.city)) {
    places.push({ label: "Plage / corniche", time: `${t[5]} min`, icon: "coast" });
  } else {
    places.push({ label: "Gare", time: `${t[5]} min`, icon: "station" });
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

// Picks up to 3 similar listings: same city first, then same property type,
// then closest budget. Never includes the current listing.
export function getSimilarListings(listing: Listing, all: Listing[], limit = 3): Listing[] {
  if (listing.similar_listing_ids?.length) {
    const byId = listing.similar_listing_ids
      .map((id) => all.find((l) => l.id === id))
      .filter((l): l is Listing => Boolean(l) && l!.id !== listing.id);
    if (byId.length >= limit) return byId.slice(0, limit);
  }

  const others = all.filter((l) => l.id !== listing.id);

  const scored = others
    .map((l) => {
      let score = 0;
      if (l.city === listing.city) score += 100;
      if (l.neighborhood === listing.neighborhood) score += 60;
      if (l.property_type === listing.property_type) score += 40;
      if (l.transaction_type === listing.transaction_type) score += 20;
      // closer budget => higher score (up to 30)
      const budgetGap = Math.abs(l.price - listing.price) / Math.max(listing.price, 1);
      score += Math.max(0, 30 - budgetGap * 30);
      return { l, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry) => entry.l);
}

export function getListingEnrichment(listing: Listing): ListingEnrichment {
  const market = deriveMarket(listing);
  const history = deriveHistory(listing);

  return {
    marketMinPerM2: listing.market_min_price_per_m2 ?? market.marketMinPerM2,
    marketMaxPerM2: listing.market_max_price_per_m2 ?? market.marketMaxPerM2,
    marketPosition: listing.market_position ?? market.marketPosition,

    initialPrice: listing.initial_price ?? history.initialPrice,
    currentPrice: listing.current_price ?? history.currentPrice,
    priceChangePercent: listing.price_change_percent ?? history.priceChangePercent,
    listedAtLabel: history.listedAtLabel,
    updatedAtLabel: history.updatedAtLabel,

    neighborhoodSummary: listing.neighborhood_summary ?? deriveNeighborhoodSummary(listing),
    nearbyPlaces: listing.nearby_places ?? deriveNearbyPlaces(listing),

    remoteBuyingNotes: listing.remote_buying_notes ?? deriveRemoteBuyingNotes(listing)
  };
}
