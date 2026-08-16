import { decideRabatMarketZonesGeoJson } from "@/lib/geo/rabat-market-zones-geojson";
import { buildRabatIntelligenceGeoJson } from "@/lib/map/intelligence-payload";
import { readRabatMarketIntelligenceMetrics } from "@/lib/map/rabat-market-intelligence-live";
import type { IntelligenceMode } from "@/lib/map/intelligence-scale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES = new Set<IntelligenceMode>(["price", "density", "listings"]);
const TRANSACTIONS = new Set(["sale", "rent"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = (url.searchParams.get("mode") ?? "listings") as IntelligenceMode;
  const transaction = url.searchParams.get("transaction") ?? "sale";

  const baseHeaders = {
    "X-AkarFinder-Market-Scope": "observed-only",
    "X-AkarFinder-Geometry-Semantic-Type": "market_zone",
    "X-AkarFinder-Official-Boundary": "false",
    "X-AkarFinder-Scale-Method": "snapshot_quantiles_v1",
    "X-AkarFinder-Attribution": "OpenStreetMap contributors; AkarFinder derived market zones",
  };

  if (!MODES.has(mode) || !TRANSACTIONS.has(transaction)) {
    return Response.json(
      { status: "invalid_request", allowedModes: [...MODES], allowedTransactions: [...TRANSACTIONS] },
      { status: 400, headers: { ...baseHeaders, "Cache-Control": "no-store" } },
    );
  }

  const geometryDecision = decideRabatMarketZonesGeoJson();
  if (!geometryDecision.enabled) {
    return Response.json(
      { status: "disabled", reason: geometryDecision.reason },
      { status: 404, headers: { ...baseHeaders, "Cache-Control": "no-store" } },
    );
  }

  try {
    const metrics = await readRabatMarketIntelligenceMetrics();
    const payload = buildRabatIntelligenceGeoJson({
      geometry: geometryDecision.collection,
      metrics,
      mode,
      transaction,
    });
    return Response.json(payload, {
      headers: {
        ...baseHeaders,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-AkarFinder-Geometry-Status": "canary-market-zones",
      },
    });
  } catch {
    return Response.json(
      { status: "unavailable", reason: "market_metrics_unavailable" },
      { status: 503, headers: { ...baseHeaders, "Cache-Control": "no-store" } },
    );
  }
}
