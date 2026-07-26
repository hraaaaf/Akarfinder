export type MapAtlasLayer = "listings" | "density" | "price";

export type MapAtlasLayerAvailability = {
  available: boolean;
  reason?: string;
};

export type MapAtlasAvailability = Record<MapAtlasLayer, MapAtlasLayerAvailability>;

export type MapAtlasLayerDefinition = {
  id: MapAtlasLayer;
  label: "Annonces" | "Densité" | "Prix";
  description: string;
};

export const MAP_ATLAS_LAYERS: readonly MapAtlasLayerDefinition[] = [
  {
    id: "listings",
    label: "Annonces",
    description: "Répartition des fiches indexées dans la recherche active.",
  },
  {
    id: "density",
    label: "Densité",
    description: "Concentration canonique des biens, après dédoublonnage.",
  },
  {
    id: "price",
    label: "Prix",
    description: "Références de prix demandés publiées avec méthode et échantillon.",
  },
] as const;

export const DEFAULT_MAP_ATLAS_AVAILABILITY: MapAtlasAvailability = {
  listings: { available: true },
  density: {
    available: false,
    reason: "Disponible après publication d’un échantillon canonique suffisant.",
  },
  price: {
    available: false,
    reason: "Disponible après certification des références de prix demandés.",
  },
};

export function canSelectMapAtlasLayer(
  layer: MapAtlasLayer,
  availability: MapAtlasAvailability,
): boolean {
  return availability[layer].available;
}

export function resolveMapAtlasLayer(
  requested: MapAtlasLayer,
  availability: MapAtlasAvailability,
): MapAtlasLayer {
  return canSelectMapAtlasLayer(requested, availability) ? requested : "listings";
}

export function mapAtlasLayerChangesRanking(): false {
  return false;
}
