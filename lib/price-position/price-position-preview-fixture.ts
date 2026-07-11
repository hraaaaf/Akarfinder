import type { Listing } from "@/lib/listings/types";

export type PricePositionPreviewFixture = {
  title: string;
  description: string;
  expected_public_label: "Position relative proche" | "Position relative inférieure" | "Position relative supérieure";
  listing: Listing;
};

export const PRICE_POSITION_PREVIEW_FIXTURE: PricePositionPreviewFixture = {
  title: "Appartement témoin fictif — Casablanca Maarif",
  description:
    "Démonstration technique Preview — données fictives, utilisée pour vérifier le vrai bloc Price Position avec la même fixture en ON/OFF.",
  expected_public_label: "Position relative proche",
  listing: {
    id: "preview-price-position-fixture-casablanca-maarif",
    title: "Appartement témoin fictif 90 m² à Maarif",
    city: "Casablanca",
    neighborhood: "Maarif",
    price: 1_255_590,
    currency: "DH",
    surface_m2: 90,
    price_per_m2: 13_951,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 2,
    freshness_label: "Démonstration technique",
    source_type: "Source analysée",
    reliability_label: "Informations complètes",
    reliability_score: 88,
    is_mre_friendly: false,
    description:
      "Bien fictif créé uniquement pour la validation Preview du module Price Position. Aucune donnée de production n'est utilisée.",
    image_url: "https://example.invalid/price-position-preview-fixture.jpg",
    reliability_explanation: "Fixture technique locale pour la preuve ON/OFF du module Price Position.",
    source_name: undefined,
    listing_url: "https://example.invalid/price-position-preview-fixture",
  },
} as const;
