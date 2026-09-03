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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractDistrictFromPrimaryStats(pageText: string, city: string | null): string | null {
  if (!city) return null;
  const marker = new RegExp(`\\s(?:à|a)\\s${escapeRegExp(city)}\\b`, "giu");
  const statPattern = /\d+\s*(?:m(?:²|2)|pi[eè]ces?|chambres?|salles?\s*de\s*bains?)/giu;
  const stopPattern = /\d|\b(?:dh|dhs|mad|favori|partager|contacter|prix|surface)\b/i;

  for (const match of pageText.matchAll(marker)) {
    if (match.index == null) continue;
    const prefix = pageText.slice(Math.max(0, match.index - 220), match.index);
    const stats = [...prefix.matchAll(statPattern)];
    if (!stats.length) continue;
    const last = stats[stats.length - 1];
    const afterLastStat = (last.index ?? 0) + last[0].length;
    let candidate = text(prefix.slice(afterLastStat).replace(/^[\s,:;\-–—]+|[\s,:;\-–—]+$/g, ""));
    if (!candidate) continue;
    if (candidate.length > 70) candidate = candidate.split(/\s+/).slice(-8).join(" ");
    if (candidate.length < 2 || candidate.length > 70 || stopPattern.test(candidate)) continue;
    if (candidate.localeCompare(city, "fr", { sensitivity: "base" }) === 0) continue;
    return candidate;
  }

  return null;
}

function extractPrimaryTransaction(title: string | null, description: string | null): CollectionListing["transaction"] {
  const titleTransaction = normalizeTransaction(null, title);
  if (titleTransaction !== "unknown") return titleTransaction;
  if (!description) return null;

  const primaryDescription = description.slice(0, 700);
  const signals: Array<{ transaction: "sale" | "rent"; index: number }> = [];
  const patterns: Array<{ transaction: "sale" | "rent"; pattern: RegExp }> = [
    { transaction: "sale", pattern: /(?:à|a)\s+vendre|(?:à|a)\s+la\s+vente|\bmis(?:e)?\s+en\s+vente\b/giu },
    { transaction: "rent", pattern: /(?:à|a)\s+louer|(?:à|a)\s+la\s+location|\bloyer\b[^.]{0,40}\/\s*mois\b/giu },
  ];

  for (const { transaction, pattern } of patterns) {
    const match = pattern.exec(primaryDescription);
    if (match?.index != null) signals.push({ transaction, index: match.index });
  }

  signals.sort((a, b) => a.index - b.index);
  return signals[0]?.transaction ?? null;
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

function extractJsonLdPrimaryType($: ReturnType<typeof load>, title: string | null): string | null {
  const normalizedTitle = title?.toLowerCase().replace(/\s+/g, " ").trim() ?? null;
  let fallback: string | null = null;

  $("script[type='application/ld+json']").each((_, el) => {
    if (fallback && !normalizedTitle) return;
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const stack = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (stack.length) {
        const node = stack.shift();
        if (!node || typeof node !== "object") continue;
        if (Array.isArray(node)) {
          stack.push(...node);
          continue;
        }
        if (Array.isArray(node["@graph"])) stack.push(...node["@graph"]);
        const type = typeof node["@type"] === "string" ? node["@type"] : null;
        const name = typeof node.name === "string" ? node.name.toLowerCase().replace(/\s+/g, " ").trim() : null;
        if (type && !fallback) fallback = type;
        if (type && normalizedTitle && name === normalizedTitle) {
          fallback = type;
          return false;
        }
      }
    } catch {
      // Ignore malformed JSON-LD and keep DOM/title fallbacks.
    }
  });

  return fallback;
}

function extractExplicitDetailType($: ReturnType<typeof load>): string | null {
  let found: string | null = null;
  $("body *").each((_, el) => {
    if (found) return false;
    const ownText = text($(el).clone().children().remove().end().text());
    if (!ownText || !/^type de bien\s*:?.*$/i.test(ownText)) return;

    const inline = text(ownText.replace(/^type de bien\s*:?\s*/i, ""));
    if (inline) {
      found = inline;
      return false;
    }

    const sibling = text($(el).next().first().text());
    if (sibling) {
      found = sibling;
      return false;
    }
  });
  return found;
}

function mapMubawabPropertyType(typeRaw: string | null): CollectionListing["property_type"] {
  if (!typeRaw) return "unknown";
  if (/\bmaison\b|\bhouse\b/i.test(typeRaw) && !/\bvilla\b/i.test(typeRaw)) return "house";
  const rawType = normalizeType(typeRaw);
  return rawType === "office" && /local|commerce|magasin/i.test(typeRaw) ? "commercial" : rawType;
}

export function extractMubawabCollectionListing(url: string, html: string, now = new Date().toISOString()): CollectionListing {
  const match = new URL(url).pathname.match(DETAIL_RE);
  if (!match) throw new Error("unsupported_mubawab_detail_url");
  const sourceId = match[2];
  const $ = load(html);
  const detail = extractDetail(html);

  const title = text($("h1").first().text()) ?? text($("meta[property='og:title']").attr("content"));
  const pageText = $("body").text().replace(/\s+/g, " ");
  const explicitType = extractExplicitDetailType($);
  const jsonLdType = extractJsonLdPrimaryType($, title);
  const typeRaw = explicitType ?? jsonLdType ?? title;
  const transaction = extractPrimaryTransaction(title, detail.description_snippet);
  const propertyType = mapMubawabPropertyType(typeRaw);
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
  const city = detail.city ?? detail.location_candidates?.find((v) => /casablanca|rabat|marrakech|tanger|agadir|fès|fes|kénitra|kenitra|mohammedia|temara|témara|salé|sale/i.test(v)) ?? null;
  const candidateDistrict = detail.location_candidates?.find((v) => !city || v.localeCompare(city, "fr", { sensitivity: "base" }) !== 0) ?? null;
  const district = detail.district ?? extractDistrictFromPrimaryStats(pageText, city) ?? candidateDistrict;

  const warnings: string[] = [];
  if (!title) warnings.push("title_missing");
  if (!city) warnings.push("city_missing");
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
    transaction,
    property_type: propertyType,
    title,
    description,
    price: { amount: priceAmount, currency: "MAD", period: transaction === "rent" ? "month" : transaction === "sale" ? "total" : null, on_request: priceAmount == null },
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
