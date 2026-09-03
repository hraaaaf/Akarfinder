import { createHash } from "node:crypto";
import { load } from "cheerio";

import type { CollectionListing } from "../../collection-adapter";
import { extractDetail } from "../../../scripts/scrapers/utils/extract";
import { normalizePrice } from "../../../scripts/scrapers/normalizers/normalize-price";
import { normalizeSurface } from "../../../scripts/scrapers/normalizers/normalize-surface";
import { normalizeTransaction, normalizeType } from "../../../scripts/scrapers/normalizers/normalize-type";

const DETAIL_RE = /\/fr\/(a|pa)\/(\d+)\//i;
const MUBAWAB_MEDIA_RE = /^https?:\/\/[^/]*mubawab-media\.com\//i;
const PRIMARY_GALLERY_SELECTORS = [
  '[data-testid="listing-gallery"]',
  '[data-testid="property-gallery"]',
  '[data-testid="ad-gallery"]',
  '[data-gallery="listing"]',
  '[data-gallery="property"]',
  '.listing-gallery',
  '.property-gallery',
  '.ad-gallery',
];

function text(v: string | undefined | null): string | null {
  const s = v?.replace(/\s+/g, " ").trim();
  return s ? s : null;
}

function unique<T>(values: T[]): T[] { return [...new Set(values)]; }

function parseFloor(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/(\d+)/);
  return m ? Number.parseInt(m[1], 10) : null;
}

function extractPrimaryImageUrls($: ReturnType<typeof load>): string[] {
  const ogImage = text($("meta[property='og:image']").attr("content"));
  const galleryImages: string[] = [];

  for (const selector of PRIMARY_GALLERY_SELECTORS) {
    const gallery = $(selector).first();
    if (!gallery.length) continue;

    gallery.find("img").each((_, el) => {
      const imageUrl = text(
        $(el).attr("src") ??
        $(el).attr("data-src") ??
        $(el).attr("data-lazy-src") ??
        $(el).attr("data-original"),
      );
      if (imageUrl && MUBAWAB_MEDIA_RE.test(imageUrl)) galleryImages.push(imageUrl);
    });
    break;
  }

  return unique([
    ...(ogImage && MUBAWAB_MEDIA_RE.test(ogImage) ? [ogImage] : []),
    ...galleryImages,
  ]);
}

function extractPrimaryJsonLdType($: ReturnType<typeof load>, sourceId: string): string | null {
  let fallback: string | null = null;

  $("script[type='application/ld+json']").each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      const nodes: any[] = [];

      for (const root of roots) {
        if (root && Array.isArray(root["@graph"])) nodes.push(...root["@graph"]);
        else nodes.push(root);
      }

      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const nodeType = Array.isArray(node["@type"]) ? node["@type"].join(" ") : node["@type"];
        if (typeof nodeType !== "string" || !nodeType.trim()) continue;

        const nodeUrl = typeof node.url === "string" ? node.url : "";
        if (nodeUrl.includes(`/a/${sourceId}/`) || nodeUrl.includes(`/pa/${sourceId}/`)) {
          fallback = nodeType;
          return false;
        }

        if (fallback == null && /apartment|house|villa|residence|land|office|store|place/i.test(nodeType)) {
          fallback = nodeType;
        }
      }
    } catch {
      // Ignore malformed JSON-LD; title remains the primary deterministic signal.
    }
  });

  return fallback;
}

function normalizeMubawabPropertyType(title: string | null, jsonLdType: string | null, pageText: string): CollectionListing["property_type"] {
  const titleType = normalizeType(title);
  if (titleType !== "unknown") return titleType;

  const jsonLdNormalized = normalizeType(jsonLdType);
  if (jsonLdNormalized !== "unknown") return jsonLdNormalized;

  const explicitTypeLabel = pageText.match(/Type de bien\s*[:\-]?\s*([^\n\r|]{2,80})/i)?.[1] ?? null;
  const fallbackType = normalizeType(explicitTypeLabel);
  if (fallbackType === "office" && /local|commerce|magasin/i.test(explicitTypeLabel ?? "")) return "commercial";
  return fallbackType;
}

function normalizeMubawabTransaction(title: string | null, pageText: string) {
  const titleTransaction = normalizeTransaction(null, title);
  if (titleTransaction !== "unknown") return titleTransaction;

  const explicitTransaction = pageText.match(/(?:Transaction|Type d['’]offre)\s*[:\-]?\s*([^\n\r|]{2,80})/i)?.[1] ?? null;
  if (explicitTransaction) {
    const normalized = normalizeTransaction(explicitTransaction);
    if (normalized !== "unknown") return normalized;
  }

  return "unknown" as const;
}

export function extractMubawabCollectionListing(url: string, html: string, now = new Date().toISOString()): CollectionListing {
  const match = new URL(url).pathname.match(DETAIL_RE);
  if (!match) throw new Error("unsupported_mubawab_detail_url");
  const sourceId = match[2];
  const $ = load(html);
  const detail = extractDetail(html);

  const title = text($("h1").first().text()) ?? text($("meta[property='og:title']").attr("content"));
  const pageText = $("body").text();
  const jsonLdType = extractPrimaryJsonLdType($, sourceId);
  const transaction = normalizeMubawabTransaction(title, pageText);
  const propertyType = normalizeMubawabPropertyType(title, jsonLdType, pageText);
  const priceAmount = normalizePrice(detail.price_raw);
  const totalSurface = normalizeSurface(detail.surface_raw);

  const images = extractPrimaryImageUrls($)
    .map((imageUrl, index) => ({ url: imageUrl, position: index + 1, hash: null }));

  const features = unique([
    ...(detail.premium_features ?? []),
    detail.has_pool ? "pool" : null,
    detail.has_concierge ? "concierge" : null,
    detail.has_equipped_kitchen ? "equipped_kitchen" : null,
    /ascenseur/i.test(pageText) ? "elevator" : null,
    /garage|parking/i.test(pageText) ? "garage" : null,
    /terrasse/i.test(pageText) ? "terrace" : null,
    /climatisation/i.test(pageText) ? "air_conditioning" : null,
    /sécurit|securit/i.test(pageText) ? "security" : null,
  ].filter((v): v is string => Boolean(v)));

  const floorLabel = pageText.match(/Étage du bien\s*([0-9]+(?:er|ème|e)?)/i)?.[1] ?? null;
  const description = detail.description_snippet;
  const district = detail.district ?? detail.location_candidates?.[0] ?? null;
  const city = detail.city ?? detail.location_candidates?.find((v) => /casablanca|rabat|marrakech|tanger|agadir|fès|fes|kénitra|kenitra|mohammedia|temara|témara|salé|sale/i.test(v)) ?? null;

  const warnings: string[] = [];
  if (!title) warnings.push("title_missing");
  if (!city) warnings.push("city_missing");
  if (transaction === "unknown") warnings.push("transaction_missing");
  if (propertyType === "unknown") warnings.push("property_type_missing");
  if (priceAmount == null) warnings.push("price_missing_or_on_request");
  if (totalSurface == null) warnings.push("surface_missing");

  const hashPayload = JSON.stringify({ title, description, priceAmount, totalSurface, rooms: detail.rooms, bedrooms: detail.bedrooms, bathrooms: detail.bathrooms, city, district, features, images: images.map((v) => v.url) });

  return {
    akar_id: null,
    source: {
      name: "mubawab",
      source_id: sourceId,
      url,
      first_seen_at: now,
      last_seen_at: now,
      scraped_at: now,
      content_hash: createHash("sha256").update(hashPayload).digest("hex"),
    },
    status: "active",
    transaction: transaction === "unknown" ? null : transaction,
    property_type: propertyType,
    title,
    description,
    price: {
      amount: priceAmount,
      currency: "MAD",
      period: transaction === "rent" ? "month" : transaction === "sale" ? "total" : null,
      on_request: priceAmount == null,
    },
    surface: { total_m2: totalSurface, habitable_m2: null, built_m2: detail.built_surface_m2 ?? null, land_m2: detail.plot_surface_m2 ?? null },
    rooms: detail.rooms,
    bedrooms: detail.bedrooms,
    bathrooms: detail.bathrooms,
    floor: parseFloor(floorLabel),
    location: { country: "Morocco", region: null, city, district, address_text: district && city ? `${district}, ${city}` : city, latitude: null, longitude: null, precision: district ? "neighborhood_centroid" : city ? "city_centroid" : "unknown" },
    features,
    images,
    seller: { name: detail.seller_name, type: detail.seller_name ? "agency" : "unknown", source_profile_url: null },
    provenance: { source_type: "portal", source_listing_url: url, retrieval_method: "crawl" },
    quality: { score: Math.max(0, 100 - warnings.length * 15), warnings },
    raw: { detail_family: match[1].toLowerCase(), field_confidence: detail._confidence, condition: detail.condition, property_age_range: detail.property_age_range, orientation: detail.orientation, floor_type: detail.floor_type },
  };
}
