#!/usr/bin/env tsx
// P1B.15 — final Geo foundation certification.
// Read-only. Authorizes P1C Shadow only; public Offer metrics and neighborhood choropleth remain OFF.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const POLICY = JSON.parse(readFileSync(join(process.cwd(), "data/geo/p1b15-geo-certification-policy.json"), "utf8"));
const P1B14 = JSON.parse(readFileSync(join(process.cwd(), "data/geo/p1b14-geometry-level-policy.json"), "utf8"));
const TOPOLOGY = JSON.parse(readFileSync(join(process.cwd(), "data/geo/casablanca-arrondissements-osm.audit.json"), "utf8"));
const OUTPUT = join(process.cwd(), "data/audits/runtime/p1b15-geo-certification.json");

const AGADIR = new Map([
  ["049cd577-fc81-4d23-bc1c-2d5cf84214ea", "district_agadir_hay_mohammadi"],
  ["6aed05ed-5aee-415f-98cb-ff87db6d2cc5", "district_agadir_dakhla"],
  ["6d72d3f0-8697-4b88-9876-5ce0806aa681", "district_agadir_hay_mohammadi"],
  ["b36688fd-fe7b-43e3-bad6-e968e2ecf4c8", "district_agadir_hay_mohammadi"],
  ["d1ecf541-bb26-43b1-87e7-d4dedd03b413", "district_agadir_dakhla"],
  ["d69e04e4-92bd-4bd9-bbd2-2bfc07b5fa7e", "district_agadir_hay_mohammadi"],
  ["e804e8ab-2575-412e-b0dd-0b01737513b1", "district_agadir_hay_mohammadi"],
  ["fbbdd20c-8d8b-4b78-a186-652a7557cf7e", "district_agadir_dakhla"],
]);
const OASIS = [
  "1c3223d2-8eae-471d-ba14-ea90447aeb2f",
  "2301d915-3d1b-45db-b178-bd2abdc26472",
  "7eacf82f-c374-467a-a3af-53430f82211d",
  "9a7f0328-683c-4783-b46e-4bdc30cb3a86",
  "9f644e9e-f2c0-4b0a-8646-8d4e750a6767",
] as const;
const IDS = [...AGADIR.keys(), ...OASIS];
const TARGETS = [
  "district_agadir_dakhla",
  "district_agadir_hay_mohammadi",
  "district_casablanca_oasis",
] as const;

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function newer(a: any, b: any): boolean {
  if (!b) return true;
  if (String(a.created_at) !== String(b.created_at)) return String(a.created_at) > String(b.created_at);
  return String(a.id) > String(b.id);
}

export async function runP1B15GeoCertification() {
  assert(POLICY.schema_version === "p1b15-geo-certification-policy-v1", "P1B.15 policy schema drift");
  assert(POLICY.principles.read_only === true && POLICY.principles.registry_mutation === false && POLICY.principles.resolution_mutation === false, "P1B.15 mutation boundary drift");
  assert(POLICY.activation_decision.p1c_shadow_allowed === true, "P1C Shadow must be the only promoted next stage");
  assert(POLICY.activation_decision.p1c_public_activation_allowed === false, "P1C public activation must remain blocked");
  assert(POLICY.activation_decision.offer_metric_layer_allowed === false, "Offer metric layer must remain OFF");
  assert(POLICY.activation_decision.p2_neighborhood_choropleth_allowed === false, "P2 neighborhood choropleth must remain blocked");

  assert(P1B14.schema_version === "p1b14-typed-geometry-policy-v1", "P1B.14 predecessor policy drift");
  assert(P1B14.casablanca_administrative_inventory.territorial_type === "arrondissement", "Casablanca geometry type drift");
  assert(P1B14.casablanca_administrative_inventory.source_admin_level === "10", "Casablanca admin level drift");
  assert(TOPOLOGY.status === "passed" && TOPOLOGY.allTopologiesValid === true && TOPOLOGY.featureCount === 16, "Casablanca topology proof drift");
  assert(P1B14.policy.name_only_cross_type_binding_forbidden === true && P1B14.policy.map_neighborhood_choropleth_default === false, "P1B.14 fail-closed geometry boundary drift");

  const db: any = getSupabaseServerClient();
  const [entitiesR, eventsR, metricR] = await Promise.all([
    db.from("geo_entities")
      .select("id,entity_type,parent_id,validation_status,map_eligible,seo_eligible")
      .in("id", TARGETS),
    db.from("geo_resolution_events")
      .select("id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,resolver_version,created_at")
      .eq("source_record_type", "source_offer_seed")
      .in("source_record_id", IDS),
    db.rpc("odm_territorial_metric_join_report_v1"),
  ]);
  if (entitiesR.error) throw new Error(`P1B.15 Registry read failed: ${entitiesR.error.message}`);
  if (eventsR.error) throw new Error(`P1B.15 resolution read failed: ${eventsR.error.message}`);
  if (metricR.error) throw new Error(`P1B.15 territorial report failed: ${metricR.error.message}`);

  const entities = entitiesR.data ?? [];
  assert(entities.length === 3, `P1B.15 expected 3 protected Registry targets, got ${entities.length}`);
  const entityById = new Map(entities.map((e: any) => [String(e.id), e]));
  for (const [id, parent] of [
    ["district_agadir_dakhla", "city_agadir"],
    ["district_agadir_hay_mohammadi", "city_agadir"],
    ["district_casablanca_oasis", "city_casablanca"],
  ] as const) {
    const e: any = entityById.get(id);
    assert(e && e.entity_type === "neighborhood" && e.parent_id === parent && e.validation_status === "validated", `Registry target drift: ${id}`);
    assert(e.map_eligible === false && e.seo_eligible === false, `protected Registry target unexpectedly activated: ${id}`);
  }

  const latest = new Map<string, any>();
  for (const event of eventsR.data ?? []) {
    const id = String(event.source_record_id);
    if (newer(event, latest.get(id))) latest.set(id, event);
  }
  assert(latest.size === 13, `P1B.15 expected latest state for 13 controlled seeds, got ${latest.size}`);

  let agadirResolved = 0;
  let oasisResolved = 0;
  for (const [seedId, target] of AGADIR) {
    const e = latest.get(seedId);
    assert(e?.resolution_status === "resolved" && e?.resolved_neighborhood_id === target, `Agadir controlled resolution drift: ${seedId}`);
    assert(e?.resolver_version === "p1b12_tier_a_authority_canary_v1", `Agadir resolver lineage drift: ${seedId}`);
    agadirResolved += 1;
  }
  for (const seedId of OASIS) {
    const e = latest.get(seedId);
    assert(e?.resolution_status === "resolved" && e?.resolved_neighborhood_id === "district_casablanca_oasis", `Oasis controlled resolution drift: ${seedId}`);
    assert(e?.resolver_version === "p1b13d_oasis_authority_canary_v1", `Oasis resolver lineage drift: ${seedId}`);
    oasisResolved += 1;
  }

  const rawMetric = metricR.data;
  const metric = Array.isArray(rawMetric) ? (rawMetric[0]?.report ?? rawMetric[0]) : (rawMetric?.report ?? rawMetric);
  assert(metric?.contract_version === "p1b3_territorial_metric_join_v1", "P1B.3 territorial contract drift");
  assert(Number(metric.eligible_public_listings) > 0 && Number(metric.resolved_neighborhood_listings) > 0, "Geo coverage disappeared");
  assert(Number(metric.latest_resolution_collisions) === 0, "latest resolution collision detected");
  assert(Number(metric.conflicting_resolution_history) === 0, "conflicting resolution history detected");
  assert(Number(metric.missing_canonical_geo) === 0, "missing canonical Geo detected");
  assert(metric.metric_layers_activated === false, "territorial metric layer activated before reliability certification");
  assert(metric.gates?.no_inferred_neighborhoods === true && metric.gates?.no_search_or_display_policy_change === true, "P1B.3 truth gate drift");

  const report = {
    schema_version: "p1b15-geo-certification-v1",
    generated_at: new Date().toISOString(),
    contract: {
      read_only: true,
      registry_mutation: false,
      resolution_mutation: false,
      search_ranking_mutation: false,
      display_policy_mutation: false,
      fuzzy_geo_inference: false,
    },
    controlled_resolution_lineage: {
      total_latest_resolved: agadirResolved + oasisResolved,
      agadir_latest_resolved: agadirResolved,
      oasis_latest_resolved: oasisResolved,
      protected_registry_targets: 3,
    },
    global_geo_integrity: {
      eligible_public_listings: Number(metric.eligible_public_listings),
      resolved_neighborhood_listings: Number(metric.resolved_neighborhood_listings),
      coverage_percent: Number(metric.coverage_percent),
      latest_resolution_collisions: Number(metric.latest_resolution_collisions),
      conflicting_resolution_history: Number(metric.conflicting_resolution_history),
      missing_canonical_geo: Number(metric.missing_canonical_geo),
      metric_layers_activated: metric.metric_layers_activated,
    },
    geometry_integrity: {
      casablanca_administrative_type: "arrondissement",
      source_admin_level: "10",
      topology_audited_features: 16,
      topology_status: "passed",
      certified_neighborhood_polygon_bindings: 0,
      map_eligible_does_not_imply_polygon_binding: true,
      neighborhood_choropleth_allowed: false,
    },
    activation_decision: {
      p1c_shadow_allowed: true,
      p1c_public_activation_allowed: false,
      offer_metric_layer_allowed: false,
      p2_neighborhood_choropleth_allowed: false,
    },
    scope_note: "P1B.15 certifies Geo contract integrity and the controlled canary lineage; it does not claim every resolved listing is independently authority-reviewed, nor does it certify neighborhood polygon coverage.",
    verdict: "P1B15_GEO_FOUNDATION_CERTIFIED_FOR_P1C_SHADOW",
    next_lot: "P1C.1 — Offre quartier Shadow",
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

const invoked = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) runP1B15GeoCertification().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
