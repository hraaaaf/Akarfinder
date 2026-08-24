import { NextRequest, NextResponse } from "next/server";
import {
  NATIONAL_TERRITORY_BOUNDARIES,
  NATIONAL_TERRITORY_META,
  NATIONAL_TERRITORY_PLACES,
  getNationalNeighborhoodsForPlace,
  getNationalTerritoryPlace,
} from "@/lib/map/national-territory-runtime.server";

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
    return NextResponse.json({
      status: "ok",
      view: "morocco",
      places: NATIONAL_TERRITORY_PLACES,
      boundaries: NATIONAL_TERRITORY_BOUNDARIES,
      meta: NATIONAL_TERRITORY_META,
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
