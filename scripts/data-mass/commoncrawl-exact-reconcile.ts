#!/usr/bin/env tsx
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const EXPECTED_DOMAINS = new Set([
  "avito.ma",
  "mubawab.ma",
  "agenz.ma",
  "sarouty.ma",
  "daragadir.com",
  "mouldar.com",
  "masaken.ma",
  "soukimmobilier.com",
  "promoimmomarrakech.com",
  "limmobiliersansfrontieres.com",
  "atlasimmobilier.com",
  "aykana.ma",
  "barnes-marrakech.com",
  "1immo.ma",
  "kawtarimmobilier.com",
  "marrakechrealty.com",
]);

function sha256Lines(lines: string[]): string {
  return createHash("sha256").update(lines.join("\n"), "utf8").digest("hex");
}

function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function findReservoirFiles(root: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...findReservoirFiles(path));
    else if (name === "commoncrawl-reservoir-canonical-urls.txt") out.push(path);
  }
  return out.sort();
}

async function main() {
  const artifactRoot = resolve(process.argv[2] ?? "data/audits/raw-results/x4c-artifacts");
  const outPath = resolve(process.argv[3] ?? "data/audits/raw-results/mass-x5-exact-reconciliation.json");
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase read credentials");

  const files = findReservoirFiles(artifactRoot);
  if (files.length !== 4) throw new Error(`Expected exactly 4 X4C reservoir files, found ${files.length}`);

  const candidates = new Set<string>();
  const artifactRows: Record<string, number> = {};
  for (const file of files) {
    const rows = readFileSync(file, "utf8").split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
    artifactRows[basename(dirname(file))] = rows.length;
    for (const url of rows) {
      const domain = domainOf(url);
      if (!domain || !EXPECTED_DOMAINS.has(domain)) throw new Error(`Unexpected candidate domain: ${url}`);
      candidates.add(url);
    }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("source_offer_seeds")
      .select("source_domain,canonical_url")
      .in("source_domain", [...EXPECTED_DOMAINS])
      .order("source_domain", { ascending: true })
      .order("canonical_url", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      if (typeof row.canonical_url === "string" && row.canonical_url) existing.add(row.canonical_url);
    }
    if (!data || data.length < pageSize) break;
  }

  const sortedCandidates = [...candidates].sort();
  const overlap = sortedCandidates.filter((url) => existing.has(url));
  const netNew = sortedCandidates.filter((url) => !existing.has(url));

  const byDomain: Record<string, { candidate: number; overlap: number; net_new: number; existing_seed_rows: number }> = {};
  for (const domain of [...EXPECTED_DOMAINS].sort()) {
    byDomain[domain] = { candidate: 0, overlap: 0, net_new: 0, existing_seed_rows: 0 };
  }
  for (const url of sortedCandidates) {
    const domain = domainOf(url)!;
    byDomain[domain].candidate++;
    if (existing.has(url)) byDomain[domain].overlap++;
    else byDomain[domain].net_new++;
  }
  for (const url of existing) {
    const domain = domainOf(url);
    if (domain && byDomain[domain]) byDomain[domain].existing_seed_rows++;
  }

  const proof = {
    schema_version: "MASS_X5_EXACT_RECONCILIATION_SHADOW_V1",
    mode: "shadow_read_only",
    unit: "CANONICAL_URL",
    generated_at_utc: new Date().toISOString(),
    x4c_artifact_files: files.map((f) => f.replace(`${artifactRoot}/`, "")),
    x4c_artifact_rows: artifactRows,
    domains: EXPECTED_DOMAINS.size,
    candidate_unique: sortedCandidates.length,
    existing_seed_unique: existing.size,
    exact_overlap: overlap.length,
    exact_net_new: netNew.length,
    candidate_sha256: sha256Lines(sortedCandidates),
    overlap_sha256: sha256Lines(overlap),
    net_new_sha256: sha256Lines(netNew),
    by_domain: byDomain,
    invariants: {
      database_writes: 0,
      registry_writes: 0,
      search_activations: 0,
      source_page_fetches: 0,
      warc_fetches: 0,
      permission_inference: 0,
      candidate_grants_authorization: false,
    },
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(proof, null, 2) + "\n", "utf8");
  writeFileSync(outPath.replace(/\.json$/, "-net-new.txt"), netNew.join("\n") + (netNew.length ? "\n" : ""), "utf8");
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
