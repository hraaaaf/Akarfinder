#!/usr/bin/env tsx
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import {
  evaluateTrustedSeedListing,
  materializeTrustedSeedListings,
  type SeedPriceConfidence,
  type TrustedSeedListingDecision,
  type TrustedSeedListingInput,
} from "@/lib/data-mass/trusted-seed-listing-materialization";

const PAGE_SIZE = 1000;
const LOOKUP_CHUNK = 40;

type ThinRow = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  seed_provider: string;
  freshness_status: string;
  title: string | null;
  snippet: string | null;
  city: string | null;
  recovered_city: string | null;
  normalized_city: string | null;
  normalized_property_type: string | null;
  normalized_intent: string | null;
  normalized_price_mad: number | null;
  recovery_confidence: string | null;
  document_kind: string | null;
  vertical_classification: string | null;
};
type SeedRow = { id: string; first_observed_at: string; last_observed_at: string };
type DiscoveryEvidenceRow = { canonical_url: string; title: string | null; snippet: string | null; updated_at: string };
type Mode = "dry-run" | "apply";

function parseMode(): Mode {
  return process.argv.includes("--apply") ? "apply" : "dry-run";
}

function parseLimit(): number | null {
  const raw = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=", 2)[1];
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error("INVALID_LIMIT");
  return parsed;
}

function chunk<T>(values: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

function priceConfidence(value: string | null): SeedPriceConfidence | null {
  if (value === "trusted_economic_v2") return "trusted";
  if (value === "economic_v2_price_to_verify") return "to_verify";
  return null;
}

async function loadEligibleThinRows(): Promise<ThinRow[]> {
  const db = getSupabaseServerClient();
  const rows: ThinRow[] = [];
  let from = 0;
  for (;;) {
    const response = await db
      .from("thin_index_search_documents")
      .select("seed_id,canonical_url,source_domain,seed_provider,freshness_status,title,snippet,city,recovered_city,normalized_city,normalized_property_type,normalized_intent,normalized_price_mad,recovery_confidence,document_kind,vertical_classification")
      .not("normalized_price_mad", "is", null)
      .in("recovery_confidence", ["trusted_economic_v2", "economic_v2_price_to_verify"])
      .range(from, from + PAGE_SIZE - 1);
    if (response.error) throw new Error(response.error.message);
    const page = (response.data ?? []) as ThinRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function loadSeeds(seedIds: string[]): Promise<Map<string, SeedRow>> {
  const db = getSupabaseServerClient();
  const rows: SeedRow[] = [];
  for (const ids of chunk(seedIds, LOOKUP_CHUNK)) {
    const response = await db.from("source_offer_seeds").select("id,first_observed_at,last_observed_at").in("id", ids);
    if (response.error) throw new Error(response.error.message);
    rows.push(...((response.data ?? []) as SeedRow[]));
  }
  return new Map(rows.map((row) => [row.id, row]));
}

async function loadDiscoveryEvidence(canonicalUrls: string[]): Promise<Map<string, DiscoveryEvidenceRow>> {
  const db = getSupabaseServerClient();
  const evidence = new Map<string, DiscoveryEvidenceRow>();
  for (const urls of chunk([...new Set(canonicalUrls)], LOOKUP_CHUNK)) {
    const response = await db
      .from("discovery_candidates")
      .select("canonical_url,title,snippet,updated_at")
      .in("canonical_url", urls)
      .order("updated_at", { ascending: false });
    if (response.error) throw new Error(response.error.message);
    for (const row of (response.data ?? []) as DiscoveryEvidenceRow[]) {
      if (!evidence.has(row.canonical_url)) evidence.set(row.canonical_url, row);
    }
  }
  return evidence;
}

async function loadExistingUrls(): Promise<Set<string>> {
  const db = getSupabaseServerClient();
  const out = new Set<string>();
  let from = 0;
  for (;;) {
    const response = await db.from("listing_sources").select("listing_url").range(from, from + PAGE_SIZE - 1);
    if (response.error) throw new Error(response.error.message);
    const page = (response.data ?? []) as Array<{ listing_url: string | null }>;
    for (const row of page) if (row.listing_url) out.add(row.listing_url);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

function summarize(decisions: TrustedSeedListingDecision[], existingUrls: Set<string>) {
  const rejectedByReason: Record<string, number> = {};
  const selectedByDomain: Record<string, number> = {};
  const selectedByConfidence: Record<string, number> = { trusted: 0, to_verify: 0 };
  let admitted = 0;
  let alreadyMaterialized = 0;
  for (const decision of decisions) {
    if (!decision.admitted) {
      for (const reason of decision.reasons) rejectedByReason[reason] = (rejectedByReason[reason] ?? 0) + 1;
      continue;
    }
    admitted += 1;
    if (existingUrls.has(decision.input.canonicalUrl)) {
      alreadyMaterialized += 1;
      continue;
    }
    selectedByDomain[decision.input.sourceDomain] = (selectedByDomain[decision.input.sourceDomain] ?? 0) + 1;
    selectedByConfidence[decision.priceConfidence] = (selectedByConfidence[decision.priceConfidence] ?? 0) + 1;
  }
  return {
    evaluated: decisions.length,
    admitted,
    alreadyMaterialized,
    netNew: admitted - alreadyMaterialized,
    selectedByConfidence,
    selectedByDomain: Object.fromEntries(Object.entries(selectedByDomain).sort((a, b) => b[1] - a[1])),
    rejectedByReason: Object.fromEntries(Object.entries(rejectedByReason).sort((a, b) => b[1] - a[1])),
  };
}

async function main() {
  const mode = parseMode();
  const limit = parseLimit();
  const thinRows = await loadEligibleThinRows();
  const seeds = await loadSeeds(thinRows.map((row) => row.seed_id));
  const discoveryEvidence = await loadDiscoveryEvidence(thinRows.map((row) => row.canonical_url));
  const existingUrls = await loadExistingUrls();

  const inputs: TrustedSeedListingInput[] = thinRows.flatMap((row) => {
    const seed = seeds.get(row.seed_id);
    const confidence = priceConfidence(row.recovery_confidence);
    if (!seed || !confidence) return [];
    const discovery = discoveryEvidence.get(row.canonical_url);
    return [{
      seedId: row.seed_id,
      canonicalUrl: row.canonical_url,
      sourceDomain: row.source_domain,
      seedProvider: row.seed_provider,
      freshnessStatus: row.freshness_status,
      firstObservedAt: seed.first_observed_at,
      lastObservedAt: seed.last_observed_at,
      title: row.title,
      snippet: row.snippet,
      discoveryTitle: discovery?.title ?? null,
      discoverySnippet: discovery?.snippet ?? null,
      city: row.normalized_city ?? row.city ?? row.recovered_city,
      priceMad: row.normalized_price_mad == null ? null : Number(row.normalized_price_mad),
      priceConfidence: confidence,
      propertyType: row.normalized_property_type,
      intent: row.normalized_intent,
      documentKind: row.document_kind,
      verticalClassification: row.vertical_classification,
    }];
  });

  const decisions = inputs.map(evaluateTrustedSeedListing);
  const plan = summarize(decisions, existingUrls);
  const selected = decisions
    .filter((decision) => decision.admitted && !existingUrls.has(decision.input.canonicalUrl))
    .sort((a, b) => a.input.canonicalUrl.localeCompare(b.input.canonicalUrl));
  const bounded = limit === null ? selected : selected.slice(0, limit);

  console.log(JSON.stringify({
    event: "SEED_LISTING_MATERIALIZATION_PLAN",
    mode,
    limit,
    thinRowsLoaded: thinRows.length,
    discoveryEvidenceRows: discoveryEvidence.size,
    plan,
    boundedWriteCount: bounded.length,
    invariants: {
      sourceNetworkRequests: 0,
      copiedSourceContent: false,
      trustedOrPriceToVerifyRequired: true,
      explicitCityRequired: true,
      explicitDistrictRequired: true,
      currentRegistryDetailUrlRequired: true,
      ambiguousDocumentKindRequiresStrongRegistryDetailUrl: true,
      discoveryEvidenceIsClassificationOnly: true,
      doubtfulPriceStatus: "ambiguous",
      dryRunDatabaseWrites: mode === "dry-run" ? 0 : null,
    },
  }, null, 2));

  if (mode === "dry-run") return;
  if (process.env.SEED_LISTING_MATERIALIZE_WRITE !== "1") throw new Error("SEED_LISTING_MATERIALIZE_WRITE_FLAG_REQUIRED");
  if (bounded.length === 0) return;

  const runId = `seed-materialization-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const result = await materializeTrustedSeedListings({ runId, decisions: bounded });
  console.log(JSON.stringify({ event: "SEED_LISTING_MATERIALIZATION_APPLY", runId, result }, null, 2));
  if (result.errors.length > 0) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
