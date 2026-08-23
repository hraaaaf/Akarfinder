import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const OUTPUT = "artifacts/mass-index/m5-shadow-dedup.json";
const PAGE_SIZE = 1000;

type Row = {
  seed_id: string;
  source_domain: string;
  canonical_url: string;
  normalized_city: string;
  normalized_property_type: string;
  normalized_intent: string;
  normalized_price_mad: number | string;
  normalized_surface_m2: number | string;
};

function dimensionKey(row: Row) {
  return [
    row.normalized_city,
    row.normalized_property_type,
    row.normalized_intent,
    String(row.normalized_price_mad),
    String(row.normalized_surface_m2),
  ].join("\u001f");
}

function groupId(key: string) {
  return createHash("sha256").update(key).digest("hex").slice(0, 24);
}

async function exactCount(db: ReturnType<typeof createClient>, full: boolean) {
  let q = db
    .from("thin_index_search_documents")
    .select("*", { count: "exact", head: true })
    .eq("vertical_classification", "real_estate_likely")
    .eq("document_kind", "LISTING");
  if (full) {
    q = q
      .not("normalized_city", "is", null)
      .not("normalized_property_type", "is", null)
      .not("normalized_intent", "is", null)
      .not("normalized_price_mad", "is", null)
      .not("normalized_surface_m2", "is", null);
  }
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function fetchFullRows(db: ReturnType<typeof createClient>) {
  const rows: Row[] = [];
  let cursor: string | null = null;
  for (;;) {
    const base = db
      .from("thin_index_search_documents")
      .select("seed_id,source_domain,canonical_url,normalized_city,normalized_property_type,normalized_intent,normalized_price_mad,normalized_surface_m2")
      .eq("vertical_classification", "real_estate_likely")
      .eq("document_kind", "LISTING")
      .not("normalized_city", "is", null)
      .not("normalized_property_type", "is", null)
      .not("normalized_intent", "is", null)
      .not("normalized_price_mad", "is", null)
      .not("normalized_surface_m2", "is", null)
      .order("seed_id", { ascending: true })
      .limit(PAGE_SIZE);
    const q = cursor ? base.gt("seed_id", cursor) : base;
    const { data, error } = await q;
    if (error) throw error;
    const page = (data ?? []) as Row[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    const next = page.at(-1)?.seed_id;
    if (!next || next === cursor) throw new Error("M5_SHADOW_CURSOR_STALLED");
    cursor = next;
  }
  return rows;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const totalListings = await exactCount(db, false);
  const rows = await fetchFullRows(db);
  const fullDimensionListings = await exactCount(db, true);
  if (rows.length !== fullDimensionListings) throw new Error("M5_SHADOW_FULL_DIM_COUNT_DRIFT");

  const buckets = new Map<string, Row[]>();
  for (const row of rows) {
    const keyValue = dimensionKey(row);
    const bucket = buckets.get(keyValue) ?? [];
    bucket.push(row);
    buckets.set(keyValue, bucket);
  }

  const candidateGroups = [...buckets.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([keyValue, members]) => {
      const sorted = [...members].sort((a, b) =>
        a.source_domain.localeCompare(b.source_domain) || a.canonical_url.localeCompare(b.canonical_url),
      );
      const sourceDomains = [...new Set(sorted.map((row) => row.source_domain))].sort();
      return {
        candidateGroupId: groupId(keyValue),
        classification: "EXACT_FULL_DIMENSION_COLLISION_NOT_DUPLICATE_PROOF",
        crossSource: sourceDomains.length > 1,
        memberCount: sorted.length,
        sourceDomains,
        dimensions: {
          city: sorted[0].normalized_city,
          propertyType: sorted[0].normalized_property_type,
          intent: sorted[0].normalized_intent,
          priceMad: sorted[0].normalized_price_mad,
          surfaceM2: sorted[0].normalized_surface_m2,
        },
        members: sorted.map((row) => ({
          seedId: row.seed_id,
          sourceDomain: row.source_domain,
          canonicalUrl: row.canonical_url,
        })),
      };
    })
    .sort((a, b) => a.candidateGroupId.localeCompare(b.candidateGroupId));

  const result = {
    schemaVersion: "MASS_INDEX_M5_SHADOW_DEDUP_V1",
    mode: "read_only_shadow",
    generatedAt: new Date().toISOString(),
    scope: "THIN_INDEX_REAL_ESTATE_LISTINGS_WITH_EXACT_FULL_DIMENSIONS",
    method: "EXACT_CITY_TYPE_INTENT_PRICE_SURFACE_COLLISION",
    summary: {
      totalRealEstateListings: totalListings,
      fullDimensionListings,
      candidateGroups: candidateGroups.length,
      representationsInCandidateGroups: candidateGroups.reduce((sum, group) => sum + group.memberCount, 0),
      crossSourceCandidateGroups: candidateGroups.filter((group) => group.crossSource).length,
      crossSourceRepresentations: candidateGroups
        .filter((group) => group.crossSource)
        .reduce((sum, group) => sum + group.memberCount, 0),
    },
    candidateGroups,
    invariants: {
      databaseWrites: 0,
      sourceNetworkRequests: 0,
      publicActivations: 0,
      propertyClustersMutated: 0,
      uniquePropertyMetricClaimed: false,
      collisionIsDuplicateProof: false,
    },
  };

  if (result.summary.fullDimensionListings > result.summary.totalRealEstateListings) {
    throw new Error("M5_SHADOW_COUNT_INVARIANT");
  }
  if (candidateGroups.some((group) => group.memberCount < 2)) throw new Error("M5_SHADOW_GROUP_SIZE_INVALID");

  const outputPath = resolve(process.env.MASS_INDEX_M5_SHADOW_OUTPUT || OUTPUT);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...result, candidateGroups: candidateGroups.map(({ members, ...group }) => ({ ...group, members: members.length })) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
