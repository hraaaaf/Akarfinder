import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.SEARCH_UX_FAST_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/search-ux-fast-1";
const route = "/search?q=appartement%20rabat";
const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const fixtureListing = {
  id: "search-ux-fast-1-fixture",
  title: "Appartement lumineux à Rabat",
  city: "Rabat",
  neighborhood: "Agdal",
  price: 1850000,
  currency: "DH",
  surface_m2: 112,
  price_per_m2: 16518,
  property_type: "Appartement",
  transaction_type: "buy",
  bedrooms: 3,
  bathrooms: 2,
  freshness_label: "Récent",
  source_type: "Source analysée",
  reliability_label: "Informations complètes",
  reliability_score: 88,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture déterministe de certification visuelle.",
  image_url: "",
  reliability_explanation: "Fixture CI",
  data_completeness_score: 90,
  source_name: "AkarFinder",
  duplicate_score: 0.1,
  can_show_result: true,
  production_allowed: true,
  can_show_thumbnail: false,
  display_images: { policy: "no_listing_image", urls: [] },
  image_permission_status: "unknown",
  source_access_level: "indexed_only",
  acquisition_channel: "first_party_user",
  origin_type: "first_party_user",
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failure = null;

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });

    await page.route("**/api/search?**", async (requestRoute) => {
      await requestRoute.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          listings: [fixtureListing],
          total: 1,
          limit: 100,
          offset: 0,
          source: "search-ux-fast-1-ci-fixture",
          generated_at: new Date().toISOString(),
        }),
      });
    });
    await page.route("**/api/search/gateway?**", async (requestRoute) => {
      await requestRoute.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ results: [], total_count: 0, next_cursor: null, has_more: false }),
      });
    });

    try {
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });

      if (!response || response.status() >= 400) {
        throw new Error(`${viewport.name}: search route returned ${response?.status() ?? "no response"}`);
      }

      await page.waitForSelector("#property-search", { timeout: 20_000 });
      await page.waitForSelector('article[data-property-active]', { timeout: 20_000 });

      const metrics = await page.evaluate(() => {
        const first = document.querySelector('article[data-property-active]');
        const search = document.querySelector("#property-search");
        const sort = document.querySelector('select[aria-label="Trier les résultats"]');
        const bodyText = document.body.innerText;
        const rect = first?.getBoundingClientRect();
        const shell = search?.closest(".min-h-screen");
        const measuredBlocks = shell
          ? Array.from(shell.querySelectorAll(":scope > section, :scope > div > section")).map((element) => {
              const box = element.getBoundingClientRect();
              return {
                tag: element.tagName.toLowerCase(),
                aria: element.getAttribute("aria-label"),
                top: Math.round(box.top),
                height: Math.round(box.height),
                text: (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 120),
              };
            })
          : [];
        const headings = Array.from(document.querySelectorAll("h1,h2,h3")).map((element) => {
          const box = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            top: Math.round(box.top),
            height: Math.round(box.height),
            text: (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 100),
          };
        });
        return {
          first_result_top: rect ? Math.round(rect.top) : null,
          first_result_visible_in_initial_viewport: rect ? rect.top < window.innerHeight : false,
          search_top: search ? Math.round(search.getBoundingClientRect().top) : null,
          sort_top: sort ? Math.round(sort.getBoundingClientRect().top) : null,
          viewport_height: window.innerHeight,
          viewport_width: window.innerWidth,
          client_width: document.documentElement.clientWidth,
          scroll_width: document.documentElement.scrollWidth,
          horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          old_hero_present: bodyText.includes("Trouvez votre bien au Maroc"),
          old_ranking_explanation_present: bodyText.includes("Ordre strict : promoteurs premium"),
          old_project_prompt_present: bodyText.includes("Besoin de clarifier vos priorités"),
          measured_blocks: measuredBlocks,
          headings,
        };
      });

      results.push({ name: viewport.name, ...metrics });

      await page.screenshot({
        path: `${outputDir}/${viewport.name}.png`,
        fullPage: true,
      });

      if (metrics.horizontal_overflow) {
        throw new Error(`${viewport.name}: horizontal overflow ${metrics.scroll_width}/${metrics.client_width}`);
      }
      if (metrics.old_hero_present || metrics.old_ranking_explanation_present || metrics.old_project_prompt_present) {
        throw new Error(`${viewport.name}: pre-result noise regression detected`);
      }
      if (!metrics.first_result_visible_in_initial_viewport) {
        throw new Error(`${viewport.name}: first result starts below initial viewport at ${metrics.first_result_top}px`);
      }
    } catch (error) {
      failure = error;
      break;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  `${outputDir}/metrics.json`,
  `${JSON.stringify({ route, fixture: "deterministic-client-api", generated_at: new Date().toISOString(), results, failure: failure instanceof Error ? failure.message : null }, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(results, null, 2));
if (failure) throw failure;
