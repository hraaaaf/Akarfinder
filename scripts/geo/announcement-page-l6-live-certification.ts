import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildGeoTruth, isExactGeoTruth } from "@/lib/geo/geo-truth";
import { buildLivingHereModel, type LivingHereRouteObservation } from "@/lib/geo/living-here";
import type { NearbyProviderResult, RoutingProviderResult } from "@/lib/geo/provider-contracts";
import { OverpassNearbyProvider } from "@/lib/geo/providers/overpass-nearby";
import { ValhallaRoutingProvider } from "@/lib/geo/providers/valhalla-routing";

const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/announcement-page-l6-live");
const DEFAULT_OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const overpassEndpoints = (
  process.env.LIVE_OVERPASS_ENDPOINTS ??
  process.env.LIVE_OVERPASS_ENDPOINT ??
  DEFAULT_OVERPASS_ENDPOINTS.join(",")
).split(",").map((value) => value.trim()).filter(Boolean);
const valhallaEndpoint = process.env.LIVE_VALHALLA_ENDPOINT ?? "https://valhalla1.openstreetmap.de";
const clientId = process.env.LIVE_GEO_CLIENT_ID ?? "akarfinder.ma-ann-l6-certification";

const origins = [
  { city: "Rabat", neighborhood: "Agdal", latitude: 33.9908, longitude: -6.8481 },
  { city: "Casablanca", neighborhood: "Anfa", latitude: 33.5908, longitude: -7.6552 },
  { city: "Marrakech", neighborhood: "Guéliz", latitude: 31.6342, longitude: -8.0091 },
  { city: "Tanger", neighborhood: "Centre", latitude: 35.7767, longitude: -5.8039 },
] as const;

const categories = ["education", "groceries", "health", "transport", "food"];

const liveFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set("x-client-id", clientId);
  headers.set("user-agent", `${clientId} (+https://akarfinder.ma)`);
  return fetch(input, {
    ...init,
    headers,
    signal: AbortSignal.timeout(20_000),
  });
};

function coordinateKey(value: { latitude: number; longitude: number }): string {
  return `${value.latitude.toFixed(6)},${value.longitude.toFixed(6)}`;
}

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
}

async function main(): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  const results: unknown[] = [];
  const findings: string[] = [];

  for (const origin of origins) {
    const geo = buildGeoTruth({
      id: `ann-l6-live-${origin.city.toLowerCase()}`,
      city: origin.city,
      neighborhood: origin.neighborhood,
      latitude: origin.latitude,
      longitude: origin.longitude,
      geo_precision: "exact",
      geo_source: "manual_import",
      geo_label: `Point de certification ANN-L6 — ${origin.neighborhood}`,
    });

    if (!isExactGeoTruth(geo)) {
      findings.push(`${origin.city}: exact GeoTruth unavailable`);
      continue;
    }

    const overpassAttempts: Array<{
      host: string;
      status: "available" | "unavailable";
      poiCount: number;
      reason?: string;
    }> = [];
    let nearby: Extract<NearbyProviderResult, { status: "available" }> | null = null;
    let overpassHost: string | null = null;

    for (const endpoint of overpassEndpoints) {
      const nearbyProvider = new OverpassNearbyProvider({ endpoint, fetchImpl: liveFetch });
      const candidate = await nearbyProvider.nearby({
        origin: geo,
        categories,
        radiusMeters: 1_800,
      });
      const host = endpointHost(endpoint);
      if (candidate.status === "available") {
        overpassAttempts.push({ host, status: "available", poiCount: candidate.pois.length });
        if (candidate.pois.length >= 2) {
          nearby = candidate;
          overpassHost = host;
          break;
        }
      } else {
        overpassAttempts.push({
          host,
          status: "unavailable",
          poiCount: 0,
          reason: candidate.reason,
        });
      }
    }

    if (!nearby || !overpassHost) {
      findings.push(`${origin.city}: fewer than 2 live named POIs across configured Overpass endpoints`);
      results.push({
        city: origin.city,
        neighborhood: origin.neighborhood,
        origin: geo.coordinate,
        overpassHost: null,
        overpassAttempts,
        nearbyStatus: "unavailable",
      });
      continue;
    }

    const routingProvider = new ValhallaRoutingProvider({
      endpoint: valhallaEndpoint,
      fetchImpl: liveFetch,
    });

    const selectedPois = nearby.pois.slice(0, 4);
    const matrix = await routingProvider.matrix({
      origin: geo,
      destinations: selectedPois.map((poi) => poi.coordinate),
      mode: "walking",
    });
    const isochrone = await routingProvider.isochrone({
      origin: geo,
      minutes: 10,
      mode: "walking",
    });

    if (matrix.status !== "available" || matrix.routes.length < 2) {
      findings.push(`${origin.city}: fewer than 2 live routed destinations`);
    }
    if (isochrone.status !== "available") {
      findings.push(`${origin.city}: 10-minute live isochrone unavailable`);
    }

    const routes: LivingHereRouteObservation[] = matrix.status === "available"
      ? matrix.routes.flatMap((route) => {
          const poi = selectedPois.find((candidate) => coordinateKey(candidate.coordinate) === coordinateKey(route.destination));
          if (!poi) return [];
          const result: RoutingProviderResult = {
            status: "available",
            evidence: matrix.evidence,
            route: {
              distanceMeters: route.distanceMeters,
              durationSeconds: route.durationSeconds,
              mode: route.mode,
            },
          };
          return [{ poiId: poi.id, destination: poi.coordinate, result }];
        })
      : [];

    const model = buildLivingHereModel({
      geo,
      nearby: {
        ...nearby,
        pois: selectedPois,
      },
      routes,
      isochrones: [{ result: isochrone }],
      now: new Date(),
    });

    if (model.visibility !== "full") findings.push(`${origin.city}: live model did not resolve to full visibility`);
    if (!model.canShowPreciseRouteTimes) findings.push(`${origin.city}: live model has no measured route capability`);
    if (model.pois.some((poi) => poi.routes.some((route) => route.distanceMeters < 0 || route.durationSeconds <= 0))) {
      findings.push(`${origin.city}: invalid live route measurement`);
    }
    if (model.isochrones.length !== 1 || model.isochrones[0]?.minutes !== 10) {
      findings.push(`${origin.city}: live 10-minute isochrone missing from truth model`);
    }

    results.push({
      city: origin.city,
      neighborhood: origin.neighborhood,
      origin: geo.coordinate,
      overpassHost,
      overpassAttempts,
      poiCount: selectedPois.length,
      pois: model.pois.map((poi) => ({
        id: poi.id,
        name: poi.name,
        category: poi.category,
        coordinate: poi.coordinate,
        observedAt: poi.observedAt,
        routes: poi.routes.map((route) => ({
          mode: route.mode,
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          observedAt: route.observedAt,
        })),
      })),
      isochrone: model.isochrones.map((item) => ({
        minutes: item.minutes,
        mode: item.mode,
        observedAt: item.observedAt,
      })),
      attribution: model.attribution,
    });
  }

  const report = {
    schemaVersion: "ANNOUNCEMENT_PAGE_L6_LIVE_INTEGRATION_V1",
    generatedAt: new Date().toISOString(),
    productionProviderClaim: false,
    benchmarkOnly: true,
    endpoints: {
      overpass: overpassEndpoints.map(endpointHost),
      valhalla: endpointHost(valhallaEndpoint),
    },
    cityCount: origins.length,
    resultCount: results.length,
    findingCount: findings.length,
    findings,
    results,
  };

  await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    schemaVersion: report.schemaVersion,
    cityCount: report.cityCount,
    resultCount: report.resultCount,
    findingCount: report.findingCount,
    findings,
  }, null, 2));

  if (results.length !== origins.length) {
    throw new Error(`ANN-L6 live certification incomplete: ${results.length}/${origins.length} cities`);
  }
  if (findings.length > 0) {
    throw new Error(`ANN-L6 live certification failed with ${findings.length} finding(s)`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
