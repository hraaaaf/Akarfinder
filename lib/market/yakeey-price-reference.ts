import * as cheerio from "cheerio";

export type YakeeyPriceReferencePolicy = {
  source_type: "benchmark_source";
  not_listing_source: true;
  can_create_listing: false;
  can_compute_market_benchmark: true;
  can_compute_price_gap: true;
  attribution_required: true;
};

export const YAKEEY_PRICE_REFERENCE_POLICY: YakeeyPriceReferencePolicy = {
  source_type: "benchmark_source",
  not_listing_source: true,
  can_create_listing: false,
  can_compute_market_benchmark: true,
  can_compute_price_gap: true,
  attribution_required: true,
};

export type YakeeyReferenceStatus = "available" | "missing";

export type YakeeyReferenceRow = {
  name: string;
  url: string | null;
  price_m2_appartement: number | null;
  price_m2_villa: number | null;
  price_m2_appartement_status: YakeeyReferenceStatus;
  price_m2_villa_status: YakeeyReferenceStatus;
  status: YakeeyReferenceStatus;
};

export type YakeeyCityReferenceRow = YakeeyReferenceRow & {
  city: string;
  city_url: string;
};

export type YakeeyDistrictReferenceRow = YakeeyReferenceRow & {
  city: string;
  city_url: string;
  district: string;
  district_url: string | null;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function slugToLabel(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function toAbsoluteUrl(baseUrl: string, href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function getPathSegment(url: string, index: number): string | null {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    return segments[index] ?? null;
  } catch {
    return null;
  }
}

function detectMissingPrice(value: string): boolean {
  const normalized = normalizeText(value).toLowerCase();
  return !normalized || normalized === "-" || normalized === "--" || normalized.includes("pas d'informations disponibles");
}

export function parseYakeeyPriceCell(value: string | null | undefined): number | null {
  const normalized = normalizeText(value);
  if (detectMissingPrice(normalized)) return null;

  const cleaned = normalized
    .replace(/dh(?:\/m²|\/m2|\/m²)?/gi, "")
    .replace(/m²/gi, "")
    .replace(/[^\d\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const match = cleaned.match(/\d[\d\s]*/);
  if (!match) return null;

  const amount = parseInt(match[0].replace(/[^\d]/g, ""), 10);
  return Number.isFinite(amount) ? amount : null;
}

function parseRowStatus(appartement: number | null, villa: number | null): YakeeyReferenceStatus {
  return appartement !== null || villa !== null ? "available" : "missing";
}

function parseReferenceRows(html: string, pageUrl: string): YakeeyReferenceRow[] {
  const $ = cheerio.load(html);
  const rows: YakeeyReferenceRow[] = [];

  $("table tr").slice(1).each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length < 3) return;

    const nameCell = cells.eq(0);
    const anchor = nameCell.find("a[href]").first();
    const name = normalizeText(anchor.text() || nameCell.text());
    if (!name) return;

    const url = toAbsoluteUrl(pageUrl, anchor.attr("href"));
    const priceAppartement = parseYakeeyPriceCell(cells.eq(1).text());
    const priceVilla = parseYakeeyPriceCell(cells.eq(2).text());

    rows.push({
      name,
      url,
      price_m2_appartement: priceAppartement,
      price_m2_villa: priceVilla,
      price_m2_appartement_status: priceAppartement === null ? "missing" : "available",
      price_m2_villa_status: priceVilla === null ? "missing" : "available",
      status: parseRowStatus(priceAppartement, priceVilla),
    });
  });

  return rows;
}

export function extractYakeeyReferenceRows(html: string, pageUrl: string): YakeeyReferenceRow[] {
  return parseReferenceRows(html, pageUrl);
}

export function extractYakeeyCityReferenceRows(
  html: string,
  pageUrl: string
): YakeeyCityReferenceRow[] {
  const cityName = normalizeText(
    cheerio.load(html)("h1").first().text().replace(/^Prix de l'immobilier au m²\s*/i, "")
  );
  const pageCitySlug = getPathSegment(pageUrl, 2);
  const city = cityName || (pageCitySlug ? slugToLabel(pageCitySlug) : "");
  const cityUrl = pageUrl;

  return parseReferenceRows(html, pageUrl).map((row) => ({
    ...row,
    city,
    city_url: cityUrl,
  }));
}

export function extractYakeeyDistrictReferenceRows(
  html: string,
  pageUrl: string
): YakeeyDistrictReferenceRow[] {
  const citySlug = getPathSegment(pageUrl, 2);
  const city = citySlug ? slugToLabel(citySlug) : "";
  const cityUrl = citySlug ? new URL(`/fr-ma/referentiel-de-prix-immobilier/${citySlug}`, pageUrl).toString() : pageUrl;

  return parseReferenceRows(html, pageUrl).map((row) => ({
    ...row,
    city,
    city_url: cityUrl,
    district: row.name,
    district_url: row.url,
  }));
}
