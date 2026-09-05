import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getCityBySlug,
  getAllCities,
  buildSearchQueryForCity,
  buildSearchQueryForIntent,
} from "@/lib/seo-city-pages/city-seo-data";
import { isValidCitySlug } from "@/lib/seo-city-pages/types";
import {
  generateCitySeoMetadata,
  generateIntentSeoMetadata,
  cityPageTitle,
  cityPageDescription,
  intentPageTitle,
  intentPageDescription,
} from "@/lib/seo-city-pages/seo-metadata";
import {
  assertSeoCityPageSafety,
  assertNoSerperInSeoPages,
} from "@/lib/seo-city-pages/public-safety";
import { getSeoCityIntentIndexability } from "@/lib/seo/city-intent-indexability";
import { evaluateMarketMetricPublication } from "@/lib/seo/market-metric-publication";
import { toPublishedMarketMetric } from "@/lib/seo/market-metric-read-model";

test("getAllCities returns 5 cities for V1", () => {
  const cities = getAllCities();
  assert.equal(cities.length, 5);

  const slugs = cities.map((c) => c.slug);
  assert.deepEqual(slugs, [
    "casablanca",
    "rabat",
    "marrakech",
    "tanger",
    "agadir",
  ]);
});

test("getCityBySlug returns city data for valid slug", () => {
  const city = getCityBySlug("casablanca");
  assert.ok(city);
  assert.equal(city.displayName, "Casablanca");
  assert.equal(city.slug, "casablanca");
  assert.ok(city.neighborhoods);
  assert.ok(city.popularSearches.length > 0);
});

test("getCityBySlug returns null for invalid slug", () => {
  const city = getCityBySlug("invalid-city");
  assert.equal(city, null);
});

test("isValidCitySlug validates slugs correctly", () => {
  assert.equal(isValidCitySlug("casablanca"), true);
  assert.equal(isValidCitySlug("rabat"), true);
  assert.equal(isValidCitySlug("invalid"), false);
  assert.equal(isValidCitySlug(123), false);
});

test("buildSearchQueryForCity generates valid URL query", () => {
  const query = buildSearchQueryForCity("Casablanca");
  assert.ok(query.includes("Casablanca"));
  assert.ok(query.includes("appartement"));
  assert.ok(!query.includes(" "));
});

test("buildSearchQueryForIntent generates correct intent-based queries", () => {
  const buyQuery = buildSearchQueryForIntent("Casablanca", "acheter");
  assert.ok(decodeURIComponent(buyQuery).includes("acheter"));

  const rentQuery = buildSearchQueryForIntent("Casablanca", "louer");
  assert.ok(decodeURIComponent(rentQuery).includes("location"));
});

test("cityPageTitle generates non-promissive title", () => {
  const city = getCityBySlug("casablanca");
  assert.ok(city);

  const title = cityPageTitle(city);
  assert.ok(title.includes("Casablanca"));
  assert.ok(title.includes("Immobilier"));
  assert.ok(title.includes("AkarFinder"));

  assert.equal(title.toLowerCase().includes("toutes les annonces"), false);
  assert.equal(title.toLowerCase().includes("annonces vérifiées"), false);
  assert.equal(title.toLowerCase().includes("meilleur"), false);
});

test("cityPageDescription is non-promissive", () => {
  const city = getCityBySlug("casablanca");
  assert.ok(city);

  const description = cityPageDescription(city);
  assert.ok(description.includes("AkarFinder"));
  assert.ok(description.includes("source originale"));

  assert.equal(description.toLowerCase().includes("annonces vérifiées"), false);
  assert.equal(description.toLowerCase().includes("annonces fiables"), false);
  assert.equal(description.toLowerCase().includes("prix officiel"), false);
});

test("generateCitySeoMetadata produces complete metadata", () => {
  const city = getCityBySlug("rabat");
  assert.ok(city);

  const seo = generateCitySeoMetadata(city);

  assert.ok(seo.title);
  assert.ok(seo.description);
  assert.ok(seo.canonical.includes("/immobilier/rabat"));
  assert.equal(seo.canonical, `https://akarfinder.vercel.app/immobilier/${city.slug}`);
  assert.ok(seo.ogTitle);
  assert.ok(seo.ogDescription);
});

test("intentPageTitle includes intent and city", () => {
  const city = getCityBySlug("marrakech");
  assert.ok(city);

  const buyTitle = intentPageTitle(city, "acheter");
  assert.ok(buyTitle.includes("Acheter"));
  assert.ok(buyTitle.includes("Marrakech"));

  const rentTitle = intentPageTitle(city, "louer");
  assert.ok(rentTitle.includes("Louer"));
  assert.ok(rentTitle.includes("Marrakech"));
});

test("generateIntentSeoMetadata produces a stable city-intent canonical", () => {
  const city = getCityBySlug("casablanca");
  assert.ok(city);

  const seo = generateIntentSeoMetadata(city, "acheter");
  assert.equal(seo.canonical, "https://akarfinder.vercel.app/immobilier/casablanca/acheter");
  assert.ok(seo.title.includes("Acheter"));
  assert.ok(seo.description.includes("Casablanca"));
});

test("city-intent indexability delegates to the shared inventory gate", async () => {
  const calls: unknown[] = [];
  const decision = await getSeoCityIntentIndexability(
    "Casablanca",
    "acheter",
    async (query) => {
      calls.push(query);
      return {
        eligible: true,
        reason: "eligible",
        listingCount: 260,
        sourceCount: 5,
      };
    },
  );

  assert.deepEqual(calls, [{ city: "Casablanca", intent: "acheter" }]);
  assert.deepEqual(decision, {
    city: "Casablanca",
    intent: "acheter",
    eligible: true,
    reason: "eligible",
    listingCount: 260,
    sourceCount: 5,
  });
});

test("SEO-4 static routes bind acheter and louer to the shared route builder", () => {
  const buyRoute = readFileSync("app/immobilier/[city]/acheter/page.tsx", "utf8");
  const rentRoute = readFileSync("app/immobilier/[city]/louer/page.tsx", "utf8");

  assert.match(buyRoute, /generateCityIntentMetadata\(city, "acheter"\)/);
  assert.match(buyRoute, /renderCityIntentPage\(city, "acheter"\)/);
  assert.match(rentRoute, /generateCityIntentMetadata\(city, "louer"\)/);
  assert.match(rentRoute, /renderCityIntentPage\(city, "louer"\)/);
});

test("SEO-4 sitemap publishes each city intent only from its own gate decision", () => {
  const sitemapSource = readFileSync("app/sitemap.ts", "utf8");

  assert.match(sitemapSource, /decision\.acheter\.eligible/);
  assert.match(sitemapSource, /decision\.louer\.eligible/);
  assert.match(sitemapSource, /\/immobilier\/\$\{city\.slug\}\/acheter/);
  assert.match(sitemapSource, /\/immobilier\/\$\{city\.slug\}\/louer/);
});

test("SEO-4 landing copy remains non-promissive", () => {
  const landingSource = readFileSync("components/seo/CityIntentLanding.tsx", "utf8");
  assert.equal(landingSource.toLowerCase().includes("toutes les annonces"), false);
  assert.equal(landingSource.toLowerCase().includes("annonces vérifiées"), false);
  assert.ok(landingSource.includes("Ce n’est pas une mesure exhaustive du marché local"));
  assert.ok(landingSource.includes("source originale"));
});

test("SEO-5 market metric gate is fail-closed for current shadow state", () => {
  assert.deepEqual(
    evaluateMarketMetricPublication({
      reliabilityLevel: "strong",
      marketRepresentativenessCertified: false,
      publicActivation: false,
      metricState: "shadow",
      median: 15000,
    }),
    { publishable: false, reason: "not_certified" },
  );
});

test("SEO-5 market metric gate rejects limited reliability even if flags are enabled", () => {
  assert.deepEqual(
    evaluateMarketMetricPublication({
      reliabilityLevel: "limited",
      marketRepresentativenessCertified: true,
      publicActivation: true,
      metricState: "published",
      median: 15000,
    }),
    { publishable: false, reason: "reliability_too_low" },
  );
});

test("SEO-5 market metric gate requires certification, public activation and non-shadow state", () => {
  assert.equal(
    evaluateMarketMetricPublication({
      reliabilityLevel: "moderate",
      marketRepresentativenessCertified: true,
      publicActivation: false,
      metricState: "published",
      median: 15000,
    }).publishable,
    false,
  );
  assert.equal(
    evaluateMarketMetricPublication({
      reliabilityLevel: "moderate",
      marketRepresentativenessCertified: true,
      publicActivation: true,
      metricState: "shadow",
      median: 15000,
    }).publishable,
    false,
  );
  assert.deepEqual(
    evaluateMarketMetricPublication({
      reliabilityLevel: "moderate",
      marketRepresentativenessCertified: true,
      publicActivation: true,
      metricState: "published",
      median: 15000,
    }),
    { publishable: true, reason: "eligible" },
  );
});

test("SEO-5 market metric gate rejects invalid medians", () => {
  for (const median of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, null]) {
    assert.deepEqual(
      evaluateMarketMetricPublication({
        reliabilityLevel: "strong",
        marketRepresentativenessCertified: true,
        publicActivation: true,
        metricState: "published",
        median,
      }),
      { publishable: false, reason: "invalid_metric" },
    );
  }
});

test("SEO-5B read model maps only a certified activated published row", () => {
  const metric = toPublishedMarketMetric({
    city_slug: "rabat",
    city_name: "Rabat",
    neighborhood_slug: "agdal",
    neighborhood_name: "Agdal",
    transaction_type: "sale",
    metric_name: "price_per_m2_mad",
    sample_count: "24",
    source_domain_count: "4",
    median: "16750.50",
    q1: "14500",
    q3: "19000",
    fresh_sample_percent: "82.50",
    field_coverage_percent: "78.20",
    reliability_level: "strong",
    market_representativeness_certified: true,
    public_activation: true,
    metric_state: "published",
    reliability_policy_version: "p1c2_neighborhood_offer_reliability_v1",
  });

  assert.ok(metric);
  assert.equal(metric.citySlug, "rabat");
  assert.equal(metric.neighborhoodSlug, "agdal");
  assert.equal(metric.median, 16750.5);
  assert.equal(metric.sampleCount, 24);
  assert.equal(metric.sourceDomainCount, 4);
});

test("SEO-5B read model drops shadow and malformed rows", () => {
  const baseRow = {
    city_slug: "rabat",
    city_name: "Rabat",
    neighborhood_slug: "agdal",
    neighborhood_name: "Agdal",
    transaction_type: "sale",
    metric_name: "price_per_m2_mad",
    sample_count: 24,
    source_domain_count: 4,
    median: 16750,
    q1: 14500,
    q3: 19000,
    fresh_sample_percent: 82.5,
    field_coverage_percent: 78.2,
    reliability_level: "strong",
    market_representativeness_certified: true,
    public_activation: true,
    metric_state: "published",
    reliability_policy_version: "p1c2_neighborhood_offer_reliability_v1",
  };

  assert.equal(toPublishedMarketMetric({ ...baseRow, metric_state: "shadow" }), null);
  assert.equal(toPublishedMarketMetric({ ...baseRow, median: "not-a-number" }), null);
  assert.equal(toPublishedMarketMetric({ ...baseRow, neighborhood_slug: null }), null);
});

test("assertSeoCityPageSafety throws on forbidden wording", () => {
  const content = "Toutes les annonces vérifiées sur notre site";
  assert.throws(
    () => assertSeoCityPageSafety(content),
    /forbidden wording/i
  );
});

test("assertSeoCityPageSafety passes on safe content", () => {
  const content =
    "AkarFinder aide à explorer des résultats immobiliers publics. Vérifiez sur la source originale.";
  assert.doesNotThrow(() => assertSeoCityPageSafety(content));
});

test("assertSeoCityPageSafety throws on data exposure", () => {
  const content = "Le value_median pour cette annonce est 2M MAD";
  assert.throws(
    () => assertSeoCityPageSafety(content),
    /forbidden concept/i
  );
});

test("assertNoSerperInSeoPages throws on Serper calls", () => {
  const code =
    "const result = await searchGateway({ query: 'apartment' });";
  assert.throws(
    () => assertNoSerperInSeoPages(code),
    /must not call Serper/i
  );
});

test("assertNoSerperInSeoPages passes on clean code", () => {
  const code =
    "return <Link href={`/search?q=${query}`}>Search</Link>";
  assert.doesNotThrow(() => assertNoSerperInSeoPages(code));
});
