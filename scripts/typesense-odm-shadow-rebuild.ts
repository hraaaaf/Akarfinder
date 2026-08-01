#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";
import {
  getOdmTypesenseShadowCollectionName,
  getOdmTypesenseShadowSchema,
  rebuildOdmTypesenseShadow,
} from "../lib/typesense-shadow/rebuild";
import type { OdmSearchProjectionRow, TypesenseOdmShadowDocument } from "../lib/typesense-shadow/odm-projection";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_missing`);
  return value;
}

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const supabaseKey = required("SUPABASE_SERVICE_ROLE_KEY");
const typesenseHost = required("TYPESENSE_SHADOW_HOST");
const typesenseProtocol = process.env.TYPESENSE_SHADOW_PROTOCOL || "http";
const typesensePort = process.env.TYPESENSE_SHADOW_PORT || "8108";
const typesenseKey = required("TYPESENSE_SHADOW_ADMIN_KEY");
const sourceTable = process.env.TYPESENSE_SHADOW_SOURCE_TABLE || "thin_index_search_documents";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const baseUrl = `${typesenseProtocol}://${typesenseHost}:${typesensePort}`;
const collection = getOdmTypesenseShadowCollectionName();

async function typesense(path: string, init: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "X-TYPESENSE-API-KEY": typesenseKey,
      ...(init.headers || {}),
    },
  });
}

async function ensureCollection() {
  const existing = await typesense(`/collections/${encodeURIComponent(collection)}`);
  if (existing.ok) return;
  if (existing.status !== 404) throw new Error(`typesense_collection_lookup_failed:${existing.status}`);
  const created = await typesense("/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getOdmTypesenseShadowSchema()),
  });
  if (!created.ok) throw new Error(`typesense_collection_create_failed:${created.status}:${await created.text()}`);
}

type SourceRow = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  freshness_status: string;
  title: string | null;
  snippet: string | null;
  normalized_city: string | null;
  normalized_property_type: string | null;
  normalized_intent: string | null;
  normalized_price_mad: number | null;
  normalized_surface_m2: number | null;
  quality_tier: string | null;
  quality_score: number | null;
  display_eligibility: string;
  document_kind: string | null;
  updated_at: string;
};

async function loadPage(offset: number, limit: number): Promise<OdmSearchProjectionRow[]> {
  const { data, error } = await supabase
    .from(sourceTable)
    .select("seed_id,canonical_url,source_domain,freshness_status,title,snippet,normalized_city,normalized_property_type,normalized_intent,normalized_price_mad,normalized_surface_m2,quality_tier,quality_score,display_eligibility,document_kind,updated_at")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .in("seed_provider", ["public_sitemap", "commoncrawl_cdx", "serper_search"])
    .in("freshness_status", ["seed_only", "fresh_confirmed"])
    .eq("document_kind", "LISTING")
    .not("canonical_url", "is", null)
    .order("seed_id", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`typesense_shadow_source_read_failed:${error.message}`);
  return ((data || []) as SourceRow[]).map((row) => ({
    representation_id: row.seed_id,
    canonical_property_id: row.seed_id,
    canonical_url: row.canonical_url,
    source_domain: row.source_domain,
    title: row.title,
    snippet: row.snippet,
    normalized_city: row.normalized_city,
    normalized_district: null,
    normalized_property_type: row.normalized_property_type,
    normalized_intent: row.normalized_intent,
    normalized_price_mad: row.normalized_price_mad,
    normalized_surface_m2: row.normalized_surface_m2,
    quality_tier: row.quality_tier,
    quality_score: row.quality_score,
    reliability_score: row.quality_score,
    freshness_score: row.freshness_status === "fresh_confirmed" ? 100 : 50,
    display_eligibility: row.display_eligibility,
    document_kind: row.document_kind,
    production_allowed: true,
    updated_at: row.updated_at,
  }));
}

async function importBatch(documents: TypesenseOdmShadowDocument[]) {
  if (documents.length === 0) return { indexed: 0, failed: 0 };
  const response = await typesense(
    `/collections/${encodeURIComponent(collection)}/documents/import?action=upsert`,
    {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: documents.map((document) => JSON.stringify(document)).join("\n"),
    },
  );
  if (!response.ok) throw new Error(`typesense_shadow_import_failed:${response.status}:${await response.text()}`);
  const rows = (await response.text()).split("\n").filter(Boolean).map((line) => JSON.parse(line) as { success: boolean });
  const failed = rows.filter((row) => !row.success).length;
  return { indexed: rows.length - failed, failed };
}

async function main() {
  await ensureCollection();
  const report = await rebuildOdmTypesenseShadow({ loadPage, importBatch });
  console.log(JSON.stringify({ collection, sourceTable, ...report }, null, 2));
  if (report.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
