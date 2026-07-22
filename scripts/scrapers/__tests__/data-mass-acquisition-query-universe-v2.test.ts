import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildQueryUniverseV2 } from "../../../lib/openserp-ingestion/query-universe-v2.js";
import {
  ACQUISITION_CHANNELS,
  TARGET_RAW_OBSERVATIONS,
  TARGET_UNIQUE_CLUSTERS,
  buildAcquisitionWaves,
  computeAcquisitionProgress,
} from "../../../lib/acquisition-scale-v1/engine.js";
import { loadSourceDomainRegistry } from "../../../lib/openserp-ingestion/domain-registry.js";

test("#21 scale targets stay explicit and independent", () => {
  assert.equal(TARGET_RAW_OBSERVATIONS, 100_000);
  assert.equal(TARGET_UNIQUE_CLUSTERS, 37_000);
  assert.equal(ACQUISITION_CHANNELS.reduce((sum, c) => sum + c.target_share_pct, 0), 100);
});

test("#21 Production baseline shape computes honest progress", () => {
  const p = computeAcquisitionProgress({
    discovery_candidate_rows: 8484,
    source_offer_observation_rows: 0,
    unique_canonical_urls: 6616,
    property_clusters: 525,
  });
  assert.equal(p.raw_observations, 8484);
  assert.equal(p.observation_progress_pct, 8.48);
  assert.equal(p.cluster_progress_pct, 1.42);
  assert.equal(p.phase, "bootstrap");
  assert.equal(p.remaining_observations, 91_516);
});

test("#22 universe is national-scale but bounded", () => {
  const universe = buildQueryUniverseV2();
  assert.ok(universe.total_queries >= 5_000, `expected >=5000, got ${universe.total_queries}`);
  assert.ok(universe.total_queries <= 20_000, `expected <=20000, got ${universe.total_queries}`);
  assert.ok(universe.cities_covered >= 16);
  assert.ok(universe.districts_covered >= 65);
});

test("#22 universe is deterministic and query ids are unique", () => {
  const a = buildQueryUniverseV2();
  const b = buildQueryUniverseV2();
  assert.equal(a.total_queries, b.total_queries);
  assert.deepEqual(a.queries.map((q) => q.query_id), b.queries.map((q) => q.query_id));
  assert.equal(new Set(a.queries.map((q) => q.query_id)).size, a.total_queries);
  assert.equal(new Set(a.queries.map((q) => q.normalized_query)).size, a.total_queries);
});

test("#22 covers French and Arabic plus city/district long-tail variants", () => {
  const q = buildQueryUniverseV2().queries;
  assert.ok(q.some((x) => x.language === "fr" && x.variant === "immobilier_longtail"));
  assert.ok(q.some((x) => x.language === "ar"));
  assert.ok(q.some((x) => x.city === "Casablanca" && x.district === "Maarif"));
  assert.ok(q.some((x) => x.city === "Rabat" && x.district === "Agdal"));
});

test("#22 source-specific queries only target approved/authorized domains", () => {
  const registry = loadSourceDomainRegistry();
  const allowed = new Set(registry.domains.filter((d) => ["approved_discovery", "partner", "authorized_static"].includes(d.status)).map((d) => d.domain));
  const blocked = new Set(registry.domains.filter((d) => d.status === "blocked").map((d) => d.domain));
  const sourceQueries = buildQueryUniverseV2().queries.filter((q) => q.target_domain);
  assert.ok(sourceQueries.length > 0);
  for (const query of sourceQueries) {
    assert.ok(allowed.has(query.target_domain!));
    assert.equal(blocked.has(query.target_domain!), false);
  }
});

test("#21 wave planner covers every V2 query exactly once", () => {
  const universe = buildQueryUniverseV2();
  const waves = buildAcquisitionWaves(universe.queries, 250);
  const ids = waves.flatMap((w) => w.queries.map((q) => q.query_id));
  assert.equal(ids.length, universe.total_queries);
  assert.equal(new Set(ids).size, universe.total_queries);
  assert.ok(waves.every((w) => w.query_count <= 250));
  assert.ok(waves[0].cities.length >= 10, "first wave should be geographically diversified");
});

test("#21 scheduled GitHub ingestion materializes and passes V2 to the existing orchestrator", () => {
  const entry = readFileSync(join(process.cwd(), "scripts/openserp/run-ingestion-github-actions.ts"), "utf8");
  const workflow = readFileSync(join(process.cwd(), ".github/workflows/openserp-github-native-ingestion.yml"), "utf8");
  assert.ok(entry.includes("buildQueryUniverseV2"));
  assert.ok(entry.includes("universePath: scale.path"));
  assert.ok(entry.includes("tmpdir()"));
  assert.ok(workflow.includes('cron: "*/30 * * * *"'));
  assert.ok(workflow.includes("run-ingestion-github-actions.ts"));
});

test("#21 V2 activation does not add filesystem writes to the Vercel serverless orchestrator", () => {
  const orchestrator = readFileSync(join(process.cwd(), "lib/openserp-ingestion/run-orchestrator.ts"), "utf8");
  assert.equal(orchestrator.includes("buildQueryUniverseV2"), false);
  assert.equal(orchestrator.includes("tmpdir()"), false);
});
