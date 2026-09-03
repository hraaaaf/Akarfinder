import { createHash } from "node:crypto";
import { load } from "cheerio";

import type { CollectionListing } from "../../collection-adapter";
import { extractDetail } from "../../../scripts/scrapers/utils/extract";
import { normalizePrice } from "../../../scripts/scrapers/normalizers/normalize-price";
import { normalizeSurface } from "../../../scripts/scrapers/normalizers/normalize-surface";
import { normalizeTransaction, normalizeType } from "../../../scripts/scrapers/normalizers/normalize-type";

const DETAIL_RE = /\/fr\/(a|pa)\/(\d+)\//i;

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

export function extractMubawabCollectionListing(url: string, html: string, now = new Date().toISOString()): CollectionListing {
  const match = new URL(url).pathname.match(DETAIL_RE);
  if (!match) throw new Error("unsupported_mubawab_detail_url");
  const sourceId = match[2];
  const $ = load(html);
  const detail = extractDetail(html);

  const title = text($("h1").first().text()) ?? text($("meta[property='og:title']").attr("content"));
  const pageText = $("body").text();
  const typeRaw = text($("body").find("*:contains('Type de bien')").next().first().text()) ?? title;
  const transaction = normalizeTransaction(null, `${title ?? ""} ${pageText.slice(0, 1200)}`);
  const rawType = normalizeType(typeRaw);
  const propertyType = rawType === "office" && /local|commerce|magasin/i.test(typeRaw ?? "") ? "commercial" : rawType;
  const priceAmount = normalizePrice(detail.price_raw);
  const totalSurface = normalizeSurface(detail.surface_raw);

  const images = unique(
    $("img[src], meta[property='og:image']")
      .map((_, el) => $(el).attr("src") ?? $(el).attr("content") ?? "")
      .get()
      .filter((src) => /^https?:\/\//.test(src) && /mubawab-media\.com/i.test(src)),
  ).map((imageUrl, index) => ({ url: imageUrl, position: index + 1, hash: null }));

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
    price: { amount: priceAmount, currency: "MAD", period: transaction === "rent" ? "month" : "total", on_request: priceAmount == null },
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
