import fs from "node:fs";
import path from "node:path";

import {
  buildCommonCrawlPrefixQuery,
  parseCommonCrawlCdxJsonLines,
} from "../data-ingestion/sources/mubawab/commoncrawl-index";

const INDEX = "CC-MAIN-2026-34";
const LIMIT_PER_FAMILY = 250;
const CERTIFIED_STATE = path.resolve("data-ingestion/runs/mubawab/lot9-office-catalog-campaign/state.json");
const OUT_DIR = path.resolve("data-ingestion/runs/mubawab/phase0-commoncrawl-index-probe");
const OUT_FILE = path.join(OUT_DIR, "proof.json");

type CatalogState = { version: number; source: string; seen_source_ids: string[] };

async function fetchIndex(detailFamily: "a" | "pa") {
  const url = buildCommonCrawlPrefixQuery({ index: INDEX, detailFamily, limit: LIMIT_PER_FAMILY });
  const response = await fetch(url, {
    headers: { "User-Agent": "AkarFinderResearchBot/1.0 (+https://akarfinder.vercel.app)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`commoncrawl_http_${response.status}:${detailFamily}`);
  const raw = await response.text();
  return { url, refs: parseCommonCrawlCdxJsonLines(raw), raw_lines: raw.split(/\r?\n/).filter(Boolean).length };
}

async function main() {
  const state = JSON.parse(fs.readFileSync(CERTIFIED_STATE, "utf8")) as CatalogState;
  if (state.version !== 1 || state.source !== "mubawab" || state.seen_source_ids.length !== 31_731) {
    throw new Error("invalid_historical_mubawab_union");
  }
  const known = new Set(state.seen_source_ids);

  const observations = [];
  for (const family of ["a", "pa"] as const) observations.push(await fetchIndex(family));

  const byId = new Map<string, ReturnType<typeof parseCommonCrawlCdxJsonLines>[number]>();
  for (const observation of observations) {
    for (const ref of observation.refs) if (!byId.has(ref.source_id)) byId.set(ref.source_id, ref);
  }
  const refs = [...byId.values()];
  const alreadyKnown = refs.filter((ref) => known.has(ref.source_id));
  const absentHistorical = refs.filter((ref) => !known.has(ref.source_id));

  const proof = {
    generated_at: new Date().toISOString(),
    mode: "phase0_commoncrawl_index_probe",
    commoncrawl_index: INDEX,
    historical_union_unique_ids: known.size,
    safety: {
      index_requests: observations.length,
      request_limit_per_family: LIMIT_PER_FAMILY,
      mubawab_live_requests: 0,
      mubawab_detail_pages_opened: 0,
      disallowed_mubawab_pagination_requests: 0,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
    },
    observations: observations.map((item) => ({
      query_url: item.url,
      raw_lines: item.raw_lines,
      unique_listing_ids: item.refs.length,
      detail_family_counts: {
        a: item.refs.filter((ref) => ref.detail_family === "a").length,
        pa: item.refs.filter((ref) => ref.detail_family === "pa").length,
      },
    })),
    sample_union_unique_ids: refs.length,
    already_known_in_historical_union: alreadyKnown.length,
    absent_from_historical_union: absentHistorical.length,
    absent_source_ids: absentHistorical.map((ref) => ref.source_id),
    interpretation_rule: "This is a bounded viability probe, not a complete denominator. New IDs prove Common Crawl can supplement authorized discovery; zero new IDs does not prove uselessness without broader index coverage.",
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
