import type { Listing } from "@/lib/listings/types";
import { buildGeoTruth } from "@/lib/geo/geo-truth";
import { LIVING_HERE_CATEGORY_LABELS, LIVING_HERE_VERSION, type LivingHereModel } from "@/lib/geo/living-here";
import { buildLivingHereForListing } from "@/lib/geo/living-here-service";
import type { LivingHereContextModel } from "@/lib/geo/living-here-context";
import { getNeighborhoodContextReadModelByNames } from "@/lib/neighborhood-context/resolve-read-model";

export function buildLivingHereNeighborhoodContextForListing(
  listing: Listing,
  now = new Date(),
): LivingHereContextModel {
  const geo = buildGeoTruth(listing);
  const context = geo.city && geo.neighborhood
    ? getNeighborhoodContextReadModelByNames(geo.city, geo.neighborhood, now)
    : null;
  const anchors = context?.anchors ?? [];
  const pois = anchors.map((anchor) => ({
    id: anchor.poi_id,
    name: anchor.name,
    category: anchor.category,
    categoryLabel: LIVING_HERE_CATEGORY_LABELS[anchor.category],
    coordinate: { latitude: anchor.latitude, longitude: anchor.longitude },
    confidence: "provider_verified" as const,
    providerId: anchor.source_id,
    attribution: anchor.attribution,
    observedAt: anchor.observed_at,
    routes: [],
    territorialWording: anchor.territorial_wording,
    neighborhoodRelation: anchor.relation,
  }));

  return {
    version: LIVING_HERE_VERSION,
    listingId: listing.id,
    visibility: "context",
    reason: pois.length > 0 ? "neighborhood_context_only" : "no_verified_pois",
    origin: {
      coordinate: geo.coordinate,
      displayMode: "neighborhood_context",
      exact: false,
    },
    canShowPreciseRouteTimes: false,
    pois,
    isochrones: [],
    attribution: Array.from(new Set(pois.map((poi) => poi.attribution).filter(Boolean))),
    neighborhoodContext: {
      canonicalNeighborhoodId: context?.canonical_neighborhood_id ?? null,
      city: geo.city,
      neighborhood: geo.neighborhood,
      coverageStatus: context?.coverage_status ?? "unavailable",
      anchorCount: anchors.length,
      sourceObservedAt: context?.source.observed_at ?? null,
      sourceMode: context ? "ann-l5-certified-seed" : "unavailable",
    },
  };
}

export async function buildConvergedLivingHereForListing(
  listing: Listing,
  options: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
    now?: Date;
    exactMeasurementsOverride?: LivingHereModel;
  } = {},
): Promise<LivingHereModel> {
  const geo = buildGeoTruth(listing);
  const neighborhoodContext = buildLivingHereNeighborhoodContextForListing(listing, options.now ?? new Date());

  if (geo.availability === "context_only" && geo.precision === "neighborhood_centroid") {
    return neighborhoodContext;
  }

  if (geo.availability === "exact") {
    let exactPropertyMeasurements: LivingHereModel | null = options.exactMeasurementsOverride ?? null;
    if (!exactPropertyMeasurements) {
      try {
        exactPropertyMeasurements = await buildLivingHereForListing(listing, {
          ...(options.env ? { env: options.env } : {}),
          ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
        });
      } catch {
        exactPropertyMeasurements = null;
      }
    }

    const converged: LivingHereContextModel = {
      ...neighborhoodContext,
      exactPropertyMeasurements: exactPropertyMeasurements?.origin.exact ? exactPropertyMeasurements : null,
    };
    return converged;
  }

  return buildLivingHereForListing(listing, {
    ...(options.env ? { env: options.env } : {}),
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });
}
