#!/usr/bin/env tsx
// AkarFinder Recovery — merge mass-discovery artifacts into one OFFLINE reservoir.
// No DB client, no DB reads, no DB writes, no publication.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getDomainEntry,
  getListingUrlPatterns,
  loadSourceDomainRegistry,
  type SourceDomainEntry,
  type SourceDomainRegistry,
} from "@/lib/openserp-ingestion/domain-registry";
import { canonicalizeSourceUrl, extractDomain } from "@/lib/openserp-ingestion/utils";

type Args = {
  commoncrawl?: string;
  sitemap?: string;
  serper?: string;
  restoredManifest?: string;
  overlay?: string;
  output: string;
  summary: string;
};

export type EvidenceChannel = "commoncrawl_deep" | "public_sitemap" | "search_api";

export type OfflineCandidate = {
  canonical_url: string;
  source_domain: string;
  evidence_channels: EvidenceChannel[];
  evidence_count: number;
  evidence: Record<string, unknown>;
  title: string | null;
  snippet: string | null;
  discovery_status: string | null;
  observed_at: string | null;
  recovery_status: "historical_only" | "current_url_only" | "search_observed" | "reobserved";
};

function parseArgs(argv: string[]): Args {
  const value = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? resolve(argv[i + 1]) : undefined;
  };
  const output = value("--output");
  const summary = value("--summary");
  if (!output || !summary) {
    throw new Error("Usage: --output <jsonl> --summary <json> [--commoncrawl txt] [--sitemap jsonl] [--serper jsonl] [--restored-manifest json] [--overlay json]");
  }
  const args: Args = {
    commoncrawl: value("--commoncrawl"),
    sitemap: value("--sitemap"),
    serper: value("--serper"),
    restoredManifest: value("--restored-manifest"),
    overlay: value("--overlay"),
    output,
    summary,
  };
  if (!args.commoncrawl && !args.sitemap && !args.serper) {
    throw new Error("At least one discovery artifact is required");
  }
  return args;
}

function mergedRegistry(overlayPath?: string): SourceDomainRegistry {
  const base = loadSourceDomainRegistry();
  if (!overlayPath) return base;
  const overlay = JSON.parse(readFileSync(overlayPath, "utf8")) as { domains?: SourceDomainEntry[] };
  const byDomain = new Map(base.domains.map((entry) => [entry.domain, entry]));
  for (const entry of overlay.domains ?? []) byDomain.set(entry.domain, entry);
  return { ...base, domains: [...byDomain.values()] };
}

function loadRestored(content: string | null): Set<string> {
  if (!content) return new Set();
  const parsed = JSON.parse(content) as { operations?: Array<{ operation?: string; canonical_url?: string }> };
  const out = new Set<string>();
  for (const row of parsed.operations ?? []) {
    if (row.operation !== "insert" || !row.canonical_url) continue;
    const canonical = canonicalizeSourceUrl(row.canonical_url);
    if (canonical) out.add(canonical);
  }
  return out;
}

function readJsonl(path: string): Record<string, unknown>[] {
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map((line, index) => {
    try { return JSON.parse(line) as Record<string, unknown>; }
    catch (error) { throw new Error(`Invalid JSONL ${path} line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`); }
  });
}

function validListingUrl(url: string, registry: SourceDomainRegistry): { canonical: string; domain: string } | null {
  const canonical = canonicalizeSourceUrl(url);
  if (!canonical) return null;
  const domain = extractDomain(canonical);
  if (!domain) return null;
  const entry = getDomainEntry(domain, registry);
  if (!entry || entry.status !== "approved_discovery" || !entry.external_web_result) return null;
  const patterns = getListingUrlPatterns(domain, registry);
  if (patterns.length === 0) return null;
  const pathname = new URL(canonical).pathname;
  if (!patterns.some((pattern) => pattern.test(pathname))) return null;
  return { canonical, domain };
}

function latestIso(values: Array<string | null | undefined>): string | null {
  const valid = values.filter((value): value is string => Boolean(value) && Number.isFinite(new Date(value!).getTime()));
  if (valid.length === 0) return null;
  return valid.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

export function mergeOfflineArtifacts(input: {
  commoncrawlUrls?: string[];
  sitemapRows?: Record<string, unknown>[];
  serperRows?: Record<string, unknown>[];
  restored?: Set<string>;
  registry: SourceDomainRegistry;
}): { rows: OfflineCandidate[]; rejected: Record<string, number>; excludedRestored: number } {
  const restored = input.restored ?? new Set<string>();
  const candidates = new Map<string, {
    canonical_url: string;
    source_domain: string;
    channels: Set<EvidenceChannel>;
    evidence: Record<string, unknown>;
    title: string | null;
    snippet: string | null;
    discovery_status: string | null;
    observed: string[];
  }>();
  const rejected: Record<string, number> = {};
  let excludedRestored = 0;

  const reject = (reason: string) => { rejected[reason] = (rejected[reason] ?? 0) + 1; };

  const upsert = (
    rawUrl: string,
    channel: EvidenceChannel,
    evidence: Record<string, unknown>,
    extras: { title?: unknown; snippet?: unknown; discovery_status?: unknown; observed_at?: unknown } = {},
  ) => {
    const valid = validListingUrl(rawUrl, input.registry);
    if (!valid) { reject("not_approved_individual_listing_url"); return; }
    if (restored.has(valid.canonical)) { excludedRestored += 1; return; }

    const existing = candidates.get(valid.canonical) ?? {
      canonical_url: valid.canonical,
      source_domain: valid.domain,
      channels: new Set<EvidenceChannel>(),
      evidence: {},
      title: null,
      snippet: null,
      discovery_status: null,
      observed: [],
    };
    existing.channels.add(channel);
    existing.evidence[channel] = evidence;
    if (typeof extras.title === "string" && extras.title.trim()) existing.title = extras.title.trim();
    if (typeof extras.snippet === "string" && extras.snippet.trim()) existing.snippet = extras.snippet.trim();
    if (typeof extras.discovery_status === "string") existing.discovery_status = extras.discovery_status;
    if (typeof extras.observed_at === "string") existing.observed.push(extras.observed_at);
    candidates.set(valid.canonical, existing);
  };

  for (const raw of input.commoncrawlUrls ?? []) {
    if (!raw.trim()) continue;
    upsert(raw.trim(), "commoncrawl_deep", { source: "commoncrawl_deep_reservoir" });
  }

  for (const row of input.sitemapRows ?? []) {
    const url = typeof row.canonical_url === "string" ? row.canonical_url : "";
    if (!url) { reject("sitemap_missing_url"); continue; }
    upsert(url, "public_sitemap", row, { observed_at: row.observed_at });
  }

  for (const row of input.serperRows ?? []) {
    const url = typeof row.canonical_url === "string" ? row.canonical_url : "";
    if (!url) { reject("search_missing_url"); continue; }
    if (row.discovery_status === "rejected") { reject("search_rejected"); continue; }
    upsert(url, "search_api", row, {
      title: row.title,
      snippet: row.snippet,
      discovery_status: row.discovery_status,
      observed_at: row.observed_at,
    });
  }

  const rows: OfflineCandidate[] = [...candidates.values()].map((row) => {
    const channels = [...row.channels].sort() as EvidenceChannel[];
    const hasSearch = row.channels.has("search_api");
    const hasSitemap = row.channels.has("public_sitemap");
    const recoveryStatus: OfflineCandidate["recovery_status"] =
      channels.length >= 2 ? "reobserved"
      : hasSearch ? "search_observed"
      : hasSitemap ? "current_url_only"
      : "historical_only";

    return {
      canonical_url: row.canonical_url,
      source_domain: row.source_domain,
      evidence_channels: channels,
      evidence_count: channels.length,
      evidence: row.evidence,
      title: row.title,
      snippet: row.snippet,
      discovery_status: row.discovery_status,
      observed_at: latestIso(row.observed),
      recovery_status: recoveryStatus,
    };
  }).sort((a, b) => a.canonical_url.localeCompare(b.canonical_url));

  return { rows, rejected, excludedRestored };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = mergedRegistry(args.overlay);
  const restored = loadRestored(args.restoredManifest ? readFileSync(args.restoredManifest, "utf8") : null);
  const commoncrawlUrls = args.commoncrawl ? readFileSync(args.commoncrawl, "utf8").split("\n").filter(Boolean) : undefined;
  const sitemapRows = args.sitemap ? readJsonl(args.sitemap) : undefined;
  const serperRows = args.serper ? readJsonl(args.serper) : undefined;

  const merged = mergeOfflineArtifacts({ commoncrawlUrls, sitemapRows, serperRows, restored, registry });
  const jsonl = merged.rows.map((row) => JSON.stringify(row)).join("\n") + (merged.rows.length ? "\n" : "");
  mkdirSync(dirname(args.output), { recursive: true });
  mkdirSync(dirname(args.summary), { recursive: true });
  writeFileSync(args.output, jsonl, "utf8");

  const byStatus = merged.rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.recovery_status] = (acc[row.recovery_status] ?? 0) + 1;
    return acc;
  }, {});
  const byDomain = merged.rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.source_domain] = (acc[row.source_domain] ?? 0) + 1;
    return acc;
  }, {});

  const summary = {
    mode: "offline_recovery_reservoir",
    unique_structural_candidates: merged.rows.length,
    excluded_restored_urls: merged.excludedRestored,
    rejected: merged.rejected,
    by_status: byStatus,
    by_domain: Object.fromEntries(Object.entries(byDomain).sort((a, b) => b[1] - a[1])),
    target_unique_post_filter: 200000,
    target_reached: merged.rows.length >= 200000,
    approved_for_import_rows: 0,
    database_access: 0,
    database_writes: 0,
    artifact_sha256: createHash("sha256").update(jsonl, "utf8").digest("hex"),
  };
  writeFileSync(args.summary, JSON.stringify(summary, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
