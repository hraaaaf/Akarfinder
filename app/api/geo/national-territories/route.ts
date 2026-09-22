import { NextRequest, NextResponse } from "next/server";
import {
  NATIONAL_TERRITORY_BOUNDARIES,
  NATIONAL_TERRITORY_META,
  NATIONAL_TERRITORY_PLACES,
  getNationalNeighborhoodsForPlace,
  getNationalTerritoryPlace,
} from "@/lib/map/national-territory-runtime.server";
import { NATIONAL_COUNTRY_HUBS, getNationalCountryHubPolicy } from "@/lib/map/national-map-product-policy";
import { GEO_CITIES, GEO_NEIGHBORHOODS } from "@/lib/geo/geo-entity-registry";
import { CITY_CENTROIDS } from "@/lib/geo/morocco-centroids";
import { CANONICAL_CITY_REGION, MOROCCO_REGIONS, getMoroccoRegion } from "@/lib/geo/morocco-region-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function territoryHeaders() {
  return {
    "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
    "X-AkarFinder-Data-Source": "HCP-Barid-OSM",
    "X-AkarFinder-Geometry-Source": "OpenStreetMap",
    "X-AkarFinder-Geometry-Status": "candidate-nonofficial",
    "X-AkarFinder-License": "ODbL-1.0",
    "X-AkarFinder-Neighborhood-Geometry-Publication": "none-n2",
  };
}

function cityBoundary(slug: string): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: NATIONAL_TERRITORY_BOUNDARIES.features.filter((feature) => feature.properties?.slug === slug),
  };
}

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city")?.trim().toLowerCase() ?? null;
  const region = request.nextUrl.searchParams.get("region")?.trim().toLowerCase() ?? null;
  if (!city && !region) {
    const places = NATIONAL_COUNTRY_HUBS.map((hub) => {
      const canonical = GEO_CITIES.find((city) => city.slug === hub.slug);
      if (!canonical) throw new Error(`Missing canonical country hub ${hub.slug}`);
      const runtimePlace = getNationalTerritoryPlace(hub.slug);
      const fallbackCenter = CITY_CENTROIDS[hub.slug] ?? null;
      const regionSlug = CANONICAL_CITY_REGION[canonical.slug];
      return {
        ...(runtimePlace ?? {
          slug: canonical.slug,
          name: canonical.canonical_name,
          center: fallbackCenter ? { lng: fallbackCenter.lng, lat: fallbackCenter.lat } : null,
          boundaryRelationId: null,
          confidence: "osm_open_map" as const,
          population: null,
          neighborhoodCount: GEO_NEIGHBORHOODS.filter((district) => district.city_slug === canonical.slug).length,
        }),
        region: {
          slug: regionSlug,
          name: getMoroccoRegion(regionSlug).canonical_name,
        },
        product: getNationalCountryHubPolicy(canonical.slug),
        countryHubSource: runtimePlace ? "territory_runtime" : "canonical_centroid_fallback",
      };
    });
    const allowed = new Set(places.map((place) => place.slug));
    const boundaries: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: NATIONAL_TERRITORY_BOUNDARIES.features.filter((feature) => {
        const slug = feature.properties?.slug;
        return typeof slug === "string" && allowed.has(slug);
      }),
    };

    return NextResponse.json({
      status: "ok",
      view: "morocco",
      places,
      boundaries,
      meta: {
        ...NATIONAL_TERRITORY_META,
        cityCount: places.length,
        countryHubCount: places.length,
        canonicalCityCount: GEO_CITIES.length,
        regionCount: MOROCCO_REGIONS.length,
        sourceCityCount: NATIONAL_TERRITORY_PLACES.length,
        displayPolicy: "COUNTRY_HUBS_ONLY",
      },
    }, { headers: territoryHeaders() });
  }

  if (!city && region) {
    const regionEntity = MOROCCO_REGIONS.find((candidate) => candidate.slug === region);
    if (!regionEntity) {
      return NextResponse.json({ status: "not_found", region }, { status: 404, headers: territoryHeaders() });
    }
    const citySlugs = GEO_CITIES
      .filter((candidate) => CANONICAL_CITY_REGION[candidate.slug] === regionEntity.slug)
      .map((candidate) => candidate.slug);
    const places = citySlugs
      .map((slug) => getNationalTerritoryPlace(slug))
      .filter((place): place is NonNullable<typeof place> => Boolean(place))
      .map((place) => ({
        ...place,
        region: {
          slug: regionEntity.slug,
          name: regionEntity.canonical_name,
        },
        product: getNationalCountryHubPolicy(place.slug),
      }));
    const allowed = new Set(places.map((place) => place.slug));
    const boundaries: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: NATIONAL_TERRITORY_BOUNDARIES.features.filter((feature) => {
        const slug = feature.properties?.slug;
        return typeof slug === "string" && allowed.has(slug);
      }),
    };
    return NextResponse.json({
      status: "ok",
      view: "region",
      region: {
        slug: regionEntity.slug,
        name: regionEntity.canonical_name,
        geometryStatus: "not_published",
      },
      places,
      boundaries,
      meta: {
        cityCount: places.length,
        boundaryCount: boundaries.features.length,
        regionGeometryPublicationCount: 0,
        displayPolicy: "CANONICAL_REGION_CITY_HUBS",
      },
    }, { headers: territoryHeaders() });
  }

  const place = getNationalTerritoryPlace(city ?? "");
  if (!place) {
    return NextResponse.json({ status: "not_found", city }, { status: 404, headers: territoryHeaders() });
  }

  const neighborhoods = getNationalNeighborhoodsForPlace(place);
  const centeredNeighborhoodCount = neighborhoods.filter((item) => item.center).length;
  const canonicalCity = GEO_CITIES.find((candidate) => candidate.slug === place.slug);
  const cityRegion = canonicalCity ? getMoroccoRegion(CANONICAL_CITY_REGION[canonicalCity.slug]) : null;

  return NextResponse.json({
    status: "ok",
    view: "city",
    place: {
      ...place,
      region: cityRegion ? { slug: cityRegion.slug, name: cityRegion.canonical_name } : null,
      product: getNationalCountryHubPolicy(place.slug),
    },
    boundary: cityBoundary(place.slug),
    neighborhoods,
    certifiedNeighborhoodBoundaries: { type: "FeatureCollection", features: [] },
    meta: {
      neighborhoodCount: neighborhoods.length,
      centeredNeighborhoodCount,
      certifiedNeighborhoodBoundaryCount: 0,
      sourceCatalogNeighborhoodCount: place.neighborhoodCount,
    },
  }, { headers: territoryHeaders() });
}
