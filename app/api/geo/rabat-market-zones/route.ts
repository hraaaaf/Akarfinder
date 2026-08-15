import { decideRabatMarketZonesGeoJson } from "@/lib/geo/rabat-market-zones-geojson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const decision = decideRabatMarketZonesGeoJson();
  const headers = {
    "Cache-Control": "private, no-store",
    "X-AkarFinder-Geometry-Semantic-Type": "market_zone",
    "X-AkarFinder-Official-Boundary": "false",
  };

  if (!decision.enabled) {
    return Response.json(
      {
        status: "disabled",
        reason: decision.reason,
      },
      { status: 404, headers },
    );
  }

  return Response.json(decision.collection, {
    headers: {
      ...headers,
      "X-AkarFinder-Geometry-Status": "reviewed-market-zones",
      "X-AkarFinder-Attribution": "OpenStreetMap contributors; AkarFinder derived market zones",
    },
  });
}
