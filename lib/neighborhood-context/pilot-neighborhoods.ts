import { resolveNeighborhoodEntity } from "@/lib/geo/geo-entity-registry";
import { getNeighborhoodBySlug } from "@/lib/map/canonical-neighborhood-data";
import type { LivingHereCategory } from "@/lib/geo/living-here";

export const NEIGHBORHOOD_CONTEXT_L1_QUERY_RADIUS_M = 1_800;

export const NEIGHBORHOOD_CONTEXT_L1_CATEGORIES: LivingHereCategory[] = [
  "education",
  "groceries",
  "health",
  "transport",
  "green_sport",
  "shopping",
];

const PILOT_SEEDS = [
  { city: "Rabat", neighborhood: "Agdal" },
  { city: "Casablanca", neighborhood: "Maârif" },
  { city: "Marrakech", neighborhood: "Guéliz" },
  { city: "Tanger", neighborhood: "Malabata" },
  { city: "Agadir", neighborhood: "Founty" },
  { city: "Fès", neighborhood: "Ville Nouvelle" },
] as const;

export type NeighborhoodContextPilotDefinition = {
  canonical_neighborhood_id: string;
  city: string;
  neighborhood: string;
  city_slug: string;
  neighborhood_slug: string;
  query_origin: { latitude: number; longitude: number };
  query_radius_m: number;
};

export function getNeighborhoodContextL1Pilots(): NeighborhoodContextPilotDefinition[] {
  return PILOT_SEEDS.map((seed) => {
    const entity = resolveNeighborhoodEntity(seed.city, seed.neighborhood);
    const point = getNeighborhoodBySlug(seed.city, seed.neighborhood);
    if (!entity) throw new Error(`Missing canonical neighborhood entity: ${seed.city}/${seed.neighborhood}`);
    if (!point) throw new Error(`Missing canonical neighborhood map point: ${seed.city}/${seed.neighborhood}`);

    return {
      canonical_neighborhood_id: entity.id,
      city: entity.city_slug === "fes" ? "Fès" : point.city,
      neighborhood: entity.canonical_name,
      city_slug: entity.city_slug,
      neighborhood_slug: entity.slug,
      query_origin: { latitude: point.lat, longitude: point.lng },
      query_radius_m: NEIGHBORHOOD_CONTEXT_L1_QUERY_RADIUS_M,
    };
  });
}
