#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";
import { TYPESENSE_ODM_SHADOW_COLLECTION } from "../lib/typesense-shadow/odm-projection";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_missing`);
  return value;
}

const supabase = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const host = required("TYPESENSE_SHADOW_HOST");
const protocol = process.env.TYPESENSE_SHADOW_PROTOCOL || "http";
const port = process.env.TYPESENSE_SHADOW_PORT || "8108";
const apiKey = required("TYPESENSE_SHADOW_ADMIN_KEY");
const baseUrl = `${protocol}://${host}:${port}`;

const matrix = [
  { name: "casablanca_apartment_sale", city: "Casablanca", propertyType: "apartment", intent: "sale" },
  { name: "casablanca_villa_sale", city: "Casablanca", propertyType: "villa", intent: "sale" },
  { name: "rabat_apartment_sale", city: "Rabat", propertyType: "apartment", intent: "sale" },
  { name: "rabat_apartment_rent", city: "Rabat", propertyType: "apartment", intent: "rent" },
  { name: "marrakech_apartment_rent", city: "Marrakech", propertyType: "apartment", intent: "rent" },
  { name: "tanger_villa_sale", city: "Tanger", propertyType: "villa", intent: "sale" },
  { name: "agadir_apartment_rent", city: "Agadir", propertyType: "apartment", intent: "rent" },
  { name: "fes_apartment_sale", city: "Fès", propertyType: "apartment", intent: "sale" },
  { name: "oujda_apartment_sale", city: "Oujda", propertyType: "apartment", intent: "sale" },
  { name: "kenitra_apartment_rent", city: "Kénitra", propertyType: "apartment", intent: "rent" },
] as const;

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return Number(sorted[index].toFixed(2));
}

function overlapAt10(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right.slice(0, 10));
  const overlap = left.slice(0, 10).filter((id) => rightSet.has(id)).length;
  return Number((overlap / Math.min(10, left.length, right.length)).toFixed(4));
}

async function queryPostgres(item: (typeof matrix)[number]) {
  const started = performance.now();
  const { data, error } = await supabase.rpc("search_public_representations_v1", {
    p_query: null,
    p_city: item.city,
    p_property_type: item.propertyType,
    p_intent: item.intent,
    p_min_price: null,
    p_max_price: null,
    p_min_surface: null,
    p_max_surface: null,
    p_limit: 10,
    p_after_lane: null,
    p_after_rank: null,
    p_after_updated_at: null,
    p_after_representation_id: null,
  });
  const durationMs = performance.now() - started;
  if (error) throw new Error(`postgres_benchmark_failed:${item.name}:${error.message}`);
  const rows = (data || []) as Array<{ representation_id: string }>;
  return { durationMs, ids: rows.map((row) => row.representation_id) };
}

async function queryTypesense(item: (typeof matrix)[number]) {
  const params = new URLSearchParams({
    q: "*",
    query_by: "title,searchable_text,city,district,property_type,transaction_type",
    filter_by: `city:=${item.city} && property_type:=${item.propertyType} && transaction_type:=${item.intent}`,
    sort_by: "quality_score:desc,reliability_score:desc,freshness_score:desc",
    per_page: "10",
  });
  const started = performance.now();
  const response = await fetch(
    `${baseUrl}/collections/${encodeURIComponent(TYPESENSE_ODM_SHADOW_COLLECTION)}/documents/search?${params}`,
    { headers: { "X-TYPESENSE-API-KEY": apiKey } },
  );
  const durationMs = performance.now() - started;
  if (!response.ok) throw new Error(`typesense_benchmark_failed:${item.name}:${response.status}:${await response.text()}`);
  const payload = (await response.json()) as { hits?: Array<{ document: { id: string; city: string; property_type: string; transaction_type: string } }> };
  const hits = payload.hits || [];
  const filterLeaks = hits.filter((hit) =>
    hit.document.city !== item.city ||
    hit.document.property_type !== item.propertyType ||
    hit.document.transaction_type !== item.intent
  ).length;
  return { durationMs, ids: hits.map((hit) => hit.document.id), filterLeaks };
}

async function main() {
  const cases = [];
  const postgresLatencies: number[] = [];
  const typesenseLatencies: number[] = [];

  for (const item of matrix) {
    const postgres = await queryPostgres(item);
    const typesense = await queryTypesense(item);
    postgresLatencies.push(postgres.durationMs);
    typesenseLatencies.push(typesense.durationMs);
    cases.push({
      ...item,
      postgres_count: postgres.ids.length,
      typesense_count: typesense.ids.length,
      postgres_ms: Number(postgres.durationMs.toFixed(2)),
      typesense_ms: Number(typesense.durationMs.toFixed(2)),
      overlap_at_10: overlapAt10(postgres.ids, typesense.ids),
      filter_leaks: typesense.filterLeaks,
    });
  }

  const report = {
    generated_at: new Date().toISOString(),
    collection: TYPESENSE_ODM_SHADOW_COLLECTION,
    cases,
    summary: {
      query_count: cases.length,
      filter_leaks: cases.reduce((sum, item) => sum + item.filter_leaks, 0),
      bilateral_non_empty: cases.filter((item) => item.postgres_count > 0 && item.typesense_count > 0).length,
      average_overlap_at_10: Number((cases.reduce((sum, item) => sum + item.overlap_at_10, 0) / cases.length).toFixed(4)),
      postgres_p50_ms: percentile(postgresLatencies, 0.5),
      postgres_p95_ms: percentile(postgresLatencies, 0.95),
      typesense_p50_ms: percentile(typesenseLatencies, 0.5),
      typesense_p95_ms: percentile(typesenseLatencies, 0.95),
    },
  };

  mkdirSync("artifacts", { recursive: true });
  writeFileSync("artifacts/typesense-shadow-benchmark.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.summary.filter_leaks > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
