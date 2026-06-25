// Shared, defensive pipeline used by every HTML source.
// Each source only declares its index URL, host and candidate card selectors.

import type {
  FieldConfidence,
  FieldConfidenceLevel,
  RawListing,
  ScrapedListingP0,
  ScrapeError,
  SourceName,
  SourceResult,
  TransactionTypeP0,
} from "../types";
import { fetchHtml, isAllowedByRobots } from "../utils/fetch-html";
import {
  getJsonLd,
  getNextData,
  harvestFromDom,
  harvestFromJson,
  loadHtml,
  type DetailFields,
} from "../utils/extract";
import { isCanonicalCity, normalizeCity } from "../normalizers/normalize-city";
import { normalizePrice } from "../normalizers/normalize-price";
import { normalizeSurface } from "../normalizers/normalize-surface";
import { normalizeTransaction, normalizeType } from "../normalizers/normalize-type";

export type HtmlSourceConfig = {
  name: SourceName;
  sourceUrl: string;
  host: string;
  cardSelectors: string[];
  max: number;
  defaultTransaction: TransactionTypeP0;
};

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function toInt(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = parseInt(String(v).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

// Reject implausibly small prices (parse noise like "9"). Real estate in MAD is
// at least a few thousand (rent) up to millions (sale).
function plausiblePrice(n: number | null): number | null {
  return n != null && n >= 1000 ? n : null;
}

function snippet(text: string | null | undefined, max = 280): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

// Fields that matter for a usable listing — the basis of the completeness score.
// data_completeness_score measures PRESENCE, not extraction quality.
// For quality, use field_confidence.
const COMPLETENESS_FIELDS: (keyof ScrapedListingP0)[] = [
  "price_mad",
  "city",
  "district",
  "surface_m2",
  "bedrooms_count",
  "bathrooms",
  "description_snippet",
  "seller_name",
];

export function computeCompleteness(listing: ScrapedListingP0): number {
  const present = COMPLETENESS_FIELDS.filter((f) => {
    const v = listing[f];
    return v !== null && v !== undefined && v !== "";
  }).length;
  return Math.round((present / COMPLETENESS_FIELDS.length) * 100);
}

// Build a FieldConfidence object for a listing.
// Uses detail-page confidence when available; falls back to "medium" for
// fields that were already present on the listing (from the index page harvest).
export function computeFieldConfidence(
  listing: ScrapedListingP0,
  detailConf?: Partial<FieldConfidence>
): FieldConfidence {
  function pick(
    field: keyof FieldConfidence,
    value: unknown
  ): FieldConfidenceLevel {
    if (value === null || value === undefined || value === "") return "missing";
    if (detailConf?.[field] && detailConf[field] !== "missing") return detailConf[field]!;
    // Field was present before detail merge (came from index JSON harvest).
    return "medium";
  }

  return {
    price: pick("price", listing.price_mad),
    city: pick("city", listing.city),
    district: pick("district", listing.district),
    surface: pick("surface", listing.surface_m2),
    rooms: pick("rooms", listing.rooms_count),
    bedrooms: pick("bedrooms", listing.bedrooms_count),
    bathrooms: pick("bathrooms", listing.bathrooms),
    description: pick("description", listing.description_snippet),
    seller: pick("seller", listing.seller_name),
  };
}

function missingFieldConfidence(): FieldConfidence {
  return {
    price: "missing",
    city: "missing",
    district: "missing",
    surface: "missing",
    rooms: "missing",
    bedrooms: "missing",
    bathrooms: "missing",
    description: "missing",
    seller: "missing",
  };
}

// Fill only the fields still missing on the listing using detail-page data.
// P8A fields are always taken from the detail page (never set on index phase).
export function mergeDetail(listing: ScrapedListingP0, d: DetailFields): void {
  const dc = d._confidence;

  if (listing.price_raw == null && d.price_raw) listing.price_raw = d.price_raw;
  if (listing.price_mad == null) listing.price_mad = plausiblePrice(normalizePrice(d.price_raw));

  // Resolve city: high-confidence detail city (from /ct/ link or JSON-LD address)
  // first, then breadcrumb candidates (prefer a known city, else the first).
  if (listing.city == null && d.city) listing.city = normalizeCity(d.city);
  if (listing.city == null && d.location_candidates.length) {
    const known = d.location_candidates.findIndex((c) => isCanonicalCity(c));
    const pick = known >= 0 ? known : 0;
    listing.city = normalizeCity(d.location_candidates[pick]);
    const next = d.location_candidates[pick + 1];
    if (listing.district == null && next) listing.district = snippet(next, 80);
  }
  if (listing.district == null && d.district) listing.district = snippet(d.district, 80);
  if (listing.surface_raw == null && d.surface_raw) listing.surface_raw = d.surface_raw;
  if (listing.surface_m2 == null) listing.surface_m2 = normalizeSurface(d.surface_raw);
  // Never overwrite a value that is already set — detail may be less reliable.
  if (listing.rooms_count == null) listing.rooms_count = toInt(d.rooms);
  if (listing.bedrooms_count == null) listing.bedrooms_count = toInt(d.bedrooms);
  if (listing.bathrooms == null) listing.bathrooms = toInt(d.bathrooms);
  if (listing.description_snippet == null) listing.description_snippet = snippet(d.description_snippet);
  if (listing.seller_name == null && d.seller_name) listing.seller_name = d.seller_name;
  if (listing.images_count == null) listing.images_count = d.images_count;

  listing.data_completeness_score = computeCompleteness(listing);
  listing.field_confidence = computeFieldConfidence(listing, {
    price: listing.price_mad != null ? dc.price : "missing",
    city: listing.city != null ? dc.city : "missing",
    district: listing.district != null ? dc.district : "missing",
    surface: listing.surface_m2 != null ? dc.surface : "missing",
    rooms: listing.rooms_count != null ? dc.rooms : "missing",
    bedrooms: listing.bedrooms_count != null ? dc.bedrooms : "missing",
    bathrooms: listing.bathrooms != null ? dc.bathrooms : "missing",
    description: listing.description_snippet != null ? dc.description : "missing",
    seller: listing.seller_name != null ? dc.seller : "missing",
  });

  // P8A: copy advanced characteristics (only overwrite when detail provides a value).
  // Guards against older DetailFields objects that don't include P8A fields yet.
  if (d.built_surface_m2 != null) listing.built_surface_m2 = d.built_surface_m2;
  if (d.plot_surface_m2 != null) listing.plot_surface_m2 = d.plot_surface_m2;
  if (d.condition) listing.condition = d.condition;
  if (d.property_age_range) listing.property_age_range = d.property_age_range;
  if (d.orientation) listing.orientation = d.orientation;
  if (d.floor_type) listing.floor_type = d.floor_type;
  if (d.floors_count != null) listing.floors_count = d.floors_count;
  if (d.garden_m2 != null) listing.garden_m2 = d.garden_m2;
  if (d.terrace_m2 != null) listing.terrace_m2 = d.terrace_m2;
  if (d.garage_spaces != null) listing.garage_spaces = d.garage_spaces;
  if (d.has_pool) listing.has_pool = true;
  if (d.has_concierge) listing.has_concierge = true;
  if (d.has_moroccan_living_room) listing.has_moroccan_living_room = true;
  if (d.has_european_living_room) listing.has_european_living_room = true;
  if (d.has_equipped_kitchen) listing.has_equipped_kitchen = true;
  if (d.premium_features?.length) listing.premium_features = d.premium_features;
}

export function mapRaw(
  raw: RawListing,
  source: SourceName,
  sourceUrl: string,
  defaultTransaction: TransactionTypeP0
): ScrapedListingP0 {
  const tx = normalizeTransaction(
    raw.transaction_type_raw,
    `${raw.title ?? ""} ${raw.price_raw ?? ""}`
  );
  const listing: ScrapedListingP0 = {
    source_name: source,
    source_url: sourceUrl,
    listing_url: raw.listing_url ?? "",
    title: raw.title ?? null,
    price_raw: raw.price_raw ?? null,
    price_mad: plausiblePrice(normalizePrice(raw.price_raw)),
    city: normalizeCity(raw.city),
    district: raw.district ? snippet(raw.district, 80) : null,
    property_type: normalizeType(raw.property_type_raw ?? raw.title),
    transaction_type: tx === "unknown" ? defaultTransaction : tx,
    surface_raw: raw.surface_raw ?? null,
    // Fall back to a surface embedded in the title only when a m²/m2 unit is
    // present (e.g. "Superficie 500 m²"), which keeps the parse reliable.
    surface_m2:
      normalizeSurface(raw.surface_raw) ??
      (raw.title && /\d+\s*m(?:²|2)\b/i.test(raw.title) ? normalizeSurface(raw.title) : null),
    rooms_count: toInt(raw.rooms_count),
    bedrooms_count: toInt(raw.bedrooms_count),
    bathrooms: toInt(raw.bathrooms),
    description_snippet: snippet(raw.description_snippet),
    images_count: raw.images_count ?? null,
    seller_name: raw.seller_name ?? null,
    published_at_raw: raw.published_at_raw ?? null,
    scraped_at: new Date().toISOString(),
    data_completeness_score: 0,
    field_confidence: missingFieldConfidence(),
    // P8A: initialized to absent; filled later by mergeDetail() if detail page extracted them.
    built_surface_m2: null,
    plot_surface_m2: null,
    condition: null,
    property_age_range: null,
    orientation: null,
    floor_type: null,
    floors_count: null,
    garden_m2: null,
    terrace_m2: null,
    garage_spaces: null,
    has_pool: false,
    has_concierge: false,
    has_moroccan_living_room: false,
    has_european_living_room: false,
    has_equipped_kitchen: false,
    premium_features: [],
  };
  listing.data_completeness_score = computeCompleteness(listing);
  // Index-phase fields all come from JSON harvest → "medium" confidence.
  listing.field_confidence = computeFieldConfidence(listing);
  return listing;
}

export async function runHtmlSource(cfg: HtmlSourceConfig): Promise<SourceResult> {
  const errors: ScrapeError[] = [];
  const at = () => new Date().toISOString();

  // 1. Respect robots.txt — skip politely if disallowed.
  let allowed = true;
  try {
    allowed = await isAllowedByRobots(cfg.sourceUrl);
  } catch {
    allowed = true;
  }
  if (!allowed) {
    errors.push({
      source: cfg.name,
      stage: "robots",
      url: cfg.sourceUrl,
      message: "Disallowed by robots.txt — source skipped politely",
      at: at(),
    });
    return { source: cfg.name, listings: [], errors, skipped: true, status: "skipped_robots" };
  }

  // 2. Fetch the public index page (single request).
  let html = "";
  try {
    const res = await fetchHtml(cfg.sourceUrl);
    html = res.html;
  } catch (e) {
    errors.push({ source: cfg.name, stage: "fetch", url: cfg.sourceUrl, message: errMsg(e), at: at() });
    return { source: cfg.name, listings: [], errors, status: "fetch_failed" };
  }

  // 3. Extract — JSON-LD, then __NEXT_DATA__, then DOM cards.
  const raws: RawListing[] = [];
  const seen = new Set<string>();
  const pushUnique = (arr: RawListing[]) => {
    for (const r of arr) {
      if (raws.length >= cfg.max) break;
      if (r.listing_url && !seen.has(r.listing_url)) {
        seen.add(r.listing_url);
        raws.push(r);
      }
    }
  };

  try {
    const $ = loadHtml(html);
    const ld = getJsonLd($);
    if (ld.length) pushUnique(harvestFromJson(ld, { host: cfg.host, max: cfg.max }));
  } catch (e) {
    errors.push({ source: cfg.name, stage: "jsonld", url: cfg.sourceUrl, message: errMsg(e), at: at() });
  }

  if (raws.length < cfg.max) {
    try {
      const nd = getNextData(html);
      if (nd) pushUnique(harvestFromJson(nd, { host: cfg.host, max: cfg.max }));
    } catch (e) {
      errors.push({ source: cfg.name, stage: "next_data", url: cfg.sourceUrl, message: errMsg(e), at: at() });
    }
  }

  if (raws.length === 0) {
    try {
      const $ = loadHtml(html);
      pushUnique(
        harvestFromDom($, {
          base: cfg.sourceUrl,
          host: cfg.host,
          max: cfg.max,
          cardSelectors: cfg.cardSelectors,
        })
      );
    } catch (e) {
      errors.push({ source: cfg.name, stage: "dom", url: cfg.sourceUrl, message: errMsg(e), at: at() });
    }
  }

  if (raws.length === 0) {
    errors.push({
      source: cfg.name,
      stage: "parse",
      url: cfg.sourceUrl,
      message: "No listings extracted (source blocked, empty page, or HTML changed)",
      at: at(),
    });
  }

  const listings = raws
    .slice(0, cfg.max)
    .map((r) => mapRaw(r, cfg.name, cfg.sourceUrl, cfg.defaultTransaction))
    .filter((l) => Boolean(l.listing_url));

  return { source: cfg.name, listings, errors, status: "ok" };
}
