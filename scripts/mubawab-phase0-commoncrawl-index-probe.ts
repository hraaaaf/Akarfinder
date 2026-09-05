import fs from "node:fs";
import path from "node:path";

import {
  buildCommonCrawlPageCountQuery,
  buildCommonCrawlPrefixQuery,
  parseCommonCrawlCdxJsonLines,
  parseCommonCrawlPageCount,
  selectSpreadPages,
} from "../data-ingestion/sources/mubawab/commoncrawl-index";
import { summarizeExternalRecovery } from "../data-ingestion/sources/mubawab/external-recovery-reconciliation";

const INDEXES = ["CC-MAIN-2026-34", "CC-MAIN-2026-30", "CC-MAIN-2026-25"] as const;
const DETAIL_FAMILIES = ["a", "pa"] as const;
const PAGE_SIZE_BLOCKS = 1;
const MAX_PAGES_PER_FAMILY_PER_INDEX = 3;
const LIMIT_PER_PAGE = 1000;
const REQUEST_DELAY_MS = 1250;
const HISTORICAL_STATE = path.resolve("data-ingestion/runs/mubawab/lot9-office-catalog-campaign/state.json");
const CURRENT_CONTROL_PROOF = path.resolve("data-ingestion/runs/mubawab/phase0-authorized-leaf-probe/proof.json");
const OUT_DIR = path.resolve("data-ingestion/runs/mubawab/phase0-commoncrawl-index-probe");
const OUT_FILE = path.join(OUT_DIR, "proof.json");

type CatalogState = { version: number; source: string; seen_source_ids: string[] };
type CurrentLeafProof = { assessments: Array<{ first_page_unit_ids: string[] }>; summary?: { observed_unit_ids?: number } };
type ListingRef = ReturnType<typeof parseCommonCrawlCdxJsonLines>[number];
type PageObservation = { page: number; query_url: string; raw_lines: number; unique_listing_ids: number };
type FamilyObservation = {
  index: string; detail_family: "a" | "pa"; page_count_query_url: string; pages_available: number;
  blocks_available: number | null; selected_pages: number[]; page_observations: PageObservation[];
  raw_lines: number; unique_listing_ids: number; refs: ListingRef[];
};
type AggregateRef = {
  source_id: string; detail_families: Set<"a" | "pa">; indexes: Set<string>;
  earliest_timestamp: string | null; latest_timestamp: string | null; latest_url: string;
};

let indexRequestCount = 0;
let lastIndexRequestAt = 0;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchIndexText(url: string, label: string): Promise<string> {
  const elapsed = Date.now() - lastIndexRequestAt;
  if (indexRequestCount > 0 && elapsed < REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS - elapsed);
  lastIndexRequestAt = Date.now();
  indexRequestCount += 1;
  const response = await fetch(url, {
    headers: { "User-Agent": "AkarFinderResearchBot/1.0 (+https://akarfinder.vercel.app)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`commoncrawl_http_${response.status}:${label}`);
  return response.text();
}

async function fetchFamily(index: string, detailFamily: "a" | "pa"): Promise<FamilyObservation> {
  const pageCountQueryUrl = buildCommonCrawlPageCountQuery({ index, detailFamily, pageSize: PAGE_SIZE_BLOCKS });
  const pageCount = parseCommonCrawlPageCount(await fetchIndexText(pageCountQueryUrl, `${index}:${detailFamily}:page-count`));
  const selectedPages = selectSpreadPages(pageCount.pages, MAX_PAGES_PER_FAMILY_PER_INDEX);
  const pageObservations: PageObservation[] = [];
  const byId = new Map<string, ListingRef>();
  let rawLines = 0;

  for (const page of selectedPages) {
    const queryUrl = buildCommonCrawlPrefixQuery({ index, detailFamily, limit: LIMIT_PER_PAGE, page, pageSize: PAGE_SIZE_BLOCKS });
    const raw = await fetchIndexText(queryUrl, `${index}:${detailFamily}:page-${page}`);
    const refs = parseCommonCrawlCdxJsonLines(raw);
    const pageRawLines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
    rawLines += pageRawLines;
    for (const ref of refs) {
      const existing = byId.get(ref.source_id);
      if (!existing || (ref.timestamp ?? "") > (existing.timestamp ?? "")) byId.set(ref.source_id, ref);
    }
    pageObservations.push({ page, query_url: queryUrl, raw_lines: pageRawLines, unique_listing_ids: refs.length });
  }

  return {
    index, detail_family: detailFamily, page_count_query_url: pageCountQueryUrl,
    pages_available: pageCount.pages, blocks_available: pageCount.blocks, selected_pages: selectedPages,
    page_observations: pageObservations, raw_lines: rawLines, unique_listing_ids: byId.size, refs: [...byId.values()],
  };
}

function mergeAggregate(target: Map<string, AggregateRef>, ref: ListingRef, index: string): void {
  const existing = target.get(ref.source_id);
  if (!existing) {
    target.set(ref.source_id, {
      source_id: ref.source_id, detail_families: new Set([ref.detail_family]), indexes: new Set([index]),
      earliest_timestamp: ref.timestamp, latest_timestamp: ref.timestamp, latest_url: ref.url,
    });
    return;
  }
  existing.detail_families.add(ref.detail_family);
  existing.indexes.add(index);
  if (ref.timestamp && (!existing.earliest_timestamp || ref.timestamp < existing.earliest_timestamp)) existing.earliest_timestamp = ref.timestamp;
  if (ref.timestamp && (!existing.latest_timestamp || ref.timestamp > existing.latest_timestamp)) {
    existing.latest_timestamp = ref.timestamp;
    existing.latest_url = ref.url;
  }
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(6));
}

async function main() {
  const state = JSON.parse(fs.readFileSync(HISTORICAL_STATE, "utf8")) as CatalogState;
  if (state.version !== 1 || state.source !== "mubawab" || state.seen_source_ids.length !== 31_731) throw new Error("invalid_historical_mubawab_union");
  const historical = new Set(state.seen_source_ids);

  const currentLeafProof = JSON.parse(fs.readFileSync(CURRENT_CONTROL_PROOF, "utf8")) as CurrentLeafProof;
  const currentControlIds = new Set(currentLeafProof.assessments.flatMap((item) => item.first_page_unit_ids));
  if (currentControlIds.size !== 372 || currentLeafProof.summary?.observed_unit_ids !== 372) throw new Error(`invalid_current_leaf_control:${currentControlIds.size}`);

  const observations: FamilyObservation[] = [];
  for (const index of INDEXES) for (const family of DETAIL_FAMILIES) observations.push(await fetchFamily(index, family));

  const aggregate = new Map<string, AggregateRef>();
  for (const observation of observations) for (const ref of observation.refs) mergeAggregate(aggregate, ref, observation.index);

  const records = [...aggregate.values()].sort((a, b) => a.source_id.localeCompare(b.source_id));
  const newestIndex = INDEXES[0];
  const absentHistorical = records.filter((record) => !historical.has(record.source_id));
  const alreadyKnown = records.filter((record) => historical.has(record.source_id));
  const absentNewest = absentHistorical.filter((record) => record.indexes.has(newestIndex));
  const absentOlderOnly = absentHistorical.filter((record) => !record.indexes.has(newestIndex));
  const absentMultiSnapshot = absentHistorical.filter((record) => record.indexes.size >= 2);

  const reconciliationInput = absentHistorical.map((record) => ({
    source_id: record.source_id,
    detail_families: [...record.detail_families].sort() as Array<"a" | "pa">,
    indexes: [...record.indexes].sort(),
    newest_snapshot_present: record.indexes.has(newestIndex),
  }));
  const externalRecoveryReconciliation = summarizeExternalRecovery(reconciliationInput);

  const aggregateIds = new Set(records.map((record) => record.source_id));
  const newestIndexIds = new Set(observations.filter((item) => item.index === newestIndex).flatMap((item) => item.refs.map((ref) => ref.source_id)));
  const currentControlMatched = [...currentControlIds].filter((id) => aggregateIds.has(id));
  const currentControlMatchedNewest = [...currentControlIds].filter((id) => newestIndexIds.has(id));

  const proof = {
    generated_at: new Date().toISOString(),
    mode: "phase0_commoncrawl_multi_snapshot_spread_probe",
    commoncrawl_indexes: INDEXES,
    historical_union_unique_ids: historical.size,
    current_first_party_control_unique_ids: currentControlIds.size,
    safety: {
      indexes: INDEXES.length, detail_families: DETAIL_FAMILIES.length, page_size_blocks: PAGE_SIZE_BLOCKS,
      max_pages_per_family_per_index: MAX_PAGES_PER_FAMILY_PER_INDEX, max_rows_per_page: LIMIT_PER_PAGE,
      request_delay_ms: REQUEST_DELAY_MS,
      theoretical_max_index_requests: INDEXES.length * DETAIL_FAMILIES.length * (1 + MAX_PAGES_PER_FAMILY_PER_INDEX),
      actual_index_requests: indexRequestCount, mubawab_live_requests: 0, mubawab_detail_pages_opened: 0,
      disallowed_mubawab_pagination_requests: 0, commoncrawl_warc_fetches: 0, database_writes: 0,
      production_writes: 0, image_downloads: 0,
    },
    observations: observations.map((item) => ({
      index: item.index, detail_family: item.detail_family, page_count_query_url: item.page_count_query_url,
      pages_available: item.pages_available, blocks_available: item.blocks_available, selected_pages: item.selected_pages,
      page_observations: item.page_observations, raw_lines: item.raw_lines, unique_listing_ids: item.unique_listing_ids,
    })),
    external_index_union: {
      unique_source_ids: records.length,
      already_known_in_historical_union: alreadyKnown.length,
      absent_from_historical_union: absentHistorical.length,
      absent_with_newest_snapshot_presence: absentNewest.length,
      absent_older_snapshots_only: absentOlderOnly.length,
      absent_with_multi_snapshot_presence: absentMultiSnapshot.length,
    },
    external_recovery_reconciliation: externalRecoveryReconciliation,
    current_first_party_control_recall: {
      control_unique_ids: currentControlIds.size,
      matched_by_external_union: currentControlMatched.length,
      union_recall_ratio: ratio(currentControlMatched.length, currentControlIds.size),
      matched_by_newest_snapshot_sample: currentControlMatchedNewest.length,
      newest_snapshot_sample_recall_ratio: ratio(currentControlMatchedNewest.length, currentControlIds.size),
      unmatched_control_ids: [...currentControlIds].filter((id) => !aggregateIds.has(id)),
    },
    absent_records: absentHistorical.map((record) => ({
      source_id: record.source_id, detail_families: [...record.detail_families].sort(), indexes: [...record.indexes].sort(),
      earliest_timestamp: record.earliest_timestamp, latest_timestamp: record.latest_timestamp, latest_url: record.latest_url,
      newest_snapshot_present: record.indexes.has(newestIndex),
    })),
    interpretation_rule: "This remains a bounded Common Crawl sample, not a denominator. External recovery classification is fail-closed: newest-snapshot presence is recent-index evidence, never proof that a listing is currently active. pa-only records are project/non-unit candidates; mixed a+pa records remain ambiguous.",
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
