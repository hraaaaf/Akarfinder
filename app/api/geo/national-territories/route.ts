import {
  NATIONAL_TERRITORY_BOUNDARIES,
  NATIONAL_TERRITORY_META,
  NATIONAL_TERRITORY_PLACES,
  getNationalTerritoryPlace,
} from "@/lib/map/national-territory-runtime.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeSlug(value: string | null): string | null {
  if (!value) return null;
  const slug = value.toLowerCase().replace(/[^a-z0-9-]+/g, "").replace(/^-+|-+$/g, "");
  return slug && slug.length <= 90 ? slug : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = safeSlug(url.searchParams.get("city"));
  const headers = {
    "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    "X-AkarFinder-Territory-Source": "HCP-RGPH-2024+OpenStreetMap-ODbL+Barid-ODbL",
    "X-AkarFinder-Boundary-Claim": "candidate-not-official",
  };

  if (!city) {
    return Response.json({
      status: "ok",
      view: "morocco",
      places: NATIONAL_TERRITORY_PLACES,
      boundaries: NATIONAL_TERRITORY_BOUNDARIES,
      meta: NATIONAL_TERRITORY_META,
    }, { headers });
  }

  const place = getNationalTerritoryPlace(city);
  if (!place) return Response.json({ status: "not_found", city }, { status: 404, headers });

  return Response.json({
    status: "ok",
    view: "city",
    place,
    boundary: {
      type: "FeatureCollection",
      features: NATIONAL_TERRITORY_BOUNDARIES.features.filter((feature) => feature.properties?.slug === city),
    },
    meta: {
      neighborhoodCount: place.neighborhoodCount,
      sourceArtifact: NATIONAL_TERRITORY_META.sourceArtifact,
    },
  }, { headers });
}
