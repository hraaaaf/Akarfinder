#!/usr/bin/env tsx
// P1B.13 — Geo Coverage Recovery Expansion
// Read-only qualification of the current top-5 explicit-district Registry gaps.
// No Registry or geo-resolution mutation is authorized by this audit.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const MANIFEST = join(process.cwd(), "data/geo/p1b13-priority-authority-evidence.json");
const OUTPUT = join(process.cwd(), "data/audits/runtime/p1b13-geo-coverage-recovery-expansion.json");

const ALLOWED_AUTHORITIES = new Set([
  "auc.ma",
  "casablancacity.ma",
  "visitcasablanca.ma",
  "aumarrakech.ma",
  "ville-marrakech.ma",
]);
const COMMERCIAL = new Set(["mouldar.com", "mubawab.ma", "marrakechrealty.com", "avito.ma", "agenz.ma"]);

type Pair = {
  city: string;
  district: string;
  rows: number;
  source_domains: string[];
  authority_tier: "A" | "B" | "C" | "NONE";
  decision: string;
  observed_entity_type: string;
  evidence: Array<{ domain: string; url: string; authority_kind: string; claim_kind: string; summary: string }>;
  reviewed_authorities?: string[];
  registry_write_authorized_in_p1b13: boolean;
  next_action: string;
};

type Manifest = {
  schema_version: string;
  reviewed_at: string;
  input_contract: string;
  policy: Record<string, boolean>;
  pairs: Pair[];
};

function norm(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}
function domain(value: string) {
  return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
}
function key(city: string, district: string) {
  return `${norm(city)}\u0000${norm(district)}`;
}
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function latestBySource(events: any[]) {
  const latest = new Map<string, any>();
  for (const event of events) {
    const id = String(event.source_record_id);
    const current = latest.get(id);
    if (!current || String(event.created_at) > String(current.created_at) || (String(event.created_at) === String(current.created_at) && String(event.id) > String(current.id))) latest.set(id, event);
  }
  return latest;
}

export async function runP1B13GeoCoverageRecoveryExpansion() {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest;
  assert(manifest.schema_version === "p1b13-priority-authority-evidence-v1", "unexpected P1B.13 manifest schema");
  assert(manifest.pairs.length === 5, `P1B.13 priority manifest must contain 5 pairs, got ${manifest.pairs.length}`);
  for (const marker of ["read_only", "commercial_recurrence_is_not_geo_truth", "property_portals_are_not_authority", "entity_type_must_be_explicitly_supported"]) assert(manifest.policy[marker] === true, `missing safe policy marker ${marker}`);
  for (const marker of ["db_mutation", "registry_mutation", "alias_creation", "entity_creation", "geo_resolution_write"]) assert(manifest.policy[marker] === false, `unsafe mutation marker ${marker}`);

  const pairKeys = new Set<string>();
  for (const pair of manifest.pairs) {
    const pairKey = key(pair.city, pair.district);
    assert(!pairKeys.has(pairKey), `duplicate pair ${pair.city} — ${pair.district}`);
    pairKeys.add(pairKey);
    assert(pair.registry_write_authorized_in_p1b13 === false, `P1B.13 may not authorize Registry writes: ${pair.city} — ${pair.district}`);
    if (pair.authority_tier === "A") {
      assert(pair.decision === "AUTHORITY_CONFIRMED_NEIGHBORHOOD", `Tier A must be explicit neighborhood authority: ${pair.city} — ${pair.district}`);
      assert(pair.observed_entity_type === "neighborhood", `Tier A entity type must be neighborhood: ${pair.city} — ${pair.district}`);
      assert(pair.evidence.length > 0, `Tier A requires authority evidence: ${pair.city} — ${pair.district}`);
    }
    if (pair.authority_tier === "NONE") {
      assert(pair.evidence.length === 0, `NONE tier cannot carry positive evidence: ${pair.city} — ${pair.district}`);
      assert((pair.reviewed_authorities?.length ?? 0) > 0, `NONE tier requires review scope: ${pair.city} — ${pair.district}`);
    }
    for (const evidence of pair.evidence) {
      const actual = domain(evidence.url);
      assert(actual === evidence.domain.replace(/^www\./, ""), `evidence domain mismatch: ${pair.city} — ${pair.district}`);
      assert(ALLOWED_AUTHORITIES.has(actual), `unapproved authority domain ${actual}`);
      assert(!COMMERCIAL.has(actual), `commercial portal cannot be authority ${actual}`);
      assert(evidence.summary.length > 30, `weak evidence summary: ${pair.city} — ${pair.district}`);
    }
    for (const reviewed of pair.reviewed_authorities ?? []) {
      assert(ALLOWED_AUTHORITIES.has(reviewed), `unapproved reviewed authority ${reviewed}`);
      assert(!COMMERCIAL.has(reviewed), `commercial portal cannot define review scope ${reviewed}`);
    }
  }

  const db = getSupabaseServerClient();
  const cities = [...new Set(manifest.pairs.map((p) => p.city))];
  const districts = [...new Set(manifest.pairs.map((p) => p.district))];
  const listingsR = await db.from("property_listings").select("id,city,district").in("city", cities).in("district", districts);
  if (listingsR.error) throw new Error(`P1B.13 property_listings read failed: ${listingsR.error.message}`);
  const listings = (listingsR.data ?? []).filter((row: any) => pairKeys.has(key(row.city, row.district)));
  const listingIds = listings.map((row: any) => String(row.id));
  assert(listingIds.length > 0, "P1B.13 priority listings disappeared");

  const seedsR = await db.from("source_offer_seeds").select("id,source_domain,metadata").in("metadata->coverage_bridge->>property_listing_id", listingIds);
  if (seedsR.error) throw new Error(`P1B.13 source_offer_seeds read failed: ${seedsR.error.message}`);
  const seeds = seedsR.data ?? [];
  const seedIds = seeds.map((row: any) => String(row.id));
  const [docsR, eventsR] = await Promise.all([
    db.from("thin_index_search_documents").select("seed_id,vertical_classification,document_kind,display_eligibility").in("seed_id", seedIds),
    db.from("geo_resolution_events").select("id,source_record_id,resolution_status,resolved_neighborhood_id,created_at").eq("source_record_type", "source_offer_seed").in("source_record_id", seedIds),
  ]);
  if (docsR.error) throw new Error(`P1B.13 documents read failed: ${docsR.error.message}`);
  if (eventsR.error) throw new Error(`P1B.13 resolution events read failed: ${eventsR.error.message}`);
  const eligible = new Set((docsR.data ?? []).filter((d: any) => d.vertical_classification === "real_estate_likely" && d.document_kind === "LISTING" && ["eligible_primary", "eligible_secondary"].includes(d.display_eligibility)).map((d: any) => String(d.seed_id)));
  const latest = latestBySource(eventsR.data ?? []);
  const listingById = new Map(listings.map((row: any) => [String(row.id), row]));

  const live = new Map<string, { city: string; district: string; rows: number; domains: Set<string> }>();
  for (const seed of seeds as any[]) {
    const seedId = String(seed.id);
    if (!eligible.has(seedId)) continue;
    const last = latest.get(seedId);
    if (last?.resolution_status === "resolved" && last?.resolved_neighborhood_id) continue;
    const listingId = String(seed?.metadata?.coverage_bridge?.property_listing_id ?? "");
    const listing: any = listingById.get(listingId);
    if (!listing) continue;
    const pairKey = key(listing.city, listing.district);
    if (!pairKeys.has(pairKey)) continue;
    const bucket = live.get(pairKey) ?? { city: String(listing.city), district: String(listing.district), rows: 0, domains: new Set<string>() };
    bucket.rows += 1;
    bucket.domains.add(String(seed.source_domain));
    live.set(pairKey, bucket);
  }

  for (const pair of manifest.pairs) {
    const current = live.get(key(pair.city, pair.district));
    assert(current, `P1B.13 live pair disappeared: ${pair.city} — ${pair.district}`);
    assert(current.rows === pair.rows, `P1B.13 row drift ${pair.city} — ${pair.district}: expected ${pair.rows}, got ${current.rows}`);
    const actualDomains = [...current.domains].sort();
    const expectedDomains = [...pair.source_domains].sort();
    assert(JSON.stringify(actualDomains) === JSON.stringify(expectedDomains), `P1B.13 source drift ${pair.city} — ${pair.district}`);
  }

  const tierA = manifest.pairs.filter((pair) => pair.authority_tier === "A");
  const report = {
    schema_version: "p1b13-geo-coverage-recovery-expansion-v1",
    generated_at: new Date().toISOString(),
    contract: { read_only: true, db_mutation: false, registry_mutation: false, geo_resolution_write: false, map_activation: false, seo_activation: false },
    priority_pairs: manifest.pairs.length,
    priority_listing_rows: manifest.pairs.reduce((sum, pair) => sum + pair.rows, 0),
    authority_confirmed_neighborhood_pairs: tierA.length,
    authority_confirmed_listing_rows: tierA.reduce((sum, pair) => sum + pair.rows, 0),
    authority_confirmed: tierA.map((pair) => ({ city: pair.city, district: pair.district, rows: pair.rows })),
    registry_write_authorized_pairs: 0,
    verdict: "P1B13_PRIORITY_AUTHORITY_REVIEW_COMPLETE_NO_WRITE",
    next_boundary: tierA.length > 0 ? "Separate bounded Registry candidate review for Tier A pairs only." : "Continue authority evidence recovery; no Registry candidate is ready.",
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

const invoked = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) runP1B13GeoCoverageRecoveryExpansion().catch((error) => { console.error(error instanceof Error ? error.stack ?? error.message : String(error)); process.exitCode = 1; });
