import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { OverpassNearbyProvider } from "@/lib/geo/providers/overpass-nearby";
import { adaptOsmNearbyResult } from "@/lib/neighborhood-context/poi-registry";
import {
  getNeighborhoodContextNationalRefreshTargets,
  runNeighborhoodContextNationalRefreshBatch,
  validateNeighborhoodContextNationalRefreshReport,
  validateNeighborhoodContextNationalRefreshTargets,
  type NeighborhoodContextRefreshFetchResultV1,
  type NeighborhoodContextRefreshTargetV1,
} from "@/lib/neighborhood-context/national-refresh";

const OUTPUT_DIR = path.resolve(process.env.NCI_L7_OUTPUT_DIR ?? "artifacts/neighborhood-context-l7-refresh-quality");
const NETWORK_TIMEOUT_MS = 12_000;

function endpointsFromEnv(): string[] {
  return Array.from(new Set(
    (process.env.AKAR_NCI_OVERPASS_ENDPOINTS ?? "")
      .split(/[;,\n]+/)
      .map((value) => value.trim())
      .filter(Boolean),
  ));
}

async function liveFetchTarget(
  target: NeighborhoodContextRefreshTargetV1,
  endpoints: string[],
): Promise<NeighborhoodContextRefreshFetchResultV1> {
  const started = Date.now();
  const diagnostics: string[] = [];
  for (const endpoint of endpoints) {
    const provider = new OverpassNearbyProvider({
      endpoint,
      fetchImpl: (input, init) => fetch(input, {
        ...init,
        signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
      }),
    });
    const result = await provider.nearby({
      origin: { coordinate: target.query_origin },
      categories: [...target.categories],
      radiusMeters: target.query_radius_m,
    });
    if (result.status !== "available") {
      diagnostics.push(`${endpoint}:${result.reason}`);
      continue;
    }
    const adapted = adaptOsmNearbyResult(result, new Date());
    if (adapted.status !== "available" || adapted.pois.length === 0) {
      diagnostics.push(`${endpoint}:${adapted.unavailable_reason ?? "empty_after_validation"}`);
      continue;
    }
    return {
      status: "available",
      provider_id: adapted.provider_id,
      observed_at: adapted.observed_at,
      endpoint_used: endpoint,
      elapsed_ms: Date.now() - started,
      pois: adapted.pois,
      diagnostics: [
        ...diagnostics,
        ...(adapted.rejected.length ? [`rejected:${adapted.rejected.length}`] : []),
      ],
    };
  }
  return {
    status: "unavailable",
    provider_id: "overpass",
    observed_at: null,
    endpoint_used: null,
    elapsed_ms: Date.now() - started,
    pois: [],
    diagnostics: diagnostics.length ? diagnostics : ["no_endpoint_succeeded"],
  };
}

async function main() {
  const mode = (process.env.NCI_L7_REFRESH_MODE ?? "plan").trim().toLowerCase();
  const targets = getNeighborhoodContextNationalRefreshTargets();
  const targetFindings = validateNeighborhoodContextNationalRefreshTargets(targets);
  if (targetFindings.length) throw new Error(`Invalid refresh target plan: ${targetFindings.join(",")}`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  if (mode === "plan") {
    const plan = {
      schema: "NEIGHBORHOOD_CONTEXT_L7_REFRESH_PLAN_V1",
      generated_at: new Date().toISOString(),
      mode: "plan",
      network_calls: 0,
      live_requires_configured_endpoints: true,
      production_provider_claim: false,
      targets: targets.length,
      queryable_targets: targets.filter((target) => target.target_status === "queryable").length,
      blocked_targets: targets.filter((target) => target.target_status === "blocked_missing_reference_point").length,
      rows: targets,
      findings: targetFindings,
    };
    await writeFile(path.join(OUTPUT_DIR, "refresh-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (mode !== "live") throw new Error(`Unsupported NCI_L7_REFRESH_MODE: ${mode}`);
  const endpoints = endpointsFromEnv();
  if (endpoints.length === 0) {
    throw new Error("Live refresh requires explicit AKAR_NCI_OVERPASS_ENDPOINTS; no public endpoint is assumed.");
  }

  const now = new Date();
  const report = await runNeighborhoodContextNationalRefreshBatch(
    now,
    (target) => liveFetchTarget(target, endpoints),
  );
  const findings = validateNeighborhoodContextNationalRefreshReport(report);
  const payload = {
    schema: "NEIGHBORHOOD_CONTEXT_L7_REFRESH_LIVE_REPORT_V1",
    generated_at: now.toISOString(),
    mode: "live",
    production_provider_claim: false,
    endpoints: endpoints.map((endpoint) => ({ endpoint, production_approved: false })),
    findings,
    ok: findings.length === 0,
    report,
  };
  await writeFile(path.join(OUTPUT_DIR, "refresh-live.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(payload, null, 2));
  if (findings.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
