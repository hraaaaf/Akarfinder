#!/usr/bin/env tsx
// AKARFINDER DB RECOVERY — Neon Common Crawl seed staging.
// Offline only: reads audited URL reservoir + historical 177-write manifest,
// emits deterministic SQL for an isolated Neon branch. It NEVER connects to a DB.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalizeSourceUrl,
  extractDomain,
} from "@/lib/openserp-ingestion/utils";
import {
  getDomainEntry,
  getListingUrlPatterns,
  loadSourceDomainRegistry,
  type SourceDomainRegistry,
} from "@/lib/openserp-ingestion/domain-registry";

export type RecoverySeedRow = {
  canonical_url: string;
  source_domain: string;
};

export type RecoveryBuildSummary = {
  input_rows: number;
  canonical_unique_input: number;
  already_recovered: number;
  duplicate_input: number;
  malformed_rejected: number;
  policy_rejected: number;
  pattern_rejected: number;
  staged_rows: number;
  reservoir_sha256: string;
  commoncrawl_index: string;
};

type Args = {
  input: string;
  excludeManifest: string;
  outputSql: string;
  outputReport: string;
  commoncrawlIndex: string;
};

function parseArgs(argv: string[]): Args {
  const read = (name: string): string | null => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
  };

  const input = read("--input");
  const excludeManifest = read("--exclude-manifest");
  const outputSql = read("--output-sql");
  const outputReport = read("--output-report");
  const commoncrawlIndex = read("--index");

  if (!input || !excludeManifest || !outputSql || !outputReport || !commoncrawlIndex) {
    throw new Error(
      "Usage: --input <reservoir.txt> --exclude-manifest <177-write-manifest.json> " +
      "--output-sql <stage.sql> --output-report <report.json> --index <CC-MAIN-YYYY-NN>",
    );
  }
  if (!/^CC-MAIN-\d{4}-\d{2}$/.test(commoncrawlIndex)) {
    throw new Error(`invalid Common Crawl index: ${commoncrawlIndex}`);
  }

  return {
    input: resolve(input),
    excludeManifest: resolve(excludeManifest),
    outputSql: resolve(outputSql),
    outputReport: resolve(outputReport),
    commoncrawlIndex,
  };
}

function canonicalReservoirHash(urls: string[]): string {
  return createHash("sha256")
    .update([...new Set(urls)].sort().join("\n"), "utf8")
    .digest("hex");
}

export function loadRecoveredCanonicalUrls(content: string): Set<string> {
  const parsed = JSON.parse(content) as {
    operations?: Array<{ operation?: string; canonical_url?: string }>;
  };
  const recovered = new Set<string>();
  for (const operation of parsed.operations ?? []) {
    if (operation.operation !== "insert" || !operation.canonical_url) continue;
    const canonical = canonicalizeSourceUrl(operation.canonical_url);
    if (canonical) recovered.add(canonical);
  }
  return recovered;
}

export function buildRecoverySeedRows(
  inputContent: string,
  recovered: Set<string>,
  registry: SourceDomainRegistry = loadSourceDomainRegistry(),
): {
  rows: RecoverySeedRow[];
  counters: Omit<RecoveryBuildSummary, "reservoir_sha256" | "commoncrawl_index">;
  canonicalInput: string[];
} {
  const rawLines = inputContent.split("\n").map((line) => line.trim()).filter(Boolean);
  const seen = new Set<string>();
  const rows: RecoverySeedRow[] = [];

  let duplicateInput = 0;
  let malformedRejected = 0;
  let policyRejected = 0;
  let patternRejected = 0;
  let alreadyRecovered = 0;

  for (const raw of rawLines) {
    const canonical = canonicalizeSourceUrl(raw);
    const domain = canonical ? extractDomain(canonical) : null;
    if (!canonical || !domain) {
      malformedRejected += 1;
      continue;
    }

    if (seen.has(canonical)) {
      duplicateInput += 1;
      continue;
    }
    seen.add(canonical);

    const entry = getDomainEntry(domain, registry);
    if (!entry || entry.status !== "approved_discovery") {
      policyRejected += 1;
      continue;
    }

    const pathname = new URL(canonical).pathname;
    const patterns = getListingUrlPatterns(domain, registry);
    if (patterns.length === 0 || !patterns.some((pattern) => pattern.test(pathname))) {
      patternRejected += 1;
      continue;
    }

    if (recovered.has(canonical)) {
      alreadyRecovered += 1;
      continue;
    }

    rows.push({ canonical_url: canonical, source_domain: domain });
  }

  rows.sort((a, b) => a.canonical_url.localeCompare(b.canonical_url));
  const canonicalInput = [...seen].sort();

  return {
    rows,
    canonicalInput,
    counters: {
      input_rows: rawLines.length,
      canonical_unique_input: seen.size,
      already_recovered: alreadyRecovered,
      duplicate_input: duplicateInput,
      malformed_rejected: malformedRejected,
      policy_rejected: policyRejected,
      pattern_rejected: patternRejected,
      staged_rows: rows.length,
    },
  };
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildStagingSql(
  rows: RecoverySeedRow[],
  options: { commoncrawlIndex: string; reservoirSha256: string },
): string {
  const table = "public.recovery_commoncrawl_seed_stage_20260924";
  const header = [
    "-- AKARFINDER DB RECOVERY — generated offline; ISOLATED NEON BRANCH ONLY.",
    "-- This SQL does NOT touch property_listings or listing_sources.",
    `-- source_index=${options.commoncrawlIndex}`,
    `-- reservoir_sha256=${options.reservoirSha256}`,
    `-- expected_stage_rows=${rows.length}`,
    "",
    "begin;",
    `drop table if exists ${table};`,
    `create table ${table} (`,
    "  canonical_url text primary key,",
    "  source_domain text not null,",
    "  seed_provider text not null check (seed_provider = 'commoncrawl_cdx'),",
    "  freshness_status text not null check (freshness_status = 'seed_only'),",
    "  metadata jsonb not null",
    ");",
    "",
  ];

  const chunks: string[] = [];
  const chunkSize = 250;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const values = rows.slice(offset, offset + chunkSize).map((row) => {
      const metadata = JSON.stringify({
        recovery_source: "commoncrawl-reservoir",
        commoncrawl_index: options.commoncrawlIndex,
        reservoir_sha256: options.reservoirSha256,
      });
      return `(${sqlLiteral(row.canonical_url)}, ${sqlLiteral(row.source_domain)}, 'commoncrawl_cdx', 'seed_only', ${sqlLiteral(metadata)}::jsonb)`;
    });
    chunks.push(
      `insert into ${table} (canonical_url, source_domain, seed_provider, freshness_status, metadata) values\n${values.join(",\n")};`,
    );
  }

  const footer = [
    "",
    `do $$`,
    "declare",
    "  v_count bigint;",
    "begin",
    `  select count(*) into v_count from ${table};`,
    `  if v_count <> ${rows.length} then`,
    `    raise exception 'staging row count mismatch: expected ${rows.length}, got %', v_count;`,
    "  end if;",
    "end $$;",
    "",
    "commit;",
    "",
    `select count(*) as staged_rows from ${table};`,
    `select source_domain, count(*) as rows from ${table} group by source_domain order by rows desc, source_domain;`,
    "",
    "-- Promotion is intentionally NOT included here.",
    "-- Next gate: verify source_offer_seeds exists on the isolated Neon branch,",
    "-- then use a separately reviewed INSERT ... ON CONFLICT DO NOTHING.",
    "",
  ];

  return [...header, ...chunks, ...footer].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputContent = readFileSync(args.input, "utf8");
  const recovered = loadRecoveredCanonicalUrls(readFileSync(args.excludeManifest, "utf8"));
  const built = buildRecoverySeedRows(inputContent, recovered);
  const reservoirSha256 = canonicalReservoirHash(built.canonicalInput);

  const summary: RecoveryBuildSummary = {
    ...built.counters,
    reservoir_sha256: reservoirSha256,
    commoncrawl_index: args.commoncrawlIndex,
  };

  mkdirSync(dirname(args.outputSql), { recursive: true });
  mkdirSync(dirname(args.outputReport), { recursive: true });

  writeFileSync(
    args.outputSql,
    buildStagingSql(built.rows, {
      commoncrawlIndex: args.commoncrawlIndex,
      reservoirSha256,
    }),
    "utf8",
  );
  writeFileSync(args.outputReport, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
