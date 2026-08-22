import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  buildUniversalCandidatePromotionManifest,
  summarizeUniversalCandidatePromotion,
  type UniversalDiscoveryCandidate,
} from "./universal-candidate-promotion";

type DiscoveryCandidateRow = {
  id: string;
  provider: string;
  discovery_query: string | null;
  source_domain: string;
  source_url: string;
  canonical_url: string;
  title: string | null;
  snippet: string | null;
  discovered_at: string;
  last_seen_at: string;
  content_fingerprint: string | null;
};

const BATCH_SIZE = 1000;
const DEFAULT_OUTPUT = "artifacts/mass-index/m1-universal-candidate-promotion.json";

async function fetchDiscoveryCandidates(db: ReturnType<typeof createClient>): Promise<DiscoveryCandidateRow[]> {
  const rows: DiscoveryCandidateRow[] = [];
  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await db
      .from("discovery_candidates")
      .select("id,provider,discovery_query,source_domain,source_url,canonical_url,title,snippet,discovered_at,last_seen_at,content_fingerprint")
      .order("id", { ascending: true })
      .range(from, from + BATCH_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as DiscoveryCandidateRow[];
    rows.push(...page);
    if (page.length < BATCH_SIZE) break;
  }
  return rows;
}

function toCandidate(row: DiscoveryCandidateRow): UniversalDiscoveryCandidate {
  return {
    sourceDomain: row.source_domain,
    url: row.canonical_url || row.source_url,
    provider: row.provider,
    discoveryQuery: row.discovery_query,
    title: row.title,
    snippet: row.snippet,
    contentFingerprint: row.content_fingerprint,
    firstSeenAt: row.discovered_at,
    lastSeenAt: row.last_seen_at,
  };
}

function topEntries(record: Record<string, number>, limit = 30) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, value]) => ({ key, value }));
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");

  const outputPath = resolve(process.env.MASS_INDEX_M1_OUTPUT || DEFAULT_OUTPUT);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const sourceRows = await fetchDiscoveryCandidates(db);
  const manifest = buildUniversalCandidatePromotionManifest(sourceRows.map(toCandidate));
  const summary = summarizeUniversalCandidatePromotion(manifest);

  const payload = {
    schemaVersion: "MASS_INDEX_M1_UNIVERSAL_PROMOTION_V1",
    mode: "read_only",
    sourceTable: "discovery_candidates",
    summary,
    manifest,
    invariants: {
      databaseWrites: 0,
      sourceNetworkRequests: 0,
      providersRelabeled: 0,
      richContentRequired: false,
      exactCanonicalDedupBeforeClassification: true,
    },
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    schemaVersion: payload.schemaVersion,
    mode: payload.mode,
    outputPath,
    summary: {
      ...summary,
      topAcceptedDomains: topEntries(summary.acceptedByDomain),
      acceptedByProvider: summary.acceptedByProvider,
      rejectedByReason: summary.rejectedByReason,
    },
    invariants: payload.invariants,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
