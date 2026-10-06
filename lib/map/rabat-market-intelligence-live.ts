import { RABAT_MARKET_ZONES_SHADOW } from "@/lib/geo/rabat-market-zones-shadow";
import {
  dedupeObservedMarketListings,
  type MarketTransaction,
} from "@/lib/map/city-market-intelligence";
import { buildMarketZoneMetricRow } from "@/lib/map/rabat-market-zone-metrics";
import { evaluateMetricReliability } from "@/lib/map/market-metric-reliability";
import { readNeonListingMarketObservations } from "@/lib/map/neon-listing-market-observations";
import type { IntelligenceMetricInput } from "@/lib/map/intelligence-payload";

const TARGETS = ["agdal", "hay-riad", "souissi", "hassan"] as const;

const ZONE_BY_NEIGHBORHOOD: ReadonlyMap<string, string> = new Map<string, string>([
  ["agdal", "market_zone_rabat_agdal"],
  ["hay-riad", "market_zone_rabat_hay_riad"],
  ["souissi", "market_zone_rabat_souissi"],
  ["hassan", "market_zone_rabat_centre"],
]);

export async function readRabatMarketIntelligenceMetrics(): Promise<readonly IntelligenceMetricInput[]> {
  const observedRows = dedupeObservedMarketListings(
    await readNeonListingMarketObservations("Rabat", TARGETS),
  );

  const rows = observedRows.flatMap((row) => {
    const zoneId = ZONE_BY_NEIGHBORHOOD.get(row.districtSlug);
    if (!zoneId) return [];
    return [{
      ...row,
      zoneId,
    }];
  });

  const snapshotTimestamp = rows.reduce(
    (max, row) => String(row.updatedAt ?? "") > max ? String(row.updatedAt ?? "") : max,
    "",
  );
  const snapshotVersion =
    `rabat-property-listings-v1:${snapshotTimestamp || "no-updated-at"}:${rows.length}`;

  const zoneById = new Map<string, (typeof RABAT_MARKET_ZONES_SHADOW)[number]>(
    RABAT_MARKET_ZONES_SHADOW.map(
      (zone): [string, (typeof RABAT_MARKET_ZONES_SHADOW)[number]] => [zone.id, zone],
    ),
  );

  const output: IntelligenceMetricInput[] = [];
  for (const zoneId of ZONE_BY_NEIGHBORHOOD.values()) {
    const zone = zoneById.get(zoneId);
    if (!zone) throw new Error(`C3 missing market zone record ${zoneId}`);

    for (const transaction of ["sale", "rent"] as const satisfies readonly MarketTransaction[]) {
      const scoped = rows.filter(
        (row) => row.zoneId === zoneId && row.transaction === transaction,
      );
      const priceObservations = scoped.flatMap((row) =>
        row.pricePerM2 != null
          ? [{
              value: row.pricePerM2,
              fresh: row.fresh,
              sourceDomain: row.sourceDomain,
            }]
          : [],
      );
      const reliability = evaluateMetricReliability({
        listingCount: scoped.length,
        observations: priceObservations,
      });
      const base = buildMarketZoneMetricRow({
        zoneId,
        displayName: zone.displayName,
        transactionType: transaction,
        areaKm2: zone.areaKm2,
        listingCount: scoped.length,
        pricePerM2SampleCount: reliability.sampleCount,
        medianPricePerM2Mad: reliability.median,
      });

      output.push({
        ...base,
        priceReliability: reliability.level,
        freshnessStatus: scoped.length === 0 ? "unconfirmed" : "unconfirmed",
        snapshotVersion,
      });
    }
  }

  return output;
}
