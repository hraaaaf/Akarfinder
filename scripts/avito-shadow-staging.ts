#!/usr/bin/env node
/** Offline-only Avito shadow staging. Reads the frozen qualification JSON only. */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { stageFeed } from "../lib/feeds/staging.js";
import type { RawFeedRow } from "../lib/feeds/schema.js";

type QualificationRecord = {
  id: string;
  url: string;
  http_status: number | null;
  availability?: string;
  fields: Record<string, unknown>;
  error?: string | null;
};
type QualificationPayload = { results: QualificationRecord[] };

const STRICT_FIELDS = ["title", "price", "location", "area"] as const;
const norm = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const text = (v: unknown): string | null => typeof v === "string" && v.trim() ? v.trim() : null;

/** Parse only a numeric representation already present in the qualification JSON. */
function numericObserved(value: unknown, unit: RegExp): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const withoutUnit = value.replace(unit, "").replace(/[\s\u00a0\u202f]/g, "").replace(/,/g, "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(withoutUnit)) return null;
  const n = Number(withoutUnit);
  return Number.isFinite(n) ? n : null;
}

function observedTypes(title: string): { property: string | null; transaction: string | null } {
  const t = norm(title);
  const property = /\b(appartement|appartements)\b/.test(t) ? "apartment"
    : /\b(villa|maison)\b/.test(t) ? "villa"
    : /\b(terrain|terrains)\b/.test(t) ? "land"
    : /\b(bureau|bureaux)\b/.test(t) ? "office"
    : /\b(local|commerce|cafe|fond de commerce)\b/.test(t) ? "commercial"
    : null;
  const transaction = /\b(louer|location|locatif|locative)\b/.test(t) ? "rent"
    : /\b(vente|vendre|vendu|a vendre)\b/.test(t) ? "sale"
    : null;
  return { property, transaction };
}

function suspicionFingerprint(r: QualificationRecord): string | null {
  const f = r.fields;
  const loc = text(f.location), area = text(f.area), price = text(f.price), description = text(f.description);
  if (!loc || !area || !price || !description) return null;
  return [loc, area, price, description].map((x) => norm(x)).join("\u001f");
}

export function buildAvitoShadowStage(payload: QualificationPayload, sourceSha256?: string) {
  if (!Array.isArray(payload.results)) throw new Error("qualification payload must have results[]");
  const records = [...payload.results].sort((a, b) => a.id.localeCompare(b.id));
  const rawRows: RawFeedRow[] = records.map((record) => {
    const f = record.fields ?? {};
    const title = text(f.title) ?? "";
    const types = observedTypes(title);
    let sourceDomain: string | null = null;
    try { sourceDomain = new URL(record.url).hostname; } catch { /* validation rejects missing/bad source URL */ }
    return {
      external_id: record.id || null,
      source_name: "avito",
      source_domain: sourceDomain,
      source_url: record.url || null,
      transaction_type: types.transaction ?? "",
      property_type: types.property ?? "",
      title,
      description: text(f.description),
      city: text(f.location) ?? "",
      district: null,
      price_mad: numericObserved(f.price, /\s*(?:MAD|DHS?|DH)?\s*$/i),
      surface_m2: numericObserved(f.area, /\s*(?:m(?:2|²))?\s*$/i),
      bedrooms_count: null,
      coordinates: null,
      image_urls: null,
      images_rights_confirmed: false,
      updated_at_source: text(f.published_or_updated),
      update_signal: null,
    };
  });

  // Reuse the project's pure validation/idempotence staging. Do not call the
  // partner-v2 bridge: that bridge asserts partner authorization and photo rights.
  const staged = stageFeed(rawRows);
  const stagedById = new Map(staged.staged.map((x) => [x.row.external_id ?? "", x]));
  const rejectedByRow = new Map(staged.rejected_rows.map((x) => [x.row_index, x]));
  const fpGroups = new Map<string, string[]>();
  for (const r of records) {
    const fp = suspicionFingerprint(r);
    if (fp) fpGroups.set(fp, [...(fpGroups.get(fp) ?? []), r.id]);
  }
  const duplicateGroups = [...fpGroups.values()].filter((ids) => ids.length > 1)
    .map((ids) => ids.sort()).sort((a, b) => a[0].localeCompare(b[0]));
  const duplicateGroupById = new Map<string, string>();
  duplicateGroups.forEach((ids, i) => ids.forEach((id) => duplicateGroupById.set(id, `suspect-${i + 1}`)));

  const rows = records.map((r, index) => {
    const f = r.fields ?? {};
    const feed = stagedById.get(r.id);
    const rejection = rejectedByRow.get(index);
    const strictMissing = STRICT_FIELDS.filter((key) => !text(f[key]));
    const photoList = Array.isArray(f.photos) ? f.photos.filter((x) => typeof x === "string") : null;
    const groupId = duplicateGroupById.get(r.id) ?? null;
    return {
      source: { source_name: "avito", external_id: r.id, source_url: r.url },
      facts: {
        title: text(f.title),
        price_observed: text(f.price),
        price_mad: numericObserved(f.price, /\s*(?:MAD|DHS?|DH)?\s*$/i),
        location_observed: text(f.location),
        city: feed?.row.city ?? text(f.location),
        district: null,
        property_type: feed?.row.property_type ?? (rawRows[index].property_type || null),
        transaction_type: feed?.row.transaction_type ?? (rawRows[index].transaction_type || null),
        surface_observed: text(f.area),
        surface_m2: numericObserved(f.area, /\s*(?:m(?:2|²))?\s*$/i),
        description: text(f.description),
        photos_present: photoList === null ? null : photoList.length > 0,
        photo_count_observed: photoList === null ? null : photoList.length,
        photo_urls_retained: false,
        reported_published_or_updated: text(f.published_or_updated),
      },
      qualification: {
        http_status: r.http_status ?? null,
        strict_complete: strictMissing.length === 0,
        strict_missing_fields: strictMissing,
        freshness_status: "unknown" as const,
        availability_status: "unconfirmed" as const,
      },
      duplicate_review: {
        suspected_group: groupId,
        auto_merged: false,
        assessment: groupId ? "same normalized city, price, surface, and description; human review required" : "no matching exact fingerprint in this batch",
      },
      guardrails: {
        commercial_reuse: "not_verified" as const,
        availability_status: "unconfirmed" as const,
        publishable: false as const,
        images_rights_confirmed: false as const,
      },
      staging: feed ? {
        status: "staged_offline" as const,
        action: feed.action,
        identity_key: feed.identity_key,
        canonical_source_url: feed.canonical_source_url,
        // Canonical validator output contains no image URLs because rights=false.
        validated_image_urls: feed.row.image_urls,
        authorization_status: null,
      } : {
        status: "rejected" as const,
        reason: rejection?.reason ?? "no validated staging row returned",
        authorization_status: null,
      },
    };
  });

  const uniqueIds = new Set(records.map((r) => r.id));
  const strictIds = rows.filter((r) => r.qualification.strict_complete).map((r) => r.source.external_id);
  const report = {
    source_payload_sha256: sourceSha256 ?? null,
    source_records: records.length,
    unique_source_ids: uniqueIds.size,
    duplicate_source_id_count: records.length - uniqueIds.size,
    staged_offline_count: rows.filter((r) => r.staging.status === "staged_offline").length,
    rejected_count: rows.filter((r) => r.staging.status === "rejected").length,
    rejected_rows: rows.filter((r) => r.staging.status === "rejected").map((r) => ({
      id: r.source.external_id,
      reason: r.staging.status === "rejected" ? r.staging.reason : null,
    })),
    strict_four_fields_count: strictIds.length,
    strict_four_fields_ids: strictIds,
    descriptions_present: rows.filter((r) => r.facts.description !== null).length,
    photos_present: rows.filter((r) => r.facts.photos_present === true).length,
    freshness_verified_count: 0,
    freshness_unknown_count: rows.length,
    suspected_physical_duplicate_groups: duplicateGroups,
    physical_duplicates_merged: 0,
    publishable_count: rows.filter((r) => r.guardrails.publishable).length,
    commercial_reuse_confirmed_count: 0,
    images_rights_confirmed_count: rows.filter((r) => r.guardrails.images_rights_confirmed).length,
    network_requests: 0,
    photo_downloads: 0,
    database_writes: 0,
    partner_v2_bridge_calls: 0,
  };
  return { schema_version: "avito-shadow-stage-v1", source_file: "docs/handovers/avito-qualification-results.json",
    source_payload_sha256: sourceSha256 ?? null, report, rows };
}

function main() {
  const input = process.argv[2] ?? "docs/handovers/avito-qualification-results.json";
  const output = process.argv[3] ?? "docs/handovers/avito-shadow-staging.json";
  const reportOutput = process.argv[4] ?? "docs/handovers/avito-shadow-staging-report.json";
  const inputBytes = readFileSync(input);
  const payload = JSON.parse(inputBytes.toString("utf8")) as QualificationPayload;
  // Hash semantic JSON bytes so Windows/Linux newline conventions do not alter evidence identity.
  const digest = createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
  const result = buildAvitoShadowStage(payload, digest);
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  writeFileSync(reportOutput, `${JSON.stringify(result.report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/avito-shadow-staging.ts")) main();
