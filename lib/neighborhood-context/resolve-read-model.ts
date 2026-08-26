import { resolveCityEntity, resolveNeighborhoodEntity } from "@/lib/geo/geo-entity-registry";
import {
  getNeighborhoodContextReadModelBySlugs,
  type NeighborhoodContextReadModelV1,
} from "@/lib/neighborhood-context/read-model";

export function getNeighborhoodContextReadModelByNames(
  city: string,
  neighborhood: string,
  now = new Date(),
): NeighborhoodContextReadModelV1 | null {
  const cityEntity = resolveCityEntity(city);
  if (!cityEntity) return null;
  const neighborhoodEntity = resolveNeighborhoodEntity(cityEntity.canonical_name, neighborhood);
  if (!neighborhoodEntity) return null;
  return getNeighborhoodContextReadModelBySlugs(cityEntity.slug, neighborhoodEntity.slug, now);
}
