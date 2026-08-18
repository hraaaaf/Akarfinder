import { buildCityMarketIntelligencePayload } from "@/lib/map/city-market-intelligence-payload";
import { readCityMarketIntelligenceMetrics } from "@/lib/map/city-market-intelligence-live";
import type { MarketTransaction } from "@/lib/map/city-market-intelligence";
import type { IntelligenceMode } from "@/lib/map/intelligence-scale";
import { getPremiumMapCity } from "@/lib/map/premium-map-city-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES = new Set<IntelligenceMode>(["price", "density", "listings"]);
const TRANSACTIONS = new Set<MarketTransaction>(["sale", "rent"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const citySlug = String(url.searchParams.get("city") ?? "").trim().toLowerCase();
  const mode = (url.searchParams.get("mode") ?? "price") as IntelligenceMode;
  const transaction = (url.searchParams.get("transaction") ?? "sale") as MarketTransaction;
  const city = getPremiumMapCity(citySlug);

  const baseHeaders = {
    "X-AkarFinder-Market-Scope": "observed-only",
    "X-AkarFinder-Market-Aggregation": "city-district-v1",
    "X-AkarFinder-Scale-Method": "snapshot_quantiles_v1",
  };

  if (!city || !MODES.has(mode) || !TRANSACTIONS.has(transaction)) {
    return Response.json(
      {
        status: "invalid_request",
        allowedCities: ["casablanca", "rabat", "marrakech", "tanger", "agadir", "fes"],
        allowedModes: [...MODES],
        allowedTransactions: [...TRANSACTIONS],
      },
      { status: 400, headers: { ...baseHeaders, "Cache-Control": "no-store" } },
    );
  }

  try {
    const metrics = await readCityMarketIntelligenceMetrics(city.slug);
    const payload = buildCityMarketIntelligencePayload({
      citySlug: city.slug,
      cityDisplayName: city.displayName,
      metrics,
      mode,
      transaction,
    });
    return Response.json(payload, {
      headers: {
        ...baseHeaders,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[market-intelligence-api]", error);
    return Response.json(
      { status: "unavailable", reason: "market_metrics_unavailable" },
      { status: 503, headers: { ...baseHeaders, "Cache-Control": "no-store" } },
    );
  }
}
