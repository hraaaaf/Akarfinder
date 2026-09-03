import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runDiscovery } from "../data-ingestion/sources/mubawab/discovery.js";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "..", "data-ingestion", "runs", "mubawab", "discovery-latest");

function maxPagesFromEnv() {
  const raw = Number.parseInt(process.env.MUBAWAB_DISCOVERY_MAX_PAGES ?? "2", 10);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 10) : 2;
}

async function fetchDiscoveryPage(url: string): Promise<string> {
  const allowed = await isAllowedByRobots(url);
  if (!allowed) throw new Error("robots_disallowed");
  const result = await fetchHtml(url);
  return result.html;
}

async function main() {
  const result = await runDiscovery(fetchDiscoveryPage, {
    maxPages: maxPagesFromEnv(),
    city: process.env.MUBAWAB_DISCOVERY_CITY || undefined,
    category_key: process.env.MUBAWAB_DISCOVERY_CATEGORY || undefined,
  });
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, "discovery-manifest.json"), JSON.stringify(result.manifest, null, 2), "utf8");
  await writeFile(join(outputDir, "listing-refs.jsonl"), result.listings.map((listing) => JSON.stringify(listing)).join("\n") + (result.listings.length ? "\n" : ""), "utf8");

  console.log(JSON.stringify({
    source: result.manifest.source,
    routes: result.manifest.routes_total,
    succeeded: result.manifest.pages_succeeded,
    failed: result.manifest.pages_failed,
    unique_listings: result.manifest.unique_listings,
    duplicate_refs: result.manifest.duplicate_refs,
    detail_family_counts: result.manifest.detail_family_counts,
    output_dir: outputDir,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
