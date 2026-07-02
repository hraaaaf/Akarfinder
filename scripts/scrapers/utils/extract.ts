// Defensive HTML extraction helpers shared by the source scrapers.
// Strategy order per source: JSON-LD -> __NEXT_DATA__ -> DOM cards.
// Everything is best-effort and must never throw on malformed markup.

import * as cheerio from "cheerio";
import type { FieldConfidenceLevel, RawListing } from "../types";

export type Cheerio$ = cheerio.CheerioAPI;

export function loadHtml(html: string): Cheerio$ {
  return cheerio.load(html);
}

export function absoluteUrl(base: string, href: string | undefined | null): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function clean(text: string | undefined | null): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  return t.length ? t : null;
}

// --- JSON-LD ----------------------------------------------------------------

export function getJsonLd($: Cheerio$): any[] {
  const blocks: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && item["@graph"] && Array.isArray(item["@graph"])) {
          blocks.push(...item["@graph"]);
        } else {
          blocks.push(item);
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });
  return blocks;
}

// --- __NEXT_DATA__ ----------------------------------------------------------

export function getNextData(html: string): any | null {
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// --- Generic JSON harvest ---------------------------------------------------
// Walks an arbitrary JSON tree and collects objects that plausibly describe a
// listing: they must expose a title-ish AND a url-ish field. This survives most
// markup changes because it does not depend on exact key paths.

const TITLE_KEYS = ["subject", "title", "name", "headline", "adTitle"];
const URL_KEYS = ["url", "friendlyUrl", "permalink", "link", "listingUrl", "share_url", "shareUrl", "slug", "canonicalUrl", "detailUrl", "href"];
const PRICE_KEYS = ["price", "priceValue", "prix", "amount", "rawPrice", "price_value"];
const CITY_KEYS = ["city", "cityName", "ville", "locationName", "town"];
const DISTRICT_KEYS = ["district", "neighborhood", "quartier", "area", "areaName", "zone"];
const SURFACE_KEYS = ["surface", "area_m2", "surfaceArea", "size", "livingArea", "superficie"];
// rooms_count = total pièces; bedrooms_count = chambres. Keys kept separate.
const ROOMS_KEYS = ["rooms", "pieces", "nbRooms", "roomCount"];
const BEDROOMS_KEYS = ["bedrooms", "chambres", "nbBedrooms", "bedroomCount", "beds"];
const BATHROOMS_KEYS = ["bathrooms", "sallesDeBain", "nbBathrooms", "bathroomCount", "baths"];
const TYPE_KEYS = ["propertyType", "category", "categoryName", "type", "typeBien", "subcategory"];
const TX_KEYS = ["transactionType", "offerType", "transaction", "purpose", "dealType"];
const SELLER_KEYS = ["sellerName", "agencyName", "storeName", "advertiser", "ownerName"];
const DATE_KEYS = ["publishedAt", "listTime", "createdAt", "date", "publishDate", "datePublished"];

function pickString(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function pickNumber(obj: any, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseInt(v.replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function pickPrice(obj: any): string | null {
  // Schema.org style: offers.price / offers[0].price / priceSpecification.price
  const offers = obj?.offers;
  if (offers) {
    const o = Array.isArray(offers) ? offers[0] : offers;
    const p = o?.price ?? o?.priceSpecification?.price;
    if (typeof p === "string" || typeof p === "number") {
      const cur = o?.priceCurrency ?? o?.priceSpecification?.priceCurrency ?? "MAD";
      return `${p} ${cur}`;
    }
  }
  const spec = obj?.priceSpecification;
  if (spec && (typeof spec.price === "string" || typeof spec.price === "number")) {
    return `${spec.price} ${spec.priceCurrency ?? "MAD"}`;
  }
  return pickString(obj, PRICE_KEYS);
}

function pickCity(obj: any): string | null {
  const direct = pickString(obj, CITY_KEYS);
  if (direct) return direct;
  const addr = obj?.address || obj?.location?.address;
  if (addr && typeof addr === "object") {
    const loc = addr.addressLocality || addr.addressRegion;
    if (typeof loc === "string" && loc.trim()) return loc.trim();
  }
  return null;
}

function pickDistrict(obj: any): string | null {
  const direct = pickString(obj, DISTRICT_KEYS);
  if (direct) return direct;
  const addr = obj?.address || obj?.location?.address;
  if (addr && typeof addr === "object" && typeof addr.streetAddress === "string") {
    return addr.streetAddress.trim() || null;
  }
  return null;
}

function countImages(obj: any): number | null {
  const candidates = [obj?.images, obj?.photos, obj?.media, obj?.image, obj?.imageList];
  for (const c of candidates) {
    if (Array.isArray(c)) return c.length;
  }
  const n = pickNumber(obj, ["imagesCount", "nbImages", "photoCount", "imageCount"]);
  return n;
}

export function harvestFromJson(root: any, opts: { host: string; max: number }): RawListing[] {
  const found: RawListing[] = [];
  const seen = new Set<string>();
  const stack: any[] = [root];
  let guard = 0;

  while (stack.length && found.length < opts.max && guard < 200000) {
    guard += 1;
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;

    if (Array.isArray(node)) {
      for (const child of node) stack.push(child);
      continue;
    }

    const title = pickString(node, TITLE_KEYS);
    let url = pickString(node, URL_KEYS);
    if (url && !/^https?:\/\//.test(url)) {
      try {
        url = new URL(url, `https://${opts.host}`).toString();
      } catch {
        url = null;
      }
    }
    const isOnHost = url ? url.includes(opts.host) : false;

    // Reject non-listing objects (site root / organization / breadcrumb).
    let pathname = "";
    if (url) {
      try {
        pathname = new URL(url).pathname.replace(/\/+$/, "");
      } catch {
        pathname = "";
      }
    }
    const isListingUrl = pathname.length > 1;

    if (title && url && isOnHost && isListingUrl && title.trim().length >= 6 && !seen.has(url)) {
      seen.add(url);
      found.push({
        listing_url: url,
        title,
        price_raw: pickPrice(node),
        city: pickCity(node),
        district: pickDistrict(node),
        property_type_raw: pickString(node, TYPE_KEYS),
        transaction_type_raw: pickString(node, TX_KEYS),
        surface_raw: pickString(node, SURFACE_KEYS),
        rooms_count: pickNumber(node, ROOMS_KEYS),
        bedrooms_count: pickNumber(node, BEDROOMS_KEYS),
        bathrooms: pickNumber(node, BATHROOMS_KEYS),
        description_snippet: pickString(node, ["description", "shortDescription", "excerpt"]),
        images_count: countImages(node),
        seller_name: pickString(node, SELLER_KEYS),
        published_at_raw: pickString(node, DATE_KEYS),
      });
    }

    for (const key of Object.keys(node)) stack.push(node[key]);
  }

  return found;
}

// --- DOM card harvest -------------------------------------------------------
// Generic fallback: try a list of candidate card selectors, then pull the first
// anchor + price-ish/title-ish text inside each card.

export function harvestFromDom(
  $: Cheerio$,
  opts: { base: string; host: string; max: number; cardSelectors: string[] }
): RawListing[] {
  const out: RawListing[] = [];
  const seen = new Set<string>();

  for (const selector of opts.cardSelectors) {
    const cards = $(selector);
    if (cards.length === 0) continue;

    cards.each((_, el) => {
      if (out.length >= opts.max) return false;
      const card = $(el);
      const anchor = card.is("a") ? card : card.find("a[href]").first();
      const href = anchor.attr("href");
      const url = absoluteUrl(opts.base, href);
      if (!url || !url.includes(opts.host) || seen.has(url)) return;

      const title =
        clean(anchor.attr("title")) ||
        clean(card.find("h2, h3, [class*=title], [class*=Title]").first().text()) ||
        clean(anchor.text());

      const priceText = clean(
        card.find('[class*=price], [class*=Price], .priceTag, [data-testid*=price]').first().text()
      );
      const locationText = clean(
        card.find('[class*=location], [class*=Location], [class*=city], [class*=address]').first().text()
      );
      const imgCount = card.find("img").length || null;

      if (!title) return;
      seen.add(url);
      out.push({
        listing_url: url,
        title,
        price_raw: priceText,
        city: locationText,
        district: null,
        property_type_raw: title,
        transaction_type_raw: null,
        surface_raw: clean(card.find('[class*=surface], [class*=area]').first().text()),
        images_count: imgCount,
      });
    });

    if (out.length > 0) break; // first selector that yields results wins
  }

  return out;
}

// --- Detail page extraction -------------------------------------------------
// Pulls richer fields from a single public listing detail page. JSON-LD first
// (most stable), then DOM + page-text regex fallbacks. Never throws.

// Confidence tracking for each extracted field.
// Used by _shared.ts/mergeDetail to build the final field_confidence object.
export type DetailFieldConfidence = {
  price: FieldConfidenceLevel;
  city: FieldConfidenceLevel;
  district: FieldConfidenceLevel;
  surface: FieldConfidenceLevel;
  rooms: FieldConfidenceLevel;
  bedrooms: FieldConfidenceLevel;
  bathrooms: FieldConfidenceLevel;
  description: FieldConfidenceLevel;
  seller: FieldConfidenceLevel;
};

export type DetailFields = {
  price_raw: string | null;
  city: string | null;
  district: string | null;
  surface_raw: string | null;
  // rooms_count = total pièces; only set from "pièces/rooms" signals.
  rooms: number | null;
  // bedrooms_count = chambres only; never set from "pièces" signals.
  bedrooms: number | null;
  bathrooms: number | null;
  description_snippet: string | null;
  seller_name: string | null;
  images_count: number | null;
  // MUBAWAB-DB-THUMBNAILS-RISK-ACCEPTED-1: single public thumbnail URL, read
  // from the page's og:image meta tag (the canonical image the source site
  // itself designates for public sharing — never a full gallery).
  thumbnail_url: string | null;
  // Ordered breadcrumb/location strings (noise-filtered) for the caller to
  // resolve city/district against the known-city list.
  location_candidates: string[];
  // Per-field extraction confidence for every non-null field.
  _confidence: DetailFieldConfidence;

  // P8A: advanced property characteristics (best-effort; null/false = absent).
  built_surface_m2: number | null;
  plot_surface_m2: number | null;
  condition: string | null;
  property_age_range: string | null;
  orientation: string | null;
  floor_type: string | null;
  floors_count: number | null;
  garden_m2: number | null;
  terrace_m2: number | null;
  garage_spaces: number | null;
  has_pool: boolean;
  has_concierge: boolean;
  has_moroccan_living_room: boolean;
  has_european_living_room: boolean;
  has_equipped_kitchen: boolean;
  premium_features: string[];
};

const NAV_NOISE =
  /accueil|mubawab|home|immobilier|(?:à|a)\s*vendre|louer|location|estimer|votre bien|connexion|inscription|publier|d[ée]poser|annonce|projet|neuf|agence|blog|conseil|favoris|compte|recherche/i;

function numVal(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseInt(v.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object") return numVal(v.value ?? v["@value"] ?? v.maxValue);
  return null;
}

function matchInt(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function missingConfidence(): DetailFieldConfidence {
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

export function extractDetail(html: string): DetailFields {
  const conf = missingConfidence();
  const out: DetailFields = {
    price_raw: null,
    city: null,
    district: null,
    surface_raw: null,
    rooms: null,
    bedrooms: null,
    bathrooms: null,
    description_snippet: null,
    seller_name: null,
    images_count: null,
    thumbnail_url: null,
    location_candidates: [],
    _confidence: conf,
    // P8A defaults
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

  let $: Cheerio$;
  try {
    $ = loadHtml(html);
  } catch {
    return out;
  }

  // 0) Public thumbnail — the single og:image the source designates for
  // sharing. Never the full gallery; never downloaded, only the remote URL.
  try {
    const ogImage = clean($('meta[property="og:image"]').attr("content"));
    if (ogImage && /^https?:\/\//.test(ogImage)) {
      out.thumbnail_url = ogImage;
    }
  } catch {
    // best-effort — absence is not an error
  }

  // 1) JSON-LD (schema.org real-estate / product) — highest confidence source
  try {
    const ld = getJsonLd($);
    const node = ld.find((o) => {
      if (!o || typeof o !== "object") return false;
      const t = o["@type"];
      const types = Array.isArray(t) ? t.join(",") : String(t ?? "");
      return (
        /Residence|Apartment|House|RealEstate|Product|Offer|Place|Accommodation/i.test(types) &&
        (o.offers || o.address || o.name || o.floorSize)
      );
    });
    if (node) {
      const p = pickPrice(node);
      if (p) { out.price_raw = p; conf.price = "high"; }

      const c = pickCity(node);
      if (c) { out.city = c; conf.city = "high"; }

      const d = pickDistrict(node);
      if (d) { out.district = d; conf.district = "high"; }

      if (node.floorSize) {
        const sf = `${numVal(node.floorSize) ?? ""} m²`.trim();
        if (sf !== "m²") { out.surface_raw = sf; conf.surface = "high"; }
      }

      // numberOfRooms = total pièces (NOT bedrooms)
      const r = numVal(node.numberOfRooms);
      if (r != null) { out.rooms = r; conf.rooms = "high"; }

      // numberOfBedrooms = chambres specifically
      const b = numVal(node.numberOfBedrooms ?? node.numberOfBedroomsTotal);
      if (b != null) { out.bedrooms = b; conf.bedrooms = "high"; }

      const bths = numVal(node.numberOfBathroomsTotal ?? node.numberOfBathrooms);
      if (bths != null) { out.bathrooms = bths; conf.bathrooms = "high"; }

      const desc = pickString(node, ["description"]);
      if (desc) { out.description_snippet = desc; conf.description = "high"; }

      const seller =
        node.offers?.seller?.name ??
        node.provider?.name ??
        node.realEstateAgent?.name ??
        pickString(node, SELLER_KEYS);
      if (seller) { out.seller_name = seller; conf.seller = "high"; }

      if (Array.isArray(node.image)) out.images_count = node.image.length;
    }
  } catch {
    // ignore JSON-LD problems, fall through to DOM
  }

  // 2) DOM + page-text fallbacks for whatever is still missing.
  const text = $("body").text().replace(/\s+/g, " ");

  if (!out.price_raw) {
    const priceEl = $('[class*="price"], [class*="Price"], .orangeText, .priceTag')
      .filter((_, el) => /\d/.test($(el).text()))
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    if (priceEl) {
      out.price_raw = priceEl;
      conf.price = "high"; // structured DOM selector
    } else {
      const m = text.match(/(\d[\d\s. ]{2,})\s*(?:dhs?|mad|dirhams?)/i);
      if (m) {
        out.price_raw = `${m[1].trim()} DH`;
        conf.price = "medium"; // text regex
      }
    }
  }

  // City from a Mubawab-style city link (/ct/<slug>/…) — highly reliable, and
  // captures peri-urban towns that are not in our canonical alias list.
  if (!out.city) {
    const ctHref = $('a[href*="/ct/"]')
      .map((_, el) => $(el).attr("href") || "")
      .get()
      .find((h) => /\/(?:fr|ar|en)\/ct\/[^/]+/.test(h));
    if (ctHref) {
      const m = ctHref.match(/\/ct\/([^/?#]+)/);
      if (m) {
        out.city = slugToTitle(decodeURIComponent(m[1]));
        conf.city = "high"; // structured URL pattern, very reliable
      }
    }
  }

  // Collect ordered location candidates from real breadcrumb trails only
  // (never the global nav). The caller validates these against known cities.
  const candidates: string[] = [];
  const pushCandidate = (s: string | null | undefined) => {
    const t = (s ?? "").replace(/\s+/g, " ").trim();
    if (t.length >= 3 && t.length <= 40 && !NAV_NOISE.test(t) && !candidates.includes(t)) {
      candidates.push(t);
    }
  };
  try {
    const ld = getJsonLd($);
    const bc = ld.find((o) => {
      const t = o?.["@type"];
      return (Array.isArray(t) ? t.join(",") : String(t ?? "")).includes("BreadcrumbList");
    });
    if (bc && Array.isArray(bc.itemListElement)) {
      for (const it of bc.itemListElement) pushCandidate(it?.name ?? it?.item?.name);
    }
  } catch {
    // ignore
  }
  $('[class*="breadcrumb"] a, [class*="Breadcrumb"] a, .fil-ariane a, [itemtype*="BreadcrumbList"] a').each(
    (_, el) => pushCandidate($(el).text())
  );
  out.location_candidates = candidates;

  // Text regex fallbacks — "medium" confidence.
  // IMPORTANT: bedrooms is only filled from "chambre" text, never from "pièce".
  // rooms is only filled from "pièce/room" text, never from "chambre".
  if (out.bedrooms == null) {
    const n = matchInt(text, /(\d+)\s*chambre/i);
    if (n != null) { out.bedrooms = n; conf.bedrooms = "medium"; }
  }
  if (out.bathrooms == null) {
    const n = matchInt(text, /(\d+)\s*(?:salle?s?\s*de\s*bain|sdb)/i);
    if (n != null) { out.bathrooms = n; conf.bathrooms = "medium"; }
  }
  if (out.rooms == null) {
    // Only match "pièces" or "rooms" — never "chambres"
    const n = matchInt(text, /(\d+)\s*pi[eè]ce/i) ?? matchInt(text, /(\d+)\s*room/i);
    if (n != null) { out.rooms = n; conf.rooms = "medium"; }
  }
  if (!out.surface_raw) {
    const m =
      text.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|2|\b)/) ||
      text.match(/(?:surface(?:\s*totale)?|superficie)\D{0,8}(\d{2,5})/i);
    if (m) {
      out.surface_raw = `${m[1]} m²`;
      conf.surface = "medium";
    }
  }

  if (!out.description_snippet) {
    const meta =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      null;
    if (meta) {
      out.description_snippet = meta;
      conf.description = "medium"; // meta tags, somewhat reliable
    } else {
      const domDesc = $('[class*="description"] p, [class*="Description"] p').first().text().replace(/\s+/g, " ").trim();
      if (domDesc) {
        out.description_snippet = domDesc;
        conf.description = "high"; // explicit DOM container
      }
    }
  }

  if (!out.seller_name) {
    const seller = $('[class*="agency"], [class*="Agency"], [class*="advertiser"], a[href*="agence"]')
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    if (seller && seller.length <= 80) {
      out.seller_name = seller;
      conf.seller = "high"; // structured DOM selector
    }
  }

  if (out.images_count == null) {
    const imgs = $('[class*="gallery"] img, [class*="thumb"] img, [class*="photo"] img, [class*="slider"] img').length;
    if (imgs > 0) out.images_count = imgs;
  }

  // P8A: advanced characteristics — best-effort, never throws.
  try {
    extractP8aCharacteristics($, text, out);
  } catch {
    // ignore — non-critical enrichment
  }

  return out;
}

// ---------------------------------------------------------------------------
// P8A: extract advanced characteristics from Mubawab detail pages.
// Strategy: labeled text patterns first (reliable), DOM block second,
// boolean feature tags third (main content only to avoid similar-listing noise).
// ---------------------------------------------------------------------------

function parseM2(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Math.round(parseFloat(m[1].replace(",", ".")));
  return Number.isFinite(n) && n > 0 && n < 1_000_000 ? n : null;
}

function extractP8aCharacteristics(
  $: Cheerio$,
  bodyText: string,
  out: DetailFields
): void {
  // ── 1. Labeled surface patterns in full body text ──────────────────────────
  // "Surface du terrain 1094 m²" / "Surface de la parcelle 800 m²"
  // Allow up to 2 intermediate words to cover "de la", "du", "de", etc.
  const plotM = bodyText.match(
    /surface\s+(?:\w+\s+){0,2}(?:terrain|parcelle)\s*[:\-]?\s*(\d[\d\s.,]*)\s*m/i
  );
  if (plotM) out.plot_surface_m2 = parseM2(plotM[1]);

  const builtM = bodyText.match(
    /surface\s+construit[e]?\s*[:\-]?\s*(\d[\d\s.,]*)\s*m/i
  );
  if (builtM) out.built_surface_m2 = parseM2(builtM[1]);

  // ── 2. DOM characteristics block — Mubawab label-value pairs ──────────────
  // Targets: <ul class="blockDetails">, <div class="ficheDetails">, tables.
  // Builds a label→value map from whatever structured list is found.
  const chars = new Map<string, string>();

  const charSelectors = [
    "[class*='blockDetails'] li",
    "[class*='ficheDetails'] li",
    "[class*='caracteristiques'] li",
    "[class*='Caracteristiques'] li",
    "[class*='criteria'] li",
    "[class*='detail-features'] li",
    "table[class*='fiche'] tr",
    "table[class*='detail'] tr",
  ].join(", ");

  $(charSelectors).each((_, el) => {
    const item = $(el);
    const labelEl = item.find(
      "[class*='titreFiche'], [class*='label'], [class*='key'], th, dt"
    ).first();
    const valueEl = item.find(
      "[class*='titreFicheValue'], [class*='value'], [class*='val'], td, dd"
    ).first();
    const label = labelEl.text().replace(/\s+/g, " ").trim().toLowerCase();
    const value = valueEl.text().replace(/\s+/g, " ").trim();
    if (label && value && label.length < 60) chars.set(label, value);
  });

  // Parse the characteristics map.
  for (const [label, value] of chars) {
    if (/surface.*terrain|terrain.*surface|parcelle/.test(label) && !out.plot_surface_m2) {
      out.plot_surface_m2 = parseM2(value);
    } else if (/surface.*construit|construit/.test(label) && !out.built_surface_m2) {
      out.built_surface_m2 = parseM2(value);
    } else if (/[eé]tat/.test(label) && !out.condition) {
      const v = value.slice(0, 60).trim();
      if (v) out.condition = v;
    } else if (/\b[aâ]ge\b|anciennet/.test(label) && !out.property_age_range) {
      const v = value.slice(0, 40).trim();
      if (v) out.property_age_range = v;
    } else if (/orientation/.test(label) && !out.orientation) {
      const v = value.slice(0, 30).trim();
      if (v) out.orientation = v;
    } else if (/(?:type\s+de\s+)?sol|rev[eê]tement|plancher/.test(label) && !out.floor_type) {
      const v = value.slice(0, 40).trim();
      if (v) out.floor_type = v;
    } else if (/[eé]tage|niveau/.test(label) && !out.floors_count) {
      const n = parseInt(value.replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 30) out.floors_count = n;
    } else if (/jardin/.test(label) && !out.garden_m2) {
      out.garden_m2 = parseM2(value);
    } else if (/terrasse/.test(label) && !out.terrace_m2) {
      out.terrace_m2 = parseM2(value);
    } else if (/garage|parking/.test(label) && !out.garage_spaces) {
      const n = parseInt(value.replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 50) out.garage_spaces = n;
    }
  }

  // ── 3. Text-regex fallbacks for labeled fields not in DOM block ────────────
  if (!out.condition) {
    const m = bodyText.match(
      /(?:[eé]tat\s+du\s+bien|[eé]tat)\s*[:\-·•]\s*([a-zéèêëàâûùïîôœçæ][^<\n,;•·]{2,50})/i
    );
    if (m) out.condition = m[1].trim();
  }

  if (!out.property_age_range) {
    const m =
      bodyText.match(/(\d{1,2}\s*[-–]\s*\d{1,2}\s*ans?)/i) ||
      bodyText.match(/[aâ]ge\s*du\s*bien\s*[:\-·•]\s*([^<\n,;•·]{2,40})/i);
    if (m) out.property_age_range = m[1].trim();
  }

  if (!out.orientation) {
    const m = bodyText.match(
      /orientation\s*[:\-·•]?\s*(nord|sud|est|ouest|nord[-\s]est|nord[-\s]ouest|sud[-\s]est|sud[-\s]ouest)/i
    );
    if (m) out.orientation = m[1].trim();
  }

  if (!out.floors_count) {
    // "R+2" = ground + 2 floors = 3 total; "Nombre d'étages : 2"
    const rPlus = bodyText.match(/\bR\+(\d+)\b/i);
    if (rPlus) {
      const n = parseInt(rPlus[1], 10);
      if (Number.isFinite(n)) out.floors_count = n + 1;
    } else {
      const m = bodyText.match(/nombre\s+d['''`]?[eé]tage[s]?\s*[:\-·]\s*(\d+)/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n >= 1 && n <= 30) out.floors_count = n;
      }
    }
  }

  if (!out.garden_m2) {
    const m =
      bodyText.match(/jardin\s+(?:de\s+)?(\d[\d\s.,]*)\s*m/i) ||
      bodyText.match(/(\d[\d\s.,]*)\s*m[²2]?\s*de\s+jardin/i);
    if (m) out.garden_m2 = parseM2(m[1]);
  }

  if (!out.terrace_m2) {
    const m =
      bodyText.match(/terrasse\s+(?:de\s+)?(\d[\d\s.,]*)\s*m/i) ||
      bodyText.match(/(\d[\d\s.,]*)\s*m[²2]?\s*de\s+terrasse/i);
    if (m) out.terrace_m2 = parseM2(m[1]);
  }

  if (!out.garage_spaces) {
    const m =
      bodyText.match(/garage\s+(\d+)\s*place/i) ||
      bodyText.match(/(\d+)\s*place[s]?\s*(?:de\s+)?garage/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n >= 1 && n <= 50) out.garage_spaces = n;
    }
  }

  // ── 4. Boolean features — use main content to avoid similar-listing noise ──
  // Prefer a specific "main" container; fall back to first 8000 chars of body.
  const mainEl = $(
    "[class*='adDetail'], [class*='adContent'], [class*='pageDetail']," +
    "[class*='ficheAd'], [class*='content-detail'], article, main"
  )
    .not("[class*='similar'], [class*='Similar'], footer, nav")
    .first();

  const featureText = mainEl.length
    ? mainEl.text().replace(/\s+/g, " ")
    : bodyText.slice(0, 8000);

  if (/piscine/i.test(featureText) && !/sans\s+piscine/i.test(featureText)) {
    out.has_pool = true;
  }
  if (/concierge/i.test(featureText)) {
    out.has_concierge = true;
  }
  if (/salon\s+marocain/i.test(featureText)) {
    out.has_moroccan_living_room = true;
  }
  if (/salon\s+europ[eé]/i.test(featureText)) {
    out.has_european_living_room = true;
  }
  if (/cuisine\s+[eé]quip[eé]/i.test(featureText)) {
    out.has_equipped_kitchen = true;
  }

  // ── 5. Aggregate premium_features list ────────────────────────────────────
  const features: string[] = [];
  if (out.has_pool) features.push("Piscine");
  if (out.has_concierge) features.push("Concierge");
  if (out.has_moroccan_living_room) features.push("Salon marocain");
  if (out.has_european_living_room) features.push("Salon européen");
  if (out.has_equipped_kitchen) features.push("Cuisine équipée");
  if (out.garden_m2) features.push(`Jardin ${out.garden_m2} m²`);
  if (out.terrace_m2) features.push(`Terrasse ${out.terrace_m2} m²`);
  if (out.garage_spaces) {
    features.push(`Garage ${out.garage_spaces} place${out.garage_spaces > 1 ? "s" : ""}`);
  }
  if (out.orientation) features.push(`Orientation ${out.orientation}`);
  out.premium_features = features;
}
