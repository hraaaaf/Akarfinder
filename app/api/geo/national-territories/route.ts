import { NextRequest, NextResponse } from "next/server";
import {
  NATIONAL_TERRITORY_BOUNDARIES,
  NATIONAL_TERRITORY_META,
  NATIONAL_TERRITORY_PLACES,
  getNationalNeighborhoodsForPlace,
  getNationalTerritoryPlace,
} from "@/lib/map/national-territory-runtime.server";
import { NATIONAL_COUNTRY_HUBS, getNationalCountryHubPolicy } from "@/lib/map/national-map-product-policy";
import { GEO_CITIES } from "@/lib/geo/geo-entity-registry";
import { MOROCCO_REGIONS } from "@/lib/geo/morocco-region-registry";

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
  if (!city) {
    const countryHubOrder = new Map(NATIONAL_COUNTRY_HUBS.map((hub) => [hub.slug, hub.order] as const));
    const places = NATIONAL_TERRITORY_PLACES
      .filter((place) => countryHubOrder.has(place.slug as never))
      .map((place) => ({
        ...place,
        product: getNationalCountryHubPolicy(place.slug),
      }))
      .sort((a, b) => (countryHubOrder.get(a.slug as never) ?? 999) - (countryHubOrder.get(b.slug as never) ?? 999));
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

  const place = getNationalTerritoryPlace(city);
  if (!place) {
    return NextResponse.json({ status: "not_found", city }, { status: 404, headers: territoryHeaders() });
  }

  const neighborhoods = getNationalNeighborhoodsForPlace(place);
  const centeredNeighborhoodCount = neighborhoods.filter((item) => item.center).length;

  return NextResponse.json({
    status: "ok",
    view: "city",
    place,
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
