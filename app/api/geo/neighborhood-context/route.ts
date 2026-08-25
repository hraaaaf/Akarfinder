import {
  getNeighborhoodContextReadModelBySlugs,
  NEIGHBORHOOD_CONTEXT_READ_MODEL_VERSION,
  NEIGHBORHOOD_CONTEXT_RUNTIME_SOURCE,
} from "@/lib/neighborhood-context/read-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";
const BASE_HEADERS = {
  "X-AkarFinder-Context-Scope": "pilot-certified-baseline",
  "X-AkarFinder-Context-Version": NEIGHBORHOOD_CONTEXT_READ_MODEL_VERSION,
  "X-AkarFinder-Context-Source": NEIGHBORHOOD_CONTEXT_RUNTIME_SOURCE,
};

function cleanSlug(value: string | null): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = cleanSlug(url.searchParams.get("city"));
  const district = cleanSlug(url.searchParams.get("district"));

  if (!city || !district || city.length > 80 || district.length > 120) {
    return Response.json(
      { status: "invalid_request", reason: "city_and_district_required" },
      { status: 400, headers: { ...BASE_HEADERS, "Cache-Control": "no-store" } },
    );
  }

  try {
    const model = getNeighborhoodContextReadModelBySlugs(city, district, new Date());
    if (!model) {
      return Response.json(
        { status: "not_found", city, district },
        { status: 404, headers: { ...BASE_HEADERS, "Cache-Control": "no-store" } },
      );
    }

    return Response.json(
      { status: "ok", context: model },
      { status: 200, headers: { ...BASE_HEADERS, "Cache-Control": CACHE_CONTROL } },
    );
  } catch (error) {
    console.error("[neighborhood-context-api]", error);
    return Response.json(
      { status: "unavailable", reason: "context_read_model_unavailable" },
      { status: 503, headers: { ...BASE_HEADERS, "Cache-Control": "no-store" } },
    );
  }
}
