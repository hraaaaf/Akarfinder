import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  buildCandidateReconciliationReport,
  renderCandidateReconciliationMarkdown,
  type CommonCrawlCandidateEvidence,
  type ReserveDomainEvidence,
  type SourceRegistryEvidence,
} from "./candidate-reconciliation";

const PAGE_SIZE = 1000;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("Unterminated quoted CSV field");
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((value) => value !== ""));
}

function parseCommonCrawlCsv(text: string): CommonCrawlCandidateEvidence[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new Error("Common Crawl CSV is empty");
  const indexes = new Map(header.map((name, index) => [name, index]));
  const required = [
    "lane",
    "domain",
    "registered_domain",
    "indexed_pages",
    "real_estate_signal_pages",
    "latest_fetch_at",
    "sample_url",
  ];
  for (const name of required) {
    if (!indexes.has(name)) throw new Error(`Missing Common Crawl CSV column: ${name}`);
  }

  const at = (row: string[], name: string): string => row[indexes.get(name)!] ?? "";
  return rows.map((row) => {
    const lane = at(row, "lane");
    if (lane !== "MA_TLD_REAL_ESTATE" && lane !== "MOROCCO_EXTERNAL_REAL_ESTATE") {
      throw new Error(`Unsupported Common Crawl lane: ${lane}`);
    }
    return {
      lane,
      domain: at(row, "domain"),
      registeredDomain: at(row, "registered_domain"),
      indexedPages: Number(at(row, "indexed_pages")),
      realEstateSignalPages: Number(at(row, "real_estate_signal_pages")),
      latestFetchAt: at(row, "latest_fetch_at") || null,
      sampleUrl: at(row, "sample_url") || null,
    };
  });
}

async function fetchAllPages<T>(fetchPage: (from: number, to: number) => Promise<T[]>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await fetchPage(from, from + PAGE_SIZE - 1);
    all.push(...page);
    if (page.length < PAGE_SIZE) return all;
  }
}

async function loadReserve(client: ReturnType<typeof createClient>): Promise<ReserveDomainEvidence[]> {
  const rows = await fetchAllPages<any>(async (from, to) => {
    const { data, error } = await client
      .from("odm_b3_discovery_expansion_audit_v1")
      .select("source_domain,canonical_url,provider,last_seen_at")
      .eq("decision", "reserve_unregistered_source")
      .order("source_domain", { ascending: true })
      .order("canonical_url", { ascending: true })
      .range(from, to);
    if (error) throw new Error(`Reserve read failed: ${error.message}`);
    return data ?? [];
  });

  const grouped = new Map<
    string,
    { urls: Set<string>; observations: number; providers: Set<string>; lastSeen: string[] }
  >();
  for (const row of rows) {
    const domain = String(row.source_domain ?? "").trim().toLowerCase();
    const url = String(row.canonical_url ?? "").trim();
    if (!domain || !url) continue;
    const current = grouped.get(domain) ?? {
      urls: new Set<string>(),
      observations: 0,
      providers: new Set<string>(),
      lastSeen: [],
    };
    current.urls.add(url);
    current.observations += 1;
    if (row.provider) current.providers.add(String(row.provider));
    if (row.last_seen_at) current.lastSeen.push(new Date(String(row.last_seen_at)).toISOString());
    grouped.set(domain, current);
  }

  return [...grouped.entries()].map(([domain, value]) => ({
    domain,
    observedUrls: value.urls.size,
    observationCount: value.observations,
    lastSeenAt: value.lastSeen.sort().at(-1) ?? null,
    providers: [...value.providers].sort(),
  }));
}

async function loadRegistry(client: ReturnType<typeof createClient>): Promise<SourceRegistryEvidence[]> {
  const rows = await fetchAllPages<any>(async (from, to) => {
    const { data, error } = await client
      .from("source_policy_registry")
      .select(
        "source_domain,source_name,current_representation_count,primary_geography,discovery_policy,detail_fetch_policy,content_reuse_policy,display_policy,authorization_status,acquisition_mode,review_status,machine_gate,ingestion_gate,display_gate,policy_hash",
      )
      .order("source_domain", { ascending: true })
      .range(from, to);
    if (error) throw new Error(`Source Registry read failed: ${error.message}`);
    return data ?? [];
  });

  return rows.map((row) => ({
    sourceDomain: String(row.source_domain),
    sourceName: row.source_name == null ? null : String(row.source_name),
    currentRepresentationCount:
      row.current_representation_count == null ? 0 : Number(row.current_representation_count),
    primaryGeography: row.primary_geography == null ? null : String(row.primary_geography),
    discoveryPolicy: row.discovery_policy == null ? null : String(row.discovery_policy),
    detailFetchPolicy: row.detail_fetch_policy == null ? null : String(row.detail_fetch_policy),
    contentReusePolicy: row.content_reuse_policy == null ? null : String(row.content_reuse_policy),
    displayPolicy: row.display_policy == null ? null : String(row.display_policy),
    authorizationStatus: row.authorization_status == null ? null : String(row.authorization_status),
    acquisitionMode: row.acquisition_mode == null ? null : String(row.acquisition_mode),
    reviewStatus: row.review_status == null ? null : String(row.review_status),
    machineGate: row.machine_gate == null ? null : String(row.machine_gate),
    ingestionGate: row.ingestion_gate == null ? null : String(row.ingestion_gate),
    displayGate: row.display_gate == null ? null : String(row.display_gate),
    policyHash: row.policy_hash == null ? null : String(row.policy_hash),
  }));
}

function csvEscape(value: string | number | boolean | null): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function main() {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const ccCsvPath = process.env.CC_CANDIDATES_CSV?.trim() || ".tmp/data-1-4/commoncrawl/all-candidates.csv";
  const outDir = process.env.DATA_1_4_OUT_DIR?.trim() || ".tmp/data-1-4/results";
  const generatedAt = process.env.DATA_1_4_GENERATED_AT?.trim() || new Date().toISOString();

  const commonCrawl = parseCommonCrawlCsv(await readFile(ccCsvPath, "utf8"));
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-AkarFinder-Mode": "DATA-1.4-read-only" } },
  });

  const [reserve, registry] = await Promise.all([loadReserve(client), loadRegistry(client)]);
  const report = buildCandidateReconciliationReport({ commonCrawl, reserve, registry, generatedAt, top: 100 });

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "candidate-reconciliation.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(outDir, "candidate-reconciliation.md"), renderCandidateReconciliationMarkdown(report));

  const topCsv = [
    ["rank", "domain", "class", "review_priority", "b3_urls", "cc_signal_pages", "cc_indexed_pages", "registry", "reasons"],
    ...report.topCandidates.map((candidate, index) => [
      index + 1,
      candidate.domain,
      candidate.primaryClass,
      candidate.score.reviewPriority,
      candidate.b3.observedUrls,
      candidate.commonCrawl.realEstateSignalPages,
      candidate.commonCrawl.indexedPages,
      candidate.registry.present,
      candidate.classificationReasons.join(";"),
    ]),
  ]
    .map((row) => row.map((value) => csvEscape(value)).join(","))
    .join("\n");
  await writeFile(path.join(outDir, "top-100.csv"), `${topCsv}\n`);

  const proof = {
    schemaVersion: report.schemaVersion,
    readOnly: true,
    writesPerformed: 0,
    effectivePoliciesAssigned: report.candidates.filter((candidate) => candidate.effectivePolicyCandidate !== null).length,
    ...report.input,
    ...report.reconciliation,
  };
  await writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
