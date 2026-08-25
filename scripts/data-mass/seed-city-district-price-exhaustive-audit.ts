import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { extractExplicitDistrict, extractPriceMad, hasExplicitCitySignal } from "../../lib/openserp-ingestion/national-admission";
import { resolveNationalGeography } from "../../lib/openserp-ingestion/national-geography";
import { safeHttpUrl } from "../../lib/openserp-ingestion/utils";

type SeedRow = {
  id: string;
  canonical_url: string;
  source_domain: string;
  seed_provider: string;
  freshness_status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ListingSourceRow = { source_url: string | null };
type ListingRow = { id: number; city: string | null; district: string | null; price_mad: number | null };

const BATCH_SIZE = 1000;
const OUTPUT = "artifacts/seed-listing-conversion/exhaustive-audit.json";

function textAt(metadata: Record<string, unknown> | null, path: string[]): string | null {
  let current: unknown = metadata;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" && current.trim() ? current.trim() : null;
}

function evidence(seed: SeedRow): { title: string | null; snippet: string | null; query: string | null; cityHint: string | null } {
  return {
    title: textAt(seed.metadata, ["external_index", "title"]),
    snippet: textAt(seed.metadata, ["external_index", "snippet"]),
    query: textAt(seed.metadata, ["external_index", "query"]),
    cityHint: textAt(seed.metadata, ["external_index", "city"]),
  };
}

async function fetchSeeds(db: ReturnType<typeof createClient>) {
  const cutoff = new Date().toISOString();
  const rows: SeedRow[] = [];
  let cursor: string | null = null;
  let pages = 0;
  for (;;) {
    const base = db.from("source_offer_seeds")
      .select("id,canonical_url,source_domain,seed_provider,freshness_status,metadata,created_at")
      .lte("created_at", cutoff).order("id", { ascending: true }).limit(BATCH_SIZE);
    const { data, error } = await (cursor ? base.gt("id", cursor) : base);
    if (error) throw error;
    const page = (data ?? []) as SeedRow[];
    rows.push(...page);
    pages += 1;
    if (page.length < BATCH_SIZE) break;
    const next = page.at(-1)?.id;
    if (!next || next === cursor) throw new Error("SEED_AUDIT_CURSOR_STALLED");
    cursor = next;
  }
  return { rows, cutoff, pages };
}

async function fetchExistingListingUrls(db: ReturnType<typeof createClient>) {
  const urls = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await db.from("listing_sources").select("source_url").range(from, from + BATCH_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as ListingSourceRow[];
    for (const row of page) if (row.source_url) urls.add(row.source_url);
    if (page.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
  }
  return urls;
}

async function fetchListingBaseline(db: ReturnType<typeof createClient>) {
  const rows: ListingRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db.from("property_listings").select("id,city,district,price_mad").range(from, from + BATCH_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as ListingRow[];
    rows.push(...page);
    if (page.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
  }
  return rows;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [snapshot, existingListingUrls, listingBaseline] = await Promise.all([
    fetchSeeds(db), fetchExistingListingUrls(db), fetchListingBaseline(db),
  ]);

  const counts: Record<string, number> = {
    seeds: snapshot.rows.length, validHttpUrl: 0, explicitCity: 0, explicitDistrict: 0, explicitPrice: 0,
    cityDistrictPrice: 0, alreadyMaterializedByExactUrl: 0, netNewCityDistrictPrice: 0,
  };
  const byDomain: Record<string, number> = {};
  const byFreshness: Record<string, number> = {};
  const samples: Array<{ canonicalUrl: string; sourceDomain: string; city: string; district: string; priceMad: number; freshnessStatus: string }> = [];

  for (const seed of snapshot.rows) {
    const parsed = safeHttpUrl(seed.canonical_url);
    if (!parsed) continue;
    counts.validHttpUrl += 1;
    const e = evidence(seed);
    const title = e.title ?? "";
    const snippet = e.snippet ?? "";
    const geography = resolveNationalGeography({ url: seed.canonical_url, title, snippet, discoveryQuery: "" });
    const city = e.cityHint ?? geography.city;
    const cityExplicit = Boolean(city) && (Boolean(e.cityHint) || hasExplicitCitySignal({ city, url: seed.canonical_url, title, snippet }));
    if (cityExplicit) counts.explicitCity += 1;
    const district = city ? extractExplicitDistrict({ city, url: seed.canonical_url, title, snippet }) : null;
    if (district) counts.explicitDistrict += 1;
    const priceMad = extractPriceMad(`${title} ${snippet}`);
    if (priceMad != null) counts.explicitPrice += 1;
    if (!cityExplicit || !city || !district || priceMad == null) continue;

    counts.cityDistrictPrice += 1;
    const materialized = existingListingUrls.has(seed.canonical_url);
    if (materialized) counts.alreadyMaterializedByExactUrl += 1;
    else counts.netNewCityDistrictPrice += 1;
    byDomain[seed.source_domain] = (byDomain[seed.source_domain] ?? 0) + 1;
    byFreshness[seed.freshness_status] = (byFreshness[seed.freshness_status] ?? 0) + 1;
    if (samples.length < 100) samples.push({ canonicalUrl: seed.canonical_url, sourceDomain: seed.source_domain, city, district, priceMad, freshnessStatus: seed.freshness_status });
  }

  const result = {
    schemaVersion: "SEED_CITY_DISTRICT_PRICE_EXHAUSTIVE_AUDIT_V1",
    mode: "read_only",
    sourceSnapshot: { cutoffCreatedAt: snapshot.cutoff, pages: snapshot.pages, pagination: "keyset_uuid", batchSize: BATCH_SIZE },
    propertyListingBaseline: {
      total: listingBaseline.length,
      withCityDistrictPrice: listingBaseline.filter((row) => Boolean(row.city?.trim()) && Boolean(row.district?.trim()) && row.price_mad != null).length,
    },
    counts,
    byDomain: Object.fromEntries(Object.entries(byDomain).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    byFreshness: Object.fromEntries(Object.entries(byFreshness).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    samples,
    invariants: { databaseWrites: 0, sourceNetworkRequests: 0, fabricatedFields: 0, cityMustBeExplicit: true, districtMustBeExplicit: true, priceMustBeExplicit: true },
  };
  const output = resolve(process.env.SEED_LISTING_AUDIT_OUTPUT || OUTPUT);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...result, samples: samples.slice(0, 10) }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
