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
const sourceTable = process.env.TYPESENSE_SHADOW_SOURCE_TABLE || "public_search_representations_v1";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const baseUrl = `${typesenseProtocol}://${typesenseHost}:${typesensePort}`;
const collection = getOdmTypesenseShadowCollectionName();

async function typesense(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "X-TYPESENSE-API-KEY": typesenseKey,
      ...(init.headers || {}),
    },
  });
  return response;
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

async function loadPage(offset: number, limit: number): Promise<OdmSearchProjectionRow[]> {
  const { data, error } = await supabase
    .from(sourceTable)
    .select("representation_id,canonical_url,canonical_property_id,source_domain,title,snippet,normalized_city,normalized_district,normalized_property_type,normalized_intent,normalized_price_mad,normalized_surface_m2,quality_tier,quality_score,reliability_score,freshness_score,display_eligibility,document_kind,production_allowed,updated_at")
    .order("representation_id", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`typesense_shadow_source_read_failed:${error.message}`);
  return (data || []) as OdmSearchProjectionRow[];
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
