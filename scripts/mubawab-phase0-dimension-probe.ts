import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  compareCoverageDimensions,
  extractCoverageDimensions,
  mergeCoverageDimensions,
} from "../data-ingestion/sources/mubawab/coverage-dimensions.js";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const CONFIG_PATH = join(process.cwd(), "data-ingestion", "sources", "mubawab", "config.json");
const OUTPUT_DIR = join(process.cwd(), "data-ingestion", "runs", "mubawab", "phase0-dimension-probe");
const PROOF_PATH = join(OUTPUT_DIR, "proof.json");
const REQUEST_DELAY_MS = 2750;

const SEEDS = [
  "https://www.mubawab.ma/fr",
  "https://www.mubawab.ma/fr/cc/immobilier-a-vendre",
  "https://www.mubawab.ma/fr/cc/immobilier-a-louer",
  "https://www.mubawab.ma/fr/sc/appartements-a-vendre",
  "https://www.mubawab.ma/fr/sc/appartements-a-louer",
  "https://www.mubawab.ma/fr/t/casablanca",
  "https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre",
  "https://www.mubawab.ma/fr/pl/cité-ennasr/listing-promotion",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const config = JSON.parse(await readFile(CONFIG_PATH, "utf8")) as {
    cities: { slug: string }[];
    categories: { st_slug: string }[];
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  const observations = [];
  const requested_urls: string[] = [];
  let lastRequestAt = 0;

  for (const url of SEEDS) {
    if (!(await isAllowedByRobots(url))) throw new Error(`robots_disallowed:${url}`);
    const elapsed = Date.now() - lastRequestAt;
    if (lastRequestAt > 0 && elapsed < REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS - elapsed);
    lastRequestAt = Date.now();
    requested_urls.push(url);
    const response = await fetchHtml(url, { timeoutMs: 20_000 });
    observations.push({ url, dimensions: extractCoverageDimensions(response.html, url) });
  }

  const discovered = mergeCoverageDimensions(observations.map((item) => item.dimensions));
  const gap = compareCoverageDimensions({
    discovered,
    configuredCitySlugs: config.cities.map((city) => city.slug),
    configuredCategorySlugs: config.categories.map((category) => category.st_slug),
  });

  const proof = {
    generated_at: new Date().toISOString(),
    mode: "phase0_dimension_probe",
    safety: {
      seeds: SEEDS.length,
      theoretical_max_page_requests: SEEDS.length,
      request_delay_ms: REQUEST_DELAY_MS,
      robots_checked: true,
      detail_pages_opened: 0,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
    },
    requested_urls,
    configured: {
      cities: config.cities.map((city) => city.slug),
      category_slugs: config.categories.map((category) => category.st_slug),
    },
    discovered,
    gap,
    observations,
  };

  await writeFile(PROOF_PATH, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));

  if (requested_urls.length !== SEEDS.length) {
    throw new Error(`phase0_dimension_probe_unexpected_request_count:${requested_urls.length}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
