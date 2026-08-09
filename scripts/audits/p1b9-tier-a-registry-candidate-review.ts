#!/usr/bin/env tsx
// P1B.9 — Tier A Registry Candidate Review
// Read-only review. No DB/Registry mutation, no source-site request, no alias/entity creation.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const OUTPUT_PATH = join(process.cwd(), "data/audits/runtime/p1b9-tier-a-registry-candidate-review.json");
const CANDIDATE_PATH = join(process.cwd(), "data/geo/p1b9-tier-a-registry-candidates.json");
const P1B8_PATH = join(process.cwd(), "data/geo/p1b8-authority-evidence.json");
const PAGE = 1000;

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function readAll(table: string, columns: string, build?: (q: any) => any) {
  const client = getSupabaseServerClient();
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    let q: any = client.from(table).select(columns).range(from, from + PAGE - 1);
    if (build) q = build(q);
    const { data, error } = await q;
    if (error) throw new Error(`P1B.9 ${table} read failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function readInChunks(table: string, columns: string, column: string, values: string[], build?: (q: any) => any) {
  const client = getSupabaseServerClient();
  const rows: any[] = [];
  const unique = [...new Set(values)];
  for (let i = 0; i < unique.length; i += 100) {
    let q: any = client.from(table).select(columns).in(column, unique.slice(i, i + 100));
    if (build) q = build(q);
    const { data, error } = await q;
    if (error) throw new Error(`P1B.9 ${table} chunk read failed: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

function isNewerEvent(candidate: any, previous: any) {
  if (!previous) return true;
  const ca = String(candidate.created_at);
  const pa = String(previous.created_at);
  if (ca !== pa) return ca > pa;
  return String(candidate.id) > String(previous.id);
}

export async function runP1B9TierARegistryCandidateReview() {
  const manifest = JSON.parse(readFileSync(CANDIDATE_PATH, "utf8"));
  const p1b8 = JSON.parse(readFileSync(P1B8_PATH, "utf8"));
  const candidates = manifest.candidates ?? [];
  if (candidates.length !== 2) throw new Error("P1B.9 must remain bounded to exactly 2 candidates");

  const p1b8TierA = (p1b8.pairs ?? [])
    .filter((p: any) => p.authority_tier === "A" && p.decision === "AUTHORITY_CONFIRMED_NEIGHBORHOOD")
    .map((p: any) => ({ city: String(p.city), district: String(p.district), rows: Number(p.p1b7_rows), authority_url: p.evidence?.[0]?.url ?? null }))
    .sort((a: any, b: any) => `${a.city}/${a.district}`.localeCompare(`${b.city}/${b.district}`));

  const expectedTierA = [
    { city: "Agadir", district: "Dakhla", rows: 3 },
    { city: "Agadir", district: "Hay Mohammadi", rows: 5 },
  ];
  if (JSON.stringify(p1b8TierA.map(({city,district,rows}: any) => ({city,district,rows}))) !== JSON.stringify(expectedTierA)) {
    throw new Error("P1B.8 Tier A identity/count drifted");
  }

  const [entities, aliases, eligibleDocs, allSeeds] = await Promise.all([
    readAll("geo_entities", "id,parent_id,entity_type,slug,canonical_name,normalized_name,validation_status,seo_eligible,map_eligible,source_version"),
    readAll("geo_aliases", "geo_entity_id,alias,normalized_alias,locale,source,confidence"),
    readAll("thin_index_search_documents", "seed_id", (q) => q.eq("vertical_classification", "real_estate_likely").eq("document_kind", "LISTING").in("display_eligibility", ["eligible_primary", "eligible_secondary"])),
    readAll("source_offer_seeds", "id,source_domain,metadata"),
  ]);

  const agadir = entities.find((e) => e.id === "city_agadir");
  const parentReady = Boolean(agadir && agadir.entity_type === "city" && agadir.validation_status === "validated");
  const eligibleSeedIds = new Set(eligibleDocs.map((r) => String(r.seed_id)));
  const bridgedSeeds = allSeeds.filter((s) => eligibleSeedIds.has(String(s.id)) && String(s?.metadata?.coverage_bridge?.property_listing_id ?? "").trim() !== "");
  const listings = await readInChunks("property_listings", "id,city,district", "id", bridgedSeeds.map((s) => String(s.metadata.coverage_bridge.property_listing_id)));
  const listingById = new Map(listings.map((r) => [String(r.id), r]));
  const events = await readInChunks("geo_resolution_events", "id,source_record_type,source_record_id,resolution_status,resolved_neighborhood_id,created_at", "source_record_id", bridgedSeeds.map((s) => String(s.id)), (q) => q.eq("source_record_type", "source_offer_seed"));
  const latest = new Map<string, any>();
  for (const event of events) {
    const key = String(event.source_record_id);
    if (isNewerEvent(event, latest.get(key))) latest.set(key, event);
  }

  const reviews = candidates.map((candidate: any) => {
    const nd = normalize(candidate.district);
    const live = bridgedSeeds.filter((seed) => {
      const listing = listingById.get(String(seed.metadata.coverage_bridge.property_listing_id));
      const event = latest.get(String(seed.id));
      return normalize(listing?.city) === "agadir" && normalize(listing?.district) === nd && !(event?.resolution_status === "resolved" && event?.resolved_neighborhood_id);
    });
    const sourceDomains = [...new Set(live.map((s) => String(s.source_domain)))].sort();
    const idCollision = entities.some((e) => String(e.id) === candidate.proposed_entity_id);
    const slugCollision = entities.some((e) => String(e.slug) === candidate.proposed_slug);
    const normalizedNameCollision = entities.some((e) => normalize(e.normalized_name) === normalize(candidate.proposed_normalized_name));
    const aliasCollision = aliases.some((a) => normalize(a.normalized_alias) === normalize(candidate.proposed_exact_alias));
    const p1b8Evidence = p1b8TierA.find((p: any) => p.city === candidate.city && p.district === candidate.district);
    const authorityEvidenceStable = Boolean(p1b8Evidence && p1b8Evidence.authority_url === candidate.authority_url && candidate.authority_domain === "agadir.ma");
    const proposedIdentitySafe = candidate.proposed_parent_id === "city_agadir"
      && candidate.proposed_validation_status === "validated"
      && candidate.proposed_seo_eligible === false
      && candidate.proposed_map_eligible === false
      && candidate.write_eligible_in_p1b9 === false;
    const ready = parentReady
      && authorityEvidenceStable
      && live.length === Number(candidate.p1b8_listing_rows)
      && sourceDomains.length === 2
      && !idCollision && !slugCollision && !normalizedNameCollision && !aliasCollision
      && proposedIdentitySafe;
    return {
      city: candidate.city,
      district: candidate.district,
      live_unresolved_rows: live.length,
      source_domains: sourceDomains,
      parent_ready: parentReady,
      authority_evidence_stable: authorityEvidenceStable,
      collisions: { id: idCollision, slug: slugCollision, normalized_name: normalizedNameCollision, exact_alias: aliasCollision },
      proposed_identity_safe: proposedIdentitySafe,
      candidate_ready_for_bounded_write_design: ready,
    };
  });

  const allReady = reviews.every((r: any) => r.candidate_ready_for_bounded_write_design);
  const report = {
    schema_version: "p1b9-tier-a-registry-candidate-review-v1",
    generated_at: new Date().toISOString(),
    contract: {
      read_only: true,
      db_mutation: false,
      registry_mutation: false,
      alias_creation: false,
      entity_creation: false,
      geo_resolution_write: false,
      source_site_request: false,
      fuzzy_matching: false,
      title_snippet_inference: false,
      registry_write_authorized: false,
    },
    p1b8_tier_a_baseline: { pairs: 2, listing_rows: 8 },
    parent_city: { id: "city_agadir", validated: parentReady },
    candidates: reviews,
    ready_pairs: reviews.filter((r: any) => r.candidate_ready_for_bounded_write_design).length,
    ready_listing_rows: reviews.filter((r: any) => r.candidate_ready_for_bounded_write_design).reduce((sum: number, r: any) => sum + r.live_unresolved_rows, 0),
    verdict: allReady ? "TIER_A_REGISTRY_CANDIDATES_READY_FOR_BOUNDED_WRITE_DESIGN" : "TIER_A_REGISTRY_CANDIDATE_REVIEW_BLOCKED",
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

const invokedAsScript = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) runP1B9TierARegistryCandidateReview().catch((error) => { console.error(error instanceof Error ? error.stack ?? error.message : String(error)); process.exitCode = 1; });
