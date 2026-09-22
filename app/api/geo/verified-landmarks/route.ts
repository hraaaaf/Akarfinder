import { resolveNeighborhoodEntity } from "@/lib/geo/geo-entity-registry";
import { getVerifiedLandmarksForDistrict } from "@/lib/geo/territory-landmark-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: string | null): string {
  return String(value ?? "").trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = clean(url.searchParams.get("city"));
  const district = clean(url.searchParams.get("district"));

  if (!city || !district || city.length > 80 || district.length > 120) {
    return Response.json(
      { status: "invalid_request", reason: "city_and_district_required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const canonical = resolveNeighborhoodEntity(city, district);
  if (!canonical || canonical.validation_status !== "validated" || !canonical.map_eligible) {
    return Response.json(
      { status: "not_found", city, district },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const landmarks = getVerifiedLandmarksForDistrict(canonical.id)
    .filter((entry) => Boolean(entry.entity.coordinates))
    .map((entry) => {
      const coordinates = entry.entity.coordinates!;
      return ({
    id: entry.entity.id,
    slug: entry.entity.landmarkSlug,
    name: entry.entity.canonicalName,
    category: entry.entity.category,
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    precision: coordinates.precision,
    importance: {
      score: entry.entity.importance.score,
      tier: entry.entity.importance.tier,
    },
    source_refs: entry.sourceRefs,
    verified_at: entry.verifiedAt,
    artwork_key: entry.entity.landmarkSlug,
      });
    });

  return Response.json(
    {
      status: "ok",
      city: canonical.city_slug,
      district: canonical.slug,
      canonical_neighborhood_id: canonical.id,
      count: landmarks.length,
      landmarks,
      publication: {
        points_only: true,
        boundary_claim: false,
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-AkarFinder-Landmark-Scope": "verified-registry-points-only",
      },
    },
  );
}
