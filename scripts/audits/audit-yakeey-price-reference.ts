import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  YAKEEY_PRICE_REFERENCE_POLICY,
  extractYakeeyDistrictReferenceRows,
  extractYakeeyReferenceRows,
  type YakeeyDistrictReferenceRow,
  type YakeeyReferenceRow,
} from "../../lib/market/yakeey-price-reference.js";
import { fetchHtml, isAllowedByRobots } from "../scrapers/utils/fetch-html.js";

const ROOT_URL = "https://yakeey.com/fr-ma/referentiel-de-prix-immobilier";
const TARGET_CITY_NAMES = ["Casablanca", "Rabat", "Marrakech", "Tanger"] as const;
const OUTPUT_JSON_PATH = resolve(process.cwd(), "data/audits/yakeey_price_reference_audit.json");
const OUTPUT_DOC_PATH = resolve(process.cwd(), "docs/YAKEEY_PRICE_REFERENCE_AUDIT.md");

type AuditStatus = "available" | "missing";
type AuditRecommendation =
  | "integrate_as_benchmark_source"
  | "audit_only"
  | "blocked"
  | "inconclusive";

type CityAuditEntry = {
  city: string;
  url: string | null;
  source_page_url: string;
  price_m2_appartement: number | null;
  price_m2_villa: number | null;
  price_m2_appartement_status: AuditStatus;
  price_m2_villa_status: AuditStatus;
  status: AuditStatus;
};

type DistrictAuditEntry = {
  city: string;
  city_url: string;
  district: string;
  url: string | null;
  source_page_url: string;
  price_m2_appartement: number | null;
  price_m2_villa: number | null;
  price_m2_appartement_status: AuditStatus;
  price_m2_villa_status: AuditStatus;
  status: AuditStatus;
};

type AuditReport = {
  source: "yakeey";
  source_type: "benchmark_source";
  data_type: "aggregated_market_price_reference";
  run_at: string;
  doctrine: {
    no_listing_scraping: true;
    no_contact: true;
    no_images: true;
    no_login: true;
    no_bypass: true;
  };
  source_policy: typeof YAKEEY_PRICE_REFERENCE_POLICY;
  summary: {
    cities_found: number;
    cities_with_appartment_price: number;
    cities_with_villa_price: number;
    city_pages_audited: number;
    districts_found: number;
    districts_with_appartment_price: number;
    districts_with_villa_price: number;
    recommendation: AuditRecommendation;
  };
  cities: CityAuditEntry[];
  districts: DistrictAuditEntry[];
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isAvailable(value: number | null): AuditStatus {
  return value === null ? "missing" : "available";
}

function pickTargetRows(rows: YakeeyReferenceRow[]): YakeeyReferenceRow[] {
  const wanted = new Map(TARGET_CITY_NAMES.map((name) => [normalizeName(name), name]));
  const picked: YakeeyReferenceRow[] = [];
  for (const row of rows) {
    const normalized = normalizeName(row.name);
    if (wanted.has(normalized)) {
      picked.push(row);
      wanted.delete(normalized);
    }
  }
  return picked;
}

function buildCityEntries(rows: YakeeyReferenceRow[]): CityAuditEntry[] {
  return rows.map((row) => ({
    city: row.name,
    url: row.url,
    source_page_url: ROOT_URL,
    price_m2_appartement: row.price_m2_appartement,
    price_m2_villa: row.price_m2_villa,
    price_m2_appartement_status: row.price_m2_appartement_status,
    price_m2_villa_status: row.price_m2_villa_status,
    status: row.status,
  }));
}

function buildDistrictEntries(rows: YakeeyDistrictReferenceRow[], sourcePageUrl: string): DistrictAuditEntry[] {
  return rows.map((row) => ({
    city: row.city,
    city_url: row.city_url,
    district: row.district,
    url: row.district_url,
    source_page_url: sourcePageUrl,
    price_m2_appartement: row.price_m2_appartement,
    price_m2_villa: row.price_m2_villa,
    price_m2_appartement_status: row.price_m2_appartement_status,
    price_m2_villa_status: row.price_m2_villa_status,
    status: row.status,
  }));
}

async function fetchPage(url: string): Promise<string> {
  if (!(await isAllowedByRobots(url))) {
    throw new Error(`Disallowed by robots.txt: ${url}`);
  }
  const result = await fetchHtml(url, { timeoutMs: 20000 });
  return result.html;
}

async function runAudit(): Promise<AuditReport> {
  const rootHtml = await fetchPage(ROOT_URL);
  const rootRows = extractYakeeyReferenceRows(rootHtml, ROOT_URL);
  const cityRows = pickTargetRows(rootRows);

  const cities = buildCityEntries(rootRows);

  const cityPages: Array<{
    name: string;
    url: string;
    rows: YakeeyDistrictReferenceRow[];
  }> = [];
  for (const city of cityRows) {
    if (!city.url) continue;
    const html = await fetchPage(city.url);
    cityPages.push({
      name: city.city,
      url: city.url,
      rows: extractYakeeyDistrictReferenceRows(html, city.url),
    });
  }

  const districts = cityPages.flatMap((page) => buildDistrictEntries(page.rows, page.url));

  const summary = {
    cities_found: cities.length,
    cities_with_appartment_price: cities.filter((city) => city.price_m2_appartement_status === "available").length,
    cities_with_villa_price: cities.filter((city) => city.price_m2_villa_status === "available").length,
    city_pages_audited: cityPages.length,
    districts_found: districts.length,
    districts_with_appartment_price: districts.filter((district) => district.price_m2_appartement_status === "available").length,
    districts_with_villa_price: districts.filter((district) => district.price_m2_villa_status === "available").length,
    recommendation:
      rootRows.length > 0 && cityPages.length === cityRows.length && districts.length > 0
        ? "integrate_as_benchmark_source"
        : "audit_only",
  } satisfies AuditReport["summary"];

  return {
    source: "yakeey",
    source_type: "benchmark_source",
    data_type: "aggregated_market_price_reference",
    run_at: new Date().toISOString(),
    doctrine: {
      no_listing_scraping: true,
      no_contact: true,
      no_images: true,
      no_login: true,
      no_bypass: true,
    },
    source_policy: YAKEEY_PRICE_REFERENCE_POLICY,
    summary,
    cities,
    districts,
  };
}

function formatMoney(value: number | null): string {
  return value === null ? "--" : `${value.toLocaleString("fr-FR")} DH`;
}

function formatStatus(value: AuditStatus): string {
  return value === "available" ? "available" : "missing";
}

function buildMarkdown(report: AuditReport): string {
  const targetCities = report.cities.filter((city) =>
    TARGET_CITY_NAMES.some((name) => normalizeName(name) === normalizeName(city.city))
  );
  const sampleCityBlock = targetCities
    .map(
      (city) =>
        `- ${city.city}: appartement ${formatMoney(city.price_m2_appartement)} · villa ${formatMoney(city.price_m2_villa)} · statut ${formatStatus(city.status)}`
    )
    .join("\n");

  const casablancaDistricts = report.districts.filter((district) => normalizeName(district.city) === "casablanca").slice(0, 5);
  const rabatDistricts = report.districts.filter((district) => normalizeName(district.city) === "rabat").slice(0, 5);

  return `# Yakeey Price Reference Audit

Date: ${report.run_at}

## Policy

- source_type: \`${report.source_policy.source_type}\`
- not_listing_source: \`${report.source_policy.not_listing_source}\`
- can_create_listing: \`${report.source_policy.can_create_listing}\`
- can_compute_market_benchmark: \`${report.source_policy.can_compute_market_benchmark}\`
- can_compute_price_gap: \`${report.source_policy.can_compute_price_gap}\`
- attribution_required: \`${report.source_policy.attribution_required}\`

## Scope

- Public benchmark source only
- No listing scraping
- No contact collection
- No images
- No login or bypass

## Summary

- Cities found: ${report.summary.cities_found}
- Cities with apartment price: ${report.summary.cities_with_appartment_price}
- Cities with villa price: ${report.summary.cities_with_villa_price}
- City pages audited: ${report.summary.city_pages_audited}
- Districts found: ${report.summary.districts_found}
- Districts with apartment price: ${report.summary.districts_with_appartment_price}
- Districts with villa price: ${report.summary.districts_with_villa_price}
- Recommendation: \`${report.summary.recommendation}\`

## Target Cities

${sampleCityBlock}

## Casablanca District Samples

${casablancaDistricts
  .map(
    (district) =>
      `- ${district.district}: appartement ${formatMoney(district.price_m2_appartement)} · villa ${formatMoney(district.price_m2_villa)} · url ${district.url ?? "--"}`
  )
  .join("\n")}

## Rabat District Samples

${rabatDistricts
  .map(
    (district) =>
      `- ${district.district}: appartement ${formatMoney(district.price_m2_appartement)} · villa ${formatMoney(district.price_m2_villa)} · url ${district.url ?? "--"}`
  )
  .join("\n")}
`;
}

async function main(): Promise<void> {
  const report = await runAudit();
  await mkdir(dirname(OUTPUT_JSON_PATH), { recursive: true });
  await mkdir(dirname(OUTPUT_DOC_PATH), { recursive: true });
  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(OUTPUT_DOC_PATH, `${buildMarkdown(report)}\n`, "utf8");
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Wrote ${OUTPUT_JSON_PATH}`);
  console.log(`Wrote ${OUTPUT_DOC_PATH}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
