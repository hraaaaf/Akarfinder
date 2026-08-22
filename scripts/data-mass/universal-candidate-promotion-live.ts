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

type DiscoverySnapshot = {
  rows: DiscoveryCandidateRow[];
  snapshotCutoff: string;
  pages: number;
};

const BATCH_SIZE = 1000;
const DEFAULT_OUTPUT = "artifacts/mass-index/m1-universal-candidate-promotion.json";

async function fetchDiscoveryCandidates(db: ReturnType<typeof createClient>): Promise<DiscoverySnapshot> {
  const rows: DiscoveryCandidateRow[] = [];
  const snapshotCutoff = new Date().toISOString();
  let cursor: string | null = null;
  let pages = 0;

  for (;;) {
    const baseQuery = db
      .from("discovery_candidates")
      .select("id,provider,discovery_query,source_domain,source_url,canonical_url,title,snippet,discovered_at,last_seen_at,content_fingerprint")
      .lte("created_at", snapshotCutoff)
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);
    const query = cursor ? baseQuery.gt("id", cursor) : baseQuery;
    const { data, error } = await query;
    if (error) throw error;

    const page = (data ?? []) as DiscoveryCandidateRow[];
    rows.push(...page);
    pages += 1;
    if (page.length < BATCH_SIZE) break;

    const nextCursor = page.at(-1)?.id;
    if (!nextCursor || nextCursor === cursor) throw new Error("MASS_INDEX_M1_KEYSET_CURSOR_STALLED");
    cursor = nextCursor;
  }

  return { rows, snapshotCutoff, pages };
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

  const snapshot = await fetchDiscoveryCandidates(db);
  const manifest = buildUniversalCandidatePromotionManifest(snapshot.rows.map(toCandidate));
  const summary = summarizeUniversalCandidatePromotion(manifest);

  const payload = {
    schemaVersion: "MASS_INDEX_M1_UNIVERSAL_PROMOTION_V1",
    mode: "read_only",
    sourceTable: "discovery_candidates",
    sourceSnapshot: {
      cutoffCreatedAt: snapshot.snapshotCutoff,
      pages: snapshot.pages,
      pagination: "keyset_uuid",
      batchSize: BATCH_SIZE,
    },
    summary,
    manifest,
    invariants: {
      databaseWrites: 0,
      sourceNetworkRequests: 0,
      providersRelabeled: 0,
      richContentRequired: false,
      exactCanonicalDedupBeforeClassification: true,
      snapshotBounded: true,
      keysetPagination: true,
    },
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    schemaVersion: payload.schemaVersion,
    mode: payload.mode,
    outputPath,
    sourceSnapshot: payload.sourceSnapshot,
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
