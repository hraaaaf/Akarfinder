import { randomUUID } from "node:crypto";
import casablancaGeometryCollection from "@/data/geo/casablanca-arrondissements-osm.json";
import {
  decideCasablancaGeometryCanary,
  readCasablancaGeometryCanaryConfig,
} from "@/lib/geo/casablanca-geometry-canary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "akar_geometry_canary";

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const fragment of cookieHeader.split(";")) {
    const [key, ...rest] = fragment.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function GET(request: Request) {
  const existingSession = readCookie(request, SESSION_COOKIE);
  const stableKey = existingSession ?? randomUUID();
  const decision = decideCasablancaGeometryCanary(readCasablancaGeometryCanaryConfig(), stableKey);
  const commonHeaders = {
    "Cache-Control": "private, no-store",
    "X-AkarFinder-Geometry-Canary": decision.reason,
    "X-AkarFinder-Geometry-Bucket": String(decision.bucket),
    "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(stableKey)}; Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly`,
  };

  if (!decision.eligible) {
    return Response.json(
      {
        status: "disabled",
        reason: decision.reason,
      },
      { status: 404, headers: commonHeaders },
    );
  }

  return Response.json(casablancaGeometryCollection, {
    headers: {
      ...commonHeaders,
      "X-AkarFinder-Geometry-Status": "preview-canary-1percent",
      "X-AkarFinder-Attribution": "OpenStreetMap contributors",
    },
  });
}
