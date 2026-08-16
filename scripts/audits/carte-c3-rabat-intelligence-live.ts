#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { decideRabatMarketZonesGeoJson } from "@/lib/geo/rabat-market-zones-geojson";
import { buildRabatIntelligenceGeoJson } from "@/lib/map/intelligence-payload";
import { readRabatMarketIntelligenceMetrics } from "@/lib/map/rabat-market-intelligence-live";
import type { IntelligenceMode } from "@/lib/map/intelligence-scale";

const OUTPUT = join(process.cwd(), "data/audits/runtime/carte-c3-rabat-intelligence-live.json");
const MODES: readonly IntelligenceMode[] = ["price", "density", "listings"];
const TRANSACTIONS = ["sale", "rent"] as const;

async function main() {
  const geometry = decideRabatMarketZonesGeoJson();
  if (!geometry.enabled) throw new Error(`C3 geometry disabled: ${geometry.reason}`);
  if (geometry.collection.features.length !== 4) throw new Error(`C3 expected 4 canary zones, got ${geometry.collection.features.length}`);

  const metrics = await readRabatMarketIntelligenceMetrics();
  if (metrics.length !== 8) throw new Error(`C3 expected 8 zone×transaction metric rows, got ${metrics.length}`);

  const payloads: any[] = [];
  for (const transaction of TRANSACTIONS) {
    for (const mode of MODES) {
      const payload = buildRabatIntelligenceGeoJson({
        geometry: geometry.collection,
        metrics,
        mode,
        transaction,
      });
      if (payload.features.length !== 4) throw new Error(`C3 ${transaction}/${mode} feature count drift`);
      for (const feature of payload.features) {
        const p = feature.properties;
        if (p.neutral) {
          if (p.classIndex !== null || p.fillColor !== payload.properties.legend.neutralColor) {
            throw new Error(`C3 ${transaction}/${mode}/${p.zoneId} neutral fill drift`);
          }
        } else {
          if (p.classIndex == null || payload.properties.legend.colors[p.classIndex] !== p.fillColor) {
            throw new Error(`C3 ${transaction}/${mode}/${p.zoneId} class/fill drift`);
          }
        }
      }
      if ((mode === "density" || mode === "listings") && payload.properties.legend.availableCount !== 4) {
        throw new Error(`C3 ${transaction}/${mode} must classify all four observed zones`);
      }
      payloads.push({
        transaction,
        mode,
        legend: payload.properties.legend,
        zones: payload.features.map((feature) => ({
          zoneId: feature.properties.zoneId,
          value: feature.properties.metricValue,
          sampleCount: feature.properties.sampleCount,
          reliability: feature.properties.reliability,
          neutral: feature.properties.neutral,
          classIndex: feature.properties.classIndex,
          fillColor: feature.properties.fillColor,
        })),
      });
    }
  }

  const report = {
    contractVersion: "carte_c3_rabat_intelligence_live_v1",
    readOnly: true,
    geometryStatus: "canary",
    officialBoundary: false,
    metricRows: metrics.length,
    payloadCount: payloads.length,
    scaleMethod: "snapshot_quantiles_v1",
    payloads,
    verdict: "C3_LIVE_PAYLOAD_REVIEWABLE",
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
