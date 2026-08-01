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

const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const host = required("TYPESENSE_SHADOW_HOST");
const protocol = process.env.TYPESENSE_SHADOW_PROTOCOL || "http";
const port = process.env.TYPESENSE_SHADOW_PORT || "8108";
const apiKey = required("TYPESENSE_SHADOW_ADMIN_KEY");
const baseUrl = `${protocol}://${host}:${port}`;

const matrix = [
  ["casablanca_apartment_sale", "Casablanca", "apartment", "sale"],
  ["casablanca_villa_sale", "Casablanca", "villa", "sale"],
  ["rabat_apartment_sale", "Rabat", "apartment", "sale"],
  ["rabat_apartment_rent", "Rabat", "apartment", "rent"],
  ["marrakech_apartment_rent", "Marrakech", "apartment", "rent"],
  ["tanger_villa_sale", "Tanger", "villa", "sale"],
  ["agadir_apartment_rent", "Agadir", "apartment", "rent"],
  ["fes_apartment_sale", "Fès", "apartment", "sale"],
  ["oujda_apartment_sale", "Oujda", "apartment", "sale"],
  ["kenitra_apartment_rent", "Kénitra", "apartment", "rent"],
].map(([name, city, propertyType, intent]) => ({ name, city, propertyType, intent }));

function percentile(values: number[], ratio: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)].toFixed(2));
}

function overlapAt10(left: string[], right: string[]): number {
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right.slice(0, 10));
  return Number((left.slice(0, 10).filter((id) => rightSet.has(id)).length / Math.min(10, left.length, right.length)).toFixed(4));
}

async function queryPostgres(item: (typeof matrix)[number]) {
  const started = performance.now();
  const { data, error } = await supabase
    .from("public_search_representations_v1")
    .select("representation_id")
    .eq("normalized_city", item.city)
    .eq("normalized_property_type", item.propertyType)
    .eq("normalized_intent", item.intent)
    .order("lane_weight", { ascending: true })
    .order("quality_score", { ascending: false })
    .limit(10);
  const durationMs = performance.now() - started;
  if (error) throw new Error(`postgres_benchmark_failed:${item.name}:${error.message}`);
  return { durationMs, ids: (data || []).map((row) => String(row.representation_id)) };
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
  const response = await fetch(`${baseUrl}/collections/${encodeURIComponent(TYPESENSE_ODM_SHADOW_COLLECTION)}/documents/search?${params}`, {
    headers: { "X-TYPESENSE-API-KEY": apiKey },
  });
  const durationMs = performance.now() - started;
  if (!response.ok) throw new Error(`typesense_benchmark_failed:${item.name}:${response.status}:${await response.text()}`);
  const payload = (await response.json()) as { hits?: Array<{ document: { id: string; city: string; property_type: string; transaction_type: string } }> };
  const hits = payload.hits || [];
  const filterLeaks = hits.filter((hit) => hit.document.city !== item.city || hit.document.property_type !== item.propertyType || hit.document.transaction_type !== item.intent).length;
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
    cases.push({ ...item, postgres_count: postgres.ids.length, typesense_count: typesense.ids.length, postgres_ms: Number(postgres.durationMs.toFixed(2)), typesense_ms: Number(typesense.durationMs.toFixed(2)), overlap_at_10: overlapAt10(postgres.ids, typesense.ids), filter_leaks: typesense.filterLeaks });
  }
  const report = {
    generated_at: new Date().toISOString(), collection: TYPESENSE_ODM_SHADOW_COLLECTION, cases,
    summary: {
      query_count: cases.length,
      filter_leaks: cases.reduce((sum, item) => sum + item.filter_leaks, 0),
      bilateral_non_empty: cases.filter((item) => item.postgres_count > 0 && item.typesense_count > 0).length,
      average_overlap_at_10: Number((cases.reduce((sum, item) => sum + item.overlap_at_10, 0) / cases.length).toFixed(4)),
      postgres_p50_ms: percentile(postgresLatencies, 0.5), postgres_p95_ms: percentile(postgresLatencies, 0.95),
      typesense_p50_ms: percentile(typesenseLatencies, 0.5), typesense_p95_ms: percentile(typesenseLatencies, 0.95),
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
