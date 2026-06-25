// P6 enrichment script: computes duplicate groups and reliability scores
// across the entire property_listings table and persists results to DB.
//
// Usage: npm run enrich:p6
//
// Safe to re-run — idempotent UPDATE statements overwrite previous values.
// Never deletes or merges listings.
import { openDb, jsonify, DEFAULT_DB_PATH } from "./db/client.ts";
import {
  assignDuplicateGroupsFromRows,
  type DbRowForDuplicate,
} from "../../lib/listings/duplicate.ts";
import {
  computeReliabilityScore,
} from "../../lib/listings/reliability.ts";

type EnrichRow = DbRowForDuplicate & {
  field_confidence: string | null;
  images_count: number | null;
  seller_name: string | null;
  description_snippet: string | null;
};

type UpdatePayload = {
  id: number;
  duplicate_group_id: string;
  duplicate_score: number;
  reliability_score: number;
  reliability_badge: string;
  reliability_reasons: string; // JSON string[]
};

export function enrichAll(dbPath = DEFAULT_DB_PATH): void {
  const db = openDb(dbPath);

  console.log("[enrich-p6] Loading all rows from property_listings...");

  const rows = db
    .prepare(
      `SELECT
         id, city, property_type, transaction_type, price_mad, surface_m2,
         bedrooms_count, title, data_completeness_score, canonical_fingerprint,
         field_confidence, images_count, seller_name, description_snippet
       FROM property_listings
       ORDER BY id`
    )
    .all() as EnrichRow[];

  console.log(`[enrich-p6] ${rows.length} rows loaded.`);

  if (rows.length === 0) {
    console.log("[enrich-p6] Nothing to enrich.");
    db.close();
    return;
  }

  // Group by city (lowercase) to limit pairwise comparisons to same-city rows.
  const byCity = new Map<string, EnrichRow[]>();
  for (const row of rows) {
    const key = (row.city ?? "__unknown__").toLowerCase().trim();
    const group = byCity.get(key) ?? [];
    group.push(row);
    byCity.set(key, group);
  }

  // Run duplicate detection per city group, collect all results.
  const dupMap = new Map<string, { group_id: string; score: number }>();

  for (const [city, cityRows] of byCity) {
    const cityDups = assignDuplicateGroupsFromRows(cityRows);
    for (const [id, info] of cityDups) {
      dupMap.set(id, info);
    }
    const groups = new Set([...cityDups.values()].map((d) => d.group_id));
    console.log(
      `[enrich-p6]   ${city}: ${cityRows.length} rows, ${groups.size} groups`
    );
  }

  // Compute reliability for each row using the duplicate_score from above.
  const payloads: UpdatePayload[] = rows.map((row) => {
    const dup = dupMap.get(String(row.id)) ?? {
      group_id: String(row.id),
      score: 0,
    };

    const rel = computeReliabilityScore({
      data_completeness_score: row.data_completeness_score,
      field_confidence_json: row.field_confidence,
      price_mad: row.price_mad,
      surface_m2: row.surface_m2,
      city: row.city,
      description_snippet: row.description_snippet,
      seller_name: row.seller_name,
      images_count: row.images_count,
      duplicate_score: dup.score,
    });

    return {
      id: row.id,
      duplicate_group_id: dup.group_id,
      duplicate_score: dup.score,
      reliability_score: rel.score,
      reliability_badge: rel.badge,
      reliability_reasons: jsonify(rel.reasons) ?? "[]",
    };
  });

  // Batch UPDATE in a single transaction for performance.
  console.log(`[enrich-p6] Writing ${payloads.length} rows...`);

  const stmt = db.prepare(
    `UPDATE property_listings
     SET duplicate_group_id = ?,
         duplicate_score     = ?,
         reliability_score   = ?,
         reliability_badge   = ?,
         reliability_reasons = ?,
         updated_at          = datetime('now')
     WHERE id = ?`
  );

  db.exec("BEGIN");
  for (const p of payloads) {
    stmt.run(
      p.duplicate_group_id,
      p.duplicate_score,
      p.reliability_score,
      p.reliability_badge,
      p.reliability_reasons,
      p.id
    );
  }
  db.exec("COMMIT");

  // Summary stats
  const dupCount = payloads.filter((p) => p.duplicate_score >= 0.70).length;
  const avgRel = Math.round(
    payloads.reduce((s, p) => s + p.reliability_score, 0) / payloads.length
  );

  console.log(`[enrich-p6] Done.`);
  console.log(`  Total rows enriched : ${payloads.length}`);
  console.log(`  Near-duplicates     : ${dupCount}`);
  console.log(`  Avg reliability     : ${avgRel}/100`);

  db.close();
}

// Auto-run when executed as a script (not when imported by tests).
if (
  process.argv[1]?.includes("enrich-p6")
) {
  enrichAll();
}
