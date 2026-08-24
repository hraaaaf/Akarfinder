import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { OverpassNearbyProvider } from "@/lib/geo/providers/overpass-nearby";
import {
  adaptOsmNearbyResult,
  OSM_ATTRIBUTION,
  OSM_LICENSE_URL,
} from "@/lib/neighborhood-context/poi-registry";
import {
  ANN_L5_CERTIFIED_SEED_OBSERVED_AT,
  ANN_L5_CERTIFIED_SEED_PROVIDER_ID,
  ANN_L5_CERTIFIED_SEED_RUN_ID,
  getAnnL5CertifiedSeedPois,
} from "@/lib/neighborhood-context/certified-seed";
import {
  NEIGHBORHOOD_CONTEXT_L1_CATEGORIES,
  getNeighborhoodContextL1Pilots,
} from "@/lib/neighborhood-context/pilot-neighborhoods";
import {
  NEIGHBORHOOD_POI_SNAPSHOT_SCHEMA_VERSION,
  summarizeNeighborhoodPoiSnapshot,
  validateNeighborhoodPoiSnapshotV1,
  type NeighborhoodPoiPilotSnapshotV1,
  type NeighborhoodPoiSnapshotV1,
} from "@/lib/neighborhood-context/poi-snapshot";

const DEFAULT_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const NETWORK_TIMEOUT_MS = 12_000;
const MIN_AVAILABLE_PILOTS = 4;

type EndpointAttempt = {
  endpoint: string;
  ok: boolean;
  reason: string | null;
  elapsed_ms: number;
};

type PilotResult = NeighborhoodPoiPilotSnapshotV1 & { attempts: EndpointAttempt[] };

function configuredEndpoints(): string[] {
  const raw = process.env.AKAR_NCI_OVERPASS_ENDPOINTS?.trim();
  const values = raw
    ? raw.split(/[;,\n]+/).map((value) => value.trim()).filter(Boolean)
    : DEFAULT_ENDPOINTS;
  return Array.from(new Set(values));
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeReportHtml(input: {
  generatedAt: string;
  snapshot: NeighborhoodPoiSnapshotV1;
  summary: ReturnType<typeof summarizeNeighborhoodPoiSnapshot>;
  ok: boolean;
  minimumAvailablePilots: number;
  truthFindings: string[];
}): string {
  const cards = input.snapshot.pilots.map((pilot) => {
    const categorySummary = pilot.categories.length ? pilot.categories.join(" · ") : "Aucune catégorie publiée";
    const statusLabel = pilot.status === "available"
      ? pilot.acquisition_mode === "live" ? "Live" : "Seed certifié"
      : pilot.status === "insufficient"
        ? "Insuffisant"
        : "Source externe dégradée";
    return `<article class="card" data-status="${pilot.status}" data-mode="${pilot.acquisition_mode}">
      <div class="cardTop"><div><div class="city">${htmlEscape(pilot.city)}</div><h2>${htmlEscape(pilot.neighborhood)}</h2></div><span class="status">${statusLabel}</span></div>
      <div class="metrics"><div><strong>${pilot.poi_count}</strong><span>POI validés</span></div><div><strong>${pilot.categories.length}</strong><span>catégories</span></div></div>
      <p class="cats">${htmlEscape(categorySummary)}</p>
      <p class="meta">${htmlEscape(pilot.canonical_neighborhood_id)}</p>
      <p class="meta">${pilot.observed_at ? `Observé ${htmlEscape(pilot.observed_at)}` : "Aucune observation publiée"}</p>
      ${pilot.diagnostics.length ? `<p class="diag">${htmlEscape(pilot.diagnostics.join(" · "))}</p>` : ""}
    </article>`;
  }).join("\n");

  const findings = input.truthFindings.length
    ? `<div class="finding"><strong>Findings vérité</strong><br>${input.truthFindings.map(htmlEscape).join("<br>")}</div>`
    : `<div class="finding ok"><strong>0 finding de vérité</strong><br>Le live est prioritaire. Un seed certifié reste explicitement distinct et n'affirme aucune appartenance territoriale.</div>`;

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NCI L1 Pilot Registry Proof</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f6f8fb;color:#10233f;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:1320px;margin:0 auto;padding:42px}.eyebrow{font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#0b63ce}.head{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;margin:8px 0 26px}.head h1{font-size:38px;line-height:1;margin:0;letter-spacing:-.04em}.head p{max-width:650px;margin:0;color:#60718a;line-height:1.5}.summary{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:18px}.summary div,.card,.finding{background:white;border:1px solid #dce6f2;border-radius:18px;box-shadow:0 8px 30px rgba(15,35,63,.05)}.summary div{padding:16px}.summary strong{display:block;font-size:26px}.summary span{display:block;margin-top:4px;color:#718096;font-size:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.card{padding:18px;min-height:220px}.cardTop{display:flex;justify-content:space-between;gap:12px}.city{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#0b63ce}.card h2{font-size:22px;margin:4px 0 0}.status{font-size:11px;font-weight:800;background:#edf6ff;color:#0b63ce;border-radius:999px;padding:7px 10px;white-space:nowrap;height:max-content}.card[data-mode="certified_seed"] .status{background:#f3efff;color:#6246a7}.card[data-status="external_degraded"] .status{background:#fff3e5;color:#9a5a00}.card[data-status="insufficient"] .status{background:#f1f3f6;color:#5b6777}.metrics{display:flex;gap:26px;margin:22px 0 14px}.metrics strong{font-size:24px;display:block}.metrics span{font-size:11px;color:#718096}.cats{font-size:12px;line-height:1.5;color:#3f5169}.meta,.diag{font-size:10px;color:#8290a3;overflow-wrap:anywhere}.diag{color:#725897}.card[data-status="external_degraded"] .diag{color:#8a5a00}.finding{margin-top:16px;padding:16px;color:#8f3d34}.finding.ok{color:#216e45}.foot{display:flex;justify-content:space-between;gap:18px;margin-top:18px;font-size:11px;color:#718096}.badge{display:inline-flex;padding:7px 10px;border-radius:999px;background:${input.ok ? "#eaf8f0" : "#fff2e8"};color:${input.ok ? "#216e45" : "#9a4f00"};font-weight:800}@media(max-width:900px){.wrap{padding:24px}.summary{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}.head{display:block}.head p{margin-top:12px}}
  </style></head><body><main class="wrap"><div class="eyebrow">AkarFinder · Neighborhood Context Intelligence · Lot 1</div><div class="head"><div><h1>National POI Registry · preuve pilote</h1></div><p>Acquisition explicite hors render path. Live prioritaire, continuité par seed ANN-L5 certifié si nécessaire. OpenStreetMap reste attribué et aucun statut « dans le quartier » n'est déduit au Lot 1.</p></div>
  <div class="summary"><div><strong>${input.summary.pilot_count}</strong><span>quartiers pilotes</span></div><div><strong>${input.summary.available_pilots}</strong><span>pilotes disponibles</span></div><div><strong>${input.summary.live_pilots}</strong><span>live</span></div><div><strong>${input.summary.certified_seed_pilots}</strong><span>seed certifié</span></div><div><strong>${input.summary.total_pois}</strong><span>POI canoniques</span></div><div><strong>${input.summary.categories.length}</strong><span>catégories</span></div></div>
  <div class="grid">${cards}</div>${findings}<div class="foot"><span>ODbL · ${htmlEscape(OSM_ATTRIBUTION)} · minimum ${input.minimumAvailablePilots}/${input.summary.pilot_count}</span><span>Seed continuité : ANN-L5 run ${ANN_L5_CERTIFIED_SEED_RUN_ID}</span><span class="badge">${input.ok ? "TECH GATE PASS" : "TECH GATE NOT MET"}</span></div></main></body></html>`;
}

function certifiedSeedFallback(
  pilot: ReturnType<typeof getNeighborhoodContextL1Pilots>[number],
  attempts: EndpointAttempt[],
): PilotResult | null {
  const now = new Date();
  const pois = getAnnL5CertifiedSeedPois(pilot.canonical_neighborhood_id, now)
    .filter((poi) => poi.status === "active" && poi.freshness_status === "fresh");
  if (pois.length === 0) return null;

  return {
    canonical_neighborhood_id: pilot.canonical_neighborhood_id,
    city: pilot.city,
    neighborhood: pilot.neighborhood,
    query_origin: pilot.query_origin,
    query_radius_m: pilot.query_radius_m,
    status: "available",
    acquisition_mode: "certified_seed",
    provider_id: ANN_L5_CERTIFIED_SEED_PROVIDER_ID,
    observed_at: ANN_L5_CERTIFIED_SEED_OBSERVED_AT,
    endpoint_used: null,
    poi_count: pois.length,
    categories: Array.from(new Set(pois.map((poi) => poi.category))).sort(),
    pois,
    diagnostics: [
      `Live indisponible; continuité ANN-L5 run ${ANN_L5_CERTIFIED_SEED_RUN_ID}`,
      ...attempts.map((attempt) => `${attempt.endpoint}: ${attempt.reason ?? "unavailable"}`),
    ],
    attempts,
  };
}

async function queryPilot(
  pilot: ReturnType<typeof getNeighborhoodContextL1Pilots>[number],
  endpoints: string[],
): Promise<PilotResult> {
  const attempts: EndpointAttempt[] = [];
  for (const endpoint of endpoints) {
    const started = Date.now();
    const timedFetch: typeof fetch = (input, init) => fetch(input, {
      ...init,
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    });
    const provider = new OverpassNearbyProvider({ endpoint, fetchImpl: timedFetch });
    const result = await provider.nearby({
      origin: { coordinate: pilot.query_origin },
      categories: [...NEIGHBORHOOD_CONTEXT_L1_CATEGORIES],
      radiusMeters: pilot.query_radius_m,
    });
    const elapsed = Date.now() - started;
    if (result.status !== "available") {
      attempts.push({ endpoint, ok: false, reason: result.reason, elapsed_ms: elapsed });
      continue;
    }

    const adapted = adaptOsmNearbyResult(result, new Date());
    if (adapted.status !== "available" || adapted.pois.length === 0) {
      attempts.push({ endpoint, ok: false, reason: adapted.unavailable_reason ?? "empty_after_validation", elapsed_ms: elapsed });
      continue;
    }

    attempts.push({ endpoint, ok: true, reason: null, elapsed_ms: elapsed });
    const categories = Array.from(new Set(adapted.pois.map((poi) => poi.category))).sort();
    const diagnostics: string[] = [];
    if (adapted.rejected.length > 0) diagnostics.push(`${adapted.rejected.length} POI rejeté(s) par validation`);

    return {
      canonical_neighborhood_id: pilot.canonical_neighborhood_id,
      city: pilot.city,
      neighborhood: pilot.neighborhood,
      query_origin: pilot.query_origin,
      query_radius_m: pilot.query_radius_m,
      status: "available",
      acquisition_mode: "live",
      provider_id: adapted.provider_id,
      observed_at: adapted.observed_at,
      endpoint_used: endpoint,
      poi_count: adapted.pois.length,
      categories,
      pois: adapted.pois,
      diagnostics,
      attempts,
    };
  }

  const seed = certifiedSeedFallback(pilot, attempts);
  if (seed) return seed;

  return {
    canonical_neighborhood_id: pilot.canonical_neighborhood_id,
    city: pilot.city,
    neighborhood: pilot.neighborhood,
    query_origin: pilot.query_origin,
    query_radius_m: pilot.query_radius_m,
    status: "external_degraded",
    acquisition_mode: "none",
    provider_id: "overpass",
    observed_at: null,
    endpoint_used: null,
    poi_count: 0,
    categories: [],
    pois: [],
    diagnostics: attempts.map((attempt) => `${attempt.endpoint}: ${attempt.reason ?? "unavailable"}`),
    attempts,
  };
}

async function main() {
  const outputDir = path.resolve(process.env.NCI_L1_OUTPUT_DIR ?? "artifacts/neighborhood-context-l1");
  const endpoints = configuredEndpoints();
  const pilots = getNeighborhoodContextL1Pilots();
  const pilotResults: PilotResult[] = [];

  for (const pilot of pilots) {
    pilotResults.push(await queryPilot(pilot, endpoints));
  }

  const generatedAt = new Date().toISOString();
  const snapshot: NeighborhoodPoiSnapshotV1 = {
    schema_version: NEIGHBORHOOD_POI_SNAPSHOT_SCHEMA_VERSION,
    generated_at: generatedAt,
    production_provider_claim: false,
    source_policy: {
      source_id: "openstreetmap",
      attribution: OSM_ATTRIBUTION,
      license_policy: "odbl_attribution_required",
      license_url: OSM_LICENSE_URL,
      acquisition_mode: "explicit_batch_only",
    },
    pilots: pilotResults.map(({ attempts: _attempts, ...pilot }) => pilot),
  };

  const truthFindings: string[] = [];
  const validation = validateNeighborhoodPoiSnapshotV1(snapshot, new Date(generatedAt));
  if (!validation.valid) truthFindings.push(...validation.errors);

  for (const pilot of snapshot.pilots) {
    if (pilot.status === "available" && pilot.poi_count !== pilot.pois.length) {
      truthFindings.push(`${pilot.canonical_neighborhood_id}: count mismatch`);
    }
    if (pilot.pois.some((poi) => poi.status !== "active" || poi.freshness_status !== "fresh")) {
      truthFindings.push(`${pilot.canonical_neighborhood_id}: non-fresh published POI`);
    }
  }

  const summary = summarizeNeighborhoodPoiSnapshot(snapshot);
  const ok = truthFindings.length === 0 && summary.available_pilots >= MIN_AVAILABLE_PILOTS;
  const report = {
    schema: "NEIGHBORHOOD_CONTEXT_L1_PILOT_REPORT_V1",
    generated_at: generatedAt,
    ok,
    minimum_available_pilots: MIN_AVAILABLE_PILOTS,
    endpoints: endpoints.map((endpoint) => ({ endpoint, production_approved: false })),
    certified_seed: {
      run_id: ANN_L5_CERTIFIED_SEED_RUN_ID,
      observed_at: ANN_L5_CERTIFIED_SEED_OBSERVED_AT,
      production_approved: false,
      role: "continuity_candidate_registry_only",
    },
    summary,
    truth_findings: truthFindings,
    pilots: pilotResults.map((pilot) => ({
      canonical_neighborhood_id: pilot.canonical_neighborhood_id,
      city: pilot.city,
      neighborhood: pilot.neighborhood,
      status: pilot.status,
      acquisition_mode: pilot.acquisition_mode,
      provider_id: pilot.provider_id,
      poi_count: pilot.poi_count,
      categories: pilot.categories,
      observed_at: pilot.observed_at,
      endpoint_used: pilot.endpoint_used,
      diagnostics: pilot.diagnostics,
      attempts: pilot.attempts,
    })),
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputDir, "report.html"), makeReportHtml({
    generatedAt,
    snapshot,
    summary,
    ok,
    minimumAvailablePilots: MIN_AVAILABLE_PILOTS,
    truthFindings,
  }), "utf8");

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
