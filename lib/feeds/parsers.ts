// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#8/10) -- Direct Feeds Ingestion
// Capability. CSV/JSON/XML parsers, each producing the same RawFeedRow[]
// shape (schema.ts) so validate/stage logic is format-agnostic. No external
// parsing library -- CSV parser mirrors the project's existing pure RFC-4180
// implementation (scripts/import-partner-csv.ts), JSON uses the native
// parser, XML uses a minimal hand-rolled reader scoped to this feed's flat
// <listing>...</listing> shape only (not a general-purpose XML parser).

import type { RawFeedRow, FeedUpdateSignal } from "./schema.js";

// ---------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------

// Minimal RFC-4180 CSV parser -- handles quoted fields with embedded commas.
export function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = content.length;

  while (i < len) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field); field = "";
      } else if (ch === "\r" && content[i + 1] === "\n") {
        row.push(field); field = ""; rows.push(row); row = []; i++;
      } else if (ch === "\n") {
        row.push(field); field = ""; rows.push(row); row = [];
      } else {
        field += ch;
      }
    }
    i++;
  }
  if (row.length > 0 || field) { row.push(field); rows.push(row); }
  while (rows.length > 0 && rows[rows.length - 1].every((f) => f === "")) rows.pop();
  return rows;
}

function csvValueToRawRow(record: Record<string, string>): RawFeedRow {
  const num = (s: string | undefined): string | null => {
    const t = (s ?? "").trim();
    return t === "" ? null : t;
  };
  const imageUrls = (record.image_urls ?? "").trim();
  return {
    external_id: num(record.external_id),
    source_name: (record.source_name ?? "").trim(),
    source_domain: num(record.source_domain),
    source_url: num(record.source_url),
    transaction_type: record.transaction_type ?? "",
    property_type: record.property_type ?? "",
    title: record.title ?? "",
    description: num(record.description),
    city: record.city ?? "",
    district: num(record.district),
    price_mad: num(record.price_mad),
    surface_m2: num(record.surface_m2),
    bedrooms_count: num(record.bedrooms_count),
    coordinates:
      record.lat && record.lng && record.lat.trim() && record.lng.trim()
        ? { lat: Number(record.lat), lng: Number(record.lng) }
        : null,
    image_urls: imageUrls ? imageUrls.split("|").map((u) => u.trim()).filter(Boolean) : null,
    images_rights_confirmed: (record.images_rights_confirmed ?? "").trim().toLowerCase() === "true",
    updated_at_source: num(record.updated_at_source),
    update_signal: (record.update_signal === "delete" || record.update_signal === "unpublish" ? record.update_signal : null) as FeedUpdateSignal | null,
  };
}

export function parseCsvFeed(content: string): RawFeedRow[] {
  const rows = parseCsvRows(content);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => { record[h] = row[i] ?? ""; });
    return csvValueToRawRow(record);
  });
}

// ---------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------

// Expected shape: { listings: [ {..fields matching RawFeedRow keys, snake_case..} ] }
export function parseJsonFeed(content: string): RawFeedRow[] {
  const parsed: unknown = JSON.parse(content);
  const listings = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { listings?: unknown }).listings)
      ? (parsed as { listings: unknown[] }).listings
      : [];

  return listings.map((entry) => {
    const e = entry as Record<string, unknown>;
    const asString = (v: unknown): string | null => (v === undefined || v === null ? null : String(v));
    const coords = e.coordinates as { lat?: unknown; lng?: unknown } | undefined;
    const updateSignal = e.update_signal === "delete" || e.update_signal === "unpublish" ? (e.update_signal as FeedUpdateSignal) : null;
    return {
      external_id: asString(e.external_id),
      source_name: asString(e.source_name) ?? "",
      source_domain: asString(e.source_domain),
      source_url: asString(e.source_url),
      transaction_type: asString(e.transaction_type) ?? "",
      property_type: asString(e.property_type) ?? "",
      title: asString(e.title) ?? "",
      description: asString(e.description),
      city: asString(e.city) ?? "",
      district: asString(e.district),
      price_mad: (e.price_mad as string | number | null) ?? null,
      surface_m2: (e.surface_m2 as string | number | null) ?? null,
      bedrooms_count: (e.bedrooms_count as string | number | null) ?? null,
      coordinates: coords && typeof coords.lat === "number" && typeof coords.lng === "number" ? { lat: coords.lat, lng: coords.lng } : null,
      image_urls: Array.isArray(e.image_urls) ? (e.image_urls as string[]) : null,
      images_rights_confirmed: e.images_rights_confirmed === true,
      updated_at_source: asString(e.updated_at_source),
      update_signal: updateSignal,
    };
  });
}

// ---------------------------------------------------------------------
// XML
// ---------------------------------------------------------------------

// Minimal, scoped XML reader: extracts each <listing>...</listing> block and
// reads flat <field>value</field> children only (no attributes, no nesting
// beyond <coordinates><lat>/<lng></coordinates> and <image_urls><url>...).
// This is NOT a general-purpose XML parser -- it is deliberately scoped to
// this feed's fixed shape, matching the "capability, not infrastructure
// bet" scope of this mission.
function extractTag(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? decodeXmlEntities(m[1].trim()) : null;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function parseXmlFeed(content: string): RawFeedRow[] {
  const blocks = content.match(/<listing>[\s\S]*?<\/listing>/g) ?? [];
  return blocks.map((block) => {
    const coordsBlock = block.match(/<coordinates>([\s\S]*?)<\/coordinates>/)?.[1] ?? null;
    const lat = coordsBlock ? extractTag(coordsBlock, "lat") : null;
    const lng = coordsBlock ? extractTag(coordsBlock, "lng") : null;

    const imagesBlock = block.match(/<image_urls>([\s\S]*?)<\/image_urls>/)?.[1] ?? "";
    const imageUrls = [...imagesBlock.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => decodeXmlEntities(m[1].trim()));

    const updateSignalRaw = extractTag(block, "update_signal");
    const updateSignal = updateSignalRaw === "delete" || updateSignalRaw === "unpublish" ? (updateSignalRaw as FeedUpdateSignal) : null;

    return {
      external_id: extractTag(block, "external_id"),
      source_name: extractTag(block, "source_name") ?? "",
      source_domain: extractTag(block, "source_domain"),
      source_url: extractTag(block, "source_url"),
      transaction_type: extractTag(block, "transaction_type") ?? "",
      property_type: extractTag(block, "property_type") ?? "",
      title: extractTag(block, "title") ?? "",
      description: extractTag(block, "description"),
      city: extractTag(block, "city") ?? "",
      district: extractTag(block, "district"),
      price_mad: extractTag(block, "price_mad"),
      surface_m2: extractTag(block, "surface_m2"),
      bedrooms_count: extractTag(block, "bedrooms_count"),
      coordinates: lat !== null && lng !== null ? { lat: Number(lat), lng: Number(lng) } : null,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
      images_rights_confirmed: extractTag(block, "images_rights_confirmed") === "true",
      updated_at_source: extractTag(block, "updated_at_source"),
      update_signal: updateSignal,
    };
  });
}
