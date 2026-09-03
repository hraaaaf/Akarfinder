import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CollectionListing } from "../data-ingestion/collection-adapter.js";
import {
  collectionSourceKey,
  propertyFingerprint,
  purgePortalSource,
  reconcileLifecycleRun,
  type LifecycleRecord,
} from "../data-ingestion/lifecycle.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "..", "data-ingestion", "runs", "lot5-lifecycle-proof");

function listing(args: {
  sourceName: string;
  sourceId: string;
  hashChar: string;
  sourceType?: CollectionListing["provenance"]["source_type"];
  price?: number;
  district?: string;
  surface?: number;
}): CollectionListing {
  const sourceType = args.sourceType ?? "portal";
  const url = `https://example.test/${args.sourceName}/${args.sourceId}`;
  return {
    akar_id: null,
    source: {
      name: args.sourceName,
      source_id: args.sourceId,
      url,
      first_seen_at: "2026-09-01T00:00:00.000Z",
      last_seen_at: "2026-09-01T00:00:00.000Z",
      scraped_at: "2026-09-01T00:00:00.000Z",
      content_hash: args.hashChar.repeat(64),
    },
    status: "active",
    transaction: "sale",
    property_type: "apartment",
    title: `Appartement ${args.sourceId}`,
    description: "Fixture Lot 5",
    price: { amount: args.price ?? 1_500_000, currency: "MAD", period: "total", on_request: false },
    surface: { total_m2: args.surface ?? 100, habitable_m2: null, built_m2: null, land_m2: null },
    rooms: 4,
    bedrooms: 2,
    bathrooms: 2,
    floor: 3,
    location: {
      country: "Morocco",
      region: null,
      city: "Casablanca",
      district: args.district ?? "Maarif",
      address_text: `${args.district ?? "Maarif"}, Casablanca`,
      latitude: null,
      longitude: null,
      precision: "neighborhood_centroid",
    },
    features: [],
    images: [],
    seller: { name: null, type: "unknown", source_profile_url: null },
    provenance: {
      source_type: sourceType,
      source_listing_url: url,
      retrieval_method: sourceType === "portal" ? "crawl" : "feed",
    },
    quality: { score: 100, warnings: [] },
    raw: {},
  };
}

function record(input: CollectionListing, propertyGroupId?: string): LifecycleRecord {
  const fp = propertyFingerprint(input);
  return {
    source_key: collectionSourceKey(input),
    property_group_id: propertyGroupId ?? `seed-${fp?.slice(0, 16) ?? input.source.source_id}`,
    listing: input,
    absence_runs: 0,
  };
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`proof_failed:${message}`);
}

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const scope = { source_name: "mubawab", source_type: "portal" as const };

  const unchangedSeed = listing({ sourceName: "mubawab", sourceId: "A", hashChar: "a", district: "Maarif", surface: 100 });
  const updateSeed = listing({ sourceName: "mubawab", sourceId: "B", hashChar: "b", district: "Palmier", surface: 90 });
  const disappearingSeed = listing({ sourceName: "mubawab", sourceId: "C", hashChar: "c", district: "Oasis", surface: 110 });
  const directSeed = listing({ sourceName: "agency-alpha", sourceId: "D", hashChar: "d", sourceType: "agency_direct", district: "Racine", surface: 80 });
  const partnerSeed = listing({ sourceName: "partner-x", sourceId: "P", hashChar: "p", sourceType: "partner_feed", district: "Gauthier", surface: 75 });

  const seedRecords = [
    record(unchangedSeed, "group-A"),
    record(updateSeed, "group-B"),
    record(disappearingSeed, "group-C"),
    record(directSeed, "group-direct"),
    record(partnerSeed, "group-partner"),
  ];

  const unchangedRun2 = listing({ sourceName: "mubawab", sourceId: "A", hashChar: "a", district: "Maarif", surface: 100 });
  const updatedRun2 = listing({ sourceName: "mubawab", sourceId: "B", hashChar: "e", price: 1_650_000, district: "Palmier", surface: 90 });
  const duplicateOfA = listing({ sourceName: "mubawab", sourceId: "A2", hashChar: "f", price: 1_520_000, district: "Maarif", surface: 100 });
  const portalMatchingDirect = listing({ sourceName: "mubawab", sourceId: "D2", hashChar: "g", price: 1_700_000, district: "Racine", surface: 80 });

  const run2 = reconcileLifecycleRun(
    seedRecords,
    [unchangedRun2, updatedRun2, duplicateOfA, portalMatchingDirect],
    scope,
    "2026-09-02T00:00:00.000Z",
  );

  requireCondition(run2.counts.unchanged === 1, "run2 unchanged count");
  requireCondition(run2.counts.update === 1, "run2 update count");
  requireCondition(run2.counts.insert === 2, "run2 insert count");
  requireCondition(run2.counts.stale === 1, "run2 stale count");
  requireCondition(run2.counts.out_of_scope === 2, "run2 direct/partner preserved");

  const a = run2.records.find((r) => r.source_key === "mubawab:A");
  const a2 = run2.records.find((r) => r.source_key === "mubawab:A2");
  const direct = run2.records.find((r) => r.source_key === "agency-alpha:D");
  const d2 = run2.records.find((r) => r.source_key === "mubawab:D2");
  requireCondition(a && a2 && a.property_group_id === a2.property_group_id, "same-property portal duplicates grouped");
  requireCondition(direct && d2 && direct.property_group_id === d2.property_group_id, "cross-source direct/portal grouped without merge");
  requireCondition(direct?.listing.provenance.source_type === "agency_direct", "direct provenance preserved");

  const run3Listings = run2.records
    .filter((r) => r.listing.source.name === "mubawab" && r.source_key !== "mubawab:C")
    .map((r) => ({ ...r.listing, source: { ...r.listing.source, scraped_at: "2026-09-03T00:00:00.000Z" } }));

  const run3 = reconcileLifecycleRun(run2.records, run3Listings, scope, "2026-09-03T00:00:00.000Z");
  const inactiveC = run3.records.find((r) => r.source_key === "mubawab:C");
  requireCondition(inactiveC?.listing.status === "inactive", "missing listing becomes inactive on second absent run");
  requireCondition(inactiveC?.absence_runs === 2, "inactive absence counter equals two");
  requireCondition(run3.records.filter((r) => r.source_key.startsWith("mubawab:")).length === 5, "portal stock cardinality stable");

  const purge = purgePortalSource(run3.records, "mubawab");
  requireCondition(purge.purged.length === 5, "all Mubawab portal records purgeable");
  requireCondition(purge.kept.some((r) => r.source_key === "agency-alpha:D"), "agency direct survives purge");
  requireCondition(purge.kept.some((r) => r.source_key === "partner-x:P"), "partner feed survives purge");

  const proof = {
    generated_at: new Date().toISOString(),
    scope,
    thresholds: { stale_after_missing_runs: 1, inactive_after_missing_runs: 2 },
    seed_records: seedRecords.length,
    run2: {
      counts: run2.counts,
      records: run2.records.length,
      duplicate_group_same_source: { a: a?.property_group_id, a2: a2?.property_group_id },
      cross_source_group: { direct: direct?.property_group_id, portal: d2?.property_group_id },
    },
    run3: {
      counts: run3.counts,
      records: run3.records.length,
      inactive_source_key: inactiveC?.source_key,
      inactive_absence_runs: inactiveC?.absence_runs,
    },
    purge: {
      purged_count: purge.purged.length,
      purged_source_keys: purge.purged.map((r) => r.source_key),
      kept_source_keys: purge.kept.map((r) => r.source_key),
      agency_direct_survives: purge.kept.some((r) => r.listing.provenance.source_type === "agency_direct"),
      partner_feed_survives: purge.kept.some((r) => r.listing.provenance.source_type === "partner_feed"),
    },
    database_writes: 0,
    production_writes: 0,
    assertions_passed: true,
  };

  await writeFile(join(outputDir, "proof.json"), JSON.stringify(proof, null, 2), "utf8");
  await writeFile(join(outputDir, "run2-decisions.json"), JSON.stringify(run2.decisions, null, 2), "utf8");
  await writeFile(join(outputDir, "run3-decisions.json"), JSON.stringify(run3.decisions, null, 2), "utf8");
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
