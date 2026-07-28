import casablancaGeometryCollection from "@/data/geo/casablanca-arrondissements-osm.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function geometryCanaryAllowed(request: Request): boolean {
  const url = new URL(request.url);
  const explicitlyRequested = url.searchParams.get("canary") === "1";
  const serverEnabled = process.env.NEIGHBORHOOD_GEOMETRY_CANARY_ENABLED === "true";
  const isProduction = process.env.VERCEL_ENV === "production";
  return explicitlyRequested && serverEnabled && !isProduction;
}

export async function GET(request: Request) {
  if (!geometryCanaryAllowed(request)) {
    return Response.json(
      {
        status: "disabled",
        reason: "Casablanca neighborhood geometry remains Shadow-only outside an explicitly enabled preview canary.",
      },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(casablancaGeometryCollection, {
    headers: {
      "Cache-Control": "private, no-store",
      "X-AkarFinder-Geometry-Status": "shadow-preview-canary",
      "X-AkarFinder-Attribution": "OpenStreetMap contributors",
    },
  });
}
