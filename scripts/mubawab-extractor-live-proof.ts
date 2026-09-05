import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { extractMubawabCollectionListing } from "../data-ingestion/sources/mubawab/extractor.js";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "..", "data-ingestion", "runs", "mubawab", "lot3-live-proof");

const samples = [
  {
    family: "a" as const,
    url: "https://www.mubawab.ma/fr/a/8258601/appartement-%C3%A0-vendre-les-princesses",
  },
  {
    family: "pa" as const,
    url: "https://www.mubawab.ma/fr/pa/8387298/appartement-%C3%A0-vendre-%C3%A0-californie-surface-de-146-m%C2%B2",
  },
];

async function main() {
  await mkdir(outputDir, { recursive: true });
  const results = [];

  for (const sample of samples) {
    const allowed = await isAllowedByRobots(sample.url);
    if (!allowed) throw new Error(`robots_disallowed:${sample.family}`);

    const fetched = await fetchHtml(sample.url);
    const listing = extractMubawabCollectionListing(sample.url, fetched.html);

    if (listing.raw.detail_family !== sample.family) throw new Error(`detail_family_mismatch:${sample.family}`);
    if (!listing.source.source_id) throw new Error(`source_id_missing:${sample.family}`);
    if (!listing.title) throw new Error(`title_missing:${sample.family}`);
    if (!listing.location.city) throw new Error(`city_missing:${sample.family}`);
    if (!listing.source.content_hash || listing.source.content_hash.length !== 64) throw new Error(`content_hash_invalid:${sample.family}`);
    if (listing.provenance.source_type !== "portal") throw new Error(`provenance_invalid:${sample.family}`);

    await writeFile(join(outputDir, `${sample.family}.json`), JSON.stringify(listing, null, 2), "utf8");
    results.push({
      family: sample.family,
      source_id: listing.source.source_id,
      title: listing.title,
      transaction: listing.transaction,
      property_type: listing.property_type,
      price: listing.price.amount,
      surface_m2: listing.surface.total_m2,
      rooms: listing.rooms,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      city: listing.location.city,
      district: listing.location.district,
      images: listing.images.length,
      features: listing.features.length,
      quality_score: listing.quality.score,
      warnings: listing.quality.warnings,
    });
  }

  const proof = {
    generated_at: new Date().toISOString(),
    samples: results,
    passed: results.length === 2,
    database_writes: 0,
    image_downloads: 0,
  };
  await writeFile(join(outputDir, "proof.json"), JSON.stringify(proof, null, 2), "utf8");
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
