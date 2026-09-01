#!/usr/bin/env tsx

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { getListingUrlPatterns } from "@/lib/openserp-ingestion/domain-registry";
import {
  AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_QUERY_IDS,
  AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_ROWS,
  AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_UNIQUE_URLS,
  AVITO_PUBLIC_INDEX_REPLAY_QUERY_IDS,
} from "./avito-public-index-replay-scope";

type CandidateRow = {
  id: string;
  discovery_query: string;
  result_rank: number | null;
  source_url: string | null;
  canonical_url: string | null;
  title: string | null;
  snippet: string | null;
  discovered_at: string;
  created_at: string;
  discovery_status: "accepted" | "rejected" | "unclassified";
  metadata: Record<string, unknown> | null;
};

function pathMatchesOfficialAvitoListingPattern(url: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  return getListingUrlPatterns("avito.ma").some((pattern) => pattern.test(pathname));
}

async function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
  const output = resolve(process.cwd(), outputArg?.slice("--output=".length) || "tmp/avito-public-index-replay-snapshot.json");
  const supabase = getSupabaseServerClient();

  const discoveryResponse = await supabase
    .from("discovery_candidates")
    .select("id,discovery_query,result_rank,source_url,canonical_url,title,snippet,discovered_at,created_at,discovery_status,metadata")
    .eq("source_domain", "avito.ma")
    .in("discovery_query", [...AVITO_PUBLIC_INDEX_REPLAY_QUERY_IDS]);
  if (discoveryResponse.error) throw new Error(`discovery read failed: ${discoveryResponse.error.message}`);

  const rows = (discoveryResponse.data ?? []) as CandidateRow[];
  const officialStrongPathRows = rows.filter((row) => row.canonical_url && pathMatchesOfficialAvitoListingPattern(row.canonical_url));
  const canonicalUrls = [...new Set(officialStrongPathRows.map((row) => row.canonical_url!).filter(Boolean))];

  const existing = new Set<string>();
  for (let i = 0; i < canonicalUrls.length; i += 100) {
    const chunk = canonicalUrls.slice(i, i + 100);
    const sourceResponse = await supabase.from("listing_sources").select("listing_url").in("listing_url", chunk);
    if (sourceResponse.error) throw new Error(`listing_sources read failed: ${sourceResponse.error.message}`);
    for (const row of sourceResponse.data ?? []) {
      if (typeof row.listing_url === "string") existing.add(row.listing_url);
    }
  }

  const netNew = officialStrongPathRows
    .filter((row) => row.canonical_url && !existing.has(row.canonical_url))
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

  const queryIds = new Set(netNew.map((row) => row.discovery_query));
  const uniqueUrls = new Set(netNew.map((row) => row.canonical_url));
  const scope = {
    rows: netNew.length,
    query_ids: queryIds.size,
    unique_urls: uniqueUrls.size,
  };

  if (
    scope.rows !== AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_ROWS ||
    scope.query_ids !== AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_QUERY_IDS ||
    scope.unique_urls !== AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_UNIQUE_URLS
  ) {
    throw new Error(
      `bounded replay scope drift: expected ${AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_ROWS}/${AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_QUERY_IDS}/${AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_UNIQUE_URLS} rows/query_ids/urls, got ${scope.rows}/${scope.query_ids}/${scope.unique_urls}`,
    );
  }

  writeFileSync(output, JSON.stringify({
    event: "AVITO_PUBLIC_INDEX_REPLAY_SNAPSHOT",
    captured_at: new Date().toISOString(),
    scope,
    query_ids: [...queryIds].sort(),
    rows: netNew,
  }, null, 2));

  console.log(JSON.stringify({ event: "AVITO_PUBLIC_INDEX_REPLAY_SNAPSHOT_OK", output, ...scope }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
