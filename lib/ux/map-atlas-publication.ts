import type { MapAtlasAvailability } from "@/lib/ux/map-atlas";

export type MapAtlasPublicationMetadata = {
  canonicalPropertyCount: number;
  densityPublished: boolean;
  priceReferencePublished: boolean;
  priceSampleSizeCanonical: number;
  askingPriceOnly: boolean;
  methodologyVersion?: string;
  geometryCertified: boolean;
};

export const MIN_ATLAS_CANONICAL_SAMPLE = 8;

export function mapAtlasAvailabilityFromPublication(
  metadata: MapAtlasPublicationMetadata,
): MapAtlasAvailability {
  const densityAvailable =
    metadata.densityPublished &&
    metadata.geometryCertified &&
    metadata.canonicalPropertyCount >= MIN_ATLAS_CANONICAL_SAMPLE;

  const priceAvailable =
    metadata.priceReferencePublished &&
    metadata.geometryCertified &&
    metadata.askingPriceOnly &&
    metadata.priceSampleSizeCanonical >= MIN_ATLAS_CANONICAL_SAMPLE &&
    Boolean(metadata.methodologyVersion?.trim());

  return {
    listings: { available: true },
    density: densityAvailable
      ? { available: true }
      : {
          available: false,
          reason: !metadata.geometryCertified
            ? "Géométrie géographique non certifiée."
            : "Échantillon canonique ou publication densité insuffisant.",
        },
    price: priceAvailable
      ? { available: true }
      : {
          available: false,
          reason: !metadata.geometryCertified
            ? "Géométrie géographique non certifiée."
            : "Référence de prix demandés non publiée ou échantillon insuffisant.",
        },
  };
}
