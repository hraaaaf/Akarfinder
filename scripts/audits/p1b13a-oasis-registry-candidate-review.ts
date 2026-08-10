#!/usr/bin/env tsx
// P1B.13A — Oasis Registry Candidate Review
// Read-only review of the single Tier A candidate promoted by P1B.13.
// This lot MUST NOT create Registry entities/aliases or geo resolution events.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const MANIFEST = join(process.cwd(), "data/geo/p1b13a-oasis-registry-candidate-review.json");
const OUTPUT = join(process.cwd(), "data/audits/runtime/p1b13a-oasis-registry-candidate-review.json");

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

export async function runP1B13AOasisRegistryCandidateReview() {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  assert(manifest.schema_version === "p1b13a-oasis-registry-candidate-review-v1", "unexpected manifest schema");
  for (const marker of ["read_only", "commercial_recurrence_is_not_geo_truth"]) assert(manifest.policy[marker] === true, `missing safe marker ${marker}`);
  for (const marker of ["db_mutation", "registry_mutation", "alias_creation", "entity_creation", "geo_resolution_write", "map_activation", "seo_activation"]) assert(manifest.policy[marker] === false, `unsafe marker ${marker}`);

  const c = manifest.candidate;
  assert(c.city_id === "city_casablanca" && c.city === "Casablanca" && c.district === "Oasis", "candidate drift");
  assert(c.proposed_entity_id === "district_casablanca_oasis" && c.proposed_slug === "oasis" && c.proposed_normalized_name === "oasis", "candidate identity drift");
  assert(c.authority_tier === "A" && c.authority_source === "casablancacity.ma", "authority boundary drift");

  const db = getSupabaseServerClient();
  const [parentR, listingsR, entityIdR, slugR, nameR, aliasR] = await Promise.all([
    db.from("geo_entities").select("id,entity_type,parent_id,canonical_name,normalized_name,slug,validation_status,map_eligible,seo_eligible,source_version").eq("id", c.city_id).maybeSingle(),
    db.from("property_listings").select("id,city,district").eq("city", c.city).eq("district", c.district),
    db.from("geo_entities").select("id,parent_id,slug,canonical_name,normalized_name").eq("id", c.proposed_entity_id),
    db.from("geo_entities").select("id,parent_id,slug,canonical_name,normalized_name").eq("slug", c.proposed_slug),
    db.from("geo_entities").select("id,parent_id,slug,canonical_name,normalized_name").eq("normalized_name", c.proposed_normalized_name),
    db.from("geo_aliases").select("geo_entity_id,alias,normalized_alias,source,confidence").eq("normalized_alias", c.proposed_normalized_name),
  ]);
  for (const [label, response] of [["parent", parentR], ["listings", listingsR], ["entity-id", entityIdR], ["slug", slugR], ["name", nameR], ["alias", aliasR]] as const) {
    if (response.error) throw new Error(`P1B.13A ${label} read failed: ${response.error.message}`);
  }
  const parent: any = parentR.data;
  assert(parent?.id === c.city_id && parent?.entity_type === "city" && parent?.validation_status === "validated", "Casablanca parent is not validated");
  assert((entityIdR.data ?? []).length === 0, "target entity id collision");
  assert((slugR.data ?? []).length === 0, "target slug collision");
  assert((nameR.data ?? []).length === 0, "target normalized-name collision");
  assert((aliasR.data ?? []).length === 0, "target alias collision");

  const listingIds = (listingsR.data ?? []).map((row: any) => String(row.id));
  assert(listingIds.length > 0, "Oasis property listings disappeared");
  const seedsR = await db.from("source_offer_seeds").select("id,source_domain,metadata").in("metadata->coverage_bridge->>property_listing_id", listingIds);
  if (seedsR.error) throw new Error(`P1B.13A seeds read failed: ${seedsR.error.message}`);
  const seeds = seedsR.data ?? [];
  const seedIds = seeds.map((row: any) => String(row.id));
  const [docsR, eventsR] = await Promise.all([
    db.from("thin_index_search_documents").select("seed_id,vertical_classification,document_kind,display_eligibility").in("seed_id", seedIds),
    db.from("geo_resolution_events").select("id,source_record_id,resolution_status,resolved_neighborhood_id,created_at").eq("source_record_type", "source_offer_seed").in("source_record_id", seedIds).order("created_at", { ascending: false }),
  ]);
  if (docsR.error) throw new Error(`P1B.13A docs read failed: ${docsR.error.message}`);
  if (eventsR.error) throw new Error(`P1B.13A events read failed: ${eventsR.error.message}`);

  const eligible = new Set((docsR.data ?? []).filter((d: any) => d.vertical_classification === "real_estate_likely" && d.document_kind === "LISTING" && ["eligible_primary", "eligible_secondary"].includes(d.display_eligibility)).map((d: any) => String(d.seed_id)));
  const latest = new Map<string, any>();
  for (const e of eventsR.data ?? []) if (!latest.has(String((e as any).source_record_id))) latest.set(String((e as any).source_record_id), e);
  const cohort = seeds.filter((s: any) => eligible.has(String(s.id)) && !((latest.get(String(s.id)) as any)?.resolution_status === "resolved" && (latest.get(String(s.id)) as any)?.resolved_neighborhood_id));
  const domains = [...new Set(cohort.map((s: any) => String(s.source_domain)))];
  assert(cohort.length === c.expected_listing_rows, `Oasis cohort drift: expected ${c.expected_listing_rows}, got ${cohort.length}`);
  assert(domains.length === c.expected_source_domains, `Oasis source-domain drift: expected ${c.expected_source_domains}, got ${domains.length}`);

  const report = {
    schema_version: "p1b13a-oasis-registry-candidate-review-v1",
    generated_at: new Date().toISOString(),
    contract: manifest.policy,
    candidate: {
      city_id: c.city_id,
      city: c.city,
      district: c.district,
      proposed_entity_id: c.proposed_entity_id,
      proposed_slug: c.proposed_slug,
      authority_tier: c.authority_tier,
    },
    live: {
      parent_validated: true,
      eligible_unresolved_seeds: cohort.length,
      source_domains: domains.length,
      target_entity_id_collisions: 0,
      target_slug_collisions: 0,
      target_name_collisions: 0,
      target_alias_collisions: 0,
    },
    registry_write_authorized_by_this_lot: false,
    verdict: "P1B13A_OASIS_REGISTRY_CANDIDATE_READY_FOR_SEPARATE_WRITE_DESIGN",
    next_boundary: manifest.next_boundary,
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

const invoked = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) runP1B13AOasisRegistryCandidateReview().catch((error) => { console.error(error instanceof Error ? error.stack ?? error.message : String(error)); process.exitCode = 1; });
