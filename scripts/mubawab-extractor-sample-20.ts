import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

import { runDiscovery, type DiscoveredListingRef } from "../data-ingestion/sources/mubawab/discovery.js";
import { extractMubawabCollectionListing } from "../data-ingestion/sources/mubawab/extractor.js";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "..", "data-ingestion", "runs", "mubawab", "lot3-sample-20");

const TARGET_SAMPLE_SIZE = 20;
const MAX_DETAIL_FETCHES = 32;
const MAX_REFS_PER_ROUTE = 4;

const discoveryPlans = [
  { city: "Casablanca", category_key: "apartment_sale" },
  { city: "Casablanca", category_key: "apartment_rent" },
  { city: "Casablanca", category_key: "villa_sale" },
  { city: "Casablanca", category_key: "villa_rent" },
  { city: "Casablanca", category_key: "house_sale" },
  { city: "Casablanca", category_key: "land_sale" },
  { city: "Casablanca", category_key: "commercial_sale" },
  { city: "Casablanca", category_key: "commercial_rent" },
  { city: "Marrakech", category_key: "riad_sale" },
  { city: "Marrakech", category_key: "riad_rent" },
] as const;

const seededRefs: DiscoveredListingRef[] = [
  {
    source_id: "8258601",
    url: "https://www.mubawab.ma/fr/a/8258601/appartement-%C3%A0-vendre-les-princesses",
    route_url: "seed:known-a",
    detail_family: "a",
  },
  {
    source_id: "8387298",
    url: "https://www.mubawab.ma/fr/pa/8387298/appartement-%C3%A0-vendre-%C3%A0-californie-surface-de-146-m%C2%B2",
    route_url: "seed:known-pa",
    detail_family: "pa",
  },
];

function clean(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function sourceEvidence(html: string) {
  const $ = load(html);
  const bodyText = clean($("body").text()) ?? "";
  return {
    h1: clean($("h1").first().text()),
    og_title: clean($("meta[property='og:title']").attr("content")),
    og_image: clean($("meta[property='og:image']").attr("content")),
    visible_price_hint: bodyText.match(/(?:\d[\d\s.,]{2,})\s*(?:DH|DHS|MAD)\b/i)?.[0] ?? null,
    visible_surface_hint: bodyText.match(/\b\d+(?:[.,]\d+)?\s*m(?:²|2)\b/i)?.[0] ?? null,
    body_excerpt: bodyText.slice(0, 700),
  };
}

function isPoorData(listing: ReturnType<typeof extractMubawabCollectionListing>) {
  const essentials = [
    listing.title,
    listing.transaction,
    listing.property_type,
    listing.price.amount,
    listing.surface.total_m2,
    listing.location.city,
    listing.rooms,
    listing.bedrooms,
    listing.bathrooms,
  ];
  const missing = essentials.filter((value) => value == null).length;
  return missing >= 3 || listing.quality.warnings.length >= 2;
}

function coverageFor(listings: Array<ReturnType<typeof extractMubawabCollectionListing>>) {
  return {
    apartment_sale: listings.some((v) => v.property_type === "apartment" && v.transaction === "sale"),
    apartment_rent: listings.some((v) => v.property_type === "apartment" && v.transaction === "rent"),
    villa_sale: listings.some((v) => v.property_type === "villa" && v.transaction === "sale"),
    villa_rent: listings.some((v) => v.property_type === "villa" && v.transaction === "rent"),
    house: listings.some((v) => v.property_type === "house"),
    land: listings.some((v) => v.property_type === "land"),
    commercial: listings.some((v) => v.property_type === "commercial"),
    riad: listings.some((v) => v.property_type === "riad"),
    on_request: listings.some((v) => v.price.amount == null && v.price.on_request === true),
    poor_data: listings.some(isPoorData),
    family_a: listings.some((v) => v.raw.detail_family === "a"),
    family_pa: listings.some((v) => v.raw.detail_family === "pa"),
  };
}

function coverageComplete(coverage: ReturnType<typeof coverageFor>) {
  return Object.values(coverage).every(Boolean);
}

async function checkedFetch(url: string) {
  const allowed = await isAllowedByRobots(url);
  if (!allowed) throw new Error(`robots_disallowed:${url}`);
  try {
    return await fetchHtml(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/HTTP\s+(403|429)\b/.test(message)) throw new Error(`explicit_source_block:${message}`);
    throw error;
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const discoveryReports = [];
  const routePools: DiscoveredListingRef[][] = [];

  for (const plan of discoveryPlans) {
    const result = await runDiscovery(
      async (url) => (await checkedFetch(url)).html,
      { maxPages: 1, city: plan.city, category_key: plan.category_key },
    );
    discoveryReports.push({ plan, manifest: result.manifest });
    routePools.push(result.listings.slice(0, MAX_REFS_PER_ROUTE));
  }

  const candidateRefs: DiscoveredListingRef[] = [...seededRefs];
  for (let index = 0; index < MAX_REFS_PER_ROUTE; index++) {
    for (const pool of routePools) {
      const ref = pool[index];
      if (ref) candidateRefs.push(ref);
    }
  }

  const dedupedCandidates = [...new Map(candidateRefs.map((ref) => [ref.source_id, ref])).values()];
  const fetchedRecords: Array<{
    ref: DiscoveredListingRef;
    listing: ReturnType<typeof extractMubawabCollectionListing>;
    evidence: ReturnType<typeof sourceEvidence>;
  }> = [];

  for (const ref of dedupedCandidates) {
    if (fetchedRecords.length >= MAX_DETAIL_FETCHES) break;
    const fetched = await checkedFetch(ref.url);
    const listing = extractMubawabCollectionListing(ref.url, fetched.html);
    fetchedRecords.push({ ref, listing, evidence: sourceEvidence(fetched.html) });
    if (fetchedRecords.length >= TARGET_SAMPLE_SIZE && coverageComplete(coverageFor(fetchedRecords.map((r) => r.listing)))) break;
  }

  const selected = fetchedRecords.slice(0, TARGET_SAMPLE_SIZE);
  const coverage = coverageFor(selected.map((r) => r.listing));
  const missingCoverage = Object.entries(coverage).filter(([, ok]) => !ok).map(([key]) => key);

  for (const [index, record] of selected.entries()) {
    await writeFile(join(outputDir, `${String(index + 1).padStart(2, "0")}-${record.ref.source_id}.json`), JSON.stringify(record, null, 2), "utf8");
  }

  const summary = {
    generated_at: new Date().toISOString(),
    target_sample_size: TARGET_SAMPLE_SIZE,
    selected_count: selected.length,
    detail_fetches: fetchedRecords.length,
    max_detail_fetches: MAX_DETAIL_FETCHES,
    discovery_pages_requested: discoveryReports.reduce((sum, item) => sum + item.manifest.pages_requested, 0),
    discovery_pages_failed: discoveryReports.reduce((sum, item) => sum + item.manifest.pages_failed, 0),
    coverage,
    missing_coverage: missingCoverage,
    selected: selected.map(({ ref, listing, evidence }) => ({
      source_id: ref.source_id,
      url: ref.url,
      discovered_from: ref.route_url,
      detail_family: listing.raw.detail_family,
      title: listing.title,
      transaction: listing.transaction,
      property_type: listing.property_type,
      price: listing.price,
      surface_m2: listing.surface.total_m2,
      rooms: listing.rooms,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      city: listing.location.city,
      district: listing.location.district,
      images_count: listing.images.length,
      warnings: listing.quality.warnings,
      poor_data: isPoorData(listing),
      source_evidence: evidence,
    })),
    database_writes: 0,
    image_downloads: 0,
    mass_ingestion: false,
  };

  await writeFile(join(outputDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  await writeFile(join(outputDir, "discovery.json"), JSON.stringify(discoveryReports, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));

  if (selected.length < TARGET_SAMPLE_SIZE) throw new Error(`sample_too_small:${selected.length}/${TARGET_SAMPLE_SIZE}`);
  if (missingCoverage.length) throw new Error(`sample_coverage_missing:${missingCoverage.join(",")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
